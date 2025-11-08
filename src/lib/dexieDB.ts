import Dexie, { type Table } from 'dexie';
import type { ScoutingDataWithId } from './scoutingDataUtils';
import type { PitScoutingEntry } from './pitScoutingTypes';

// Scout gamification types
export interface Scout {
  name: string; // Primary key - matches the name from nav-user sidebar
  stakes: number; // Total stakes including bonuses from achievements
  stakesFromPredictions: number; // Stakes earned only from predictions/matches
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number; // Current consecutive correct predictions
  longestStreak: number; // Best streak ever achieved
  createdAt: number;
  lastUpdated: number;
}

export interface MatchPrediction {
  id: string;
  scoutName: string;
  eventName: string;
  matchNumber: string;
  predictedWinner: 'red' | 'blue';
  actualWinner?: 'red' | 'blue' | 'tie';
  isCorrect?: boolean;
  pointsAwarded?: number;
  timestamp: number;
  verified: boolean;
}

export interface ScoutAchievement {
  scoutName: string;
  achievementId: string;
  unlockedAt: number;
  progress?: number;
}

export interface ScoutingEntryDB {
  id: string;
  teamNumber?: string;
  matchNumber?: string;
  alliance?: string;
  scoutName?: string;
  eventName?: string;
  data: Record<string, unknown>;
  timestamp: number;
  
  // Correction tracking fields
  isCorrected?: boolean;         // Has this been re-scouted?
  correctionCount?: number;      // Number of times corrected (1, 2, 3...)
  lastCorrectedAt?: number;      // Timestamp of last correction
  lastCorrectedBy?: string;      // Scout name who did correction
  correctionNotes?: string;      // Why it was corrected
  originalScoutName?: string;    // Original scout (preserved on first correction)
}

export class SimpleScoutingAppDB extends Dexie {
  scoutingData!: Table<ScoutingEntryDB>;

  constructor() {
    super('SimpleScoutingDB');
    
    this.version(1).stores({
      scoutingData: 'id, teamNumber, matchNumber, alliance, scoutName, eventName, timestamp'
    });
    
    // Version 2: Add correction tracking fields
    this.version(2).stores({
      scoutingData: 'id, teamNumber, matchNumber, alliance, scoutName, eventName, timestamp, isCorrected'
    }).upgrade(tx => {
      // Add default values for correction tracking fields on existing records
      return tx.table('scoutingData').toCollection().modify(entry => {
        if (entry.isCorrected === undefined) {
          entry.isCorrected = false;
          entry.correctionCount = 0;
        }
      });
    });
  }
}

export class PitScoutingDB extends Dexie {
  pitScoutingData!: Table<PitScoutingEntry>;

  constructor() {
    super('PitScoutingDB');
    
    this.version(1).stores({
      pitScoutingData: 'id, teamNumber, eventName, scoutName, timestamp, [teamNumber+eventName]'
    });
  }
}

export class ScoutProfileDB extends Dexie {
  scouts!: Table<Scout>;
  predictions!: Table<MatchPrediction>;
  scoutAchievements!: Table<ScoutAchievement>;

  constructor() {
    super('ScoutProfileDB');
    
    this.version(1).stores({
      scouts: 'name, stakes, totalPredictions, correctPredictions, currentStreak, longestStreak, lastUpdated',
      predictions: 'id, scoutName, eventName, matchNumber, predictedWinner, timestamp, verified, [scoutName+eventName+matchNumber]',
      scoutAchievements: '[scoutName+achievementId], scoutName, achievementId, unlockedAt'
    });

    // Version 2: Add stakesFromPredictions field
    this.version(2).stores({
      scouts: 'name, stakes, stakesFromPredictions, totalPredictions, correctPredictions, currentStreak, longestStreak, lastUpdated',
      predictions: 'id, scoutName, eventName, matchNumber, predictedWinner, timestamp, verified, [scoutName+eventName+matchNumber]',
      scoutAchievements: '[scoutName+achievementId], scoutName, achievementId, unlockedAt'
    }).upgrade(tx => {
      // Add default stakesFromPredictions value for existing scouts
      return tx.table('scouts').toCollection().modify(scout => {
        scout.stakesFromPredictions = scout.stakes || 0; // Assume current stakes are all from predictions for existing users
      });
    });
  }
}

export const db = new SimpleScoutingAppDB();
export const pitDB = new PitScoutingDB();
export const gameDB = new ScoutProfileDB();

