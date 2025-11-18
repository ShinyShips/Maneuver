/**
 * Custom hook for handling automatic import of received data
 * Manages conflict detection, batch review, and database operations
 */

import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { detectConflicts, type ScoutingDataWithId, type ConflictInfo } from '@/lib/scoutingDataUtils';
import { debugLog } from '@/lib/peerTransferUtils';

interface ReceivedDataEntry {
  scoutName: string;
  data: unknown;
  timestamp: number;
  dataType?: string;
}

interface ConnectedScout {
  id: string;
  name: string;
  channel?: RTCDataChannel | null;
}

interface UsePeerTransferImportOptions {
  receivedData: ReceivedDataEntry[];
  importedDataCount: number;
  setImportedDataCount: (count: number) => void;
  connectedScouts: ConnectedScout[];
  setRequestingScouts: React.Dispatch<React.SetStateAction<Set<string>>>;
  setBatchReviewEntries: (entries: ScoutingDataWithId[]) => void;
  setPendingConflicts: (conflicts: ConflictInfo[]) => void;
  setShowBatchDialog: (show: boolean) => void;
  setCurrentConflicts: (conflicts: ConflictInfo[]) => void;
  setCurrentConflictIndex: (index: number) => void;
  setConflictResolutions: React.Dispatch<React.SetStateAction<Map<string, 'skip' | 'replace'>>>;
  setShowConflictDialog: (show: boolean) => void;
  setErrorMessage: (message: string) => void;
  setShowErrorDialog: (show: boolean) => void;
}

