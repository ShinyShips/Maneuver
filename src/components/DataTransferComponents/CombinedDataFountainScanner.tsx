import { gameDB, type Scout, type MatchPrediction } from "@/lib/dexieDB";
import { 
  loadScoutingData, 
  saveScoutingData, 
  mergeScoutingData, 
  detectConflicts,
  type ScoutingDataWithId
} from "@/lib/scoutingDataUtils";
import { useConflictResolution } from "@/hooks/useConflictResolution";
import UniversalFountainScanner from "./UniversalFountainScanner";
import ScoutAddConfirmDialog from "./ScoutAddConfirmDialog";
import ConflictResolutionDialog from "./ConflictResolutionDialog";
import { toast } from "sonner";
import { useState } from "react";
import { decompressScoutingData, decompressScoutProfiles } from "@/lib/compressionUtils";
import { toUint8Array } from "js-base64";

interface CombinedDataFountainScannerProps {
  onBack: () => void;
  onSwitchToGenerator: () => void;
}

/**
 * Helper function to convert various compressed data formats to Uint8Array
 * Handles base64 strings, number arrays, and Uint8Arrays
 */
function convertToUint8Array(data: unknown, dataLabel: string): Uint8Array {
  if (typeof data === 'string') {
    return toUint8Array(data);
  } else if (Array.isArray(data)) {
    return new Uint8Array(data as number[]);
  } else if (data instanceof Uint8Array) {
    return data;
  } else {
    throw new Error(`Invalid ${dataLabel} format: expected base64 string, number array, or Uint8Array`);
  }
}

interface CombinedDataStructure {
  type: string;
  scoutingData: {
    compressed?: boolean;
    data: ScoutingDataWithId[] | { entries: ScoutingDataWithId[] } | number[] | string;
  } | {
    entries: ScoutingDataWithId[];
  };
  scoutProfiles: {
    compressed?: boolean;
    data: { scouts: Scout[]; predictions: MatchPrediction[] } | number[] | string;
  } | {
    scouts: Scout[];
    predictions: MatchPrediction[];
  };
  metadata: {
    exportedAt: string;
    version: string;
    scoutingEntriesCount: number;
    scoutsCount: number;
    predictionsCount: number;
  };
}

