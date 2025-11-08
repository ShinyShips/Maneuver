/**
 * Normalize event name for consistent storage and comparison
 * Prevents issues where users enter same event with different capitalization
 * Example: "2025MRcmp" and "2025mrcmp" both normalize to "2025mrcmp"
 */
export const normalizeEventName = (eventName: string): string => {
  return String(eventName).toLowerCase().trim();
};

// Generate a deterministic ID based on match, team, alliance, and event
// Uses a composite key format for fast lookups and natural collision detection
export const generateDeterministicEntryId = (
  matchNumber: string,
  teamNumber: string,
  alliance: string,
  eventName: string
): string => {
  // Normalize all components for consistent matching
  const event = normalizeEventName(eventName);
  const match = String(matchNumber).toLowerCase().trim();
  const team = String(teamNumber).trim();
  
  // Normalize alliance: "redAlliance" -> "red", "blueAlliance" -> "blue"
  const normalizedAlliance = String(alliance)
    .toLowerCase()
    .replace('alliance', '')
    .trim();
  
  // Use :: as separator (unlikely to appear in actual data)
  // Format: event::match::team::alliance
  // Example: "2025mrcmp::q11::3142::red"
  return `${event}::${match}::${team}::${normalizedAlliance}`;
};

/**
 * Generate a hash fingerprint of the actual scouting data (excluding metadata)
 * Used to quickly detect if two entries have identical scouting data
 * Excludes: id, timestamp, isCorrected, correctionCount, lastCorrectedAt, lastCorrectedBy, correctionNotes, originalScoutName
 */
export const generateDataFingerprint = (data: Record<string, unknown>): string => {
  // Create a sorted array of [key, value] pairs for deterministic ordering
  const sortedEntries = Object.entries(data)
    .filter(([key]) => {
      // Exclude metadata fields
      const metadataFields = [
        'id', 'timestamp', 'isCorrected', 'correctionCount', 
        'lastCorrectedAt', 'lastCorrectedBy', 'correctionNotes', 'originalScoutName'
      ];
      return !metadataFields.includes(key);
    })
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  
  // Create deterministic string
  const dataString = sortedEntries
    .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
    .join('|');
  
  // Simple hash function (FNV-1a)
  let hash = 2166136261;
  for (let i = 0; i < dataString.length; i++) {
    hash ^= dataString.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  
  return (hash >>> 0).toString(36); // Convert to base36 for shorter string
};

export const generateEntryId = (entryData: Record<string, unknown> | unknown[]): string => {
  // If entryData is an object with identifying fields, use deterministic ID
  if (typeof entryData === 'object' && !Array.isArray(entryData)) {
    const data = entryData as Record<string, unknown>;
    if (data.matchNumber && data.selectTeam && data.alliance && data.eventName) {
      return generateDeterministicEntryId(
        String(data.matchNumber),
        String(data.selectTeam),
        String(data.alliance),
        String(data.eventName)
      );
    }
  }
  
  // Fallback to old hash-based method for legacy data
  const dataString = JSON.stringify(entryData);
  
  let hash1 = 0;
  let hash2 = 0;
  
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1) + char;
    hash1 = hash1 & hash1;
    hash2 = ((hash2 << 3) + hash2) + char;
    hash2 = hash2 & hash2;
  }
  
  const part1 = Math.abs(hash1).toString(16).padStart(8, '0').substring(0, 8);
  const part2 = Math.abs(hash2).toString(16).padStart(8, '0').substring(0, 8);
  
  return part1 + part2;
};

export interface ScoutingDataWithId {
  id: string;
  data: Record<string, unknown>;
  timestamp?: number;
}

export const addIdsToScoutingData = (legacyData: (unknown[] | Record<string, unknown>)[]): ScoutingDataWithId[] => {
  return legacyData.map(entryData => {
    let cleanData: Record<string, unknown>;
    
    if (Array.isArray(entryData)) {
      console.warn('Legacy array format detected, this should not happen with object-based data');
      
      let cleanArray = entryData;
      const firstElement = entryData[0];
      
      if (typeof firstElement === 'string' && firstElement.length === 16 && /^[0-9a-f]+$/i.test(firstElement)) {
        cleanArray = entryData.slice(1);
      }
      
      cleanData = { legacyArrayData: cleanArray };
    } else {
      cleanData = { ...entryData };
    }
    
    const generatedId = generateEntryId(cleanData);
    return {
      id: generatedId,
      data: cleanData,
      timestamp: Date.now()
    };
  });
};