const safeStringify = (value: unknown): string | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const str = String(value).trim();
  return str === '' ? undefined : str;
};

const enhanceEntry = (entry: ScoutingDataWithId): ScoutingEntryDB => {
  const data = entry.data;
  let actualData = data;
  
  if (data && typeof data === 'object') {
    if ('data' in data && typeof data.data === 'object') {
      actualData = data.data as Record<string, unknown>;
    }
  }
  
  const matchNumber = safeStringify(actualData?.matchNumber);
  let alliance = safeStringify(actualData?.alliance);
  const scoutName = safeStringify(actualData?.scoutName);
  const teamNumber = safeStringify(actualData?.selectTeam);
  let eventName = safeStringify(actualData?.eventName);
  
  // Normalize alliance value: "redAlliance" -> "red", "blueAlliance" -> "blue"
  if (alliance) {
    alliance = alliance.toLowerCase().replace('alliance', '').trim();
  }
  
  // Normalize event name to lowercase for consistency
  // This prevents "2025MRcmp" and "2025mrcmp" from being treated as different events
  if (eventName) {
    eventName = eventName.toLowerCase().trim();
  }

  // Extract correction metadata from data if present
  const isCorrected = Boolean(actualData?.isCorrected);
  const correctionCount = typeof actualData?.correctionCount === 'number' ? actualData.correctionCount : undefined;
  const lastCorrectedAt = typeof actualData?.lastCorrectedAt === 'number' ? actualData.lastCorrectedAt : undefined;
  const lastCorrectedBy = typeof actualData?.lastCorrectedBy === 'string' ? actualData.lastCorrectedBy : undefined;
  const correctionNotes = typeof actualData?.correctionNotes === 'string' ? actualData.correctionNotes : undefined;

  // Update the data object with normalized values for consistency
  const normalizedData = {
    ...actualData,
    eventName,  // Use normalized lowercase eventName
    alliance,   // Use normalized alliance (already normalized above)
  };

  return {
    id: entry.id,
    teamNumber,
    matchNumber,
    alliance,
    scoutName,
    eventName,
    data: normalizedData || data,
    timestamp: entry.timestamp || Date.now(),
    isCorrected,
    correctionCount,
    lastCorrectedAt,
    lastCorrectedBy,
    correctionNotes
  };
};

export const saveScoutingEntry = async (entry: ScoutingDataWithId): Promise<void> => {
  const enhancedEntry = enhanceEntry(entry);
  await db.scoutingData.put(enhancedEntry);
};

export const saveScoutingEntries = async (entries: ScoutingDataWithId[]): Promise<void> => {  
  const enhancedEntries = entries.map(enhanceEntry);
  await db.scoutingData.bulkPut(enhancedEntries);
};

export const loadAllScoutingEntries = async (): Promise<ScoutingEntryDB[]> => {
  return await db.scoutingData.toArray();
};

export const loadScoutingEntriesByTeam = async (teamNumber: string): Promise<ScoutingEntryDB[]> => {
  return await db.scoutingData.where('teamNumber').equals(teamNumber).toArray();
};

export const loadScoutingEntriesByMatch = async (matchNumber: string): Promise<ScoutingEntryDB[]> => {
  return await db.scoutingData.where('matchNumber').equals(matchNumber).toArray();
};

export const loadScoutingEntriesByEvent = async (eventName: string): Promise<ScoutingEntryDB[]> => {
  return await db.scoutingData.where('eventName').equals(eventName).toArray();
};

export const loadScoutingEntriesByTeamAndEvent = async (
  teamNumber: string, 
  eventName: string
): Promise<ScoutingEntryDB[]> => {
  return await db.scoutingData
    .where('[teamNumber+eventName]')
    .equals([teamNumber, eventName])
    .toArray();
};

