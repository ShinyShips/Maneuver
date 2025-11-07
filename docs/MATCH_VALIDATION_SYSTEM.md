# Match Data Validation System

## Overview
A system to aggregate individual scouting entries by match and alliance, compare them against official TBA (The Blue Alliance) API data, and flag discrepancies for potential re-scouting.

## Purpose
- **Data Quality Assurance**: Identify potential scouting errors by comparing scout-recorded data with official match results
- **Scout Accountability**: Track which scouts recorded each team's data for accuracy feedback
- **Strategic Reliability**: Ensure strategy decisions are based on accurate data
- **Continuous Improvement**: Help scouts learn and improve through constructive feedback

## Key Features

### 🎯 Core Capabilities
- **Match-by-Match Validation**: Compare scouted data vs TBA official data for each match
- **Alliance-Level Aggregation**: Combine 3 teams per alliance into cohesive match view
- **Scout Accountability**: Display scout names for each team entry
- **Easy Re-scouting**: Load existing data into form, edit only incorrect fields
- **Customizable Thresholds**: User-configurable acceptable error margins
- **Offline Viewing**: View matches and data without internet (validation requires online)
- **Public Access**: All users can view validation (encourages team-wide data quality ownership)

### 🔍 What Gets Validated
✅ **Validated Against TBA:**
- Coral counts by level (L1/L2/L3/L4) for auto and teleop
- Algae net shots and processor placements
- Auto line crossings (count per alliance)
- Endgame status (deep climb, shallow climb, park counts)

❌ **Not Validated (Scout-Only Insights):**
- Pickup locations, dropped pieces, defense, breakdowns
- Climb failure attempts (useful for reliability tracking)

### ⚙️ User Experience
- **No Complex Permissions**: Everyone sees validation data
- **Focus on Current Event**: No historical data clutter
- **Configurable Settings**: Adjust thresholds as season progresses
- **Scout Training Tool**: Pattern detection for constructive feedback
- **Penalty Context**: Show TBA penalties to explain score differences

## Quick Reference: TBA API Mappings

### Coral Levels
- **L4** (Top Row) → `autoReef.tba_topRowCount` / `teleopReef.tba_topRowCount`
- **L3** (Mid Row) → `autoReef.tba_midRowCount` / `teleopReef.tba_midRowCount`
- **L2** (Bottom Row) → `autoReef.tba_botRowCount` / `teleopReef.tba_botRowCount`
- **L1** (Trough) → `autoReef.trough` / `teleopReef.trough`

### Algae
- **Net Shots** → `netAlgaeCount` (combined auto + teleop)
- **Processor** → `wallAlgaeCount` (combined auto + teleop)

### Endgame
- **Deep Climb** → Count of `endGameRobotX = "DeepCage"`
- **Shallow Climb** → Count of `endGameRobotX = "ShallowCage"`
- **Park** → Count of `endGameRobotX = "Parked"`

### Auto
- **Crossed Start Line** → Count of `autoLineRobotX = "Yes"`

### Key Insights
- TBA combines auto + teleop for algae (we track separately for strategic analysis)
- TBA tracks per-robot endgame status (we aggregate to alliance level)
- We validate using **counts** (not points) for accuracy across varying scoring rules
- Scout-only data (pickups, drops, defense) cannot be validated but remains valuable

---

## Core Functionality

### 1. Match Data Aggregation
**Goal**: Combine individual team scouting entries into complete match views

#### Data Structure
```typescript
interface AggregatedMatchData {
  matchNumber: number;
  eventName: string;
  redAlliance: {
    teams: number[];  // [team1, team2, team3]
    entries: ScoutingEntry[];  // One entry per team
    aggregatedStats: AllianceStats;
  };
  blueAlliance: {
    teams: number[];
    entries: ScoutingEntry[];
    aggregatedStats: AllianceStats;
  };
  officialData?: TBAMatchData;  // From TBA API
  validationResults?: ValidationResults;
}

interface AllianceStats {
  // Coral Stats by Level (Auto)
  autoCoralL1: number;
  autoCoralL2: number;
  autoCoralL3: number;
  autoCoralL4: number;
  autoCoralTotal: number;
  
  // Coral Stats by Level (Teleop)
  teleopCoralL1: number;
  teleopCoralL2: number;
  teleopCoralL3: number;
  teleopCoralL4: number;
  teleopCoralTotal: number;
  
  // Combined Coral Stats
  totalCoralL1: number;
  totalCoralL2: number;
  totalCoralL3: number;
  totalCoralL4: number;
  totalCoral: number;
  
  // Algae Stats (Auto)
  autoAlgaeNet: number;
  autoAlgaeProcessor: number;
  autoAlgaeTotal: number;
  
  // Algae Stats (Teleop)
  teleopAlgaeNet: number;
  teleopAlgaeProcessor: number;
  teleopAlgaeTotal: number;
  
  // Combined Algae Stats
  totalAlgaeNet: number;
  totalAlgaeProcessor: number;
  totalAlgae: number;
  
  // Endgame Stats
  deepClimbs: number;
  shallowClimbs: number;
  parks: number;
  noEndgame: number;  // Count of robots with no endgame action
  climbFailures: number;  // For reliability tracking only (not validated)
  
  // Auto Stats
  teamsPassedStartLine: number;  // Count of teams (0-3)
  
  // Other
  breakdowns: number;  // For tracking only (not validated)
  defensePlayedCount: number;  // For tracking only (not validated)
}
```

#### Aggregation Logic
1. **Query**: Fetch all scouting entries for a specific match number at an event
2. **Group by Alliance**: Separate entries into Red and Blue alliances based on `alliance` field
3. **Validate Completeness**: 
   - Check if all 6 teams have scouting data (3 per alliance)
   - Flag matches with missing data
4. **Calculate Alliance Totals**: Sum up all scoring actions per alliance
5. **Store Missing Teams**: Track which teams lack scouting data

