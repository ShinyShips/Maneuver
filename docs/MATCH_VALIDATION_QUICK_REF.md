# Match Validation Utils - Quick Reference

Quick reference for using the match aggregation utilities.

## Import

```typescript
import {
  aggregateMatchData,
  aggregateEventMatches,
  getMatchDataSummary,
  getScoutAccountability,
  getIncompleteMatches,
  formatAllianceStatsSummary,
  type AllianceStats,
  type AllianceData,
  type AggregatedMatchData,
  type MatchDataSummary,
} from '@/lib/matchValidationUtils';
```

## Common Use Cases

### 1. Aggregate a Single Match

```typescript
const matchData = aggregateMatchData('42', '2025mrcmp', allEntries);

// Access red alliance stats
const redCoral = matchData.redAlliance.aggregatedStats.totalCoral;
const redTeams = matchData.redAlliance.teams; // ['1234', '5678', '9012']

// Check completeness
if (matchData.redAlliance.isComplete && matchData.blueAlliance.isComplete) {
  console.log('Match fully scouted!');
}
```

### 2. Get Event Summary

```typescript
const summary = getMatchDataSummary('2025mrcmp', allEntries);

console.log(`Completeness: ${summary.completenessPercentage}%`);
console.log(`Complete: ${summary.completeMatches} / ${summary.totalMatches}`);

// Find incomplete matches
summary.matches.forEach(match => {
  if (!match.redComplete || !match.blueComplete) {
    console.log(`Match ${match.matchNumber} needs more data`);
  }
});
```

### 3. Scout Accountability

```typescript
const scouts = getScoutAccountability(matchData);

scouts.forEach((scoutName, teamNumber) => {
  console.log(`Team ${teamNumber}: ${scoutName}`);
});

// Or convert to object
const scoutMap = Object.fromEntries(scouts);
// { '1234': 'Alice', '5678': 'Bob', ... }
```

### 4. Find Incomplete Matches

```typescript
const incompleteMatches = getIncompleteMatches('2025mrcmp', allEntries);

if (incompleteMatches.length > 0) {
  console.log('Matches needing data:', incompleteMatches.join(', '));
}
```

### 5. Format Stats for Display

```typescript
const summary = formatAllianceStatsSummary(matchData.redAlliance.aggregatedStats);
console.log(summary);
// Output:
// Coral: 24 total (L1:6 L2:8 L3:6 L4:4)
// Algae: 12 total (Net:8 Processor:4)
// Endgame: 2 deep, 1 shallow, 0 parked
// Auto: 3/3 crossed line
```

### 6. Aggregate All Matches

```typescript
const allMatches = aggregateEventMatches('2025mrcmp', allEntries);

allMatches.forEach(match => {
  console.log(`Match ${match.matchNumber}:`);
  console.log(`  Red: ${match.redAlliance.aggregatedStats.totalCoral} coral`);
  console.log(`  Blue: ${match.blueAlliance.aggregatedStats.totalCoral} coral`);
});
```

## Data Structure Overview

### AllianceStats
Complete aggregated statistics for an alliance:
```typescript
{
  // Coral by level (auto)
  autoCoralL1: number,
  autoCoralL2: number,
  autoCoralL3: number,
  autoCoralL4: number,
  autoCoralTotal: number,
  
  // Coral by level (teleop)
  teleopCoralL1: number,
  teleopCoralL2: number,
  teleopCoralL3: number,
  teleopCoralL4: number,
  teleopCoralTotal: number,
  
  // Combined coral
  totalCoralL1: number,
  totalCoralL2: number,
  totalCoralL3: number,
  totalCoralL4: number,
  totalCoral: number,
  
  // Algae (auto)
  autoAlgaeNet: number,
  autoAlgaeProcessor: number,
  autoAlgaeTotal: number,
  
  // Algae (teleop)
  teleopAlgaeNet: number,
  teleopAlgaeProcessor: number,
  teleopAlgaeTotal: number,
  
  // Combined algae
  totalAlgaeNet: number,
  totalAlgaeProcessor: number,
  totalAlgae: number,
  
  // Endgame
  deepClimbs: number,      // Count 0-3
  shallowClimbs: number,   // Count 0-3
  parks: number,           // Count 0-3
  noEndgame: number,       // Count 0-3
  climbFailures: number,   // For tracking only
  
  // Auto
  teamsPassedStartLine: number,  // Count 0-3
  
  // Other (not validated)
  breakdowns: number,
  defensePlayedCount: number,
}
```

### AllianceData
Alliance with teams and aggregated stats:
```typescript
{
  teams: string[],              // ['1234', '5678', '9012']
  entries: ScoutingEntry[],     // Individual team entries
  aggregatedStats: AllianceStats,
  scoutNames: string[],         // ['Alice', 'Bob', 'Charlie']
  missingTeams: string[],       // Teams without data (populated in Phase 2)
  isComplete: boolean,          // True if 3 teams have data
}
```

### AggregatedMatchData
Complete match with both alliances:
```typescript
{
  matchNumber: string,
  eventName: string,
  matchKey: string,             // 'e.g., '2025mrcmp_qm42'
  redAlliance: AllianceData,
  blueAlliance: AllianceData,
  timestamp: Date,              // When aggregation was performed
}
```

## Tips

### Filtering by Alliance
```typescript
// Get only red alliance entries for a match
const redEntries = allEntries.filter(e => 
  e.matchNumber === '42' && 
  e.eventName === '2025mrcmp' &&
  e.alliance.toLowerCase().includes('red')
);
```

### Checking Data Quality
```typescript
// Check if any team broke down
if (matchData.redAlliance.aggregatedStats.breakdowns > 0) {
  console.log('Red alliance had breakdowns!');
}

// Check auto line performance
const autoLinePct = (matchData.blueAlliance.aggregatedStats.teamsPassedStartLine / 3) * 100;
console.log(`Blue auto line: ${autoLinePct}%`);
```

### Custom Aggregations
```typescript
// Calculate total game pieces placed
const totalPieces = 
  stats.totalCoral +  // All coral
  stats.totalAlgae;   // All algae

// Calculate average coral per team
const avgCoralPerTeam = stats.totalCoral / 3;
```

### Comparing Alliances
```typescript
const match = aggregateMatchData('42', '2025mrcmp', allEntries);

const redScore = match.redAlliance.aggregatedStats.totalCoral;
const blueScore = match.blueAlliance.aggregatedStats.totalCoral;

if (redScore > blueScore) {
  console.log(`Red led in coral: ${redScore} vs ${blueScore}`);
}
```

## Next Steps

Once Phase 2 (TBA Integration) is complete, you'll be able to:
- Compare aggregated stats directly with TBA official data
- Identify discrepancies automatically
- Populate `missingTeams` arrays with actual team numbers from TBA
- Generate validation reports

---

For complete documentation, see:
- `docs/MATCH_VALIDATION_SYSTEM.md` - Full system design
- `src/lib/matchValidationUtils.ts` - Source code with JSDoc
- `src/lib/matchValidationUtils.test.ts` - Usage examples
