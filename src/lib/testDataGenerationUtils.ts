/**
 * Test Data Generation Utilities
 * 
 * Business logic and calculations for generating realistic test scouting data
 * with controlled discrepancies for validation testing.
 */

import type { ScoutingEntry } from '@/lib/scoutingTypes';

// Scout name pool for test data
export const SCOUT_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];

// Error profiles defining discrepancy rates for different quality levels
export const DISCREPANCY_PROFILES = {
  clean: { coralError: 0, algaeError: 0, endgameError: 0, mobilityError: 0 },
  minor: { coralError: 0.05, algaeError: 0.05, endgameError: 0.03, mobilityError: 0.03 },
  warning: { coralError: 0.10, algaeError: 0.10, endgameError: 0.08, mobilityError: 0.05 },
  critical: { coralError: 0.20, algaeError: 0.20, endgameError: 0.15, mobilityError: 0.10 },
  mixed: { coralError: 0.08, algaeError: 0.08, endgameError: 0.06, mobilityError: 0.05 }
} as const;

// Realistic distribution - most scouts are accurate
export const TEST_DISTRIBUTION = {
  clean: 0.50,      // 50% perfect accuracy
  minor: 0.30,      // 30% one small mistake
  warning: 0.12,    // 12% a few mistakes
  critical: 0.05,   // 5% significant errors
  mixed: 0.03       // 3% multiple types of errors
} as const;

export type DiscrepancyProfile = typeof DISCREPANCY_PROFILES[keyof typeof DISCREPANCY_PROFILES];

export interface TBAMatch {
  event_key: string;
  match_number: number;
  comp_level: string;
  score_breakdown?: {
    red: AllianceBreakdown;
    blue: AllianceBreakdown;
  };
  score_breakdown_2025?: {
    red: AllianceBreakdown;
    blue: AllianceBreakdown;
  };
  alliances: {
    red: { 
      team_keys: string[];
      score: number;
    };
    blue: { 
      team_keys: string[];
      score: number;
    };
  };
}

export interface AllianceBreakdown {
  autoReef?: {
    trough?: number;
    tba_botRowCount?: number;
    tba_midRowCount?: number;
    tba_topRowCount?: number;
  };
  teleopReef?: {
    trough?: number;
    tba_botRowCount?: number;
    tba_midRowCount?: number;
    tba_topRowCount?: number;
  };
  netAlgaeCount?: number;
  wallAlgaeCount?: number;
  endGameRobot1?: string;
  endGameRobot2?: string;
  endGameRobot3?: string;
  endGameBargePoints?: number;
  [key: string]: number | string | object | undefined;
}

/**
 * Apply random error to a value based on error rate
 */
export function applyError(
  value: number, 
  errorRate: number, 
  errorMagnitude: [number, number] = [1, 2]
): number {
  if (Math.random() > errorRate) {
    return value;
  }
  const [minError, maxError] = errorMagnitude;
  const error = Math.floor(Math.random() * (maxError - minError + 1)) + minError;
  const direction = Math.random() > 0.5 ? 1 : -1;
  return Math.max(0, value + (error * direction));
}

/**
 * Select a random profile based on distribution probabilities
 */
export function selectProfile(): { name: string; profile: DiscrepancyProfile } {
  const random = Math.random();
  let cumulative = 0;
  for (const [name, probability] of Object.entries(TEST_DISTRIBUTION)) {
    cumulative += probability;
    if (random < cumulative) {
      return { 
        name, 
        profile: DISCREPANCY_PROFILES[name as keyof typeof DISCREPANCY_PROFILES] 
      };
    }
  }
  return { name: 'mixed', profile: DISCREPANCY_PROFILES.mixed };
}

/**
 * Distribute a count across 3 teams
 */
export function distributeCount(total: number, teamIndex: number): number {
  if (total === 0) return 0;
  const base = Math.floor(total / 3);
  const remainder = total % 3;
  // Distribute remainder to first N teams
  return base + (teamIndex < remainder ? 1 : 0);
}

/**
 * Determine error parameters based on profile
 */
export function getErrorParameters(profile: DiscrepancyProfile): {
  numFieldsWithErrors: number;
  errorMagnitude: [number, number];
} {
  if (profile.coralError === 0) {
    return { numFieldsWithErrors: 0, errorMagnitude: [1, 1] };
  }
  
  if (profile.coralError <= 0.05) {
    // Minor: 1 field, ±1 piece only
    return { numFieldsWithErrors: 1, errorMagnitude: [1, 1] };
  } else if (profile.coralError <= 0.10) {
    // Warning: 1-2 fields, ±1 piece (occasionally ±2)
    return { 
      numFieldsWithErrors: Math.random() < 0.7 ? 1 : 2,
      errorMagnitude: Math.random() < 0.8 ? [1, 1] : [2, 2]
    };
  } else if (profile.coralError <= 0.20) {
    // Critical: 2-3 fields, ±2 pieces (occasionally ±3)
    return { 
      numFieldsWithErrors: Math.random() < 0.5 ? 2 : 3,
      errorMagnitude: Math.random() < 0.7 ? [2, 2] : [3, 3]
    };
  } else {
    // Mixed: 1-2 fields, ±1-2 pieces
    return { 
      numFieldsWithErrors: Math.random() < 0.6 ? 1 : 2,
      errorMagnitude: [1, 2]
    };
  }
}

