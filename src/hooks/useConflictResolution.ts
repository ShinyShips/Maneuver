import { useState } from "react";
import { toast } from "sonner";
import type { ConflictInfo, ScoutingDataWithId } from "@/lib/scoutingDataUtils";
import { computeChangedFields } from "@/lib/scoutingDataUtils";

export const useConflictResolution = () => {
  // Conflict resolution state
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [currentConflicts, setCurrentConflicts] = useState<ConflictInfo[]>([]);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [conflictResolutions, setConflictResolutions] = useState<Map<string, 'replace' | 'skip'>>(new Map());
  const [resolutionHistory, setResolutionHistory] = useState<Array<{ index: number; action: 'replace' | 'skip' }>>([]);

  // Generate conflict key from conflict info
  const getConflictKey = (conflict: ConflictInfo): string => {
    return `${conflict.local.matchNumber}-${conflict.local.teamNumber}-${conflict.local.eventName}`;
  };

  // Handle individual conflict resolution
  const handleConflictResolution = async (action: 'replace' | 'skip') => {
    const currentConflict = currentConflicts[currentConflictIndex];
    if (!currentConflict) return;

    // Store the decision (using event, match, team as key)
    const conflictKey = getConflictKey(currentConflict);
    const updatedResolutions = new Map(conflictResolutions).set(conflictKey, action);
    setConflictResolutions(updatedResolutions);

    // Add to history
    setResolutionHistory(prev => [...prev, { index: currentConflictIndex, action }]);

    // Move to next conflict or finish
    if (currentConflictIndex < currentConflicts.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1);
    } else {
      // All conflicts resolved, apply decisions with the updated map
      await applyConflictResolutions(updatedResolutions);
    }
  };

  // Apply all conflict resolutions
  const applyConflictResolutions = async (resolutionsMap?: Map<string, 'replace' | 'skip'>) => {
    const { saveScoutingEntry, db } = await import('@/lib/dexieDB');
    
    const resolutions = resolutionsMap || conflictResolutions;
    let replaced = 0;
    let kept = 0;

    for (const conflict of currentConflicts) {
      const conflictKey = getConflictKey(conflict);
      const decision = resolutions.get(conflictKey);

      if (decision === 'replace') {
        // Delete old entry and save new one
        await db.scoutingData.delete(conflict.local.id);
        await saveScoutingEntry(conflict.incoming);
        replaced++;
      } else if (decision === 'skip') {
        // Keep existing entry, do nothing
        kept++;
      }
    }

    toast.success(
      `Conflict resolution complete! ${replaced} entries replaced, ${kept} entries kept.`
    );

    // Reset state
    setShowConflictDialog(false);
    setCurrentConflicts([]);
    setCurrentConflictIndex(0);
    setConflictResolutions(new Map());
    setResolutionHistory([]);
  };

  // Batch resolve all remaining conflicts
  const handleBatchResolve = async (action: 'replace' | 'skip') => {
    // Apply action to all remaining conflicts
    const newResolutions = new Map(conflictResolutions);
    for (let i = currentConflictIndex; i < currentConflicts.length; i++) {
      const conflict = currentConflicts[i];
      const key = getConflictKey(conflict);
      newResolutions.set(key, action);
    }
    setConflictResolutions(newResolutions);

    // Apply immediately
    const { saveScoutingEntry, db } = await import('@/lib/dexieDB');
    let replaced = 0;
    let skipped = 0;

    for (let i = currentConflictIndex; i < currentConflicts.length; i++) {
      const conflict = currentConflicts[i];
      const conflictKey = getConflictKey(conflict);
      const decision = newResolutions.get(conflictKey);

      if (decision === 'replace') {
        await db.scoutingData.delete(conflict.local.id);
        await saveScoutingEntry(conflict.incoming);
        replaced++;
      } else {
        skipped++;
      }
    }

    toast.success(
      `Batch operation complete! ${replaced} entries replaced, ${skipped} entries kept.`
    );

    // Reset state
    setShowConflictDialog(false);
    setCurrentConflicts([]);
    setCurrentConflictIndex(0);
    setConflictResolutions(new Map());
    setResolutionHistory([]);
  };

  // Undo last conflict resolution
  const handleUndo = () => {
    if (resolutionHistory.length === 0) return;

    const lastResolution = resolutionHistory[resolutionHistory.length - 1];

    // Remove last resolution from map
    const lastConflict = currentConflicts[lastResolution.index];
    const conflictKey = getConflictKey(lastConflict);
    const newResolutions = new Map(conflictResolutions);
    newResolutions.delete(conflictKey);
    setConflictResolutions(newResolutions);

    // Remove from history
    setResolutionHistory(prev => prev.slice(0, -1));

    // Go back to that conflict
    setCurrentConflictIndex(lastResolution.index);
  };

  // Handle batch review decision (for duplicate entries)
  const handleBatchReviewDecision = async (
    batchReviewEntries: ScoutingDataWithId[],
    pendingConflicts: ConflictInfo[],
    decision: 'replace-all' | 'skip-all' | 'review-each'
  ) => {
    const { saveScoutingEntry, db } = await import('@/lib/dexieDB');
    
    if (decision === 'replace-all') {
      let replaced = 0;
      for (const entry of batchReviewEntries) {
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
        replaced++;
      }
      toast.success(`Replaced ${replaced} entries with incoming data`);
      
      // Check if there are pending conflicts after batch
      if (pendingConflicts.length > 0) {
        setCurrentConflicts(pendingConflicts);
        setCurrentConflictIndex(0);
        setConflictResolutions(new Map());
        setShowConflictDialog(true);
        return { hasMoreConflicts: true };
      }
      
      return { hasMoreConflicts: false };
      
    } else if (decision === 'skip-all') {
      toast.success(`Kept ${batchReviewEntries.length} local entries unchanged`);
      
      // Check if there are pending conflicts after batch
      if (pendingConflicts.length > 0) {
        setCurrentConflicts(pendingConflicts);
        setCurrentConflictIndex(0);
        setConflictResolutions(new Map());
        setShowConflictDialog(true);
        return { hasMoreConflicts: true };
      }
      
      return { hasMoreConflicts: false };
      
    } else if (decision === 'review-each') {
      // Convert batch entries to conflicts for individual review
      const batchConflicts: ConflictInfo[] = await Promise.all(
        batchReviewEntries.map(async (entry) => {
          const incomingData = entry.data;
          const matchNumber = String(incomingData.matchNumber || '');
          const teamNumber = String(incomingData.selectTeam || incomingData.teamNumber || '');
          const eventName = String(incomingData.eventName || '');
          
          // Match on event, match, and team only (alliance is redundant)
          // If eventName is missing, fall back to matching on match + team only
          const local = await db.scoutingData
            .toArray()
            .then(entries => {
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
            });
          
          const changedFields = local?.data 
            ? computeChangedFields(local.data as Record<string, unknown>, incomingData as Record<string, unknown>)
            : [];
          
          return {
            incoming: entry,
            local: local ? {
              id: local.id,
              teamNumber: local.teamNumber,
              matchNumber: local.matchNumber,
              alliance: local.alliance,
              eventName: local.eventName,
              timestamp: local.timestamp,
              scoutName: local.scoutName,
              isCorrected: local.isCorrected,
              correctionCount: local.correctionCount,
              lastCorrectedAt: local.lastCorrectedAt,
              lastCorrectedBy: local.lastCorrectedBy,
              correctionNotes: local.correctionNotes,
              originalScoutName: local.originalScoutName
            } : {
              id: '',
              teamNumber,
              matchNumber,
              eventName,
              timestamp: 0
            },
            conflictType: 'corrected-vs-uncorrected' as const,
            isNewerIncoming: false,
            changedFields
          };
        })
      );
      
      // Add pending conflicts after batch conflicts
      const allConflicts = [...batchConflicts, ...pendingConflicts];
      setCurrentConflicts(allConflicts);
      setCurrentConflictIndex(0);
      setConflictResolutions(new Map());
      setShowConflictDialog(true);
      
      return { hasMoreConflicts: true };
    }
    
    return { hasMoreConflicts: false };
  };

  return {
    // State
    showConflictDialog,
    setShowConflictDialog,
    currentConflicts,
    setCurrentConflicts,
    currentConflictIndex,
    setCurrentConflictIndex,
    conflictResolutions,
    setConflictResolutions,
    resolutionHistory,
    setResolutionHistory,
    
    // Actions
    handleConflictResolution,
    handleBatchResolve,
    handleUndo,
    applyConflictResolutions,
    handleBatchReviewDecision,
    
    // Computed
    canUndo: resolutionHistory.length > 0,
    currentConflict: currentConflicts[currentConflictIndex],
    hasMoreConflicts: currentConflictIndex < currentConflicts.length - 1,
  };
};
