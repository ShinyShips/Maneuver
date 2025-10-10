export const generateEntryId = (entryData: Record<string, unknown> | unknown[]): string => {
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
    const convertedEntries: ScoutingDataWithId[] = existingEntries.map(entry => ({
      id: entry.id,
      data: entry.data,
      timestamp: entry.timestamp
    }));
    
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
