# Pit Assignments Demo Data

This directory contains demo data for testing the Pit Assignments page and other parts of the scouting application.

## Files

### `teams.json`
A list of 60 unique team numbers extracted from the match schedule data. This includes teams like:
- 11, 25, 56, 75, 102, 103, 193, 222, 223, 272, etc.

These teams are used throughout the application for:
- Pit assignments
- Match strategy planning  
- Team statistics
- Pick list generation

### `matchSchedule.json`
Complete match schedule with 120 matches showing red and blue alliance team assignments.

### `pitScoutingData.json`
Sample pit scouting entries for various teams.

### `scoutProfiles.json`
Demo scout profiles with achievements and statistics.

### `matchScoutingData.json`
Sample match scouting data entries.

## Usage

### Quick Setup (Browser Console)
```javascript
// Import and run in browser console
import { setupDemoEventTeams } from '@/lib/teamUtils';
setupDemoEventTeams();
```

### Programmatic Setup
```typescript
import { setupDemoEventTeams, clearDemoEventTeams } from '@/lib/teamUtils';
import { createAllTestData } from '@/lib/testDataGenerator';

// Set up just event teams
setupDemoEventTeams();

// Or set up all demo data
await createAllTestData();

// Clear event teams
clearDemoEventTeams();
```

### Available Demo Events

After running `setupDemoEventTeams()`, you'll have access to these demo events:

1. **2024dcmp** - FIRST Championship - Washington
   - Source: TBA
   - Teams: All 60 teams from match schedule
   
2. **2024mdbet** - Bethesda Robotics Invitational  
   - Source: TBA
   - Teams: 40 teams (subset)
   
3. **2024vabla** - Blacksburg Regional
   - Source: Nexus (includes pit addresses)
   - Teams: 30 teams (different subset)

## Pit Assignments Page Testing

1. Run the demo setup
2. Navigate to the Pit Assignments page
3. You should see the demo events available in the dropdown
4. Add some scouts in the management section
5. Try different assignment modes:
   - **Sequential**: Assigns teams in order
   - **Spatial**: Uses pit addresses (for Nexus events) 
   - **Manual**: Click to assign individual teams

## Integration with Other Pages

The teams data is designed to work with:

- **Team Statistics Page**: Shows stats for demo teams
- **Strategy Pages**: Uses team lists for analysis
- **Pick List Page**: Uses teams for pick list generation
- **Match Strategy**: References teams in match planning

## Data Persistence

Demo data is stored in localStorage with these keys:
- `tba_event_teams_*` - TBA-style team data
- `nexus_event_teams_*` - Nexus-style team data  
- `nexus_pit_addresses_*` - Pit address mappings for Nexus events

## Cleaning Up

To remove demo data:
```typescript
import { clearDemoEventTeams } from '@/lib/teamUtils';
clearDemoEventTeams();
```

Or clear everything:
```typescript
import { clearAllTestData } from '@/lib/testDataGenerator';
await clearAllTestData();
```