#### Example Aggregation Function
```typescript
function aggregateMatchData(
  matchNumber: number,
  eventName: string,
  entries: ScoutingEntry[]
): AggregatedMatchData {
  // Filter entries for this specific match
  const matchEntries = entries.filter(
    e => e.matchNumber === matchNumber && e.eventName === eventName
  );
  
  // Separate by alliance
  const redEntries = matchEntries.filter(e => e.alliance.toLowerCase().includes('red'));
  const blueEntries = matchEntries.filter(e => e.alliance.toLowerCase().includes('blue'));
  
  // Calculate aggregated stats for each alliance
  const redStats = calculateAllianceStats(redEntries);
  const blueStats = calculateAllianceStats(blueEntries);
  
  return {
    matchNumber,
    eventName,
    redAlliance: {
      teams: redEntries.map(e => e.selectTeam),
      entries: redEntries,
      aggregatedStats: redStats,
    },
    blueAlliance: {
      teams: blueEntries.map(e => e.selectTeam),
      entries: blueEntries,
      aggregatedStats: blueStats,
    },
  };
}

function calculateAllianceStats(entries: ScoutingEntry[]): AllianceStats {
  return {
    // Auto Coral by Level
    autoCoralL1: entries.reduce((sum, e) => sum + e.autoCoralPlaceL1Count, 0),
    autoCoralL2: entries.reduce((sum, e) => sum + e.autoCoralPlaceL2Count, 0),
    autoCoralL3: entries.reduce((sum, e) => sum + e.autoCoralPlaceL3Count, 0),
    autoCoralL4: entries.reduce((sum, e) => sum + e.autoCoralPlaceL4Count, 0),
    autoCoralTotal: entries.reduce((sum, e) => 
      sum + e.autoCoralPlaceL1Count + e.autoCoralPlaceL2Count + 
      e.autoCoralPlaceL3Count + e.autoCoralPlaceL4Count, 0),
    
    // Teleop Coral by Level
    teleopCoralL1: entries.reduce((sum, e) => sum + e.teleopCoralPlaceL1Count, 0),
    teleopCoralL2: entries.reduce((sum, e) => sum + e.teleopCoralPlaceL2Count, 0),
    teleopCoralL3: entries.reduce((sum, e) => sum + e.teleopCoralPlaceL3Count, 0),
    teleopCoralL4: entries.reduce((sum, e) => sum + e.teleopCoralPlaceL4Count, 0),
    teleopCoralTotal: entries.reduce((sum, e) => 
      sum + e.teleopCoralPlaceL1Count + e.teleopCoralPlaceL2Count + 
      e.teleopCoralPlaceL3Count + e.teleopCoralPlaceL4Count, 0),
    
    // Combined Coral
    totalCoralL1: entries.reduce((sum, e) => 
      sum + e.autoCoralPlaceL1Count + e.teleopCoralPlaceL1Count, 0),
    totalCoralL2: entries.reduce((sum, e) => 
      sum + e.autoCoralPlaceL2Count + e.teleopCoralPlaceL2Count, 0),
    totalCoralL3: entries.reduce((sum, e) => 
      sum + e.autoCoralPlaceL3Count + e.teleopCoralPlaceL3Count, 0),
    totalCoralL4: entries.reduce((sum, e) => 
      sum + e.autoCoralPlaceL4Count + e.teleopCoralPlaceL4Count, 0),
    totalCoral: entries.reduce((sum, e) => 
      sum + e.autoCoralPlaceL1Count + e.autoCoralPlaceL2Count + 
      e.autoCoralPlaceL3Count + e.autoCoralPlaceL4Count +
      e.teleopCoralPlaceL1Count + e.teleopCoralPlaceL2Count + 
      e.teleopCoralPlaceL3Count + e.teleopCoralPlaceL4Count, 0),
    
    // Auto Algae
    autoAlgaeNet: entries.reduce((sum, e) => sum + e.autoAlgaePlaceNetShot, 0),
    autoAlgaeProcessor: entries.reduce((sum, e) => sum + e.autoAlgaePlaceProcessor, 0),
    autoAlgaeTotal: entries.reduce((sum, e) => 
      sum + e.autoAlgaePlaceNetShot + e.autoAlgaePlaceProcessor, 0),
    
    // Teleop Algae
    teleopAlgaeNet: entries.reduce((sum, e) => sum + e.teleopAlgaePlaceNetShot, 0),
    teleopAlgaeProcessor: entries.reduce((sum, e) => sum + e.teleopAlgaePlaceProcessor, 0),
    teleopAlgaeTotal: entries.reduce((sum, e) => 
      sum + e.teleopAlgaePlaceNetShot + e.teleopAlgaePlaceProcessor, 0),
    
    // Combined Algae
    totalAlgaeNet: entries.reduce((sum, e) => 
      sum + e.autoAlgaePlaceNetShot + e.teleopAlgaePlaceNetShot, 0),
    totalAlgaeProcessor: entries.reduce((sum, e) => 
      sum + e.autoAlgaePlaceProcessor + e.teleopAlgaePlaceProcessor, 0),
    totalAlgae: entries.reduce((sum, e) => 
      sum + e.autoAlgaePlaceNetShot + e.autoAlgaePlaceProcessor +
      e.teleopAlgaePlaceNetShot + e.teleopAlgaePlaceProcessor, 0),
    
    // Endgame
    deepClimbs: entries.filter(e => e.deepClimbAttempted).length,
    shallowClimbs: entries.filter(e => e.shallowClimbAttempted).length,
    parks: entries.filter(e => e.parkAttempted).length,
    noEndgame: entries.filter(e => 
      !e.deepClimbAttempted && !e.shallowClimbAttempted && !e.parkAttempted
    ).length,
    climbFailures: entries.filter(e => e.climbFailed).length,
    
    // Auto
    teamsPassedStartLine: entries.filter(e => e.autoPassedStartLine).length,
    
    // Other (not validated)
    breakdowns: entries.filter(e => e.brokeDown).length,
    defensePlayedCount: entries.filter(e => e.playedDefense).length,
  };
}
```

---

### 2. TBA API Integration

#### Data Points to Compare
Based on TBA's match data structure:

**Score Breakdown Comparison:**
- **Total Score**: Compare TBA alliance score with calculated score from scouting data
- **Auto Points**: Compare auto period scoring
- **Teleop Points**: Compare teleop period scoring
- **Endgame Points**: Compare climb/park points
- **Coral Scoring**: Compare coral placement counts (if available in TBA breakdown)
- **Algae Scoring**: Compare algae scoring counts (if available)
- **Penalties**: Check for fouls that might explain score differences

