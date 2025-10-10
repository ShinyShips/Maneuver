import type { ScoutingDataWithId } from './scoutingDataUtils';

const DB_NAME = 'SimpleScoutingDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'scoutingData';

let dbInstance: IDBDatabase | null = null;

export const initializeDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        
        store.createIndex('teamNumber', 'teamNumber', { unique: false });
        store.createIndex('matchNumber', 'matchNumber', { unique: false });
        store.createIndex('alliance', 'alliance', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('scoutName', 'scoutName', { unique: false });
        store.createIndex('eventName', 'eventName', { unique: false });
      } else {
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        if (transaction) {
          const store = transaction.objectStore(STORE_NAME);
          if (!store.indexNames.contains('eventName')) {
            store.createIndex('eventName', 'eventName', { unique: false });
          }
        }
      }
    };
  });
};

export interface ScoutingEntryDB {
  id: string;
  teamNumber?: string;
  matchNumber?: string;
  alliance?: string;
  scoutName?: string;
  eventName?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const enhanceEntry = (entry: ScoutingDataWithId): ScoutingEntryDB => {
  const safeStringify = (value: unknown): string | undefined => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const str = String(value).trim();
    return str === '' ? undefined : str;
  };

  const data = entry.data;
  
  let actualData = data;
  
  if (data && typeof data === 'object') {
    if ('data' in data && typeof data.data === 'object') {
      actualData = data.data as Record<string, unknown>;
    }
  }

  
  const matchNumber = safeStringify(actualData?.matchNumber);
  const alliance = safeStringify(actualData?.alliance);
  const scoutName = safeStringify(actualData?.scoutName);
  const teamNumber = safeStringify(actualData?.selectTeam); // Team number is stored in selectTeam field
  const eventName = safeStringify(actualData?.eventName);

  return {
    id: entry.id,
    teamNumber,
    matchNumber,
    alliance,
    scoutName,
    eventName,
    data: actualData || data, // Use the actual data, fallback to original
    timestamp: entry.timestamp || Date.now()
  };
};


export const saveScoutingEntry = async (entry: ScoutingDataWithId): Promise<void> => {
  const db = await initializeDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  const enhancedEntry = enhanceEntry(entry);
  
  return new Promise((resolve, reject) => {
    const request = store.put(enhancedEntry);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};


export const saveScoutingEntries = async (entries: ScoutingDataWithId[]): Promise<void> => {
  
  const db = await initializeDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    let completed = 0;
    const total = entries.length;
    
    if (total === 0) {
      resolve();
      return;
    }
    
    entries.forEach((entry) => {
      const enhancedEntry = enhanceEntry(entry);
      
      const request = store.put(enhancedEntry);
      
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  });
};


export const loadAllScoutingEntries = async (): Promise<ScoutingEntryDB[]> => {
  const db = await initializeDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => reject(request.error);
  });
};


export const loadScoutingEntriesByTeam = async (teamNumber: string): Promise<ScoutingEntryDB[]> => {
  const db = await initializeDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index('teamNumber');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(teamNumber);
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => reject(request.error);
  });
};


export const loadScoutingEntriesByMatch = async (matchNumber: string): Promise<ScoutingEntryDB[]> => {
  const db = await initializeDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index('matchNumber');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(matchNumber);
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => reject(request.error);
  });
};


export const loadScoutingEntriesByEvent = async (eventName: string): Promise<ScoutingEntryDB[]> => {
  const db = await initializeDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index('eventName');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(eventName);
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => reject(request.error);
  });
};


export const deleteScoutingEntry = async (id: string): Promise<void> => {
  const db = await initializeDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};


export const clearAllScoutingData = async (): Promise<void> => {
  try {
    const db = await initializeDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      
      request.onsuccess = () => {
        dbInstance = null;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing scouting data:', error);
    throw error;
  }
};

export const resetDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
    
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    
    deleteRequest.onsuccess = async () => {
      try {
        await initializeDB();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    
    deleteRequest.onerror = () => {
      console.error('Failed to delete database:', deleteRequest.error);
      reject(deleteRequest.error);
    };
    
    deleteRequest.onblocked = () => {
      console.warn('Database deletion blocked. Please close all tabs using this application.');
      reject(new Error('Database deletion blocked'));
    };
  });
};

export const clearOldDatabases = async (): Promise<void> => {
  const oldDbNames = [
    'ScoutingAppDB',
    'SimpleScoutingDB',
    'ScoutingApp-DB', 
    'ManeuverScoutingDB'
  ];
  
  const deletePromises = oldDbNames.map(dbName => {
    return new Promise<void>((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      deleteRequest.onsuccess = () => {
        resolve();
      };
      deleteRequest.onerror = () => {
        resolve();
      };
      deleteRequest.onblocked = () => {
        resolve();
      };
    });
  });
  
  await Promise.all(deletePromises);
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
  const entries = await loadAllScoutingEntries();
  
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
    
    // Import the legacy utilities to parse the data
    const { migrateToIdStructure, hasIdStructure } = await import('./scoutingDataUtils');
    
    const parsed = JSON.parse(existingDataStr);
    let dataToMigrate: { entries: ScoutingDataWithId[] };
    
    if (hasIdStructure(parsed)) {
      dataToMigrate = parsed;
    } else {
      dataToMigrate = migrateToIdStructure(parsed);
    }
    
    // Save to IndexedDB
    await saveScoutingEntries(dataToMigrate.entries);
    
    // Create backup of localStorage data before removing
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


export const exportScoutingData = async (): Promise<{
  entries: ScoutingEntryDB[];
  exportedAt: number;
  version: string;
}> => {
  const entries = await loadAllScoutingEntries();
  
  return {
    entries,
    exportedAt: Date.now(),
    version: '1.0'
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
      await saveScoutingEntries(importData.entries);
      
      return {
        success: true,
        importedCount: importData.entries.length
      };
    } else {
      // Append mode - check for duplicates
      const existingEntries = await loadAllScoutingEntries();
      const existingIds = new Set(existingEntries.map(entry => entry.id));
      
      const newEntries = importData.entries.filter(entry => !existingIds.has(entry.id));
      await saveScoutingEntries(newEntries);
      
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
