/* eslint-disable @typescript-eslint/no-explicit-any */
import { addIdsToScoutingData, detectConflicts } from "./scoutingDataUtils";
import type { ScoutingDataWithId, ConflictInfo } from "./scoutingDataUtils";

/**
 * Parse and normalize incoming fountain code data format
 * Handles both new format (with composite IDs) and old format (hash IDs or no IDs)
 */
export const parseFountainData = async (data: unknown): Promise<ScoutingDataWithId[]> => {
  let newDataWithIds: ScoutingDataWithId[] = [];
  
  if (data && typeof data === 'object' && 'entries' in data && Array.isArray((data as any).entries)) {
    // New format: entries with IDs
    const entries = (data as any).entries;
    
    // Check if entries have composite IDs (new format) or hash IDs (old format)
    // Composite IDs contain "::" separator
    const firstEntry = entries[0];
    const hasCompositeIds = firstEntry?.id && typeof firstEntry.id === 'string' && firstEntry.id.includes('::');
    
    if (hasCompositeIds) {
      // Already has composite IDs - preserve them!
      newDataWithIds = entries;
    } else {
      // Old hash IDs or missing IDs - regenerate with composite format
      const rawData = entries.map((entry: ScoutingDataWithId) => entry.data);
      newDataWithIds = addIdsToScoutingData(rawData);
    }
  } else if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data)) {
    // Fallback: old format without IDs (regenerate them)
    const newDataObjects = (data as any).data;
    newDataWithIds = addIdsToScoutingData(newDataObjects);
  }
  
  return newDataWithIds;
};

/**
 * Process scouting data import with conflict detection
 * Returns results summary
 */
export const processScoutingImport = async (
  newDataWithIds: ScoutingDataWithId[]
): Promise<{
  added: number;
  replaced: number;
  conflicts: ConflictInfo[];
}> => {
  const { saveScoutingEntry, db } = await import('./dexieDB');
  
  // Use new conflict detection system
  const conflictResult = await detectConflicts(newDataWithIds);
  
  const results = { added: 0, replaced: 0, conflicts: conflictResult.conflicts };
  
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
  
  return results;
};

/**
 * Find existing entry in database matching the incoming entry
 * Supports fallback matching when eventName is missing
 */
export const findExistingEntry = async (
  incomingData: Record<string, unknown>
): Promise<any | undefined> => {
  const { db } = await import('./dexieDB');
  
  const matchNumber = String(incomingData.matchNumber || '');
  const teamNumber = String(incomingData.selectTeam || incomingData.teamNumber || '');
  const eventName = String(incomingData.eventName || '');
  
  const entries = await db.scoutingData.toArray();
  
  if (eventName) {
    // Normal matching: event + match + team
    return entries.find(e => 
      e.matchNumber === matchNumber &&
      e.teamNumber === teamNumber &&
      e.eventName === eventName
    );
  } else {
    // Fallback matching when eventName is missing: match + team only
    return entries.find(e => 
      e.matchNumber === matchNumber &&
      e.teamNumber === teamNumber
    );
  }
};
