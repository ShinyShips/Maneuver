/**
 * useMatchValidation Hook
 * 
 * Phase 5: React Hook for Match Validation Orchestration
 * 
 * Orchestrates the validation workflow:
 * - Fetches scouted data from IndexedDB
 * - Gets TBA match data from cache
 * - Runs comparison algorithms
 * - Stores validation results
 * - Provides status and progress to UI
 */

import { useState, useCallback, useEffect } from 'react';
import { db } from '@/lib/dexieDB';
import type { ScoutingEntry } from '@/lib/scoutingTypes';
import type { ScoutingEntryDB } from '@/lib/dexieDB';
import type {
  MatchValidationResult,
  ValidationSummary,
  ValidationConfig,
  ValidationStatus
} from '@/lib/matchValidationTypes';
import { DEFAULT_VALIDATION_CONFIG } from '@/lib/matchValidationTypes';
import { validateMatch } from '@/lib/matchValidationUtils';
import {
  getCachedTBAEventMatches,
  storeValidationResult,
  getEventValidationResults,
  clearEventValidationResults
} from '@/lib/tbaCache';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface ValidationProgress {
  current: number;
  total: number;
  currentMatch: string;
  phase: 'fetching-scouted' | 'fetching-tba' | 'validating' | 'storing';
}

interface UseMatchValidationOptions {
  eventKey: string;
  config?: ValidationConfig;
  autoLoad?: boolean;  // Auto-load cached results on mount
}

interface UseMatchValidationReturn {
  // State
  isValidating: boolean;
  error: string | null;
  progress: ValidationProgress | null;
  
  // Results
  validationResults: MatchValidationResult[];
  summary: ValidationSummary | null;
  
  // Actions
  validateMatch: (matchNumber: string) => Promise<MatchValidationResult | null>;
  validateEvent: () => Promise<void>;
  clearResults: () => Promise<void>;
  refreshResults: () => Promise<void>;
  