// Clean up duplicate entries (keep most recent version)
export const cleanupDuplicateEntries = async () => {
  console.log('[Cleanup] Starting duplicate entry cleanup...');
  
  try {
    const allEntries = await db.scoutingData.toArray();
    console.log(`[Cleanup] Found ${allEntries.length} total entries`);
    
    // Group by match-team-alliance-event
    const entriesByKey = new Map<string, ScoutingEntryDB[]>();
    
    allEntries.forEach(entry => {
      const key = `${entry.eventName}-${entry.matchNumber}-${entry.alliance}-${entry.teamNumber}`;
      if (!entriesByKey.has(key)) {
        entriesByKey.set(key, []);
      }
      entriesByKey.get(key)!.push(entry);
    });
    
    // Find duplicates
    const idsToDelete: string[] = [];
    
    entriesByKey.forEach((entries, key) => {
      if (entries.length > 1) {
        console.log(`[Cleanup] Found ${entries.length} duplicates for ${key}`);
        
        // Sort by timestamp (most recent first)
        entries.sort((a, b) => {
          const timeA = a.lastCorrectedAt || a.timestamp || 0;
          const timeB = b.lastCorrectedAt || b.timestamp || 0;
          return timeB - timeA;
        });
        
        // Keep the first (most recent), delete the rest
        const [keep, ...remove] = entries;
        console.log(`[Cleanup] Keeping entry ${keep.id}, removing ${remove.length} older entries`);
        idsToDelete.push(...remove.map(e => e.id));
      }
    });
    
    if (idsToDelete.length > 0) {
      console.log(`[Cleanup] Deleting ${idsToDelete.length} duplicate entries:`, idsToDelete);
      await db.scoutingData.bulkDelete(idsToDelete);
      console.log('[Cleanup] ✅ Cleanup complete!');
      return { deleted: idsToDelete.length, total: allEntries.length };
    } else {
      console.log('[Cleanup] No duplicates found');
      return { deleted: 0, total: allEntries.length };
    }
  } catch (error) {
    console.error('[Cleanup] Error during cleanup:', error);
    throw error;
  }
};

// Fix alliance values in existing data (redAlliance -> red, blueAlliance -> blue)
export const normalizeAllianceValues = async () => {
  console.log('[Normalize] Fixing alliance values...');
  
  try {
    const allEntries = await db.scoutingData.toArray();
    let fixedCount = 0;
    
    for (const entry of allEntries) {
      if (entry.alliance && (entry.alliance.includes('Alliance') || entry.alliance.includes('alliance'))) {
        const normalizedAlliance = entry.alliance.toLowerCase().replace('alliance', '').trim();
        await db.scoutingData.update(entry.id, { alliance: normalizedAlliance });
        fixedCount++;
      }
    }
    
    console.log(`[Normalize] Fixed ${fixedCount} entries out of ${allEntries.length} total`);
    return { fixed: fixedCount, total: allEntries.length };
  } catch (error) {
    console.error('[Normalize] Error during normalization:', error);
    throw error;
  }
};

export const findExistingScoutingEntry = async (
  matchNumber: string,
  teamNumber: string,
  alliance: string,
  eventName: string
): Promise<ScoutingEntryDB | undefined> => {
  const entries = await db.scoutingData
    .where({ matchNumber, teamNumber, alliance, eventName })
    .toArray();
  
  // Log if there are duplicates
  if (entries.length > 1) {
    console.warn(`Found ${entries.length} duplicate entries for match ${matchNumber}, team ${teamNumber}, alliance ${alliance}`);
    console.warn('Entry IDs:', entries.map(e => e.id));
  }
  
  return entries[0];
};

export const updateScoutingEntryWithCorrection = async (
  id: string,
  newData: ScoutingDataWithId,
  correctionNotes: string,
  correctedBy: string
): Promise<void> => {
  const existing = await db.scoutingData.get(id);
  if (!existing) {
    throw new Error('Entry not found');
  }

  // Find and delete ALL other entries for the same match/team/alliance to prevent duplicates
  const matchNumber = newData.data.matchNumber as string;
  const teamNumber = newData.data.selectTeam as string;
  const alliance = newData.data.alliance as string;
  const eventName = newData.data.eventName as string;
  
  const duplicates = await db.scoutingData
    .where({ matchNumber, teamNumber, alliance, eventName })
    .toArray();
  
  // Delete all duplicates except the one we're updating
  const duplicateIds = duplicates
    .filter(entry => entry.id !== id)
    .map(entry => entry.id!);
  
  if (duplicateIds.length > 0) {
    console.warn(`Deleting ${duplicateIds.length} duplicate entries:`, duplicateIds);
    await db.scoutingData.bulkDelete(duplicateIds);
  }

  const enhancedEntry = enhanceEntry(newData);
  
  // Completely replace the entry with new data, keeping only correction metadata
  await db.scoutingData.put({
    ...enhancedEntry,
    id: id, // Keep the same ID to replace the existing entry
    lastCorrectedAt: Date.now(),
    lastCorrectedBy: correctedBy,
    correctionNotes: correctionNotes || undefined,
    isCorrected: true,
    correctionCount: (existing.correctionCount || 0) + 1,
    originalScoutName: existing.originalScoutName || existing.scoutName,
  });
};

