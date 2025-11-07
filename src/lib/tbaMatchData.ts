/**
 * TBA Match Data Utilities
 * 
 * Functions for fetching and parsing detailed match data from The Blue Alliance API
 * for match validation purposes.
 * 
 * Phase 2: TBA Integration
 */

const TBA_BASE_URL = 'https://www.thebluealliance.com/api/v3';

// ============================================================================
// Type Definitions (matching actual TBA API response structure)
// ============================================================================

/**
 * TBA Score Breakdown for 2025 REEFSCAPE game
 * Contains detailed scoring information for one alliance
 */
export interface TBAScoreBreakdown {
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
    topRow: { nodeA: boolean; nodeB: boolean; nodeC: boolean; nodeD: boolean; 
              nodeE: boolean; nodeF: boolean; nodeG: boolean; nodeH: boolean;
              nodeI: boolean; nodeJ: boolean; nodeK: boolean; nodeL: boolean };
    midRow: { nodeA: boolean; nodeB: boolean; nodeC: boolean; nodeD: boolean; 
              nodeE: boolean; nodeF: boolean; nodeG: boolean; nodeH: boolean;
              nodeI: boolean; nodeJ: boolean; nodeK: boolean; nodeL: boolean };
    botRow: { nodeA: boolean; nodeB: boolean; nodeC: boolean; nodeD: boolean; 
              nodeE: boolean; nodeF: boolean; nodeG: boolean; nodeH: boolean;
              nodeI: boolean; nodeJ: boolean; nodeK: boolean; nodeL: boolean };
    trough: number;  // L1 count
    tba_topRowCount: number;  // Calculated count
    tba_midRowCount: number;
    tba_botRowCount: number;
  };
  
  // Coral Placement by Level (Teleop)
  teleopReef: {
    topRow: { nodeA: boolean; nodeB: boolean; nodeC: boolean; nodeD: boolean; 
              nodeE: boolean; nodeF: boolean; nodeG: boolean; nodeH: boolean;
              nodeI: boolean; nodeJ: boolean; nodeK: boolean; nodeL: boolean };
    midRow: { nodeA: boolean; nodeB: boolean; nodeC: boolean; nodeD: boolean; 
              nodeE: boolean; nodeF: boolean; nodeG: boolean; nodeH: boolean;
              nodeI: boolean; nodeJ: boolean; nodeK: boolean; nodeL: boolean };
    botRow: { nodeA: boolean; nodeB: boolean; nodeC: boolean; nodeD: boolean; 
              nodeE: boolean; nodeF: boolean; nodeG: boolean; nodeH: boolean;
              nodeI: boolean; nodeJ: boolean; nodeK: boolean; nodeL: boolean };
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

/**
 * Complete TBA Match Data with score breakdowns
 */
export interface TBAMatchData {
  match_number: number;
  set_number: number;  // For playoff matches
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
  } | null;
  winning_alliance: "red" | "blue" | "";
  time: number;  // Unix timestamp
  actual_time: number;
  predicted_time: number;
  post_result_time: number;
  videos?: Array<{ key: string; type: string }>;
}

/**
 * Simplified match list item (for fetching match lists)
 */