  // Queries
  getMatchResult: (matchNumber: string) => MatchValidationResult | null;
  getFlaggedMatches: () => MatchValidationResult[];
  getFailedMatches: () => MatchValidationResult[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse scouting entry from database record
 */
function parseScoutingEntry(dataObject: Record<string, unknown>): ScoutingEntry {
  return {
    matchNumber: String(dataObject.matchNumber || ''),
    alliance: String(dataObject.alliance || ''),
    scoutName: String(dataObject.scoutName || ''),
    selectTeam: String(dataObject.selectTeam || ''),
    eventName: String(dataObject.eventName || ''),
    startPoses0: Boolean(dataObject.startPoses0),
    startPoses1: Boolean(dataObject.startPoses1),
    startPoses2: Boolean(dataObject.startPoses2),
    startPoses3: Boolean(dataObject.startPoses3),
    startPoses4: Boolean(dataObject.startPoses4),
    startPoses5: Boolean(dataObject.startPoses5),
    autoCoralPlaceL1Count: Number(dataObject.autoCoralPlaceL1Count || 0),
    autoCoralPlaceL2Count: Number(dataObject.autoCoralPlaceL2Count || 0),
    autoCoralPlaceL3Count: Number(dataObject.autoCoralPlaceL3Count || 0),
    autoCoralPlaceL4Count: Number(dataObject.autoCoralPlaceL4Count || 0),
    autoCoralPlaceDropMissCount: Number(dataObject.autoCoralPlaceDropMissCount || 0),
    autoCoralPickPreloadCount: Number(dataObject.autoCoralPickPreloadCount || 0),
    autoCoralPickStationCount: Number(dataObject.autoCoralPickStationCount || 0),
    autoCoralPickMark1Count: Number(dataObject.autoCoralPickMark1Count || 0),
    autoCoralPickMark2Count: Number(dataObject.autoCoralPickMark2Count || 0),
    autoCoralPickMark3Count: Number(dataObject.autoCoralPickMark3Count || 0),
    autoAlgaePlaceNetShot: Number(dataObject.autoAlgaePlaceNetShot || 0),
    autoAlgaePlaceProcessor: Number(dataObject.autoAlgaePlaceProcessor || 0),
    autoAlgaePlaceDropMiss: Number(dataObject.autoAlgaePlaceDropMiss || 0),
    autoAlgaePlaceRemove: Number(dataObject.autoAlgaePlaceRemove || 0),
    autoAlgaePickReefCount: Number(dataObject.autoAlgaePickReefCount || 0),
    autoAlgaePickMark1Count: Number(dataObject.autoAlgaePickMark1Count || 0),
    autoAlgaePickMark2Count: Number(dataObject.autoAlgaePickMark2Count || 0),
    autoAlgaePickMark3Count: Number(dataObject.autoAlgaePickMark3Count || 0),
    autoPassedStartLine: Boolean(dataObject.autoPassedStartLine),
    teleopCoralPlaceL1Count: Number(dataObject.teleopCoralPlaceL1Count || 0),
    teleopCoralPlaceL2Count: Number(dataObject.teleopCoralPlaceL2Count || 0),
    teleopCoralPlaceL3Count: Number(dataObject.teleopCoralPlaceL3Count || 0),
    teleopCoralPlaceL4Count: Number(dataObject.teleopCoralPlaceL4Count || 0),
    teleopCoralPlaceDropMissCount: Number(dataObject.teleopCoralPlaceDropMissCount || 0),
    teleopCoralPickStationCount: Number(dataObject.teleopCoralPickStationCount || 0),
    teleopCoralPickCarpetCount: Number(dataObject.teleopCoralPickCarpetCount || 0),
    teleopAlgaePlaceNetShot: Number(dataObject.teleopAlgaePlaceNetShot || 0),
    teleopAlgaePlaceProcessor: Number(dataObject.teleopAlgaePlaceProcessor || 0),
    teleopAlgaePlaceDropMiss: Number(dataObject.teleopAlgaePlaceDropMiss || 0),
    teleopAlgaePlaceRemove: Number(dataObject.teleopAlgaePlaceRemove || 0),
    teleopAlgaePickReefCount: Number(dataObject.teleopAlgaePickReefCount || 0),
    teleopAlgaePickCarpetCount: Number(dataObject.teleopAlgaePickCarpetCount || 0),
    shallowClimbAttempted: Boolean(dataObject.shallowClimbAttempted),
    deepClimbAttempted: Boolean(dataObject.deepClimbAttempted),
    parkAttempted: Boolean(dataObject.parkAttempted),
    climbFailed: Boolean(dataObject.climbFailed),
    playedDefense: Boolean(dataObject.playedDefense),
    brokeDown: Boolean(dataObject.brokeDown),
    comment: String(dataObject.comment || '')
  };
}

/**
 * Fetch scouted entries for a match from IndexedDB
 * Returns both parsed entries and raw DB entries with correction metadata
 */
async function fetchScoutedMatchData(
  eventKey: string,
  matchNumber: string
): Promise<{ 
  red: ScoutingEntry[]; 
  blue: ScoutingEntry[];
  redRaw: ScoutingEntryDB[];
  blueRaw: ScoutingEntryDB[];
}> {
  const entries = await db.scoutingData
    .where('eventName')
    .equals(eventKey)
    .and(entry => entry.matchNumber === matchNumber)
    .toArray();

  const redEntries: ScoutingEntry[] = [];
  const blueEntries: ScoutingEntry[] = [];
  const redRaw: ScoutingEntryDB[] = [];
  const blueRaw: ScoutingEntryDB[] = [];

  entries.forEach(entry => {
    const parsed = parseScoutingEntry(entry.data);
    
    if (parsed.alliance === 'redAlliance' || parsed.alliance === 'red') {
      redEntries.push(parsed);
      redRaw.push(entry);
    } else if (parsed.alliance === 'blueAlliance' || parsed.alliance === 'blue') {
      blueEntries.push(parsed);
      blueRaw.push(entry);
    }
  });

  return { red: redEntries, blue: blueEntries, redRaw, blueRaw };
}

/**
 * Calculate validation summary from results
 */
function calculateSummary(
  results: MatchValidationResult[],
  eventKey: string
): ValidationSummary {
  const totalMatches = results.length;
  const statusCounts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<ValidationStatus, number>);

  const discrepancyCounts = results.reduce(
    (acc, r) => ({
      total: acc.total + r.totalDiscrepancies,
      critical: acc.critical + r.criticalDiscrepancies,
      warning: acc.warning + r.warningDiscrepancies,
      minor: acc.minor + (r.totalDiscrepancies - r.criticalDiscrepancies - r.warningDiscrepancies)
    }),
    { total: 0, critical: 0, warning: 0, minor: 0 }
  );

  // Calculate average confidence
  const confidenceMap = { high: 3, medium: 2, low: 1 };
  const avgConfidenceScore = results.length > 0
    ? results.reduce((sum, r) => sum + confidenceMap[r.confidence], 0) / results.length
    : 0;
  
  let averageConfidence: 'high' | 'medium' | 'low';
  if (avgConfidenceScore >= 2.5) averageConfidence = 'high';
  else if (avgConfidenceScore >= 1.5) averageConfidence = 'medium';
  else averageConfidence = 'low';

  return {
    eventKey,
    totalMatches,
    validatedMatches: totalMatches,
    pendingMatches: statusCounts['pending'] || 0,
    passedMatches: statusCounts['passed'] || 0,
    flaggedMatches: statusCounts['flagged'] || 0,
    failedMatches: statusCounts['failed'] || 0,
    noTBADataMatches: statusCounts['no-tba-data'] || 0,
    totalDiscrepancies: discrepancyCounts.total,
    criticalDiscrepancies: discrepancyCounts.critical,
    warningDiscrepancies: discrepancyCounts.warning,
    minorDiscrepancies: discrepancyCounts.minor,
    averageConfidence,
    matchesRequiringReScout: results.filter(r => r.requiresReScout).length,
    generatedAt: Date.now()
  };
}

// ============================================================================
// Main Hook
// ============================================================================

export function useMatchValidation({
  eventKey,
  config = DEFAULT_VALIDATION_CONFIG,
  autoLoad = true
}: UseMatchValidationOptions): UseMatchValidationReturn {
  // State
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ValidationProgress | null>(null);
  const [validationResults, setValidationResults] = useState<MatchValidationResult[]>([]);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);