export function usePeerTransferImport(options: UsePeerTransferImportOptions) {
  const {
    receivedData,
    importedDataCount,
    setImportedDataCount,
    connectedScouts,
    setRequestingScouts,
    setBatchReviewEntries,
    setPendingConflicts,
    setShowBatchDialog,
    setCurrentConflicts,
    setCurrentConflictIndex,
    setConflictResolutions,
    setShowConflictDialog,
    setErrorMessage,
    setShowErrorDialog,
  } = options;

  const importScoutProfiles = useCallback(async (scoutData: { scouts?: unknown[]; predictions?: unknown[]; achievements?: unknown[] }) => {
    const { gameDB } = await import('@/lib/dexieDB');
    let importedCount = 0;
    
    if (scoutData.scouts && Array.isArray(scoutData.scouts)) {
      await gameDB.scouts.bulkPut(scoutData.scouts as never[]);
      importedCount += scoutData.scouts.length;
      console.log(`✅ Imported ${scoutData.scouts.length} scouts`);
    }
    if (scoutData.predictions && Array.isArray(scoutData.predictions)) {
      await gameDB.predictions.bulkPut(scoutData.predictions as never[]);
      importedCount += scoutData.predictions.length;
      console.log(`✅ Imported ${scoutData.predictions.length} predictions`);
    }
    if (scoutData.achievements && Array.isArray(scoutData.achievements)) {
      await gameDB.scoutAchievements.bulkPut(scoutData.achievements as never[]);
      importedCount += scoutData.achievements.length;
      console.log(`✅ Imported ${scoutData.achievements.length} achievements`);
    }
    
    return importedCount;
  }, []);

  const importMatchData = useCallback(async (matchData: { matches?: unknown[] }, scoutName: string) => {
    if (matchData.matches && Array.isArray(matchData.matches)) {
      localStorage.setItem('matchData', JSON.stringify(matchData.matches));
      toast.success(`Imported ${matchData.matches.length} matches from ${scoutName}`);
    }
  }, []);

  const importPitScoutingData = useCallback(async (pitData: { entries?: unknown[] }, scoutName: string) => {
    if (pitData.entries && Array.isArray(pitData.entries)) {
      const { pitDB } = await import('@/lib/dexieDB');
      await pitDB.pitScoutingData.bulkPut(pitData.entries as never[]);
      toast.success(`Imported ${pitData.entries.length} pit scouting entries from ${scoutName}`);
    }
  }, []);

  const importScoutingData = useCallback(async (
    newDataWithIds: ScoutingDataWithId[],
    scoutName: string
  ) => {
    console.log('📊 Incoming data count:', newDataWithIds.length);
    console.log('📊 Sample entry:', newDataWithIds[0]);
    
    // Check if data has the required fields for conflict detection
    const firstEntry = newDataWithIds[0];
    if (firstEntry?.data) {
      const data = firstEntry.data as Record<string, unknown>;
      console.log('📊 Key fields check:', {
        hasId: !!firstEntry.id,
        hasMatchNumber: 'matchNumber' in data,
        hasSelectTeam: 'selectTeam' in data || 'teamNumber' in data,
        hasAlliance: 'alliance' in data,
        hasEventName: 'eventName' in data,
      });
    }
    
    // Check local database before conflict detection
    const { db: dexieDb } = await import('@/lib/dexieDB');
    const localCount = await dexieDb.scoutingData.count();
    console.log('📊 Local database count BEFORE import:', localCount);
    
    // Detect conflicts
    debugLog('🔍 Starting conflict detection...');
    const conflictStartTime = performance.now();
    const conflictResult = await detectConflicts(newDataWithIds);
    const conflictEndTime = performance.now();
    debugLog(`⏱️ Conflict detection took ${(conflictEndTime - conflictStartTime).toFixed(2)}ms`);
    
    console.log('📊 Conflict detection results:', {
      autoImport: conflictResult.autoImport.length,
      autoReplace: conflictResult.autoReplace.length,
      batchReview: conflictResult.batchReview.length,
      conflicts: conflictResult.conflicts.length
    });
    
    const { saveScoutingEntry, db } = await import('@/lib/dexieDB');
    const results = { added: 0, replaced: 0, conflictsToReview: 0 };
    
    // Auto-import: Save new entries
    if (conflictResult.autoImport.length > 0) {
      for (const entry of conflictResult.autoImport) {
        await saveScoutingEntry(entry);
      }
      results.added = conflictResult.autoImport.length;
    }
    
    // Auto-replace: Delete old, save new
    if (conflictResult.autoReplace.length > 0) {
      for (const entry of conflictResult.autoReplace) {
        const incomingData = entry.data;
        const matchNumber = String(incomingData.matchNumber || '');
        const teamNumber = String(incomingData.selectTeam || incomingData.teamNumber || '');
        const alliance = String(incomingData.alliance || '').toLowerCase().replace('alliance', '').trim();
        const eventName = String(incomingData.eventName || '');
        
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
        await saveScoutingEntry(entry);
      }
      results.replaced = conflictResult.autoReplace.length;
    }
    
    // Batch review: Let user decide on duplicates
    if (conflictResult.batchReview.length > 0) {
      debugLog('📋 Showing batch review dialog for duplicates');
      setBatchReviewEntries(conflictResult.batchReview);
      setPendingConflicts(conflictResult.conflicts);
      setShowBatchDialog(true);
      
      toast.success(
        `Imported ${results.added} new entries, ` +
        `Replaced ${results.replaced} existing entries. ` +
        `${conflictResult.batchReview.length} duplicates need review.`
      );
      return { needsUserAction: true };
    }
    
    // Conflicts: Store for user resolution
    if (conflictResult.conflicts.length > 0) {
      debugLog('⚠️ Showing conflict resolution dialog');
      results.conflictsToReview = conflictResult.conflicts.length;
      setCurrentConflicts(conflictResult.conflicts);
      setCurrentConflictIndex(0);
      setConflictResolutions(new Map());
      
      toast.success(
        `Imported ${results.added} new entries, ` +
        `Replaced ${results.replaced} existing entries. ` +
        `${results.conflictsToReview} conflicts need review.`
      );
      
      setShowConflictDialog(true);
      return { needsUserAction: true };
    }
    
    // No conflicts - success
    console.log(`✅ SUCCESS: Imported ${scoutName}'s data (${newDataWithIds.length} entries) into database`);
    
    // Check if everything was skipped as duplicates
    const totalProcessed = results.added + results.replaced + results.conflictsToReview;
    const skippedCount = newDataWithIds.length - totalProcessed;
    
    if (skippedCount > 0 && totalProcessed === 0) {
      toast.info(`All ${skippedCount} entries from ${scoutName} already exist (skipped as duplicates)`);
    } else if (skippedCount > 0) {
      toast.success(`Import complete! ${results.added} new, ${results.replaced} replaced, ${skippedCount} duplicates skipped.`);
    } else {
      toast.success(`Import complete! ${results.added} new entries, ${results.replaced} entries replaced.`);
    }
    
    return { needsUserAction: false };
  }, [setBatchReviewEntries, setPendingConflicts, setShowBatchDialog, setCurrentConflicts, setCurrentConflictIndex, setConflictResolutions, setShowConflictDialog]);

  // Auto-import effect
  useEffect(() => {
    debugLog('📦 Auto-import check:', { 
      receivedDataLength: receivedData.length, 
      importedDataCount,
      shouldImport: receivedData.length > importedDataCount
    });
    
    // Only import new data that hasn't been imported yet
    if (receivedData.length > importedDataCount) {
      debugLog('✅ Condition met, starting import...');
      const latest = receivedData[receivedData.length - 1];
      
      // Check if this is a special message type (not actual data to import)
      const messageData = latest.data as { type?: string; dataType?: string; entries?: ScoutingDataWithId[] };
      
      if (messageData.type === 'declined') {
        toast.error(`${latest.scoutName} declined the data request`);
        setImportedDataCount(receivedData.length);
        return;
      }
      
      if (messageData.type === 'push-declined') {
        const dataTypeLabel = messageData.dataType || 'data';
        toast.warning(`${latest.scoutName} declined pushed ${dataTypeLabel}`);
        setImportedDataCount(receivedData.length);
        return;
      }
      
      if (messageData.type === 'pushed') {
        // This is a push confirmation for history tracking only, not actual received data
        // Just update the counter and skip import
        debugLog(`✅ Push confirmation logged for ${latest.scoutName}`);
        setImportedDataCount(receivedData.length);
        return;
      }
      
      // Now we know it's actual data, check what type it is
      const receivedDataObj = latest.data;
      const receivedDataType = (latest as { dataType?: string }).dataType;
      
      console.log(`✅ Received data from ${latest.scoutName}, type: ${receivedDataType}:`, receivedDataObj);
      console.log('Received data size:', JSON.stringify(receivedDataObj).length, 'characters');
      
      // Clear requesting state for this scout
      const scoutId = connectedScouts.find(s => s.name === latest.scoutName)?.id;
      if (scoutId) {
        setRequestingScouts(prev => {
          const next = new Set(prev);
          next.delete(scoutId);
          return next;
        });
      }
      
      // Import data into database based on type
      const importData = async () => {
        debugLog(`📥 Attempting to import ${receivedDataType} data from ${latest.scoutName}...`);
        try {
          // Handle different data types
          if (receivedDataType === 'scout') {
            const scoutData = receivedDataObj as { scouts?: unknown[]; predictions?: unknown[]; achievements?: unknown[] };
            const importedCount = await importScoutProfiles(scoutData);
            
            if (importedCount > 0) {
              toast.success(`Imported ${importedCount} scout profile items from ${latest.scoutName}`);
            } else {
              toast.warning(`No scout profile data to import from ${latest.scoutName}`);
            }
            setImportedDataCount(receivedData.length);
            return;
          }
          
          if (receivedDataType === 'match') {
            await importMatchData(receivedDataObj as { matches?: unknown[] }, latest.scoutName);
            setImportedDataCount(receivedData.length);
            return;
          }
          
          if (receivedDataType === 'pit-scouting') {
            await importPitScoutingData(receivedDataObj as { entries?: unknown[] }, latest.scoutName);
            setImportedDataCount(receivedData.length);
            return;
          }
          
          // Handle scouting data and combined
          const scoutingDataObj = receivedDataObj as { 
            entries?: ScoutingDataWithId[]; 
            scoutProfiles?: { scouts?: unknown[]; predictions?: unknown[] }
          };
          const newDataWithIds = scoutingDataObj.entries;
          
          if (!newDataWithIds || !Array.isArray(newDataWithIds)) {
            console.error('No valid entries found in received data');
            toast.error(`Invalid data structure from ${latest.scoutName}`);
            setImportedDataCount(receivedData.length);
            return;
          }
          
          // If this is combined data, also import scout profiles
          if (receivedDataType === 'combined' && scoutingDataObj.scoutProfiles) {
            const profileCount = await importScoutProfiles(scoutingDataObj.scoutProfiles);
            console.log(`✅ Combined data: imported ${profileCount} profile items`);
          }
          
          // Import scouting entries
          const result = await importScoutingData(newDataWithIds, latest.scoutName);
          if (!result.needsUserAction) {
            setImportedDataCount(receivedData.length);
          } else {
            setImportedDataCount(receivedData.length);
          }
        } catch (err) {
          console.error(`❌ FAILED to import data from ${latest.scoutName}:`, err);
          setErrorMessage(`Failed to import data from ${latest.scoutName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setShowErrorDialog(true);
        }
      };
      
      importData();
    }
  }, [
    receivedData,
    importedDataCount,
    connectedScouts,
    setImportedDataCount,
    setRequestingScouts,
    importScoutProfiles,
    importMatchData,
    importPitScoutingData,
    importScoutingData,
    setErrorMessage,
    setShowErrorDialog,
  ]);
}