#### TBA Data Structure (Actual from API)
```typescript
interface TBAMatchData {
  match_number: number;
  comp_level: string;  // "qm" (quals), "qf", "sf", "f" (finals)
  event_key: string;
  key: string;  // e.g., "2025mrcmp_f1m1"
  alliances: {
    red: {
      score: number;
      team_keys: string[];  // ["frc1234", "frc5678", "frc9012"]
      dq_team_keys: string[];
      surrogate_team_keys: string[];
    };
    blue: {
      score: number;
      team_keys: string[];
      dq_team_keys: string[];
      surrogate_team_keys: string[];
    };
  };
  score_breakdown: {
    red: TBAScoreBreakdown;
    blue: TBAScoreBreakdown;
  };
  winning_alliance: "red" | "blue" | "";
  time: number;  // Unix timestamp
  actual_time: number;
  videos?: Array<{ key: string; type: string }>;
}

interface TBAScoreBreakdown {
  // Total Points
  totalPoints: number;
  autoPoints: number;
  teleopPoints: number;
  adjustPoints: number;
  foulPoints: number;
  
  // Coral Scoring
  autoCoralCount: number;  // Total auto coral (for reference/tiebreaker)
  autoCoralPoints: number;
  teleopCoralCount: number;  // Total teleop coral
  teleopCoralPoints: number;
  
  // Coral Placement by Level (Auto)
  autoReef: {
    topRow: { nodeA: boolean; nodeB: boolean; /* ... */ nodeL: boolean };  // L4
    midRow: { nodeA: boolean; nodeB: boolean; /* ... */ nodeL: boolean };  // L3
    botRow: { nodeA: boolean; nodeB: boolean; /* ... */ nodeL: boolean };  // L2
    trough: number;  // L1 count
    tba_topRowCount: number;  // Calculated count of topRow nodes
    tba_midRowCount: number;  // Calculated count of midRow nodes
    tba_botRowCount: number;  // Calculated count of botRow nodes
  };
  
  // Coral Placement by Level (Teleop)
  teleopReef: {
    topRow: { nodeA: boolean; nodeB: boolean; /* ... */ nodeL: boolean };  // L4
    midRow: { nodeA: boolean; nodeB: boolean; /* ... */ nodeL: boolean };  // L3
    botRow: { nodeA: boolean; nodeB: boolean; /* ... */ nodeL: boolean };  // L2
    trough: number;  // L1 count
    tba_topRowCount: number;
    tba_midRowCount: number;
    tba_botRowCount: number;
  };
  
  // Algae Scoring
  algaePoints: number;
  netAlgaeCount: number;      // Net shots (auto + teleop combined)
  wallAlgaeCount: number;     // Processor placements (auto + teleop combined)
  
  // Auto Mobility
  autoLineRobot1: "Yes" | "No";
  autoLineRobot2: "Yes" | "No";
  autoLineRobot3: "Yes" | "No";
  autoMobilityPoints: number;
  
  // Endgame
  endGameRobot1: "DeepCage" | "ShallowCage" | "Parked" | "None";
  endGameRobot2: "DeepCage" | "ShallowCage" | "Parked" | "None";
  endGameRobot3: "DeepCage" | "ShallowCage" | "Parked" | "None";
  endGameBargePoints: number;
  
  // Bonuses & Achievements
  autoBonusAchieved: boolean;
  coralBonusAchieved: boolean;
  bargeBonusAchieved: boolean;
  coopertitionCriteriaMet: boolean;
  
  // Penalties
  foulCount: number;
  techFoulCount: number;
  g206Penalty: boolean;
  g410Penalty: boolean;
  g418Penalty: boolean;
  g428Penalty: boolean;
  
  // Ranking Points
  rp: number;
}
```

---

### 3. Field Mapping: Scouting Data → TBA API

This section defines the exact mappings between our scouting data and TBA's official data.

#### ✅ Fields We Can Validate

| Category | Our Field(s) | TBA Field(s) | Calculation | Notes |
|----------|-------------|--------------|-------------|-------|
| **Coral Levels (Auto)** | `autoCoralPlaceL4Count` | `autoReef.tba_topRowCount` | Direct comparison | L4 = Top Row |
| | `autoCoralPlaceL3Count` | `autoReef.tba_midRowCount` | Direct comparison | L3 = Mid Row |
| | `autoCoralPlaceL2Count` | `autoReef.tba_botRowCount` | Direct comparison | L2 = Bottom Row |
| | `autoCoralPlaceL1Count` | `autoReef.trough` | Direct comparison | L1 = Trough |
| **Coral Levels (Teleop)** | `teleopCoralPlaceL4Count` | `teleopReef.tba_topRowCount` | Direct comparison | L4 = Top Row |
| | `teleopCoralPlaceL3Count` | `teleopReef.tba_midRowCount` | Direct comparison | L3 = Mid Row |
| | `teleopCoralPlaceL2Count` | `teleopReef.tba_botRowCount` | Direct comparison | L2 = Bottom Row |
| | `teleopCoralPlaceL1Count` | `teleopReef.trough` | Direct comparison | L1 = Trough |
| **Total Coral (Auto)** | Sum of L1-L4 auto | `autoCoralCount` | Sum vs TBA total | Fallback if level data missing |
| **Total Coral (Teleop)** | Sum of L1-L4 teleop | `teleopCoralCount` | Sum vs TBA total | Fallback if level data missing |
| **Total Coral (Match)** | Sum of all L1-L4 | `autoCoralCount + teleopCoralCount` | Grand total comparison | Primary validation metric |
| **Algae Net Shots** | `autoAlgaePlaceNetShot + teleopAlgaePlaceNetShot` | `netAlgaeCount` | Sum auto+teleop vs TBA | TBA combines periods |
| **Algae Processor** | `autoAlgaePlaceProcessor + teleopAlgaePlaceProcessor` | `wallAlgaeCount` | Sum auto+teleop vs TBA | TBA combines periods |
| **Total Algae** | Sum of net + processor | `netAlgaeCount + wallAlgaeCount` | Grand total | |
| **Auto Line Crossed** | Count of `autoPassedStartLine = true` | Count of `autoLineRobotX = "Yes"` | Count comparison per alliance | 0-3 robots per alliance |
| **Deep Climbs** | Count of `deepClimbAttempted = true` | Count of `endGameRobotX = "DeepCage"` | Count comparison per alliance | 0-3 robots per alliance |
| **Shallow Climbs** | Count of `shallowClimbAttempted = true` | Count of `endGameRobotX = "ShallowCage"` | Count comparison per alliance | 0-3 robots per alliance |
| **Parks** | Count of `parkAttempted = true` | Count of `endGameRobotX = "Parked"` | Count comparison per alliance | 0-3 robots per alliance |
| **No Endgame** | None checked | `endGameRobotX = "None"` | Implied by absence | Not explicitly tracked |
| **Total Alliance Score** | Calculated from all actions | `alliances.red/blue.score` | Calculated vs official | High-level validation |

#### ❌ Fields We Cannot Validate (Scout-Only Data)

These fields provide valuable strategic insights but cannot be verified against TBA data:

| Field Category | Fields | Reason |
|----------------|--------|--------|
| **Pickup Locations** | `autoCoralPickPreloadCount`, `autoCoralPickStationCount`, `autoCoralPickMark1/2/3Count`, `teleopCoralPickStationCount`, `teleopCoralPickCarpetCount`, `autoAlgaePickReefCount`, `autoAlgaePickMark1/2/3Count`, `teleopAlgaePickReefCount`, `teleopAlgaePickCarpetCount` | TBA doesn't track where game pieces were acquired |
| **Missed/Dropped Pieces** | `autoCoralPlaceDropMissCount`, `teleopCoralPlaceDropMissCount`, `autoAlgaePlaceDropMiss`, `teleopAlgaePlaceDropMiss` | TBA only tracks successful placements |
| **Algae Removed** | `autoAlgaePlaceRemove`, `teleopAlgaePlaceRemove` | Not tracked by TBA |
| **Defense** | `playedDefense` | Subjective observation, not in official data |
| **Breakdowns** | `brokeDown` | Not officially recorded (though may correlate with "None" endgame) |
| **Climb Failures** | `climbFailed` | TBA doesn't distinguish between attempted and successful climbs; failed climb often results in "Parked" or "None" |
| **Start Position** | `startPoses0-5` | Not tracked by TBA |
| **Scout Info** | `scoutName`, `comment` | Scout metadata |

#### 🔍 Special Validation Cases

**Case 1: Climb Failed**
- Our data: `climbFailed = true`, possibly with `parkAttempted = true`
- TBA data: Likely shows `"Parked"` or `"None"`
- Validation: Cannot verify the *failure*, but can verify the end result
- Use: Track for team reliability metrics, but don't flag as discrepancy

**Case 2: Off-Season Scoring Rules**
- Some off-season events modify point values
- Our validation uses **counts** (pieces placed) rather than points
- This ensures accuracy regardless of scoring rule variations

**Case 3: Penalties & Fouls**
- TBA tracks: `foulCount`, `techFoulCount`, `foulPoints`
- We don't track penalties in scouting
- Large score deltas may be explained by penalties (check TBA data in discrepancy report)

**Case 4: Missing Scouting Data**
- If one or more teams in an alliance lack scouting entries
- Cannot aggregate alliance data
- Flag as "Incomplete" rather than "Discrepancy"
- Prioritize getting missing data before validation

---

### 4. Validation & Comparison Logic

#### Validation Thresholds
Define acceptable delta ranges for flagging discrepancies:

```typescript
interface ValidationThresholds {
  totalScore: {
    warning: number;    // e.g., 10 points difference
    critical: number;   // e.g., 25 points difference
  };
  // Coral counts (by level or total)
  coralL1: {
    warning: number;    // e.g., 1 piece difference
    critical: number;   // e.g., 3 pieces difference
  };
  coralL2: {
    warning: number;    // e.g., 1 piece difference
    critical: number;   // e.g., 3 pieces difference
  };
  coralL3: {
    warning: number;    // e.g., 2 pieces difference
    critical: number;   // e.g., 4 pieces difference
  };
  coralL4: {
    warning: number;    // e.g., 2 pieces difference
    critical: number;   // e.g., 4 pieces difference
  };
  coralTotal: {
    warning: number;    // e.g., 3 pieces difference
    critical: number;   // e.g., 8 pieces difference
  };
  // Algae counts
  algaeNet: {
    warning: number;    // e.g., 2 pieces difference
    critical: number;   // e.g., 5 pieces difference
  };
  algaeProcessor: {
    warning: number;    // e.g., 1 piece difference
    critical: number;   // e.g., 3 pieces difference
  };
  algaeTotal: {
    warning: number;    // e.g., 2 pieces difference
    critical: number;   // e.g., 5 pieces difference
  };
  // Endgame (count of robots, 0-3)
  endgameCount: {
    warning: number;    // e.g., 1 robot difference
    critical: number;   // e.g., 2 robots difference
  };
  // Auto line (count of robots, 0-3)
  autoLineCount: {
    warning: number;    // e.g., 1 robot difference
    critical: number;   // e.g., 2 robots difference
  };
}

const DEFAULT_THRESHOLDS: ValidationThresholds = {
  totalScore: { warning: 10, critical: 25 },
  coralL1: { warning: 1, critical: 3 },
  coralL2: { warning: 1, critical: 3 },
  coralL3: { warning: 2, critical: 4 },
  coralL4: { warning: 2, critical: 4 },
  coralTotal: { warning: 3, critical: 8 },
  algaeNet: { warning: 2, critical: 5 },
  algaeProcessor: { warning: 1, critical: 3 },
  algaeTotal: { warning: 2, critical: 5 },
  endgameCount: { warning: 1, critical: 2 },
  autoLineCount: { warning: 1, critical: 2 },
};
```

#### Validation Results
```typescript
interface ValidationResults {
  matchNumber: number;
  eventName: string;
  timestamp: Date;
  overallStatus: "perfect" | "good" | "warning" | "critical" | "incomplete";
  
  redAlliance: AllianceValidation;
  blueAlliance: AllianceValidation;
  
  recommendations: ValidationRecommendation[];
}

interface AllianceValidation {
  color: "red" | "blue";
  dataComplete: boolean;  // All 3 teams have data
  missingTeams: number[];
  
  scoreDelta: number;  // TBA score - calculated score
  scoreDeltaStatus: "good" | "warning" | "critical";
  
  discrepancies: Discrepancy[];
}

interface Discrepancy {
  category: "coral" | "algae" | "climb" | "auto" | "total";
  field: string;  // e.g., "totalCoralL3", "deepClimbs"
  scoutedValue: number;
  officialValue: number;
  delta: number;
  severity: "warning" | "critical";
  message: string;  // Human-readable explanation
}

interface ValidationRecommendation {
  priority: "high" | "medium" | "low";
  alliance: "red" | "blue" | "both";
  teams?: number[];  // Specific teams to re-scout (if identifiable)
  message: string;
  action: "rescout" | "review" | "check_penalties" | "ignore";
}
```