  /**
   * Refresh results from IndexedDB cache
   */
  const refreshResults = useCallback(async () => {
    if (!eventKey) return;

    try {
      const cached = await getEventValidationResults(eventKey);
      const results = cached.map(c => c.result);
      setValidationResults(results);
    } catch (err) {
      console.error('Error loading cached validation results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load results');
    }
  }, [eventKey]);

  // Load cached results on mount
  useEffect(() => {
    if (autoLoad && eventKey) {
      refreshResults();
    }
  }, [eventKey, autoLoad, refreshResults]);

  // Update summary when results change
  useEffect(() => {
    if (validationResults.length > 0) {
      setSummary(calculateSummary(validationResults, eventKey));
    } else {
      setSummary(null);
    }
  }, [validationResults, eventKey]);

  /**
   * Validate a single match
   */
  const validateSingleMatch = useCallback(
    async (matchNumber: string): Promise<MatchValidationResult | null> => {
      if (!eventKey) {
        throw new Error('Event key is required');
      }

      setError(null);

      try {
        // Fetch scouted data
        const { red: redEntries, blue: blueEntries, redRaw, blueRaw } = await fetchScoutedMatchData(
          eventKey,
          matchNumber
        );

        // Check if we have any scouted data
        if (redEntries.length === 0 && blueEntries.length === 0) {
          toast.warning(`No scouted data found for match ${matchNumber}`);
          return null;
        }

        // Get TBA match data (try to find the match key)
        const tbaMatches = await getCachedTBAEventMatches(eventKey, true);
        const tbaMatch = tbaMatches.find(
          m => String(m.match_number) === matchNumber && m.comp_level === 'qm'
        );

        if (!tbaMatch) {
          toast.warning(`No TBA data found for match ${matchNumber}`);
          return null;
        }

        // Run validation
        const result = validateMatch(
          eventKey,
          matchNumber,
          redEntries,
          blueEntries,
          tbaMatch,
          config,
          redRaw,
          blueRaw
        );

        // Store result
        await storeValidationResult({
          id: result.id,
          eventKey,
          matchKey: result.matchKey,
          matchNumber,
          result,
          timestamp: Date.now()
        });

        // Update local state
        setValidationResults(prev => {
          const filtered = prev.filter(r => r.matchNumber !== matchNumber);
          return [...filtered, result].sort((a, b) => 
            parseInt(a.matchNumber) - parseInt(b.matchNumber)
          );
        });

        return result;
      } catch (err) {
        console.error('Error validating match:', err);
        const errorMsg = err instanceof Error ? err.message : 'Validation failed';
        setError(errorMsg);
        toast.error(`Failed to validate match ${matchNumber}: ${errorMsg}`);
        return null;
      }
    },
    [eventKey, config]
  );

