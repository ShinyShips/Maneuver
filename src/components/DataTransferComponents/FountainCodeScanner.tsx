/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  addIdsToScoutingData,
  detectConflicts,
  type ConflictInfo
} from "@/lib/scoutingDataUtils";
import type { ScoutingDataWithId } from "@/lib/scoutingDataUtils";
import { useConflictResolution } from "@/hooks/useConflictResolution";
import UniversalFountainScanner from "./UniversalFountainScanner";
import ConflictResolutionDialog from "./ConflictResolutionDialog";
import { BatchConflictDialog } from "./BatchConflictDialog";
import { toast } from "sonner";
import { useState } from "react";

interface FountainCodeScannerProps {
  onBack: () => void;
  onSwitchToGenerator: () => void;
}

const FountainCodeScanner = ({ onBack, onSwitchToGenerator }: FountainCodeScannerProps) => {
  // Batch review state
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchReviewEntries, setBatchReviewEntries] = useState<ScoutingDataWithId[]>([]);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictInfo[]>([]);
  
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
    canUndo,
    handleBatchReviewDecision: handleBatchReviewDecisionBase
  } = useConflictResolution();
  
  const saveScoutingDataFromFountain = async (data: unknown) => {
    // Parse incoming data format
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
    
    if (newDataWithIds.length === 0) {
      toast.error('No valid scouting data found');
      return;
    }
    
    // Use new conflict detection system
    const conflictResult = await detectConflicts(newDataWithIds);
    
    // Import non-conflicting entries immediately
    const { saveScoutingEntry, db } = await import('@/lib/dexieDB');
    
    const results = { added: 0, replaced: 0, conflictsToReview: 0 };
    
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
    
    // Batch Review: Store for user decision
    if (conflictResult.batchReview.length > 0) {
      try {
        setBatchReviewEntries(conflictResult.batchReview);
        setPendingConflicts(conflictResult.conflicts);
        setShowBatchDialog(true);
        
        // Show toast about what was auto-processed
        if (results.added > 0 || results.replaced > 0) {
          toast.success(
            `Imported ${results.added} new entries, ` +
            `Replaced ${results.replaced} existing entries. ` +
            `${conflictResult.batchReview.length} duplicates need review.`
          );
        }
        return; // Wait for user decision on batch
      } catch (error) {
        console.error('Error setting up batch review:', error);
        toast.error(`Failed to set up batch review: ${error}`);
        return;
      }
    }
    
    // Conflicts: Store for user resolution
    if (conflictResult.conflicts.length > 0) {
      results.conflictsToReview = conflictResult.conflicts.length;
      setCurrentConflicts(conflictResult.conflicts);
      setCurrentConflictIndex(0);
      setConflictResolutions(new Map());
      
      // Show toast about initial import and conflicts
      toast.success(
        `Imported ${results.added} new entries, ` +
        `Replaced ${results.replaced} existing entries. ` +
        `${results.conflictsToReview} conflicts need review.`
      );
      
      // Show conflict resolution dialog
      setShowConflictDialog(true);
    } else {
      // No conflicts - show completion message
      toast.success(
        `Import complete! ${results.added} new entries, ${results.replaced} entries replaced.`
      );
    }
  };

  // Wrapper for batch review that handles closing dialog and resetting state
  const handleBatchReviewDecision = async (decision: 'replace-all' | 'skip-all' | 'review-each') => {
    const result = await handleBatchReviewDecisionBase(batchReviewEntries, pendingConflicts, decision);
    
    // Close batch dialog if no more conflicts
    if (!result.hasMoreConflicts) {
      setShowBatchDialog(false);
      setBatchReviewEntries([]);
      setPendingConflicts([]);
    } else {
      // Move to conflict dialog
      setShowBatchDialog(false);
    }
  };

  const validateScoutingData = (data: unknown): boolean => {
    // Validate that it's scouting data in the expected format
    if (!data || typeof data !== 'object') return false;
    
    const dataObj = data as any;
    
    // Check for new format with preserved IDs
    if (dataObj.entries && Array.isArray(dataObj.entries)) {
      if (dataObj.entries.length === 0) return false;
      const firstEntry = dataObj.entries[0];
      return firstEntry && 
             typeof firstEntry === 'object' && 
             'id' in firstEntry && 
             'data' in firstEntry;
    }
    
    // Check for old format (fallback)
    if (dataObj.data && Array.isArray(dataObj.data)) {
      if (dataObj.data.length === 0) return false;
      const firstEntry = dataObj.data[0];
      if (!firstEntry || typeof firstEntry !== 'object') return false;
      
      // Check for expected scouting data fields (object format)
      const requiredFields = ['matchNumber', 'selectTeam', 'alliance'];
      const hasRequiredFields = requiredFields.some(field => field in firstEntry);
      return hasRequiredFields;
    }
    
    return false;
  };

  const getScoutingDataSummary = (data: unknown): string => {
    if (!data || typeof data !== 'object') return '0 entries';
    
    const dataObj = data as any;
    
    // Check for new format with preserved IDs
    if (dataObj.entries && Array.isArray(dataObj.entries)) {
      return `${dataObj.entries.length} entries (with IDs)`;
    }
    
    // Check for old format (fallback)
    if (dataObj.data && Array.isArray(dataObj.data)) {
      return `${dataObj.data.length} entries (legacy)`;
    }
    
    return '0 entries';
  };

  return (
    <>
      <UniversalFountainScanner
        onBack={onBack}
        onSwitchToGenerator={onSwitchToGenerator}
        dataType="scouting"
        expectedPacketType="scouting_fountain_packet"
        saveData={saveScoutingDataFromFountain}
        validateData={validateScoutingData}
        getDataSummary={getScoutingDataSummary}
        title="Scan Fountain Codes"
        description="Point your camera at the QR codes to receive scouting data"
        completionMessage="Scouting data has been successfully reconstructed and merged"
      />
      
      {/* Batch Review Dialog */}
      <BatchConflictDialog
        isOpen={showBatchDialog}
        entries={batchReviewEntries}
        onResolve={handleBatchReviewDecision}
      />
      
      {/* Conflict Resolution Dialog */}
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

export default FountainCodeScanner;