#### Comparison Algorithm
```typescript
function validateMatch(
  aggregatedData: AggregatedMatchData,
  tbaData: TBAMatchData,
  thresholds: ValidationThresholds
): ValidationResults {
  // 1. Check data completeness for both alliances
  const redComplete = aggregatedData.redAlliance.entries.length === 3;
  const blueComplete = aggregatedData.blueAlliance.entries.length === 3;
  
  if (!redComplete || !blueComplete) {
    return createIncompleteValidationResult(aggregatedData, tbaData);
  }
  
  // 2. Validate each alliance
  const redValidation = validateAlliance(
    aggregatedData.redAlliance,
    tbaData.score_breakdown.red,
    thresholds
  );
  
  const blueValidation = validateAlliance(
    aggregatedData.blueAlliance,
    tbaData.score_breakdown.blue,
    thresholds
  );
  
  // 3. Calculate expected scores from scouting data (optional, for reference)
  const redCalculatedScore = calculateExpectedScore(aggregatedData.redAlliance);
  const blueCalculatedScore = calculateExpectedScore(aggregatedData.blueAlliance);
  
  // 4. Determine overall status
  const overallStatus = determineOverallStatus(redValidation, blueValidation);
  
  // 5. Generate recommendations
  const recommendations = generateRecommendations(
    redValidation,
    blueValidation,
    tbaData
  );
  
  return {
    matchNumber: aggregatedData.matchNumber,
    eventName: aggregatedData.eventName,
    timestamp: new Date(),
    overallStatus,
    redAlliance: redValidation,
    blueAlliance: blueValidation,
    recommendations,
    tbaMatchKey: tbaData.key,
  };
}

function validateAlliance(
  allianceData: { teams: number[]; entries: ScoutingEntry[]; aggregatedStats: AllianceStats },
  tbaBreakdown: TBAScoreBreakdown,
  thresholds: ValidationThresholds
): AllianceValidation {
  const discrepancies: Discrepancy[] = [];
  
  // Validate Coral by Level (Auto)
  discrepancies.push(...validateCoralLevel(
    "auto", "L4",
    allianceData.aggregatedStats.autoCoralL4,
    tbaBreakdown.autoReef.tba_topRowCount,
    thresholds.coralL4
  ));
  discrepancies.push(...validateCoralLevel(
    "auto", "L3",
    allianceData.aggregatedStats.autoCoralL3,
    tbaBreakdown.autoReef.tba_midRowCount,
    thresholds.coralL3
  ));
  discrepancies.push(...validateCoralLevel(
    "auto", "L2",
    allianceData.aggregatedStats.autoCoralL2,
    tbaBreakdown.autoReef.tba_botRowCount,
    thresholds.coralL2
  ));
  discrepancies.push(...validateCoralLevel(
    "auto", "L1",
    allianceData.aggregatedStats.autoCoralL1,
    tbaBreakdown.autoReef.trough,
    thresholds.coralL1
  ));
  
  // Validate Coral by Level (Teleop)
  discrepancies.push(...validateCoralLevel(
    "teleop", "L4",
    allianceData.aggregatedStats.teleopCoralL4,
    tbaBreakdown.teleopReef.tba_topRowCount,
    thresholds.coralL4
  ));
  discrepancies.push(...validateCoralLevel(
    "teleop", "L3",
    allianceData.aggregatedStats.teleopCoralL3,
    tbaBreakdown.teleopReef.tba_midRowCount,
    thresholds.coralL3
  ));
  discrepancies.push(...validateCoralLevel(
    "teleop", "L2",
    allianceData.aggregatedStats.teleopCoralL2,
    tbaBreakdown.teleopReef.tba_botRowCount,
    thresholds.coralL2
  ));
  discrepancies.push(...validateCoralLevel(
    "teleop", "L1",
    allianceData.aggregatedStats.teleopCoralL1,
    tbaBreakdown.teleopReef.trough,
    thresholds.coralL1
  ));
  
  // Validate Total Coral
  const totalCoralScouted = allianceData.aggregatedStats.totalCoral;
  const totalCoralTBA = tbaBreakdown.autoCoralCount + tbaBreakdown.teleopCoralCount;
  discrepancies.push(...validateCount(
    "coral", "Total Coral",
    totalCoralScouted,
    totalCoralTBA,
    thresholds.coralTotal
  ));
  
  // Validate Algae
  discrepancies.push(...validateCount(
    "algae", "Net Shots",
    allianceData.aggregatedStats.totalAlgaeNet,
    tbaBreakdown.netAlgaeCount,
    thresholds.algaeNet
  ));
  discrepancies.push(...validateCount(
    "algae", "Processor",
    allianceData.aggregatedStats.totalAlgaeProcessor,
    tbaBreakdown.wallAlgaeCount,
    thresholds.algaeProcessor
  ));
  
  // Validate Auto Line
  discrepancies.push(...validateCount(
    "auto", "Auto Line Crossed",
    allianceData.aggregatedStats.teamsPassedStartLine,
    countAutoLine(tbaBreakdown),
    thresholds.autoLineCount
  ));
  
  // Validate Endgame
  const endgameCounts = countEndgame(tbaBreakdown);
  discrepancies.push(...validateCount(
    "climb", "Deep Climbs",
    allianceData.aggregatedStats.deepClimbs,
    endgameCounts.deep,
    thresholds.endgameCount
  ));
  discrepancies.push(...validateCount(
    "climb", "Shallow Climbs",
    allianceData.aggregatedStats.shallowClimbs,
    endgameCounts.shallow,
    thresholds.endgameCount
  ));
  discrepancies.push(...validateCount(
    "climb", "Parks",
    allianceData.aggregatedStats.parks,
    endgameCounts.parked,
    thresholds.endgameCount
  ));
  
  // Validate Total Score (high-level check)
  const calculatedScore = calculateExpectedScore(allianceData);
  const scoreDelta = Math.abs(tbaBreakdown.totalPoints - calculatedScore);
  const scoreDeltaStatus = 
    scoreDelta <= thresholds.totalScore.warning ? "good" :
    scoreDelta <= thresholds.totalScore.critical ? "warning" : "critical";
  
  return {
    color: /* determine from alliance data */,
    dataComplete: true,
    missingTeams: [],
    scoreDelta: tbaBreakdown.totalPoints - calculatedScore,
    scoreDeltaStatus,
    discrepancies: discrepancies.filter(d => d !== null),
  };
}

// Helper functions
function countAutoLine(breakdown: TBAScoreBreakdown): number {
  let count = 0;
  if (breakdown.autoLineRobot1 === "Yes") count++;
  if (breakdown.autoLineRobot2 === "Yes") count++;
  if (breakdown.autoLineRobot3 === "Yes") count++;
  return count;
}

function countEndgame(breakdown: TBAScoreBreakdown): { deep: number; shallow: number; parked: number; none: number } {
  const counts = { deep: 0, shallow: 0, parked: 0, none: 0 };
  
  [breakdown.endGameRobot1, breakdown.endGameRobot2, breakdown.endGameRobot3].forEach(status => {
    if (status === "DeepCage") counts.deep++;
    else if (status === "ShallowCage") counts.shallow++;
    else if (status === "Parked") counts.parked++;
    else if (status === "None") counts.none++;
  });
  
  return counts;
}

function validateCount(
  category: string,
  field: string,
  scoutedValue: number,
  officialValue: number,
  threshold: { warning: number; critical: number }
): Discrepancy[] {
  const delta = Math.abs(scoutedValue - officialValue);
  
  if (delta === 0) return [];
  
  const severity = delta <= threshold.warning ? "warning" : "critical";
  const direction = scoutedValue > officialValue ? "over-counted" : "under-counted";
  
  return [{
    category,
    field,
    scoutedValue,
    officialValue,
    delta: scoutedValue - officialValue,
    severity,
    message: `${field}: Scouted ${scoutedValue}, Official ${officialValue} (${direction} by ${delta})`,
  }];
}

function validateCoralLevel(
  period: "auto" | "teleop",
  level: "L1" | "L2" | "L3" | "L4",
  scoutedValue: number,
  officialValue: number,
  threshold: { warning: number; critical: number }
): Discrepancy[] {
  return validateCount(
    "coral",
    `${period === "auto" ? "Auto" : "Teleop"} Coral ${level}`,
    scoutedValue,
    officialValue,
    threshold
  );
}
```