export const deleteScoutingEntry = async (id: string): Promise<void> => {
  await db.scoutingData.delete(id);
};

export const deleteScoutingEntries = async (ids: string[]): Promise<void> => {
  await db.scoutingData.bulkDelete(ids);
};

export const clearAllScoutingData = async (): Promise<void> => {
  await db.scoutingData.clear();
};

export const getDBStats = async (): Promise<{
  totalEntries: number;
  teams: string[];
  matches: string[];
  scouts: string[];
  events: string[];
  oldestEntry?: number;
  newestEntry?: number;
}> => {
  const entries = await db.scoutingData.toArray();
  
  const teams = new Set<string>();
  const matches = new Set<string>();
  const scouts = new Set<string>();
  const events = new Set<string>();
  let oldestEntry: number | undefined;
  let newestEntry: number | undefined;
  
  entries.forEach(entry => {
    if (entry.teamNumber) teams.add(entry.teamNumber);
    if (entry.matchNumber) matches.add(entry.matchNumber);
    if (entry.scoutName) scouts.add(entry.scoutName);
    if (entry.eventName) events.add(entry.eventName);
    
    if (!oldestEntry || entry.timestamp < oldestEntry) {
      oldestEntry = entry.timestamp;
    }
    if (!newestEntry || entry.timestamp > newestEntry) {
      newestEntry = entry.timestamp;
    }
  });
  
  return {
    totalEntries: entries.length,
    teams: Array.from(teams).sort((a, b) => Number(a) - Number(b)),
    matches: Array.from(matches).sort((a, b) => Number(a) - Number(b)),
    scouts: Array.from(scouts).sort(),
    events: Array.from(events).sort(),
    oldestEntry,
    newestEntry
  };
};

