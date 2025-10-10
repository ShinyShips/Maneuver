# Dexie.js Database Implementation

This project now uses [Dexie.js](https://dexie.org/) for IndexedDB management, providing a much cleaner and more powerful API for database operations.

## Migration from Old Implementation

The app automatically migrates data from:
1. Old manual IndexedDB implementation
2. localStorage storage

Migration happens automatically on app startup and is logged to the console.

## New Database Structure

### ScoutingEntryDB Interface
```typescript
interface ScoutingEntryDB {
  id: string;                    // Unique entry ID
  teamNumber?: string;           // Extracted for indexing
  matchNumber?: string;          // Extracted for indexing
  alliance?: string;             // Extracted for indexing
  scoutName?: string;      // Extracted for indexing
  eventName?: string;            // Extracted for indexing
  data: Record<string, unknown>; // Full scouting data object
  timestamp: number;             // Entry creation time
}
```

### Database Schema
- **Version 1**: Basic indexes for teamNumber, matchNumber, alliance, scoutName, timestamp
- **Version 2**: Added eventName index

## API Overview

### Basic Operations
```typescript
import { 
  saveScoutingEntry, 
  saveScoutingEntries, 
  loadAllScoutingEntries,
  deleteScoutingEntry,
  clearAllScoutingData 
} from './lib/dexieDB';

// Save single entry
await saveScoutingEntry(entryWithId);

// Save multiple entries
await saveScoutingEntries(entriesArray);

// Load all entries
const entries = await loadAllScoutingEntries();

// Delete entry
await deleteScoutingEntry(entryId);

// Clear all data
await clearAllScoutingData();
```

### Querying by Criteria
```typescript
import { 
  loadScoutingEntriesByTeam,
  loadScoutingEntriesByMatch,
  loadScoutingEntriesByEvent,
  queryScoutingEntries 
} from './lib/dexieDB';

// Load by team
const teamEntries = await loadScoutingEntriesByTeam('1234');

// Load by match
const matchEntries = await loadScoutingEntriesByMatch('42');

// Load by event
const eventEntries = await loadScoutingEntriesByEvent('2025mrcmp');

// Advanced filtering
const filteredEntries = await queryScoutingEntries({
  teamNumbers: ['1234', '5678'],
  eventNames: ['2025mrcmp'],
  alliances: ['red'],
  dateRange: { start: startTimestamp, end: endTimestamp }
});
```

### Statistics and Metadata
```typescript
import { getDBStats, getFilterOptions } from './lib/dexieDB';

// Get database statistics
const stats = await getDBStats();
// Returns: { totalEntries, teams, matches, scouts, events, oldestEntry, newestEntry }

// Get filter options for UI
const options = await getFilterOptions();
// Returns: { teams, matches, events, alliances, scouts }
```

### Import/Export
```typescript
import { exportScoutingData, importScoutingData } from './lib/dexieDB';

// Export all data
const exportData = await exportScoutingData();

// Import data (append or overwrite)
const result = await importScoutingData(importData, 'append');
```

## Benefits of Dexie.js

1. **Cleaner API**: Much simpler than raw IndexedDB
2. **Better TypeScript Support**: Full type safety
3. **Automatic Schema Management**: Version upgrades handled automatically
4. **Powerful Querying**: Complex filters and compound indexes
5. **Better Error Handling**: Promises-based with clear error messages
6. **Performance**: Optimized queries and bulk operations
7. **Future-Proof**: Easy to add new features and indexes

## Migration Details

### Automatic Migration
- Runs on app startup
- Checks for existing data in old storage systems
- Migrates to Dexie if needed
- Keeps backups of original data
- Logs migration progress

### Manual Migration
```typescript
import migrationUtils from './lib/migrationUtils';

// Check if migration is needed
const status = await migrationUtils.checkMigrationNeeded();

// Perform migration
const result = await migrationUtils.performMigration();

// Clean up old data (optional)
const cleanup = await migrationUtils.cleanupOldData();
```

## Compatibility

The new implementation maintains backward compatibility:
- Existing components continue to work unchanged
- `loadLegacyScoutingData()` still returns the expected format
- Data transformation functions remain the same
- All existing APIs are preserved

## Development

### Adding New Indexes
To add new indexes, increment the database version in `dexieDB.ts`:

```typescript
this.version(3).stores({
  scoutingData: 'id, teamNumber, matchNumber, alliance, scoutName, eventName, newField, timestamp'
});
```

### Custom Queries
Use Dexie's powerful query API for complex operations:

```typescript
// Example: Find all entries for a team in the last 30 days
const recentEntries = await db.scoutingData
  .where('[teamNumber+timestamp]')
  .between(['1234', Date.now() - 30 * 24 * 60 * 60 * 1000], ['1234', Date.now()])
  .toArray();
```

## Files Changed

- `src/lib/dexieDB.ts` - New Dexie implementation
- `src/lib/migrationUtils.ts` - Migration utilities
- `src/lib/scoutingDataUtils.ts` - Updated to use Dexie
- `src/main.tsx` - Added auto-migration on startup

## Next Steps

1. Test the migration with existing data
2. Monitor console logs for migration status
3. Gradually replace direct `indexedDBUtils.ts` imports with `dexieDB.ts`
4. Eventually remove `indexedDBUtils.ts` after migration is complete