const CombinedDataFountainScanner = ({ onBack, onSwitchToGenerator }: CombinedDataFountainScannerProps) => {
  const [showScoutAddDialog, setShowScoutAddDialog] = useState(false);
  const [pendingScoutNames, setPendingScoutNames] = useState<string[]>([]);
  const [pendingImportData, setPendingImportData] = useState<{
    scoutingData: ScoutingDataWithId[];
    scoutsToImport: Scout[];
    predictionsToImport: MatchPrediction[];
  } | null>(null);
  
  // Use conflict resolution hook
  const {
    showConflictDialog,
    setShowConflictDialog,
    currentConflicts,
    setCurrentConflicts,
    currentConflictIndex,
    setCurrentConflictIndex,
    setConflictResolutions,
    handleConflictResolution,
    handleBatchResolve,
    handleUndo,
    canUndo
  } = useConflictResolution();
  const saveCombinedData = async (data: unknown) => {
    try {
      // Validate the received data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid combined data format');
      }
      
      const rawData = data as CombinedDataStructure;
      
      if (rawData.type !== 'combined_export') {
        throw new Error('Data is not a combined export format');
      }
      
      if (!rawData.scoutingData || !rawData.scoutProfiles || !rawData.metadata) {
        throw new Error('Missing required data sections in combined export');
      }
      
      // Decompress scouting data if compressed
      let scoutingData: { entries: ScoutingDataWithId[] };
      if ('compressed' in rawData.scoutingData && rawData.scoutingData.compressed) {
        if (import.meta.env.DEV) {
          console.log('🗜️ Decompressing scouting data...');
        }
        const compressedArray = convertToUint8Array(rawData.scoutingData.data, 'scouting data');
        const decompressed = decompressScoutingData(compressedArray);
        scoutingData = { entries: decompressed.entries as ScoutingDataWithId[] };
        if (import.meta.env.DEV) {
          console.log('🔍 Decompressed scouting data:', decompressed.entries?.length, 'entries');
          toast.info(`Decompressed ${decompressed.entries?.length || 0} scouting entries`);
        }
      } else if ('entries' in rawData.scoutingData) {
        scoutingData = { entries: rawData.scoutingData.entries };
      } else if ('data' in rawData.scoutingData && typeof rawData.scoutingData.data === 'object' && 'entries' in rawData.scoutingData.data) {
        scoutingData = rawData.scoutingData.data as { entries: ScoutingDataWithId[] };
      } else {
        throw new Error('Invalid scouting data format');
      }
      
      // Decompress scout profiles if compressed
      let scoutProfiles: { scouts: Scout[]; predictions: MatchPrediction[] };
      if ('compressed' in rawData.scoutProfiles && rawData.scoutProfiles.compressed) {
        if (import.meta.env.DEV) {
          console.log('🗜️ Decompressing scout profiles...');
        }
        const compressedArray = convertToUint8Array(rawData.scoutProfiles.data, 'scout profiles');
        const decompressed = decompressScoutProfiles(compressedArray);
        scoutProfiles = {
          scouts: decompressed.scouts as Scout[],
          predictions: decompressed.predictions as MatchPrediction[]
        };
        if (import.meta.env.DEV) {
          console.log('🔍 Decompressed scout profiles:', decompressed.scouts?.length, 'scouts,', decompressed.predictions?.length, 'predictions');
          toast.info(`Decompressed ${decompressed.scouts?.length || 0} scouts, ${decompressed.predictions?.length || 0} predictions`);
        }
      } else if ('scouts' in rawData.scoutProfiles && 'predictions' in rawData.scoutProfiles) {
        scoutProfiles = {
          scouts: rawData.scoutProfiles.scouts,
          predictions: rawData.scoutProfiles.predictions
        };
      } else if ('data' in rawData.scoutProfiles && typeof rawData.scoutProfiles.data === 'object') {
        scoutProfiles = rawData.scoutProfiles.data as { scouts: Scout[]; predictions: MatchPrediction[] };
      } else {
        throw new Error('Invalid scout profiles format');
      }
      
      if (import.meta.env.DEV) {
        console.log('✅ Decompression complete:', {
          scoutingEntries: scoutingData.entries?.length || 0,
          scouts: scoutProfiles.scouts?.length || 0,
          predictions: scoutProfiles.predictions?.length || 0
        });
        toast.info(`Ready to save: ${scoutingData.entries?.length || 0} entries, ${scoutProfiles.scouts?.length || 0} scouts`);
      }
      
      const scoutingResults = { added: 0, replaced: 0, conflictsToReview: 0 };
      const scoutResults = { scoutsAdded: 0, scoutsUpdated: 0, predictionsAdded: 0, predictionsSkipped: 0 };
      
      // Process scouting data with conflict detection if present
      if (scoutingData.entries && scoutingData.entries.length > 0) {
        // Check if entries have composite IDs (new format) or hash IDs (old format)
        const firstEntry = scoutingData.entries[0];
        const hasCompositeIds = firstEntry?.id && typeof firstEntry.id === 'string' && firstEntry.id.includes('::');
        
        let entriesWithIds;
        if (hasCompositeIds) {
          // Already has composite IDs - preserve them!
          entriesWithIds = scoutingData.entries;
        } else {
          // Old hash IDs or missing IDs - regenerate with composite format
          const { addIdsToScoutingData } = await import('@/lib/scoutingDataUtils');
          const rawDataEntries = scoutingData.entries.map((entry: ScoutingDataWithId) => entry.data);
          entriesWithIds = addIdsToScoutingData(rawDataEntries);
        }
        
        // Detect conflicts using the new system
        const conflictResult = await detectConflicts(entriesWithIds);
        
        // Import non-conflicting entries immediately
        const { saveScoutingEntry, db } = await import('@/lib/dexieDB');
        
        // Auto-import: Save new entries
        if (conflictResult.autoImport.length > 0) {
          for (const entry of conflictResult.autoImport) {
            await saveScoutingEntry(entry);
          }
          scoutingResults.added = conflictResult.autoImport.length;
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
          scoutingResults.replaced = conflictResult.autoReplace.length;
        }
        
        // Conflicts: Store for user resolution (but don't return yet - process scout profiles first)
        if (conflictResult.conflicts.length > 0) {
          scoutingResults.conflictsToReview = conflictResult.conflicts.length;
          setCurrentConflicts(conflictResult.conflicts);
          setCurrentConflictIndex(0);
          setConflictResolutions(new Map());
        }
      }
      
      // Process scout profiles data if present (existing logic)
      if (scoutProfiles.scouts || scoutProfiles.predictions) {
        const scoutsToImport = scoutProfiles.scouts || [];
        const predictionsToImport = scoutProfiles.predictions || [];
        
        // Check which scouts would be new to the selectable list
        const existingScoutsList = localStorage.getItem("scoutsList");
        let scoutsListArray: string[] = [];
        
        if (existingScoutsList) {
          try {
            scoutsListArray = JSON.parse(existingScoutsList);
          } catch {
            scoutsListArray = [];
          }
        }
        
        const newScoutNames = scoutsToImport
          .map(s => s.name)
          .filter(name => !scoutsListArray.includes(name));
        
        // If there are new scouts, ask the user if they want to add them to selectable list
        if (newScoutNames.length > 0) {
          // Show scouting import results first
          const scoutingMessage = scoutingResults.added > 0 || scoutingResults.replaced > 0 
            ? `Scouting: ${scoutingResults.added} new entries, ${scoutingResults.replaced} entries replaced. `
            : '';
          
          if (scoutingMessage) {
            toast.success(`${scoutingMessage}Scout profiles ready to import.`);
          }
          
          setPendingScoutNames(newScoutNames);
          // Note: Don't pass scoutingData - it's already been imported above!
          setPendingImportData({ 
            scoutingData: [], // Empty - data already processed
            scoutsToImport, 
            predictionsToImport 
          });
          setShowScoutAddDialog(true);
          return; // Wait for user decision
        }
        
        // If no new scouts, proceed with import without updating selectable list
        const scoutImportResult = await performScoutImport(scoutsToImport, predictionsToImport, false);
        scoutResults.scoutsAdded = scoutImportResult.scoutsAdded;
        scoutResults.scoutsUpdated = scoutImportResult.scoutsUpdated;
        scoutResults.predictionsAdded = scoutImportResult.predictionsAdded;
        scoutResults.predictionsSkipped = scoutImportResult.predictionsSkipped;
      }
      
      // Show comprehensive summary to user (updated to show replaced instead of existing)
      const scoutingMessage = scoutingResults.added > 0 || scoutingResults.replaced > 0 
        ? `Scouting: ${scoutingResults.added} new entries, ${scoutingResults.replaced} entries replaced. `
        : '';
        
      const scoutMessage = scoutResults.scoutsAdded > 0 || scoutResults.scoutsUpdated > 0 || scoutResults.predictionsAdded > 0
        ? `Profiles: ${scoutResults.scoutsAdded} new scouts, ${scoutResults.scoutsUpdated} updated scouts, ${scoutResults.predictionsAdded} predictions imported.`
        : '';
      
      // If there are conflicts, show dialog AFTER scout profiles are imported
      if (scoutingResults.conflictsToReview > 0) {
        toast.success(
          `${scoutingMessage}${scoutMessage}${scoutingResults.conflictsToReview} conflicts need review.`
        );
        setShowConflictDialog(true);
      } else {
        // No conflicts - show normal completion message
        const fullMessage = `Combined import complete! ${scoutingMessage}${scoutMessage}`;
        toast.success(fullMessage);
      }
      
    } catch (error) {
      console.error('❌ Combined import error:', error);
      toast.error(`Combined import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const performScoutImport = async (scoutsToImport: Scout[], predictionsToImport: MatchPrediction[], addToSelectableList: boolean) => {
    const results = { scoutsAdded: 0, scoutsUpdated: 0, predictionsAdded: 0, predictionsSkipped: 0 };
    
    // Get existing data to merge intelligently
    const existingScouts = await gameDB.scouts.toArray();
    const existingPredictions = await gameDB.predictions.toArray();
    
    // Process scouts - merge or update based on name
    for (const scout of scoutsToImport) {
      const existing = existingScouts.find(s => s.name === scout.name);
      
      if (existing) {
        // Update existing scout with higher values or newer timestamp
        const shouldUpdate = 
          scout.lastUpdated > existing.lastUpdated ||
          scout.stakes > existing.stakes ||
          scout.totalPredictions > existing.totalPredictions;
          
        if (shouldUpdate) {
          await gameDB.scouts.update(scout.name, {
            stakes: Math.max(scout.stakes, existing.stakes),
            totalPredictions: Math.max(scout.totalPredictions, existing.totalPredictions),
            correctPredictions: Math.max(scout.correctPredictions, existing.correctPredictions),
            currentStreak: scout.lastUpdated > existing.lastUpdated ? scout.currentStreak : existing.currentStreak,
            longestStreak: Math.max(scout.longestStreak, existing.longestStreak),
            lastUpdated: Math.max(scout.lastUpdated, existing.lastUpdated)
          });
          results.scoutsUpdated++;
        }
      } else {
        // Add new scout
        await gameDB.scouts.add(scout);
        results.scoutsAdded++;
      }
    }
    
    // Process predictions - avoid duplicates based on unique constraint
    for (const prediction of predictionsToImport) {
      const exists = existingPredictions.some(p => p.id === prediction.id);
      
      if (!exists) {
        try {
          await gameDB.predictions.add(prediction);
          results.predictionsAdded++;
        } catch {
          // Probably a duplicate ID constraint, skip it
          console.warn(`Skipping duplicate prediction: ${prediction.id}`);
          results.predictionsSkipped++;
        }
      } else {
        results.predictionsSkipped++;
      }
    }
    
    // Only update localStorage scout list if user chose to add to selectable list
    if (addToSelectableList && scoutsToImport.length > 0) {
      const allScoutNames = scoutsToImport.map(s => s.name);
      const existingScoutsList = localStorage.getItem("scoutsList");
      let scoutsListArray: string[] = [];
      
      if (existingScoutsList) {
        try {
          scoutsListArray = JSON.parse(existingScoutsList);
        } catch {
          scoutsListArray = [];
        }
      }
      
      // Merge and deduplicate
      const mergedScouts = [...new Set([...scoutsListArray, ...allScoutNames])].sort();
      localStorage.setItem("scoutsList", JSON.stringify(mergedScouts));
    }
    
    return results;
  };

  const performCombinedImport = async (scoutingData: ScoutingDataWithId[], scoutsToImport: Scout[], predictionsToImport: MatchPrediction[], addToSelectableList: boolean) => {
    let scoutingResults = { added: 0, existing: 0, duplicates: 0 };
    
    // Process scouting data if present (typically empty when called from scout dialog since data is already imported)
    if (scoutingData && scoutingData.length > 0) {
      // Load existing scouting data
      const existingScoutingData = await loadScoutingData();
      
      // Merge scouting data with deduplication
      const mergeResult = mergeScoutingData(
        existingScoutingData.entries,
        scoutingData,
        'smart-merge'
      );
      
      // Save merged scouting data
      await saveScoutingData({ entries: mergeResult.merged });
      scoutingResults = {
        added: mergeResult.stats.new,
        existing: mergeResult.stats.existing,
        duplicates: mergeResult.stats.duplicates
      };
    }
    
    // Process scout profiles data
    const scoutResults = await performScoutImport(scoutsToImport, predictionsToImport, addToSelectableList);
    
    // Show results - scouting data message only if data was actually processed (non-empty)
    const scoutingMessage = scoutingData.length > 0 && (scoutingResults.added > 0 || scoutingResults.existing > 0)
      ? `Scouting: ${scoutingResults.added} new entries added, ${scoutingResults.existing} existing entries found${scoutingResults.duplicates > 0 ? `, ${scoutingResults.duplicates} duplicates skipped` : ''}. `
      : '';
      
    const scoutMessage = scoutResults.scoutsAdded > 0 || scoutResults.scoutsUpdated > 0 || scoutResults.predictionsAdded > 0
      ? `Profiles: ${scoutResults.scoutsAdded} new scouts, ${scoutResults.scoutsUpdated} updated scouts, ${scoutResults.predictionsAdded} predictions imported.`
      : '';
    
    const addedToSelectableMessage = addToSelectableList ? " Scouts added to selectable list." : "";
    const fullMessage = `Scout profiles imported! ${scoutingMessage}${scoutMessage}${addedToSelectableMessage}`;
    toast.success(fullMessage);
    
    // Notify other components that scout data has been updated
    window.dispatchEvent(new CustomEvent('scoutDataUpdated'));
  };

  const handleAddScoutsToSelectable = async () => {
    if (pendingImportData) {
      await performCombinedImport(
        pendingImportData.scoutingData, 
        pendingImportData.scoutsToImport, 
        pendingImportData.predictionsToImport, 
        true
      );
      setShowScoutAddDialog(false);
      setPendingImportData(null);
      setPendingScoutNames([]);
    }
  };

  const handleImportWithoutAdding = async () => {
    if (pendingImportData) {
      await performCombinedImport(
        pendingImportData.scoutingData, 
        pendingImportData.scoutsToImport, 
        pendingImportData.predictionsToImport, 
        false
      );
      setShowScoutAddDialog(false);
      setPendingImportData(null);
      setPendingScoutNames([]);
    }
  };

  const validateCombinedData = (data: unknown): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    const combinedData = data as CombinedDataStructure;
    
    // Check for combined export type
    if (combinedData.type !== 'combined_export') return false;
    
    // Must have at least the basic structure
    if (!combinedData.scoutingData || !combinedData.scoutProfiles || !combinedData.metadata) return false;
    
    // Validate that we have some meaningful data (check for both old and new compressed formats)
    let hasScoutingData = false;
    if ('entries' in combinedData.scoutingData) {
      hasScoutingData = Array.isArray(combinedData.scoutingData.entries) && combinedData.scoutingData.entries.length > 0;
    } else if ('data' in combinedData.scoutingData) {
      hasScoutingData = true; // Has data property, assume it's valid (compressed or uncompressed)
    }
    
    let hasScoutData = false;
    if ('scouts' in combinedData.scoutProfiles || 'predictions' in combinedData.scoutProfiles) {
      const scouts = 'scouts' in combinedData.scoutProfiles ? combinedData.scoutProfiles.scouts : null;
      const predictions = 'predictions' in combinedData.scoutProfiles ? combinedData.scoutProfiles.predictions : null;
      hasScoutData = (Array.isArray(scouts) && scouts.length > 0) || (Array.isArray(predictions) && predictions.length > 0);
    } else if ('data' in combinedData.scoutProfiles) {
      hasScoutData = true; // Has data property, assume it's valid (compressed or uncompressed)
    }
    
    return hasScoutingData || hasScoutData;
  };

  const getCombinedDataSummary = (data: unknown): string => {
    if (!data || typeof data !== 'object') return '0 items';
    
    const combinedData = data as CombinedDataStructure;
    
    if (!combinedData.metadata) return 'Invalid data';
    
    const scoutingCount = combinedData.metadata.scoutingEntriesCount || 0;
    const scoutsCount = combinedData.metadata.scoutsCount || 0;
    const predictionsCount = combinedData.metadata.predictionsCount || 0;
    
    const parts = [];
    if (scoutingCount > 0) parts.push(`${scoutingCount} scouting entries`);
    if (scoutsCount > 0) parts.push(`${scoutsCount} scouts`);
    if (predictionsCount > 0) parts.push(`${predictionsCount} predictions`);
    
    return parts.length > 0 ? parts.join(', ') : 'No data';
  };

  return (
    <>
      <UniversalFountainScanner
        onBack={onBack}
        onSwitchToGenerator={onSwitchToGenerator}
        dataType="combined"
        expectedPacketType="combined_fountain_packet"
        saveData={saveCombinedData}
        validateData={validateCombinedData}
        getDataSummary={getCombinedDataSummary}
        title="Scan Combined Data Fountain Codes"
        description="Point your camera at the QR codes to receive both scouting data and scout profiles"
        completionMessage="Combined data has been successfully reconstructed and imported"
      />
      
      <ScoutAddConfirmDialog
        open={showScoutAddDialog}
        onOpenChange={setShowScoutAddDialog}
        pendingScoutNames={pendingScoutNames}
        onAddToSelectable={handleAddScoutsToSelectable}
        onImportOnly={handleImportWithoutAdding}
      />
      
      <ConflictResolutionDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflict={currentConflicts[currentConflictIndex] || null}
        currentIndex={currentConflictIndex}
        totalConflicts={currentConflicts.length}
        onResolve={handleConflictResolution}
        onBatchResolve={handleBatchResolve}
        onUndo={handleUndo}
        canUndo={canUndo}
      />
    </>
  );
};

export default CombinedDataFountainScanner;