export const migrateFromLocalStorage = async (): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
}> => {
  try {
    const existingDataStr = localStorage.getItem('scoutingData');
    if (!existingDataStr) {
      return { success: true, migratedCount: 0 };
    }
    
    const { migrateToIdStructure, hasIdStructure } = await import('./scoutingDataUtils');
    
    const parsed = JSON.parse(existingDataStr);
    let dataToMigrate: { entries: ScoutingDataWithId[] };
    
    if (hasIdStructure(parsed)) {
      dataToMigrate = parsed;
    } else {
      dataToMigrate = migrateToIdStructure(parsed);
    }
    
    await saveScoutingEntries(dataToMigrate.entries);
    
    localStorage.setItem('scoutingData_backup', existingDataStr);
    localStorage.removeItem('scoutingData');
    
    return {
      success: true,
      migratedCount: dataToMigrate.entries.length
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      migratedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const migrateFromIndexedDB = async (): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
}> => {
  try {
    const { loadAllScoutingEntries: loadOldEntries } = await import('./indexedDBUtils');
    
    const oldEntries = await loadOldEntries();
    if (oldEntries.length === 0) {
      return { success: true, migratedCount: 0 };
    }
    
    const convertedEntries: ScoutingDataWithId[] = oldEntries.map(entry => ({
      id: entry.id,
      data: entry.data,
      timestamp: entry.timestamp
    }));
    
    await saveScoutingEntries(convertedEntries);
    
    return {
      success: true,
      migratedCount: convertedEntries.length
    };
  } catch (error) {
    console.error('IndexedDB migration failed:', error);
    return {
      success: false,
      migratedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const exportScoutingData = async (): Promise<{
  entries: ScoutingEntryDB[];
  exportedAt: number;
  version: string;
}> => {
  const entries = await loadAllScoutingEntries();
  
  return {
    entries,
    exportedAt: Date.now(),
    version: '2.0-dexie'
  };
};

export const importScoutingData = async (
  importData: { entries: ScoutingEntryDB[] },
  mode: 'append' | 'overwrite' = 'append'
): Promise<{
  success: boolean;
  importedCount: number;
  duplicatesSkipped?: number;
  error?: string;
}> => {
  try {
    if (mode === 'overwrite') {
      await clearAllScoutingData();
      await db.scoutingData.bulkPut(importData.entries);
      
      return {
        success: true,
        importedCount: importData.entries.length
      };
    } else {
      const existingIds = await db.scoutingData.orderBy('id').keys();
      const existingIdSet = new Set(existingIds);
      
      const newEntries = importData.entries.filter(entry => !existingIdSet.has(entry.id));
      await db.scoutingData.bulkPut(newEntries);
      
      return {
        success: true,
        importedCount: newEntries.length,
        duplicatesSkipped: importData.entries.length - newEntries.length
      };
    }
  } catch (error) {
    console.error('Import failed:', error);
    return {
      success: false,
      importedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const queryScoutingEntries = async (filters: {
  teamNumbers?: string[];
  matchNumbers?: string[];
  eventNames?: string[];
  alliances?: string[];
  scoutName?: string[];
  dateRange?: { start: number; end: number };
}): Promise<ScoutingEntryDB[]> => {
  let collection = db.scoutingData.toCollection();
  
  if (filters.dateRange) {
    collection = collection.filter(entry => 
      entry.timestamp >= filters.dateRange!.start && 
      entry.timestamp <= filters.dateRange!.end
    );
  }
  
  if (filters.teamNumbers && filters.teamNumbers.length > 0) {
    collection = collection.filter(entry => 
      Boolean(entry.teamNumber && filters.teamNumbers!.includes(entry.teamNumber))
    );
  }
  
  if (filters.matchNumbers && filters.matchNumbers.length > 0) {
    collection = collection.filter(entry => 
      Boolean(entry.matchNumber && filters.matchNumbers!.includes(entry.matchNumber))
    );
  }
  
  if (filters.eventNames && filters.eventNames.length > 0) {
    collection = collection.filter(entry => 
      Boolean(entry.eventName && filters.eventNames!.includes(entry.eventName))
    );
  }
  
  if (filters.alliances && filters.alliances.length > 0) {
    collection = collection.filter(entry => 
      Boolean(entry.alliance && filters.alliances!.includes(entry.alliance))
    );
  }
  
  if (filters.scoutName && filters.scoutName.length > 0) {
    collection = collection.filter(entry => 
      Boolean(entry.scoutName && filters.scoutName!.includes(entry.scoutName))
    );
  }
  
  return await collection.toArray();
};

export const getFilterOptions = async (): Promise<{
  teams: string[];
  matches: string[];
  events: string[];
  alliances: string[];
  scouts: string[];
}> => {
  const stats = await getDBStats();
  
  const entries = await db.scoutingData.toArray();
  const alliances = [...new Set(entries.map(e => e.alliance).filter(Boolean))].sort() as string[];
  
  return {
    teams: stats.teams,
    matches: stats.matches,
    events: stats.events,
    alliances,
    scouts: stats.scouts
  };
};

db.open().catch(error => {
  console.error('Failed to open Dexie database:', error);
});

pitDB.open().catch(error => {
  console.error('Failed to open Pit Scouting database:', error);
});

// Pit Scouting Database Functions
export const savePitScoutingEntry = async (entry: PitScoutingEntry): Promise<void> => {
  try {
    await pitDB.pitScoutingData.put(entry);
  } catch (error) {
    console.error('Error saving pit scouting entry to database:', error);
    throw error;
  }
};

export const loadAllPitScoutingEntries = async (): Promise<PitScoutingEntry[]> => {
  try {
    return await pitDB.pitScoutingData.toArray();
  } catch (error) {
    console.error('Error loading all pit scouting entries:', error);
    return [];
  }
};

export const loadPitScoutingByTeam = async (teamNumber: string): Promise<PitScoutingEntry[]> => {
  try {
    return await pitDB.pitScoutingData.where('teamNumber').equals(teamNumber).toArray();
  } catch (error) {
    console.error('Error loading pit scouting entries by team:', error);
    return [];
  }
};

export const loadPitScoutingByEvent = async (eventName: string): Promise<PitScoutingEntry[]> => {
  try {
    return await pitDB.pitScoutingData.where('eventName').equals(eventName).toArray();
  } catch (error) {
    console.error('Error loading pit scouting entries by event:', error);
    return [];
  }
};

export const loadPitScoutingByTeamAndEvent = async (
  teamNumber: string, 
  eventName: string
): Promise<PitScoutingEntry | undefined> => {
  try {
    const results = await pitDB.pitScoutingData
      .where('[teamNumber+eventName]')
      .equals([teamNumber, eventName])
      .toArray();
    
    // Return the most recent entry if multiple exist
    return results.sort((a, b) => b.timestamp - a.timestamp)[0];
  } catch (error) {
    console.error('Error loading pit scouting entry by team and event:', error);
    // Fallback to manual filtering if compound index fails
    try {
      const allEntries = await pitDB.pitScoutingData.toArray();
      const filtered = allEntries.filter(entry => 
        entry.teamNumber === teamNumber && entry.eventName === eventName
      );
      return filtered.sort((a, b) => b.timestamp - a.timestamp)[0];
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      return undefined;
    }
  }
};

export const deletePitScoutingEntry = async (id: string): Promise<void> => {
  await pitDB.pitScoutingData.delete(id);
};

export const clearAllPitScoutingData = async (): Promise<void> => {
  await pitDB.pitScoutingData.clear();
};

export const getPitScoutingStats = async (): Promise<{
  totalEntries: number;
  teams: string[];
  events: string[];
  scouts: string[];
}> => {
  const entries = await pitDB.pitScoutingData.toArray();
  
  const teams = [...new Set(entries.map(e => e.teamNumber))].sort((a, b) => Number(a) - Number(b));
  const events = [...new Set(entries.map(e => e.eventName))].sort();
  const scouts = [...new Set(entries.map(e => e.scoutName))].sort();
  
  return {
    totalEntries: entries.length,
    teams,
    events,
    scouts
  };
};

// Scout gamification functions
export const getOrCreateScout = async (name: string): Promise<Scout> => {
  const existingScout = await gameDB.scouts.get(name);
  
  if (existingScout) {
    // Update last updated time
    existingScout.lastUpdated = Date.now();
    await gameDB.scouts.put(existingScout);
    return existingScout;
  }
  
  // Create new scout
  const newScout: Scout = {
    name: name.trim(),
    stakes: 0,
    stakesFromPredictions: 0,
    totalPredictions: 0,
    correctPredictions: 0,
    currentStreak: 0,
    longestStreak: 0,
    createdAt: Date.now(),
    lastUpdated: Date.now()
  };
  
  await gameDB.scouts.put(newScout);
  return newScout;
};

export const getScout = async (name: string): Promise<Scout | undefined> => {
  return await gameDB.scouts.get(name);
};

export const getAllScouts = async (): Promise<Scout[]> => {
  return await gameDB.scouts.orderBy('stakes').reverse().toArray();
};

export const updateScoutPoints = async (name: string, pointsToAdd: number): Promise<void> => {
  const scout = await gameDB.scouts.get(name);
  if (scout) {
    scout.stakes += pointsToAdd;
    scout.lastUpdated = Date.now();
    await gameDB.scouts.put(scout);
  }
};

export const updateScoutStats = async (
  name: string, 
  newStakes: number, 
  correctPredictions: number, 
  totalPredictions: number,
  currentStreak?: number,
  longestStreak?: number,
  additionalStakesFromPredictions: number = 0
): Promise<void> => {
  const scout = await gameDB.scouts.get(name);
  if (scout) {
    scout.stakes = newStakes;
    scout.stakesFromPredictions += additionalStakesFromPredictions;
    scout.correctPredictions = correctPredictions;
    scout.totalPredictions = totalPredictions;
    if (currentStreak !== undefined) scout.currentStreak = currentStreak;
    if (longestStreak !== undefined) scout.longestStreak = longestStreak;
    scout.lastUpdated = Date.now();
    await gameDB.scouts.put(scout);
  }
};

// New function to update scout with prediction result and handle streaks
export const updateScoutWithPredictionResult = async (
  name: string,
  isCorrect: boolean,
  basePoints: number,
  eventName: string,
  matchNumber: string
): Promise<number> => {
  const scout = await gameDB.scouts.get(name);
  if (!scout) return 0;

  let pointsAwarded = 0;
  let newCurrentStreak = scout.currentStreak;
  let newLongestStreak = scout.longestStreak;

  // Check if this match is sequential to the last verified prediction
  const isSequential = await isMatchSequential(name, eventName, matchNumber);

  if (isCorrect) {
    // Award base points for correct prediction
    pointsAwarded += basePoints;
    
    // Only increment streak if the match is sequential OR this is the first prediction
    if (isSequential || scout.totalPredictions === 0) {
      newCurrentStreak += 1;
    } else {
      // Reset streak if there's a gap in matches
      newCurrentStreak = 1; // Start new streak at 1
    }
    
    // Update longest streak if current streak is better
    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
    }
    
    // Award streak bonus if streak is 2 or more
    if (newCurrentStreak >= 2) {
      const streakBonus = 2 * (newCurrentStreak - 1); // 2 extra points for streak 2, 4 for streak 3, etc.
      pointsAwarded += streakBonus;
    }
  } else {
    // Reset streak on incorrect prediction
    newCurrentStreak = 0;
  }

  // Update scout stats
  await updateScoutStats(
    name,
    scout.stakes + pointsAwarded,
    scout.correctPredictions + (isCorrect ? 1 : 0),
    scout.totalPredictions + 1,
    newCurrentStreak,
    newLongestStreak,
    pointsAwarded // This tracks stakes earned from predictions
  );

  return pointsAwarded;
};

// Helper function to check if current match is sequential to last verified prediction
const isMatchSequential = async (
  scoutName: string,
  eventName: string,
  currentMatchNumber: string
): Promise<boolean> => {
  // Get the most recent verified prediction for this scout in this event
  const lastPrediction = await gameDB.predictions
    .where('scoutName')
    .equals(scoutName)
    .and(prediction => prediction.eventName === eventName && prediction.verified)
    .reverse()
    .sortBy('timestamp');

  if (!lastPrediction || lastPrediction.length === 0) {
    return true; // No previous predictions, so this is sequential (first prediction)
  }

  const lastMatchNumber = parseInt(lastPrediction[0].matchNumber);
  const currentMatch = parseInt(currentMatchNumber);
  
  // Check if current match is exactly one more than the last match
  // Allow for some flexibility (e.g., within 3 matches) to account for missed matches
  const gap = currentMatch - lastMatchNumber;
  
  return gap <= 3 && gap > 0; // Sequential if gap is 1, 2, or 3 matches
};

export const createMatchPrediction = async (
  scoutName: string,
  eventName: string,
  matchNumber: string,
  predictedWinner: 'red' | 'blue'
): Promise<MatchPrediction> => {
  const existingPrediction = await gameDB.predictions
    .where('[scoutName+eventName+matchNumber]')
    .equals([scoutName, eventName, matchNumber])
    .first();

  if (existingPrediction) {
    existingPrediction.predictedWinner = predictedWinner;
    existingPrediction.timestamp = Date.now();
    await gameDB.predictions.put(existingPrediction);
    return existingPrediction;
  }

  const prediction: MatchPrediction = {
    id: `prediction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    scoutName,
    eventName,
    matchNumber,
    predictedWinner,
    timestamp: Date.now(),
    verified: false
  };

  await gameDB.predictions.put(prediction);

  const scout = await gameDB.scouts.get(scoutName);
  if (scout) {
    scout.totalPredictions += 1;
    scout.lastUpdated = Date.now();
    await gameDB.scouts.put(scout);
    
    const { checkForNewAchievements } = await import('./achievementUtils');
    const newAchievements = await checkForNewAchievements(scoutName);
    
    if (newAchievements.length > 0) {
      console.log('🏆 New achievements unlocked for', scoutName, ':', newAchievements.map(a => a.name));
    }
  }

  return prediction;
};

export const getPredictionForMatch = async (
  scoutName: string,
  eventName: string,
  matchNumber: string
): Promise<MatchPrediction | undefined> => {
  return await gameDB.predictions
    .where('[scoutName+eventName+matchNumber]')
    .equals([scoutName, eventName, matchNumber])
    .first();
};

export const getAllPredictionsForScout = async (scoutName: string): Promise<MatchPrediction[]> => {
  return await gameDB.predictions
    .where('scoutName')
    .equals(scoutName)
    .reverse()
    .toArray();
};

export const getAllPredictionsForMatch = async (
  eventName: string,
  matchNumber: string
): Promise<MatchPrediction[]> => {
  return await gameDB.predictions
    .where('eventName')
    .equals(eventName)
    .and(prediction => prediction.matchNumber === matchNumber)
    .toArray();
};

export const markPredictionAsVerified = async (predictionId: string): Promise<void> => {
  await gameDB.predictions.update(predictionId, { verified: true });
};

export const deleteScout = async (name: string): Promise<void> => {
  await gameDB.scouts.delete(name);
};

export const clearGameData = async (): Promise<void> => {
  await gameDB.scouts.clear();
  await gameDB.predictions.clear();
};

/**
 * Migration: Regenerate IDs for all scouting entries to use composite key format
 * This converts old hash-based IDs to the new event::match::team::alliance format
 * for faster lookups and natural collision detection
 */
export const migrateScoutingEntryIds = async (): Promise<{ updated: number; errors: number }> => {
  console.log('🔄 [Migration] Starting scouting entry ID migration...');
  
  try {
    const allEntries = await db.scoutingData.toArray();
    console.log(`📊 [Migration] Found ${allEntries.length} entries to migrate`);
    
    let updated = 0;
    let errors = 0;
    
    for (const entry of allEntries) {
      try {
        // Skip entries missing required fields
        if (!entry.matchNumber || !entry.teamNumber || !entry.alliance || !entry.eventName) {
          console.warn(`⚠️ [Migration] Skipping entry ${entry.id} - missing required fields`);
          errors++;
          continue;
        }
        
        // Generate new composite ID from the entry's fields
        const { generateDeterministicEntryId } = await import('./scoutingDataUtils');
        const newId = generateDeterministicEntryId(
          entry.matchNumber,
          entry.teamNumber,
          entry.alliance,
          entry.eventName
        );
        
        // Only update if ID changed
        if (entry.id !== newId) {
          // Delete old entry
          await db.scoutingData.delete(entry.id);
          
          // Add with new ID
          await db.scoutingData.add({
            ...entry,
            id: newId
          });
          
          updated++;
          
          if (updated % 100 === 0) {
            console.log(`✅ [Migration] Migrated ${updated} entries...`);
          }
        }
      } catch (error) {
        console.error(`❌ [Migration] Error migrating entry ${entry.id}:`, error);
        errors++;
      }
    }
    
    console.log(`✅ [Migration] Complete! Updated: ${updated}, Errors: ${errors}`);
    return { updated, errors };
  } catch (error) {
    console.error('❌ [Migration] Fatal error during migration:', error);
    throw error;
  }
};

/**
 * Migrate existing entries to populate top-level scoutName and timestamp fields
 * This fixes entries where these fields are only in the data object
 */
export const migrateScoutingMetadata = async (): Promise<{ updated: number; errors: number }> => {
  try {
    console.log('🔄 [Metadata Migration] Starting migration to populate top-level fields...');
    
    const allEntries = await db.scoutingData.toArray();
    console.log(`📊 [Metadata Migration] Found ${allEntries.length} entries to check`);
    
    let updated = 0;
    let errors = 0;
    
    for (const entry of allEntries) {
      try {
        const data = entry.data as Record<string, unknown>;
        let needsUpdate = false;
        const updates: Partial<ScoutingEntryDB> = {};
        
        // Debug first entry to see structure
        if (updated === 0 && errors === 0) {
          console.log('🔍 [Metadata Migration] Sample entry structure:', {
            id: entry.id,
            topLevelScoutName: entry.scoutName,
            topLevelTimestamp: entry.timestamp,
            hasData: !!data,
            dataScoutName: data?.scoutName,
            dataTimestamp: data?.timestamp,
            scoutNameType: typeof entry.scoutName,
            timestampType: typeof entry.timestamp
          });
        }
        
        // Check if scoutName is missing at top level but exists in data
        if (!entry.scoutName && data?.scoutName) {
          updates.scoutName = String(data.scoutName);
          needsUpdate = true;
          console.log(`📝 [Metadata Migration] Will update scoutName for ${entry.id}`);
        }
        
        // Check if timestamp is missing or zero
        if ((!entry.timestamp || entry.timestamp === 0) && typeof data?.timestamp === 'number') {
          updates.timestamp = data.timestamp;
          needsUpdate = true;
          console.log(`📝 [Metadata Migration] Will update timestamp for ${entry.id}`);
        } else if (!entry.timestamp || entry.timestamp === 0) {
          // If no timestamp anywhere, use current time
          updates.timestamp = Date.now();
          needsUpdate = true;
          console.log(`📝 [Metadata Migration] Will set current timestamp for ${entry.id}`);
        }
        
        if (needsUpdate) {
          await db.scoutingData.update(entry.id, updates);
          updated++;
          
          if (updated % 100 === 0) {
            console.log(`✅ [Metadata Migration] Updated ${updated} entries...`);
          }
        }
      } catch (error) {
        console.error(`❌ [Metadata Migration] Error updating entry ${entry.id}:`, error);
        errors++;
      }
    }
    
    console.log(`✅ [Metadata Migration] Complete! Updated: ${updated}, Errors: ${errors}`);
    return { updated, errors };
  } catch (error) {
    console.error('❌ [Metadata Migration] Fatal error during migration:', error);
    throw error;
  }
};