export const extractLegacyData = (dataWithIds: ScoutingDataWithId[]): Record<string, unknown>[] => {
  return dataWithIds.map(entry => entry.data);
};

export const hasIdStructure = (data: unknown): data is { entries: ScoutingDataWithId[] } => {
  if (typeof data !== 'object' || data === null || !('entries' in data)) {
    return false;
  }
  
  const candidate = data as Record<string, unknown>;
  if (!Array.isArray(candidate.entries) || candidate.entries.length === 0) {
    return false;
  }
  
  const firstEntry = candidate.entries[0];
  return (
    typeof firstEntry === 'object' &&
    firstEntry !== null &&
    'id' in firstEntry &&
    'data' in firstEntry
  );
};

export const migrateToIdStructure = (legacyData: unknown): { entries: ScoutingDataWithId[] } => {
  let dataEntries: (unknown[] | Record<string, unknown>)[] = [];
  
  if (Array.isArray(legacyData)) {
    if (legacyData.length > 0) {
      if (typeof legacyData[0] === 'object' && legacyData[0] !== null && !Array.isArray(legacyData[0])) {
        dataEntries = legacyData as Record<string, unknown>[];
      } else if (Array.isArray(legacyData[0])) {
        dataEntries = legacyData as unknown[][];
      }
    }
    } else if (typeof legacyData === 'object' && legacyData !== null && 'data' in legacyData) {
    const wrapped = legacyData as { data: unknown[] };
    if (Array.isArray(wrapped.data) && wrapped.data.length > 0) {
      if (typeof wrapped.data[0] === 'object' && wrapped.data[0] !== null && !Array.isArray(wrapped.data[0])) {
        dataEntries = wrapped.data as Record<string, unknown>[];
      } else if (Array.isArray(wrapped.data[0])) {
        dataEntries = wrapped.data as unknown[][];
      }
    }
  }  return {
    entries: addIdsToScoutingData(dataEntries)
  };
};

export const mergeScoutingData = (
  existingData: ScoutingDataWithId[],
  newData: ScoutingDataWithId[],
  mode: 'append' | 'overwrite' | 'smart-merge' = 'smart-merge'
): {
  merged: ScoutingDataWithId[];
  stats: {
    existing: number;
    new: number;
    duplicates: number;
    final: number;
  };
} => {
  if (mode === 'overwrite') {
    return {
      merged: newData,
      stats: {
        existing: existingData.length,
        new: newData.length,
        duplicates: 0,
        final: newData.length
      }
    };
  }
  
  if (mode === 'append') {
    return {
      merged: [...existingData, ...newData],
      stats: {
        existing: existingData.length,
        new: newData.length,
        duplicates: 0,
        final: existingData.length + newData.length
      }
    };
  }
  
  const existingIds = new Set(existingData.map(entry => entry.id));
  const uniqueNewData = newData.filter(entry => !existingIds.has(entry.id));
  const duplicateCount = newData.length - uniqueNewData.length;
  
  const merged = [...existingData, ...uniqueNewData];
  
  return {
    merged,
    stats: {
      existing: existingData.length,
      new: uniqueNewData.length,
      duplicates: duplicateCount,
      final: merged.length
    }
  };
};

// Load scouting data with Dexie support and localStorage fallback
export const loadScoutingData = async (): Promise<{ entries: ScoutingDataWithId[] }> => {
  try {
    // Simply load from Dexie - no complex migration needed
    const { loadAllScoutingEntries } = await import('./dexieDB');
    
    const existingEntries = await loadAllScoutingEntries();
    
    // Convert ScoutingEntryDB back to ScoutingDataWithId format
    // Important: Merge the top-level indexed fields back into the data object
    // so that when exported, the alliance field is present
    const convertedEntries: ScoutingDataWithId[] = existingEntries.map(entry => {
      const dataObj = entry.data as Record<string, unknown>;
      
      // Merge top-level fields back into data if they're missing
      const mergedData = {
        ...dataObj,
        // Only add these if they're not already in the data object
        alliance: dataObj.alliance || entry.alliance,
        matchNumber: dataObj.matchNumber || entry.matchNumber,
        selectTeam: dataObj.selectTeam || dataObj.teamNumber || entry.teamNumber,
        scoutName: dataObj.scoutName || entry.scoutName,
        eventName: dataObj.eventName || entry.eventName
      };
      
      return {
        id: entry.id,
        data: mergedData,
        timestamp: entry.timestamp
      };
    });
    
    return { entries: convertedEntries };
  } catch (error) {
    console.error('Error loading scouting data:', error);
    return { entries: [] };
  }
};

