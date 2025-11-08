import { toast } from "sonner";
import { 
  loadScoutingData, 
  saveScoutingData, 
  addIdsToScoutingData,
  detectConflicts
} from "@/lib/scoutingDataUtils";
import type { ScoutingDataWithId, ConflictInfo } from "@/lib/scoutingDataUtils";

export type UploadMode = "append" | "overwrite" | "smart-merge";

interface RawScoutingData {
  data: unknown[];
}

type ProcessedScoutingData = unknown[][];

// Return type for async upload operations that may have conflicts
export interface UploadResult {
  hasConflicts: boolean;
  hasBatchReview?: boolean;
  batchReviewEntries?: ScoutingDataWithId[];
  conflicts?: ConflictInfo[];
  autoProcessed?: {
    added: number;
    replaced: number;
  };
}

export const handleScoutingDataUpload = async (jsonData: unknown, mode: UploadMode): Promise<UploadResult> => {
  // Validate scouting data structure
  let newDataWithIds: ScoutingDataWithId[] = [];
  
  if (
    typeof jsonData === "object" &&
    jsonData !== null &&
    "entries" in jsonData &&
    Array.isArray((jsonData as { entries: unknown[] }).entries)
  ) {
    // Modern format with entries and IDs
    const modernData = jsonData as { entries: ScoutingDataWithId[] };
    
    // Check if entries have composite IDs (new format) or hash IDs (old format)
    const firstEntry = modernData.entries[0];
    const hasCompositeIds = firstEntry?.id && typeof firstEntry.id === 'string' && firstEntry.id.includes('::');
    
    if (hasCompositeIds) {
      // Already has composite IDs - preserve them!
      newDataWithIds = modernData.entries;
    } else {
      // Old hash IDs or missing IDs - regenerate with composite format
      const rawData = modernData.entries.map(entry => entry.data);
      newDataWithIds = addIdsToScoutingData(rawData as (unknown[] | Record<string, unknown>)[]);
    }
  } else if (
    typeof jsonData === "object" &&
    jsonData !== null &&
    "data" in jsonData &&
    Array.isArray((jsonData as RawScoutingData).data)
  ) {
    // Raw scouting data format
    const rawData = (jsonData as RawScoutingData).data;
    newDataWithIds = addIdsToScoutingData(rawData as (unknown[] | Record<string, unknown>)[]);
  } else if (Array.isArray(jsonData)) {
    // Processed scouting data format - skip header row if it exists
    const hasHeaderRow =
      jsonData.length > 0 &&
      Array.isArray(jsonData[0]) &&
      typeof jsonData[0][0] === "string" &&
      jsonData[0].some(
        (cell: unknown) =>
          typeof cell === "string" &&
          (cell.includes("match") || cell.includes("team"))
      );

    const newData = hasHeaderRow ? (jsonData as ProcessedScoutingData).slice(1) : (jsonData as ProcessedScoutingData);
    newDataWithIds = addIdsToScoutingData(newData as unknown[][]);
  } else {
    toast.error("Invalid scouting data format");
    return { hasConflicts: false };
  }
  
  if (newDataWithIds.length === 0) {
    toast.error("No valid scouting data found");
    return { hasConflicts: false };
  }
  
  // Handle different modes
  if (mode === "overwrite") {
    // Clear all existing data and save new data
    await saveScoutingData({ entries: newDataWithIds });
    toast.success(`Overwritten with ${newDataWithIds.length} scouting entries`);
    return { hasConflicts: false };
  }
  
  if (mode === "append") {
    // Just add all new entries without checking for duplicates
    const existingScoutingData = await loadScoutingData();
    const combined = [...existingScoutingData.entries, ...newDataWithIds];
    await saveScoutingData({ entries: combined });
    toast.success(
      `Appended ${newDataWithIds.length} entries to existing ${existingScoutingData.entries.length} entries (Total: ${combined.length})`
    );
    return { hasConflicts: false };
  }
  
  if (mode === "smart-merge") {
    // Use field-based conflict detection for reliable cross-device matching
    const conflictResult = await detectConflicts(newDataWithIds);
    
    const { saveScoutingEntry, db } = await import('@/lib/dexieDB');
    
    const results = { added: 0, replaced: 0 };
    
    // Auto-import: Save new entries
    if (conflictResult.autoImport.length > 0) {
      for (const entry of conflictResult.autoImport) {
        await saveScoutingEntry(entry);
      }
      results.added = conflictResult.autoImport.length;
    }
    
    // Auto-replace: Delete old, save new (with correction metadata preserved)
    if (conflictResult.autoReplace.length > 0) {
      for (const entry of conflictResult.autoReplace) {
        const incomingData = entry.data;
        const matchNumber = String(incomingData.matchNumber || '');
        const teamNumber = String(incomingData.selectTeam || incomingData.teamNumber || '');
        const alliance = String(incomingData.alliance || '').toLowerCase().replace('alliance', '').trim();
        const eventName = String(incomingData.eventName || '');
        
        // Find and delete existing entry
        const existing = await db.scoutingData
          .toArray()
          .then(entries => entries.find(e => 
            e.matchNumber === matchNumber &&
            e.teamNumber === teamNumber &&
            e.alliance?.toLowerCase().replace('alliance', '').trim() === alliance &&
            e.eventName === eventName
          ));
        
        if (existing) {
          await db.scoutingData.delete(existing.id);
        }
        
        // Save new entry (with correction metadata if present)
        await saveScoutingEntry(entry);
      }
      results.replaced = conflictResult.autoReplace.length;
    }
    
    // Handle conflicts: Return them for user to resolve via dialog
    if (conflictResult.conflicts.length > 0 || conflictResult.batchReview.length > 0) {
      // Show initial toast about auto-processed entries
      if (results.added > 0 || results.replaced > 0) {
        const batchMessage = conflictResult.batchReview.length > 0 ? ` ${conflictResult.batchReview.length} duplicates need review.` : '';
        const conflictMessage = conflictResult.conflicts.length > 0 ? ` ${conflictResult.conflicts.length} conflicts need review.` : '';
        toast.success(
          `Imported ${results.added} new entries, ` +
          `Replaced ${results.replaced} existing entries.` +
          batchMessage + conflictMessage
        );
      }
      
      // Return batch review first if present, otherwise conflicts
      if (conflictResult.batchReview.length > 0) {
        return {
          hasConflicts: false,
          hasBatchReview: true,
          batchReviewEntries: conflictResult.batchReview,
          conflicts: conflictResult.conflicts.length > 0 ? conflictResult.conflicts : undefined,
          autoProcessed: results
        };
      }
      
      return {
        hasConflicts: true,
        conflicts: conflictResult.conflicts,
        autoProcessed: results
      };
    }
    
    // No conflicts - show completion message
    const totalExisting = await db.scoutingData.count();
    
    toast.success(
      `Smart merge complete! ${results.added} new entries added, ${results.replaced} entries replaced (Total: ${totalExisting})`
    );
    return { hasConflicts: false, autoProcessed: results };
  }
  
  return { hasConflicts: false };
};

// Apply conflict resolutions after user makes decisions
export const applyConflictResolutions = async (
  conflicts: ConflictInfo[],
  resolutions: Map<string, 'replace' | 'skip'>
): Promise<{ replaced: number; skipped: number }> => {
  const { saveScoutingEntry, db } = await import('@/lib/dexieDB');
  let replaced = 0;
  let skipped = 0;
  
  for (const conflict of conflicts) {
    const conflictKey = `${conflict.local.matchNumber}-${conflict.local.teamNumber}-${conflict.local.eventName}`;
    const decision = resolutions.get(conflictKey);
    
    if (decision === 'replace') {
      // Delete old entry and save new one
      await db.scoutingData.delete(conflict.local.id);
      await saveScoutingEntry(conflict.incoming);
      replaced++;
    } else {
      // Skip - keep local, do nothing
      skipped++;
    }
  }
  
  return { replaced, skipped };
};