/**
 * Select random fields to apply errors to
 */
export function selectErrorFields(numFields: number): Set<string> {
  const scoreableFields = [
    'autoCoralPlaceL1Count', 'autoCoralPlaceL2Count', 'autoCoralPlaceL3Count', 'autoCoralPlaceL4Count',
    'teleopCoralPlaceL1Count', 'teleopCoralPlaceL2Count', 'teleopCoralPlaceL3Count', 'teleopCoralPlaceL4Count',
    'autoAlgaePlaceNetShot', 'autoAlgaePlaceProcessor',
    'teleopAlgaePlaceNetShot', 'teleopAlgaePlaceProcessor'
  ];
  
  const fieldsWithErrors = new Set<string>();
  while (fieldsWithErrors.size < numFields && scoreableFields.length > 0) {
    const randomField = scoreableFields[Math.floor(Math.random() * scoreableFields.length)];
    fieldsWithErrors.add(randomField);
  }
  return fieldsWithErrors;
}

/**
 * Generate team-specific scouting data from alliance breakdown
 */
export function generateTeamData(
  alliance: AllianceBreakdown, 
  profile: DiscrepancyProfile, 
  teamIndex: number
) {
  const autoReef = alliance.autoReef || {};
  const teleopReef = alliance.teleopReef || {};
  
  const { numFieldsWithErrors, errorMagnitude } = getErrorParameters(profile);
  const fieldsWithErrors = selectErrorFields(numFieldsWithErrors);
  
  // Helper to conditionally apply error only if field is selected for error
  const conditionalError = (fieldName: string, value: number): number => {
    if (fieldsWithErrors.has(fieldName)) {
      return applyError(value, 1.0, errorMagnitude); // 100% chance of error if field is selected
    }
    return value; // No error
  };
  
  return {
    // Auto coral placement counts - L1=trough, L2=bottom, L3=mid, L4=top
    autoCoralPlaceL1Count: conditionalError('autoCoralPlaceL1Count', distributeCount(autoReef.trough || 0, teamIndex)),
    autoCoralPlaceL2Count: conditionalError('autoCoralPlaceL2Count', distributeCount(autoReef.tba_botRowCount || 0, teamIndex)),
    autoCoralPlaceL3Count: conditionalError('autoCoralPlaceL3Count', distributeCount(autoReef.tba_midRowCount || 0, teamIndex)),
    autoCoralPlaceL4Count: conditionalError('autoCoralPlaceL4Count', distributeCount(autoReef.tba_topRowCount || 0, teamIndex)),
    autoCoralPlaceDropMissCount: 0,
    
    // Auto coral pickup counts (generated/defaults)
    autoCoralPickPreloadCount: 1,
    autoCoralPickStationCount: 0,
    autoCoralPickMark1Count: 0,
    autoCoralPickMark2Count: 0,
    autoCoralPickMark3Count: 0,
    
    // Teleop coral placement counts - NOTE: TBA's teleopReef counts are FINAL counts (include auto), so we must subtract auto
    teleopCoralPlaceL1Count: conditionalError('teleopCoralPlaceL1Count', distributeCount(Math.max(0, (teleopReef.trough || 0) - (autoReef.trough || 0)), teamIndex)),
    teleopCoralPlaceL2Count: conditionalError('teleopCoralPlaceL2Count', distributeCount(Math.max(0, (teleopReef.tba_botRowCount || 0) - (autoReef.tba_botRowCount || 0)), teamIndex)),
    teleopCoralPlaceL3Count: conditionalError('teleopCoralPlaceL3Count', distributeCount(Math.max(0, (teleopReef.tba_midRowCount || 0) - (autoReef.tba_midRowCount || 0)), teamIndex)),
    teleopCoralPlaceL4Count: conditionalError('teleopCoralPlaceL4Count', distributeCount(Math.max(0, (teleopReef.tba_topRowCount || 0) - (autoReef.tba_topRowCount || 0)), teamIndex)),
    teleopCoralPlaceDropMissCount: 0,
    teleopCoralPickStationCount: 0,
    teleopCoralPickCarpetCount: 0,
    
    // Algae placement - TBA uses netAlgaeCount and wallAlgaeCount
    // Split roughly 1/6 auto, 5/6 teleop
    autoAlgaePlaceNetShot: conditionalError('autoAlgaePlaceNetShot', distributeCount(Math.floor((alliance.netAlgaeCount || 0) / 6), teamIndex)),
    autoAlgaePlaceProcessor: conditionalError('autoAlgaePlaceProcessor', distributeCount(Math.floor((alliance.wallAlgaeCount || 0) / 6), teamIndex)),
    autoAlgaePlaceDropMiss: 0,
    autoAlgaePlaceRemove: 0,
    
    // Algae pickup (auto)
    autoAlgaePickReefCount: 0,
    autoAlgaePickMark1Count: 0,
    autoAlgaePickMark2Count: 0,
    autoAlgaePickMark3Count: 0,
    
    // Teleop algae
    teleopAlgaePlaceNetShot: conditionalError('teleopAlgaePlaceNetShot', distributeCount(Math.floor((alliance.netAlgaeCount || 0) * 5 / 6), teamIndex)),
    teleopAlgaePlaceProcessor: conditionalError('teleopAlgaePlaceProcessor', distributeCount(Math.floor((alliance.wallAlgaeCount || 0) * 5 / 6), teamIndex)),
    teleopAlgaePlaceDropMiss: 0,
    teleopAlgaePlaceRemove: 0,
    teleopAlgaePickReefCount: 0,
    teleopAlgaePickCarpetCount: 0,
    
    // Auto mobility
    autoPassedStartLine: Math.random() > 0.3,
    
    // Start positions (randomly select one)
    startPoses0: false,
    startPoses1: false,
    startPoses2: false,
    startPoses3: false,
    startPoses4: false,
    startPoses5: false,
    
    // Defense and breakdown
    playedDefense: false,
    brokeDown: false,
    
    // Comment
    comment: '',
    
    // Endgame - will be overwritten by distributeEndgame
    deepClimbAttempted: false,
    shallowClimbAttempted: false,
    parkAttempted: false,
    climbFailed: false,
  };
}