---

### 4. User Interface Design

#### Page Location
**Path**: `/strategy/matches`

#### Layout Components

##### A. Match Selection & Filter
- **Event Selector**: GENERIC selector Dropdown to select event
- **Match Filter**: 
  - All matches
  - Qualification matches only
  - Playoff matches only
  - Matches with issues only
  - Matches missing data
- **Status Filter**: 
  - All
  - Perfect/Good
  - Warnings
  - Critical issues
  - Incomplete data

##### B. Match Overview List
Display matches in a scrollable list/table:

| Match | Red Alliance | Blue Alliance | Status | Score Delta | Actions |
|-------|--------------|---------------|--------|-------------|---------|
| Q1    | 1234, 5678, 9012 | 1111, 2222, 3333 | ✅ Good | +2 | View Details |
| Q2    | 4444, 5555, 6666 | 7777, 8888, 9999 | ⚠️ Warning | -8 | View Details |
| Q3    | ... | ... | ❌ Critical | +18 | View Details |

**Status Indicators:**
- ✅ **Perfect/Good**: Green - within acceptable thresholds
- ⚠️ **Warning**: Yellow - minor discrepancies detected
- ❌ **Critical**: Red - significant discrepancies, recommend re-scout
- 📋 **Incomplete**: Gray - missing scouting data for one or more teams

##### C. Match Detail View (Expanded/Modal)
When clicking "View Details" on a match:

**Section 1: Match Header**
- Match number and type (Qual/Playoff)
- Overall validation status badge
- Timestamp of validation

**Section 2: Alliance Comparison (Side-by-Side)**
```
┌─────────────────────────────┬─────────────────────────────┐
│      RED ALLIANCE           │      BLUE ALLIANCE          │
│  Teams: 1234, 5678, 9012    │  Teams: 1111, 2222, 3333    │
├─────────────────────────────┼─────────────────────────────┤
│  SCOUTED DATA               │  SCOUTED DATA               │
│  Total Score: 145           │  Total Score: 132           │
│  Coral: 18 pieces           │  Coral: 15 pieces           │
│  Algae: 12 pieces           │  Algae: 10 pieces           │
│  Climbs: 2 Deep, 1 Shallow  │  Climbs: 1 Deep, 2 Shallow  │
├─────────────────────────────┼─────────────────────────────┤
│  TBA OFFICIAL               │  TBA OFFICIAL               │
│  Total Score: 143 (-2) ✅   │  Total Score: 140 (+8) ⚠️   │
│  Coral Points: ... ✅       │  Coral Points: ... ⚠️       │
│  Algae Points: ... ✅       │  Algae Points: ... ❌       │
└─────────────────────────────┴─────────────────────────────┘
```

**Section 3: Detailed Discrepancies**
Table/list showing each discrepancy:
- Category (Coral, Algae, Climb, etc.)
- Field name
- Scouted value vs Official value
- Delta (with color coding)
- Severity badge

**Section 4: Individual Team Breakdown**
Expandable sections for each team showing:
- Team number
- **Scout name** (critical for accountability - from `scoutName` field)
- Quick stats summary
- Link to view full match data (using existing `MatchStatsButton`)
- **"Load for Re-scout" button**: Opens scouting interface pre-filled with this match's data for editing

**Section 5: Recommendations**
- Priority-sorted list of recommended actions
- **"Re-scout Match"** button (with specific teams highlighted if identifiable)
  - Opens scouting interface with existing data loaded
  - User can edit specific fields without starting from scratch
- **"Mark as Reviewed"** button (acknowledges discrepancy without re-scouting)
- Notes field for recording investigation results
- Show TBA penalty data if penalties exist (helps explain score deltas)

**Section 6: Scout Performance Insights** (Expandable)
When a match has discrepancies, show:
- Which scout(s) may have contributed to the discrepancy
- Pattern detection: Does this scout consistently over/under-count certain actions?
- **Use for training, not punishment**: Constructive feedback approach
- Links to other matches scouted by the same person for pattern analysis

##### D. Statistics Dashboard
Summary cards showing:
- **Total Matches Validated**: X / Y
- **Data Completeness**: 95% (matches with all 6 teams scouted)
- **Accuracy Rate**: 87% (matches within thresholds)
- **Matches Needing Attention**: 5
- **Average Score Delta**: +/- 3.2 points

**Scout-specific stats** (optional view):
- Accuracy rate by scout
- Most common error types per scout
- Improvement trends over event

##### E. Settings Panel
User-configurable settings:
- **Validation Thresholds**: Adjust warning/critical levels for each metric
  - Total score delta
  - Coral counts (per level and total)
  - Algae counts
  - Endgame counts
  - Auto line counts
- **Display Options**:
  - Show/hide penalty information
  - Show/hide scout performance data
  - Compact vs detailed view
- **Export Options**:
  - Export validation report as PDF/CSV
  - Include/exclude scout names in exports

---

### 5. Implementation Plan

#### Phase 1: Data Aggregation (Foundation) ✅ COMPLETE
- [x] Create aggregation utilities in `src/lib/matchValidationUtils.ts`
- [x] Implement match data grouping by alliance
- [x] Build alliance statistics calculator
- [x] Handle missing data scenarios
- [x] Add test utilities and examples
- [x] Type definitions for all data structures