// Load legacy format data for backward compatibility with existing components
export const loadLegacyScoutingData = async (): Promise<Record<string, unknown>[]> => {
  const data = await loadScoutingData();
  return extractLegacyData(data.entries);
};

// Save scouting data using Dexie with localStorage fallback
export const saveScoutingData = async (data: { entries: ScoutingDataWithId[] }): Promise<void> => {
  try {
    // Try to save to Dexie first
    const { saveScoutingEntries } = await import('./dexieDB');
    await saveScoutingEntries(data.entries);
  } catch (error) {
    console.error('Error saving to Dexie, falling back to localStorage:', error);
    
    // Fallback to localStorage (legacy format)
    const legacyData = extractLegacyData(data.entries);
    const legacyFormat = { data: legacyData };
    localStorage.setItem("scoutingData", JSON.stringify(legacyFormat));
  }
};

// Save scouting data in new object format (for internal use if needed)
export const saveScoutingDataNewFormat = (data: { entries: ScoutingDataWithId[] }): void => {
  localStorage.setItem("scoutingData", JSON.stringify(data));
};

// Get display summary for UI (now async)
export const getDataSummary = async (data?: { entries: ScoutingDataWithId[] }): Promise<{
  totalEntries: number;
  teams: string[];
  matches: string[];
  scouts: string[];
}> => {
  let dataToUse = data;
  
  if (!dataToUse) {
    dataToUse = await loadScoutingData();
  }
  
  const teams = new Set<string>();
  const matches = new Set<string>();
  const scouts = new Set<string>();
  
  dataToUse.entries.forEach(entry => {
    // Skip the ID at index 0, so actual data starts at index 1
    const matchNumber = entry.data[1]?.toString(); // was index 0, now index 1
    const scoutName = entry.data[3]?.toString(); // was index 2, now index 3
    const teamNumber = entry.data[4]?.toString();   // was index 3, now index 4
    
    if (matchNumber) matches.add(matchNumber);
    if (scoutName) scouts.add(scoutName);
    if (teamNumber) teams.add(teamNumber);
  });
  
  return {
    totalEntries: dataToUse.entries.length,
    teams: Array.from(teams).sort((a, b) => Number(a) - Number(b)),
    matches: Array.from(matches).sort((a, b) => Number(a) - Number(b)),
    scouts: Array.from(scouts).sort()
  };
};

// ==============================================================================
// CONFLICT DETECTION FOR DATA IMPORTS
// ==============================================================================

export interface ConflictInfo {
  incoming: ScoutingDataWithId;
  local: {
    id: string;
    teamNumber?: string;
    matchNumber?: string;
    alliance?: string;
    scoutName?: string;
    eventName?: string;
    timestamp: number;
    isCorrected?: boolean;
    correctionCount?: number;
    lastCorrectedAt?: number;
    lastCorrectedBy?: string;
    correctionNotes?: string;
    originalScoutName?: string;
  };
  conflictType: 'corrected-vs-uncorrected' | 'corrected-vs-corrected';
  isNewerIncoming: boolean; // True if incoming has more recent correction timestamp
  changedFields?: Array<{ field: string; localValue: unknown; incomingValue: unknown }>; // Fields that differ
}

export interface ConflictDetectionResult {
  autoImport: ScoutingDataWithId[];       // No local entry exists
  autoReplace: ScoutingDataWithId[];      // Safe to replace without asking
  batchReview: ScoutingDataWithId[];      // Both uncorrected - user should review in batch
  conflicts: ConflictInfo[];              // Require individual user decision
}

/**
 * Compare two data objects and return list of fields that differ
 * Excludes metadata fields (id, timestamp, correction fields)
 */
export const computeChangedFields = (
  localData: Record<string, unknown>, 
  incomingData: Record<string, unknown>
): Array<{ field: string; localValue: unknown; incomingValue: unknown }> => {
  const changes: Array<{ field: string; localValue: unknown; incomingValue: unknown }> = [];
  
  // Metadata fields to exclude from diff
  const metadataFields = [
    'id', 'timestamp', 'isCorrected', 'correctionCount',
    'lastCorrectedAt', 'lastCorrectedBy', 'correctionNotes', 'originalScoutName'
  ];
  
  // Get all unique field names from both objects
  const allFields = new Set([
    ...Object.keys(localData),
    ...Object.keys(incomingData)
  ]);
  
  for (const field of allFields) {
    // Skip metadata fields
    if (metadataFields.includes(field)) continue;
    
    const localValue = localData[field];
    const incomingValue = incomingData[field];
    
    // Skip if incoming is null/undefined (treat as "no change" - don't overwrite with null)
    if (incomingValue === null || incomingValue === undefined) continue;
    
    // Skip if local is null/undefined and incoming exists (new data, not a change)
    if (localValue === null || localValue === undefined) continue;
    
    // Compare values (use JSON.stringify for deep comparison)
    if (JSON.stringify(localValue) !== JSON.stringify(incomingValue)) {
      changes.push({ field, localValue, incomingValue });
    }
  }
  
  return changes;
};