/**
 * Distribute endgame states across teams with potential errors
 */
export function distributeEndgame(
  alliance: AllianceBreakdown, 
  profile: DiscrepancyProfile
): Array<{ deep: number; shallow: number; park: number }> {
  // Count endgame states from TBA data
  // endGameRobot1/2/3 can be: "DeepCage", "ShallowCage", "Parked", "None"
  let deepCount = 0;
  let shallowCount = 0;
  let parkedCount = 0;
  
  [alliance.endGameRobot1, alliance.endGameRobot2, alliance.endGameRobot3].forEach(status => {
    if (status === 'DeepCage') deepCount++;
    else if (status === 'ShallowCage') shallowCount++;
    else if (status === 'Parked') parkedCount++;
  });

  const states = [
    { deep: 0, shallow: 0, park: 0 },
    { deep: 0, shallow: 0, park: 0 },
    { deep: 0, shallow: 0, park: 0 }
  ];

  // Assign deep climbs
  for (let i = 0; i < Math.min(deepCount, 3); i++) {
    states[i].deep = applyError(1, profile.endgameError, [0, 1]);
  }

  // Assign shallow climbs
  for (let i = 0; i < Math.min(shallowCount, 3 - deepCount); i++) {
    const teamIndex = deepCount + i;
    if (teamIndex < 3) {
      states[teamIndex].shallow = applyError(1, profile.endgameError, [0, 1]);
    }
  }
  
  // Assign parks
  for (let i = 0; i < Math.min(parkedCount, 3 - deepCount - shallowCount); i++) {
    const teamIndex = deepCount + shallowCount + i;
    if (teamIndex < 3) {
      states[teamIndex].park = applyError(1, profile.endgameError, [0, 1]);
    }
  }

  return states;
}

/**
 * Generate complete match data with scouting entries for all teams
 */
export function generateMatchData(
  match: TBAMatch, 
  profileInfo: { name: string; profile: DiscrepancyProfile },
  eventKey: string
): { entries: ScoutingEntry[]; profile: string } {
  const entries: ScoutingEntry[] = [];
  
  // Use score_breakdown_2025 if available, otherwise fall back to score_breakdown
  const breakdown = match.score_breakdown_2025 || match.score_breakdown;
  
  if (!breakdown) {
    console.warn(`Match ${match.match_number} has no score breakdown data`);
    return { entries: [], profile: profileInfo.name };
  }
  
  const redAlliance = match.alliances.red;
  const blueAlliance = match.alliances.blue;
  
  // Generate data for each alliance
  ['red', 'blue'].forEach((allianceColor) => {
    const alliance = allianceColor === 'red' ? redAlliance : blueAlliance;
    const allianceBreakdown = breakdown[allianceColor as 'red' | 'blue'];
    const endgameStates = distributeEndgame(allianceBreakdown, profileInfo.profile);
    
    alliance.team_keys.forEach((teamKey, teamIndex) => {
      const teamNumber = teamKey.replace('frc', '');
      const teamData = generateTeamData(allianceBreakdown, profileInfo.profile, teamIndex);
      const endgame = endgameStates[teamIndex];
      const scoutName = SCOUT_NAMES[Math.floor(Math.random() * SCOUT_NAMES.length)];
      
      const entry: ScoutingEntry = {
        matchNumber: match.match_number.toString(),
        alliance: allianceColor,
        scoutName: scoutName,
        selectTeam: teamNumber,
        eventName: eventKey,
        ...teamData,
        deepClimbAttempted: endgame.deep === 1,
        shallowClimbAttempted: endgame.shallow === 1,
        parkAttempted: endgame.park === 1,
        climbFailed: false,
      };
      
      entries.push(entry);
    });
  });

  return { entries, profile: profileInfo.name };
}