export interface TBAMatchSimple {
  key: string;
  comp_level: string;
  match_number: number;
  alliances: {
    red: { team_keys: string[] };
    blue: { team_keys: string[] };
  };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch detailed match data for a specific match from TBA
 * 
 * @param matchKey - TBA match key (e.g., '2025mrcmp_qm1')
 * @param apiKey - TBA API key
 * @returns Detailed match data with score breakdown
 */
export async function fetchTBAMatchDetail(
  matchKey: string,
  apiKey: string
): Promise<TBAMatchData> {
  const url = `${TBA_BASE_URL}/match/${matchKey}`;
  
  const response = await fetch(url, {
    headers: {
      'X-TBA-Auth-Key': apiKey,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid TBA API key');
    } else if (response.status === 404) {
      throw new Error(`Match ${matchKey} not found`);
    } else {
      throw new Error(`TBA API request failed: ${response.status}`);
    }
  }
  
  const data = await response.json();
  return data as TBAMatchData;
}

/**
 * Fetch all matches for an event (simple format, no score breakdowns)
 * 
 * @param eventKey - TBA event key (e.g., '2025mrcmp')
 * @param apiKey - TBA API key
 * @returns Array of simplified match data
 */
export async function fetchTBAEventMatches(
  eventKey: string,
  apiKey: string
): Promise<TBAMatchSimple[]> {
  const url = `${TBA_BASE_URL}/event/${eventKey}/matches/simple`;
  
  const response = await fetch(url, {
    headers: {
      'X-TBA-Auth-Key': apiKey,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid TBA API key');
    } else if (response.status === 404) {
      throw new Error(`Event ${eventKey} not found`);
    } else {
      throw new Error(`TBA API request failed: ${response.status}`);
    }
  }
  
  const data = await response.json();
  return data as TBAMatchSimple[];
}

/**
 * Fetch all detailed matches for an event (with score breakdowns)
 * Note: This makes one API call and gets all data at once
 * 
 * @param eventKey - TBA event key (e.g., '2025mrcmp')
 * @param apiKey - TBA API key
 * @returns Array of detailed match data
 */
export async function fetchTBAEventMatchesDetailed(
  eventKey: string,
  apiKey: string
): Promise<TBAMatchData[]> {
  const url = `${TBA_BASE_URL}/event/${eventKey}/matches`;
  
  const response = await fetch(url, {
    headers: {
      'X-TBA-Auth-Key': apiKey,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid TBA API key');
    } else if (response.status === 404) {
      throw new Error(`Event ${eventKey} not found`);
    } else {
      throw new Error(`TBA API request failed: ${response.status}`);
    }
  }
  
  const data = await response.json();
  return data as TBAMatchData[];
}

// ============================================================================
// Helper Functions
// ============================================================================

// Re-export helper functions from tbaUtils for convenience
export { extractTeamNumber, extractTeamNumbers } from './tbaUtils';

/**
 * Generate match key from event and match number
 * Attempts to follow TBA format
 * 
 * @param eventKey - Event key (e.g., '2025mrcmp')
 * @param matchNumber - Match number
 * @param compLevel - Competition level ('qm', 'qf', 'sf', 'f')
 * @returns Match key (e.g., '2025mrcmp_qm1')
 */
export function generateMatchKey(
  eventKey: string,
  matchNumber: string | number,
  compLevel: string = 'qm'
): string {
  return `${eventKey}_${compLevel}${matchNumber}`;
}

/**
 * Parse match key to extract components
 * Enhanced version that handles playoff formats
 * @param matchKey - TBA match key (e.g., '2025mrcmp_qm1' or '2025mrcmp_f1m1')
 * @returns Object with eventKey, compLevel, and matchNumber as string
 */
export function parseMatchKey(matchKey: string): {
  eventKey: string;
  compLevel: string;
  matchNumber: string;
} {
  const parts = matchKey.split('_');
  if (parts.length !== 2) {
    throw new Error(`Invalid match key format: ${matchKey}`);
  }
  
  const eventKey = parts[0];
  const matchPart = parts[1];
  
  // Extract comp level and match number
  // e.g., "qm1" -> compLevel="qm", matchNumber="1"
  // e.g., "f1m1" -> compLevel="f", matchNumber="1m1" (keep playoff format)
  const match = matchPart.match(/^([a-z]+)(.+)$/);
  if (!match) {
    throw new Error(`Invalid match key format: ${matchKey}`);
  }
  
  const compLevel = match[1];
  const matchNumber = match[2];
  
  return { eventKey, compLevel, matchNumber };
}

/**
 * Check if a match has score breakdown data
 * @param match - TBA match data
 * @returns True if score breakdown exists
 */
export function hasScoreBreakdown(match: TBAMatchData): boolean {
  return match.score_breakdown !== null && 
         match.score_breakdown !== undefined &&
         match.score_breakdown.red !== undefined;
}

/**
 * Count auto line crossings from score breakdown
 * @param breakdown - TBA score breakdown for one alliance
 * @returns Count of robots that crossed the line (0-3)
 */
export function countAutoLine(breakdown: TBAScoreBreakdown): number {
  let count = 0;
  if (breakdown.autoLineRobot1 === "Yes") count++;
  if (breakdown.autoLineRobot2 === "Yes") count++;
  if (breakdown.autoLineRobot3 === "Yes") count++;
  return count;
}

/**
 * Count endgame statuses from score breakdown
 * @param breakdown - TBA score breakdown for one alliance
 * @returns Object with counts for each endgame status
 */
export function countEndgame(breakdown: TBAScoreBreakdown): {
  deep: number;
  shallow: number;
  parked: number;
  none: number;
} {
  const counts = { deep: 0, shallow: 0, parked: 0, none: 0 };
  
  [breakdown.endGameRobot1, breakdown.endGameRobot2, breakdown.endGameRobot3].forEach(status => {
    if (status === "DeepCage") counts.deep++;
    else if (status === "ShallowCage") counts.shallow++;
    else if (status === "Parked") counts.parked++;
    else if (status === "None") counts.none++;
  });
  
  return counts;
}

/**
 * Get friendly match type name
 * @param compLevel - TBA competition level
 * @returns Human-readable match type
 */
export function getMatchTypeName(compLevel: string): string {
  const types: Record<string, string> = {
    qm: 'Qualification',
    ef: 'Eighth Finals',
    qf: 'Quarter Finals',
    sf: 'Semi Finals',
    f: 'Finals',
  };
  
  return types[compLevel] || compLevel.toUpperCase();
}

/**
 * Format match display name
 * @param match - TBA match data
 * @returns Formatted string (e.g., "Qualification 42" or "Finals 1-1")
 */
export function formatMatchName(match: TBAMatchData): string {
  const typeName = getMatchTypeName(match.comp_level);
  
  if (match.comp_level === 'qm') {
    return `${typeName} ${match.match_number}`;
  } else {
    // Playoff matches have set numbers
    return `${typeName} ${match.set_number}-${match.match_number}`;
  }
}

/**
 * Check if penalties exist for an alliance
 * @param breakdown - TBA score breakdown
 * @returns True if any fouls were called
 */
export function hasPenalties(breakdown: TBAScoreBreakdown): boolean {
  return breakdown.foulCount > 0 || breakdown.techFoulCount > 0;
}

/**
 * Get total penalty count
 * @param breakdown - TBA score breakdown
 * @returns Total number of penalties
 */
export function getTotalPenalties(breakdown: TBAScoreBreakdown): number {
  return breakdown.foulCount + breakdown.techFoulCount;
}