**Files Created:**
- `src/lib/matchValidationUtils.ts` - Core aggregation logic
- `src/lib/matchValidationUtils.test.ts` - Test utilities and examples

**Key Functions:**
- `aggregateMatchData()` - Aggregate single match by alliance
- `aggregateEventMatches()` - Aggregate all matches for an event
- `calculateAllianceStats()` - Calculate alliance-level statistics
- `getMatchDataSummary()` - Get event data completeness summary
- `getScoutAccountability()` - Map teams to scouts
- `getIncompleteMatches()` - Find matches needing more data

#### Phase 2: TBA Integration ✅ COMPLETE
- [x] Extend TBA data utilities with match detail fetching
- [x] Add match detail fetch function with score breakdowns
- [x] Parse score breakdown data (coral, algae, endgame)
- [x] Cache TBA data in IndexedDB
- [x] Handle API rate limiting with caching
- [x] Create React hook for easy integration

**Files Created:**
- `src/lib/tbaMatchData.ts` - TBA API functions and type definitions
- `src/lib/tbaCache.ts` - IndexedDB caching layer
- `src/hooks/useTBAMatchData.ts` - React hook for components

**Key Functions:**
- `fetchTBAMatchDetail()` - Fetch single match with breakdown
- `fetchTBAEventMatchesDetailed()` - Fetch all matches for event
- `cacheTBAMatches()` - Store matches in IndexedDB
- `getCachedTBAMatch()` - Retrieve from cache
- `extractTeamNumbers()` - Convert "frc1234" to "1234"
- `countAutoLine()` - Count robots that crossed line
- `countEndgame()` - Count endgame statuses
- `useTBAMatchData()` - React hook with auto-caching

#### Phase 3: Validation Logic (Next)
- [ ] Implement comparison algorithm
- [ ] Define and configure default thresholds (easily modifiable)
- [ ] Build discrepancy detection
- [ ] Generate recommendations
- [ ] Create validation result types
- [ ] Implement scout accountability tracking

#### Phase 4: UI Components
- [ ] Create base page layout
- [ ] Build match list/table component
- [ ] Implement match detail view with scout names
- [ ] Add filtering and sorting
- [ ] Create status badges and indicators
- [ ] Build statistics dashboard
- [ ] Add scout performance insights section

#### Phase 5: Settings & Configuration
- [ ] Create threshold configuration UI
- [ ] Implement settings storage (IndexedDB/localStorage)
- [ ] Add display options (penalties, scout data, compact view)
- [ ] Build settings import/export functionality
- [ ] Add help tooltips explaining thresholds

#### Phase 6: Re-scouting Workflow
- [ ] Implement "Load for Re-scout" functionality
- [ ] Pre-fill scouting form with existing entry data
- [ ] Track re-scouted entries (`isRescout` flag)
- [ ] Link to original entries
- [ ] Auto-revalidate after re-scout

#### Phase 7: Integration & Polish
- [ ] Add navigation link in Strategy section
- [ ] Add offline handling (view-only mode)
- [ ] Add export functionality (validation reports)
- [ ] Integrate penalty data display from TBA
- [ ] Add help tooltips and documentation
- [ ] Performance optimization
- [ ] Add loading states and error boundaries

#### Phase 8: Advanced Features (Future)
- [ ] Historical validation tracking (if needed)
- [ ] Scout accuracy scoring system
- [ ] Automatic notification system
- [ ] Bulk validation operations
- [ ] Machine learning to predict likely errors
- [ ] Video review integration
- [ ] Add help tooltips and documentation
- [ ] Performance optimization

#### Phase 6: Advanced Features (Future)
- [ ] Historical validation tracking
- [ ] Scout accuracy scoring
- [ ] Automatic notification system
- [ ] Bulk validation operations
- [ ] Machine learning to predict likely errors

---

### 6. Technical Considerations

#### Database Schema Updates
May need to extend `scoutingEntries` table:
```typescript
interface ScoutingEntryExtended extends ScoutingEntry {
  validationStatus?: "pending" | "validated" | "flagged" | "reviewed";
  validationNotes?: string;
  lastValidated?: Date;
  isRescout?: boolean;  // Track if this is a re-scouted entry
  originalEntryId?: string;  // Link to original entry if re-scouted
}
```

New table for validation results:
```typescript
interface ValidationRecord {
  id: string;
  matchNumber: number;
  eventName: string;
  timestamp: Date;
  results: ValidationResults;
  reviewed: boolean;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}
```