/**
 * Detects conflicts between incoming data and existing local data
 * Returns categorized results based on decision matrix from CONFLICT_RESOLUTION_SPEC.md
 * 
 * Uses direct ID lookups for O(1) performance instead of O(n) linear search.
 * 
 * Decision Matrix:
 * 0. Identical data AND correction status → skip (no action needed)
 * 1. No local entry → autoImport
 * 2. Local uncorrected + Incoming uncorrected → batchReview (user decides)
 * 3. Local uncorrected + Incoming corrected → autoReplace (corrected is better)
 * 4. Local corrected + Incoming uncorrected → conflicts (show dialog)
 * 5. Local corrected + Incoming corrected (same timestamp) → autoReplace
 * 6. Local corrected + Incoming corrected (different timestamp) → conflicts (show dialog)
 */
export const detectConflicts = async (
  incomingData: ScoutingDataWithId[]
): Promise<ConflictDetectionResult> => {
  const { db } = await import('./dexieDB');
  
  const autoImport: ScoutingDataWithId[] = [];
  const autoReplace: ScoutingDataWithId[] = [];
  const batchReview: ScoutingDataWithId[] = [];
  const conflicts: ConflictInfo[] = [];
  
  // Build TWO maps for O(1) lookups:
  // 1. By composite ID (for new format entries)
  // 2. By field-based key (for legacy entries with hash IDs)
  const allLocalEntries = await db.scoutingData.toArray();
  const localEntriesById = new Map(
    allLocalEntries.map(entry => [entry.id, entry])
  );
  
  // Build secondary map using field-based keys for legacy data lookup
  // Key format: "event::match::team::alliance" (same as generateDeterministicEntryId)
  const localEntriesByFields = new Map(
    allLocalEntries.map(entry => {
      const key = generateDeterministicEntryId(
        entry.matchNumber || '',
        entry.teamNumber || '',
        entry.alliance || '',
        entry.eventName || ''
      );
      return [key, entry];
    })
  );
  
  for (const incomingEntry of incomingData) {
    const incomingData = incomingEntry.data;
    
    // Try direct ID lookup first (O(1)) - for entries with composite IDs
    let matchingLocal = localEntriesById.get(incomingEntry.id);
    
    // Fallback: Field-based lookup for legacy data (O(1) using Map)
    // This handles cases where old entries have hash-based IDs
    if (!matchingLocal) {
      const fieldBasedKey = generateDeterministicEntryId(
        String(incomingData.matchNumber || ''),
        String(incomingData.selectTeam || incomingData.teamNumber || ''),
        String(incomingData.alliance || ''),
        String(incomingData.eventName || '')
      );
      
      matchingLocal = localEntriesByFields.get(fieldBasedKey);
    }
    
    // Scenario 1: No local entry exists → autoImport
    if (!matchingLocal) {
      autoImport.push(incomingEntry);
      continue;
    }
    
    // Check correction status FIRST (before fingerprint)
    // This ensures correction metadata changes are always detected
    const localIsCorrected = matchingLocal.isCorrected || false;
    const incomingIsCorrected = Boolean(incomingData.isCorrected);
    
    // Check if data is identical using fingerprint hash (fast comparison)
    // Only check fingerprint if BOTH have same correction status
    // This prevents skipping when correction metadata changes
    const localData = matchingLocal.data;
    const localFingerprint = generateDataFingerprint(localData as Record<string, unknown>);
    const incomingFingerprint = generateDataFingerprint(incomingData);
    
    // For both corrected, also check if timestamps differ before skipping
    if (localIsCorrected && incomingIsCorrected) {
      const localCorrectionTime = Number(matchingLocal.lastCorrectedAt || matchingLocal.timestamp || 0);
      const incomingCorrectionTime = Number(incomingData.lastCorrectedAt || incomingEntry.timestamp || 0);
      
      // If fingerprints match AND timestamps are the same (within 1 second), skip
      if (localFingerprint === incomingFingerprint && Math.abs(localCorrectionTime - incomingCorrectionTime) <= 1000) {
        continue; // Scenario 0: Identical data and correction
      }
      // Otherwise, continue to Scenario 5/6 logic below
    } else if (localFingerprint === incomingFingerprint && localIsCorrected === incomingIsCorrected) {
      // For uncorrected entries, just check fingerprint and correction status
      continue; // Scenario 0: Identical data
    }
    
    // Scenario 2: Local uncorrected + Incoming uncorrected → batchReview (let user decide)
    if (!localIsCorrected && !incomingIsCorrected) {
      batchReview.push(incomingEntry);
      continue;
    }
    
    // Scenario 3: Local uncorrected + Incoming corrected → autoReplace (corrected is better)
    if (!localIsCorrected && incomingIsCorrected) {
      autoReplace.push(incomingEntry);
      continue;
    }
    
    // Scenario 4: Local corrected + Incoming uncorrected → conflicts
    if (localIsCorrected && !incomingIsCorrected) {
      const changedFields = computeChangedFields(localData as Record<string, unknown>, incomingData);
      
      // Extract scoutName and timestamp with robust fallbacks
      const localDataObj = matchingLocal.data as Record<string, unknown> | undefined;
      const extractedScoutName = matchingLocal.scoutName 
        || (localDataObj?.scoutName as string | undefined)
        || undefined;
      const extractedTimestamp = matchingLocal.timestamp 
        || (typeof localDataObj?.timestamp === 'number' ? localDataObj.timestamp : 0)
        || 0;
      
      conflicts.push({
        incoming: incomingEntry,
        local: {
          id: matchingLocal.id,
          teamNumber: matchingLocal.teamNumber,
          matchNumber: matchingLocal.matchNumber,
          alliance: matchingLocal.alliance,
          scoutName: extractedScoutName,
          eventName: matchingLocal.eventName,
          timestamp: extractedTimestamp,
          isCorrected: matchingLocal.isCorrected,
          correctionCount: matchingLocal.correctionCount,
          lastCorrectedAt: matchingLocal.lastCorrectedAt,
          lastCorrectedBy: matchingLocal.lastCorrectedBy,
          correctionNotes: matchingLocal.correctionNotes,
          originalScoutName: matchingLocal.originalScoutName
        },
        conflictType: 'corrected-vs-uncorrected',
        isNewerIncoming: false, // Local corrected is "better" than incoming uncorrected
        changedFields
      });
      continue;
    }
    
    // Scenarios 5 & 6: Both corrected → check timestamps
    if (localIsCorrected && incomingIsCorrected) {
      const localCorrectionTime = matchingLocal.lastCorrectedAt || matchingLocal.timestamp;
      const incomingCorrectionTime = Number(incomingData.lastCorrectedAt || incomingEntry.timestamp || 0);
      
      // If timestamps are the same (or very close, within 1 second), auto-replace
      if (Math.abs(localCorrectionTime - incomingCorrectionTime) <= 1000) {
        autoReplace.push(incomingEntry);
        continue;
      }
      
      // Different timestamps → conflicts (show dialog with newer indicated)
      const changedFields = computeChangedFields(localData as Record<string, unknown>, incomingData);
      
      // Extract scoutName and timestamp with robust fallbacks
      const localDataObj = matchingLocal.data as Record<string, unknown> | undefined;
      const extractedScoutName = matchingLocal.scoutName 
        || (localDataObj?.scoutName as string | undefined)
        || undefined;
      const extractedTimestamp = matchingLocal.timestamp 
        || (typeof localDataObj?.timestamp === 'number' ? localDataObj.timestamp : 0)
        || 0;
      
      conflicts.push({
        incoming: incomingEntry,
        local: {
          id: matchingLocal.id,
          teamNumber: matchingLocal.teamNumber,
          matchNumber: matchingLocal.matchNumber,
          alliance: matchingLocal.alliance,
          scoutName: extractedScoutName,
          eventName: matchingLocal.eventName,
          timestamp: extractedTimestamp,
          isCorrected: matchingLocal.isCorrected,
          correctionCount: matchingLocal.correctionCount,
          lastCorrectedAt: matchingLocal.lastCorrectedAt,
          lastCorrectedBy: matchingLocal.lastCorrectedBy,
          correctionNotes: matchingLocal.correctionNotes,
          originalScoutName: matchingLocal.originalScoutName
        },
        conflictType: 'corrected-vs-corrected',
        isNewerIncoming: incomingCorrectionTime > localCorrectionTime,
        changedFields
      });
    }
  }
  
  return {
    autoImport,
    autoReplace,
    batchReview,
    conflicts
  };
};