  /**
   * Validate entire event (batch validation)
   */
  const validateEventMatches = useCallback(async () => {
    if (!eventKey) {
      toast.error('Event key is required');
      return;
    }

    setIsValidating(true);
    setError(null);
    setProgress({ current: 0, total: 0, currentMatch: '', phase: 'fetching-tba' });

    try {
      // Fetch all TBA matches for event
      const tbaMatches = await getCachedTBAEventMatches(eventKey, true);
      
      if (tbaMatches.length === 0) {
        toast.warning('No TBA matches found. Load match data first.');
        setIsValidating(false);
        setProgress(null);
        return;
      }

      setProgress({
        current: 0,
        total: tbaMatches.length,
        currentMatch: '',
        phase: 'fetching-scouted'
      });

      const results: MatchValidationResult[] = [];
      let successCount = 0;
      let skippedCount = 0;

      // Validate each match
      for (let i = 0; i < tbaMatches.length; i++) {
        const tbaMatch = tbaMatches[i];
        const matchNumber = String(tbaMatch.match_number);

        setProgress({
          current: i + 1,
          total: tbaMatches.length,
          currentMatch: matchNumber,
          phase: 'validating'
        });

        try {
          // Fetch scouted data
          const { red: redEntries, blue: blueEntries, redRaw, blueRaw } = await fetchScoutedMatchData(
            eventKey,
            matchNumber
          );

          // Skip if no scouted data
          if (redEntries.length === 0 && blueEntries.length === 0) {
            console.log(`Skipping match ${matchNumber}: No scouted data`);
            skippedCount++;
            continue;
          }

          // Run validation
          const result = validateMatch(
            eventKey,
            matchNumber,
            redEntries,
            blueEntries,
            tbaMatch,
            config,
            redRaw,
            blueRaw
          );

          results.push(result);
          successCount++;

          // Store result
          setProgress(prev => prev ? { ...prev, phase: 'storing' } : null);
          await storeValidationResult({
            id: result.id,
            eventKey,
            matchKey: result.matchKey,
            matchNumber,
            result,
            timestamp: Date.now()
          });
        } catch (err) {
          console.error(`Error validating match ${matchNumber}:`, err);
          skippedCount++;
        }
      }

      // Update state with all results
      setValidationResults(results.sort((a, b) => 
        parseInt(a.matchNumber) - parseInt(b.matchNumber)
      ));

      // Show summary toast
      toast.success(
        `Validation complete! ${successCount} matches validated, ${skippedCount} skipped.`
      );
    } catch (err) {
      console.error('Error validating event:', err);
      const errorMsg = err instanceof Error ? err.message : 'Validation failed';
      setError(errorMsg);
      toast.error(`Event validation failed: ${errorMsg}`);
    } finally {
      setIsValidating(false);
      setProgress(null);
    }
  }, [eventKey, config]);