New table for user threshold settings:
```typescript
interface UserValidationSettings {
  id: string;
  userId?: string;  // Optional: can be per-user or global
  eventName?: string;  // Optional: can be per-event
  thresholds: ValidationThresholds;
  displayOptions: {
    showPenalties: boolean;
    showScoutPerformance: boolean;
    compactView: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

Storage approach:
- Store in IndexedDB alongside other app data
- Use localStorage as fallback for threshold settings
- Default thresholds always available if user settings not found
- Settings can be exported/imported for sharing across team

#### Performance Considerations
- **Caching**: Cache TBA data and validation results
- **Lazy Loading**: Load match details on demand
- **Batch Processing**: Validate multiple matches in background
- **Debouncing**: Avoid re-validation on every data change

#### Error Handling
- TBA API unavailable: Gracefully degrade, show partial data
- Missing scouting data: Clear messaging about incomplete data
- Network issues: Retry logic with user feedback
- Invalid data formats: Robust parsing with fallbacks

---

### 7. User Workflows

#### Workflow 1: Post-Match Validation
1. Scout completes match scouting
2. Data syncs to central database
3. System automatically validates when all 6 teams have data
4. Alerts generated for discrepancies
5. Scout leader reviews flagged matches
6. Re-scouting assigned if needed

#### Workflow 2: Pre-Strategy Validation
1. Strategy team prepares for alliance selection
2. Opens match validation page
3. Reviews data quality across all matches
4. Identifies and resolves critical discrepancies
5. Exports clean data for analysis
6. Proceeds with confident strategy decisions
#### Workflow 3: Re-scouting Process (Critical)
1. Scout lead identifies match with discrepancies in validation page
2. Clicks on specific team's "Load for Re-scout" button
3. Scouting interface opens with all existing data pre-filled
4. Scout reviews TBA data and validation notes to identify issue
5. Edits only the incorrect field(s) (e.g., change "5" to "6" for L3 coral)
6. Saves updated entry (marked as `isRescout: true`)
7. Validation automatically re-runs with new data
8. If still flagged, repeat or mark as "Reviewed" with explanation

**Key Benefits:**
- Fast corrections (seconds instead of re-watching entire match)
- No need to re-enter 50+ correct fields to fix 1 mistake
- Maintains data history (original entry preserved)
- Reduces scout frustration

#### Workflow 4: Scout Training & Feedback
1. Use validation results to identify common errors
2. Provide targeted feedback to scouts (specific error patterns)
3. Track improvement over time per scout
4. Build trust in scouting data
5. Use scout performance view constructively, not punitively

---

### 8. Future Enhancements

#### Advanced Analytics
- **Error Pattern Detection**: Identify systematic issues (e.g., consistently mis-counting L3 coral)
- **Scout Performance Metrics**: Track accuracy by scout for training
- **Confidence Scoring**: Assign confidence levels to aggregated data
- **Predictive Validation**: Flag suspicious patterns before TBA comparison

#### Automation
- **Real-time Validation**: Validate as soon as match concludes
- **Push Notifications**: Alert scouts immediately of discrepancies
- **Auto-correct Suggestions**: ML-based suggestions for likely errors
- **Batch Re-scouting**: Tools for efficient re-scouting of multiple matches

#### Integration
- **Video Review Links**: Deep-link to match video at specific timestamps
- **Cross-reference**: Link to team stats to identify outliers
- **Alliance Selection Tool**: Use validated data directly in pick strategy
- **Export Reports**: Generate validation reports for team leadership

---

## Questions & Decisions

### ✅ Resolved Decisions

1. **Level Mapping**: 
   - L4 = Top Row (`tba_topRowCount`)
   - L3 = Mid Row (`tba_midRowCount`)
   - L2 = Bottom Row (`tba_botRowCount`)
   - L1 = Trough (`trough`)
   
2. **Algae Mapping**: 
   - TBA's `netAlgaeCount` = our `autoAlgaePlaceNetShot + teleopAlgaePlaceNetShot`
   - TBA's `wallAlgaeCount` = our `autoAlgaePlaceProcessor + teleopAlgaePlaceProcessor`
   
3. **Validation Method**: 
   - Use **counts** (pieces) rather than points for accuracy across different scoring rules
   - Calculate coral breakdown from node-by-node data (more accurate than just totals)
   - `autoCoralCount` and `teleopCoralCount` are primarily tiebreaker stats
   
4. **Endgame Aggregation**: 
   - Count boolean flags per alliance (0-3 robots)
   - `climbFailed` tracked for reliability but not validated against TBA (failed climbs often show as "Parked" or "None")
   
5. **Auto Line**: 
   - Count teams with `autoPassedStartLine = true`
   - Compare to count of TBA's `autoLineRobotX = "Yes"`
   
6. **Scout-Only Fields (Not Validated)**: 
   - Pickup locations (Station, Carpet, Mark1/2/3, Reef)
   - Dropped/missed pieces
   - Defense played
   - Breakdowns
   - These remain valuable for strategic insights but cannot be verified

### ✅ Additional Resolved Decisions

7. **Threshold Configuration**:
   - Default thresholds are acceptable for initial implementation
   - Must be designed for easy modification later
   - Users should have settings to customize threshold values
   - Different teams may have different acceptable error rates over a season
   
8. **Re-scouting Workflow**:
   - Make re-scouting as easy as possible
   - Users should be able to "Load" existing match data into the scouting interface
   - Allow editing of specific fields without re-scouting the entire match
   - If only 1 placement was missed, just correct that field
   - **Future enhancement**: Track which fields were edited during re-scout
   
9. **Permissions**:
   - No complex permission system needed
   - All users can view validation results
   - **Benefit**: Engages entire scouting team in data accuracy
   - Promotes collective ownership of data quality
   
10. **Offline Support**:
    - No validation when offline (requires TBA API)
    - Matches and their scouted values remain viewable offline
    - Validation runs when internet connection is restored
    
11. **Historical Data**:
    - Focus only on current event
    - Historical validation can be added later if needed
    - Keeps implementation simpler and more performant
    
12. **Penalties**:
    - Include penalty data from TBA if available
    - Display penalties in discrepancy explanations (helps explain score deltas)
    - Scouts do NOT count penalties
    - Validation focuses on game piece totals, not actual score amounts
    
13. **Scout Accountability**:
    - **Critical**: Display which scout recorded each team's data
    - Scout lead can identify accuracy patterns per scout
    - **Future integration**: Scout performance stats/metrics
    - Use for training and feedback, not punishment
    - Shows scout name from `scoutName` field on each entry

---

## Success Metrics

- **Data Completeness**: >95% of matches have all 6 teams scouted
- **Accuracy Rate**: >90% of matches within acceptable thresholds
- **Response Time**: Discrepancies identified and resolved within 1 hour
- **User Adoption**: Strategy team uses validation before key decisions
- **Error Reduction**: Measurable decrease in scouting errors over time

---

## Notes

- This system complements existing match scouting, doesn't replace it
- Focus on actionable insights, not just data display
- Make it easy for scouts to improve, not punitive
- Balance automation with human judgment
- Consider using existing `MatchStatsButton` component for individual team views

---

## Implementation Checklist

### ✅ Design Decisions (Complete)
- [x] TBA API field mappings defined
- [x] Validation strategy determined (counts vs points)
- [x] Threshold approach established (configurable by user)
- [x] Re-scouting workflow designed (load and edit)
- [x] Permissions decided (public to all users)
- [x] Offline strategy confirmed (view-only)
- [x] Current event focus established
- [x] Scout accountability approach defined
- [x] Penalty display strategy determined

### 🚧 Ready to Implement
All design questions resolved. Ready to begin Phase 1 implementation.

### 📋 Development Phases Summary
1. **Phase 1**: Data aggregation utilities (foundation)
2. **Phase 2**: TBA API integration (fetch match details)
3. **Phase 3**: Validation logic (comparison algorithms)
4. **Phase 4**: UI components (match lists, detail views)
5. **Phase 5**: Settings & configuration (thresholds, display options)
6. **Phase 6**: Re-scouting workflow (load and edit)
7. **Phase 7**: Integration & polish (navigation, offline, exports)
8. **Phase 8**: Advanced features (future enhancements)

---

## Document Status

**Last Updated**: January 2025  
**Status**: Design Complete - Ready for Implementation  
**Next Action**: Begin Phase 1 - Data Aggregation Utilities

All major design decisions have been resolved. This document serves as the complete specification for the Match Data Validation System and can be used as a reference throughout development.