  /**
   * Clear all validation results
   */
  const clearResults = useCallback(async () => {
    if (!eventKey) return;

    try {
      await clearEventValidationResults(eventKey);
      setValidationResults([]);
      setSummary(null);
      toast.success('Validation results cleared');
    } catch (err) {
      console.error('Error clearing results:', err);
      toast.error('Failed to clear results');
    }
  }, [eventKey]);

  /**
   * Get validation result for specific match
   */
  const getMatchResult = useCallback(
    (matchNumber: string): MatchValidationResult | null => {
      return validationResults.find(r => r.matchNumber === matchNumber) || null;
    },
    [validationResults]
  );

  /**
   * Sort matches by competition level and match number
   */
  const sortMatches = (matches: MatchValidationResult[]): MatchValidationResult[] => {
    return matches.sort((a, b) => {
      // Extract match key parts (format: "eventKey_compLevelMatchNum" e.g. "2025mrcmp_qm15")
      const aKey = a.matchKey.split('_')[1] || a.matchKey;
      const bKey = b.matchKey.split('_')[1] || b.matchKey;
      
      // Determine competition level order: qm < sf < f
      const getCompOrder = (key: string) => {
        if (key.startsWith('qm')) return 1;
        if (key.startsWith('sf')) return 2;
        if (key.startsWith('f')) return 3;
        return 4;
      };
      
      const aOrder = getCompOrder(aKey);
      const bOrder = getCompOrder(bKey);
      
      // Sort by competition level first
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Within same competition level, sort by set number, then match number
      const extractNumbers = (key: string): { set: number; match: number } => {
        if (key.startsWith('qm')) {
          const num = parseInt(key.substring(2)) || 0;
          return { set: num, match: 0 };
        }
        if (key.startsWith('sf')) {
          // Elims: sf2m1 -> set=2, match=1
          const match = key.match(/sf(\d+)m(\d+)/);
          return {
            set: match ? parseInt(match[1]) : 0,
            match: match ? parseInt(match[2]) : 0
          };
        }
        if (key.startsWith('f')) {
          // Finals: f1m2 -> just use match number since there's only 1 finals bracket
          const match = key.match(/f\d+m(\d+)/);
          return {
            set: 0,
            match: match ? parseInt(match[1]) : 0
          };
        }
        return { set: 0, match: 0 };
      };
      
      const aNumbers = extractNumbers(aKey);
      const bNumbers = extractNumbers(bKey);
      
      // Sort by set number first
      if (aNumbers.set !== bNumbers.set) {
        return aNumbers.set - bNumbers.set;
      }
      
      // Then by match number within the set
      return aNumbers.match - bNumbers.match;
    });
  };

  /**
   * Get all flagged matches
   */
  const getFlaggedMatches = useCallback((): MatchValidationResult[] => {
    const flagged = validationResults.filter(r => r.status === 'flagged');
    return sortMatches(flagged);
  }, [validationResults]);

  /**
   * Get all failed matches
   */
  const getFailedMatches = useCallback((): MatchValidationResult[] => {
    const failed = validationResults.filter(r => r.status === 'failed');
    return sortMatches(failed);
  }, [validationResults]);

  return {
    // State
    isValidating,
    error,
    progress,
    
    // Results
    validationResults,
    summary,
    
    // Actions
    validateMatch: validateSingleMatch,
    validateEvent: validateEventMatches,
    clearResults,
    refreshResults,
    
    // Queries
    getMatchResult,
    getFlaggedMatches,
    getFailedMatches
  };
}
