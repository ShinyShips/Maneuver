/**
 * Match Data Validation Utilities
 * 
 * This module provides utilities for aggregating scouting entries by match and alliance,
 * preparing data for validation against TBA API results.
 * 
 * Phase 1: Data Aggregation
 */

import type { ScoutingEntry } from './scoutingTypes';
import type { ScoutingEntryDB } from './dexieDB';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Aggregated statistics for an alliance (3 teams combined)
 */
export interface AllianceStats {
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
  
  // Other (not validated, for context)
  breakdowns: number;
  defensePlayedCount: number;
}

/**
 * Alliance data with teams, entries, and aggregated statistics
 */
export interface AllianceData {
  teams: string[];  // Team numbers as strings [team1, team2, team3]
  entries: ScoutingEntry[];  // Individual scouting entries
  aggregatedStats: AllianceStats;
  scoutNames: string[];  // Scout names for accountability
  missingTeams: string[];  // Teams without scouting data
  isComplete: boolean;  // True if all 3 teams have data
}

/**
 * Complete match data with both alliances aggregated
 */
export interface AggregatedMatchData {
  matchNumber: string;  // Match number as string (matches ScoutingEntry type)
  eventName: string;
  matchKey?: string;  // e.g., "2025mrcmp_qm1"
  redAlliance: AllianceData;
  blueAlliance: AllianceData;
  timestamp: Date;  // When aggregation was performed
}

/**
 * Summary of match data completeness across an event
 */
export interface MatchDataSummary {
  eventName: string;
  totalMatches: number;
  completeMatches: number;  // Matches with all 6 teams scouted
  incompleteMatches: number;
  missingDataCount: number;  // Total missing team entries
  completenessPercentage: number;
  matches: Array<{
    matchNumber: string;  // Match number as string
    redComplete: boolean;
    blueComplete: boolean;
    missingTeams: string[];  // Team numbers as strings
  }>;
}

// ============================================================================
// Core Aggregation Functions
// ============================================================================

/**
 * Calculate aggregated statistics for an alliance from individual team entries
 * 
 * @param entries - Array of scouting entries (should be 3 teams for complete alliance)
 * @returns Aggregated statistics for the alliance
 */
export function calculateAllianceStats(entries: ScoutingEntry[]): AllianceStats {
  // Handle empty entries
  if (entries.length === 0) {
    return createEmptyAllianceStats();
  }

  return {
    // Auto Coral by Level
    autoCoralL1: entries.reduce((sum, e) => sum + (e.autoCoralPlaceL1Count || 0), 0),
    autoCoralL2: entries.reduce((sum, e) => sum + (e.autoCoralPlaceL2Count || 0), 0),
    autoCoralL3: entries.reduce((sum, e) => sum + (e.autoCoralPlaceL3Count || 0), 0),
    autoCoralL4: entries.reduce((sum, e) => sum + (e.autoCoralPlaceL4Count || 0), 0),
    autoCoralTotal: entries.reduce((sum, e) => 
      sum + (e.autoCoralPlaceL1Count || 0) + (e.autoCoralPlaceL2Count || 0) + 
      (e.autoCoralPlaceL3Count || 0) + (e.autoCoralPlaceL4Count || 0), 0),
    
    // Teleop Coral by Level
    teleopCoralL1: entries.reduce((sum, e) => sum + (e.teleopCoralPlaceL1Count || 0), 0),
    teleopCoralL2: entries.reduce((sum, e) => sum + (e.teleopCoralPlaceL2Count || 0), 0),
    teleopCoralL3: entries.reduce((sum, e) => sum + (e.teleopCoralPlaceL3Count || 0), 0),
    teleopCoralL4: entries.reduce((sum, e) => sum + (e.teleopCoralPlaceL4Count || 0), 0),
    teleopCoralTotal: entries.reduce((sum, e) => 
      sum + (e.teleopCoralPlaceL1Count || 0) + (e.teleopCoralPlaceL2Count || 0) + 
      (e.teleopCoralPlaceL3Count || 0) + (e.teleopCoralPlaceL4Count || 0), 0),
    
    // Combined Coral
    totalCoralL1: entries.reduce((sum, e) => 
      sum + (e.autoCoralPlaceL1Count || 0) + (e.teleopCoralPlaceL1Count || 0), 0),
    totalCoralL2: entries.reduce((sum, e) => 
      sum + (e.autoCoralPlaceL2Count || 0) + (e.teleopCoralPlaceL2Count || 0), 0),
    totalCoralL3: entries.reduce((sum, e) => 
      sum + (e.autoCoralPlaceL3Count || 0) + (e.teleopCoralPlaceL3Count || 0), 0),
    totalCoralL4: entries.reduce((sum, e) => 
      sum + (e.autoCoralPlaceL4Count || 0) + (e.teleopCoralPlaceL4Count || 0), 0),
    totalCoral: entries.reduce((sum, e) => 
      sum + (e.autoCoralPlaceL1Count || 0) + (e.autoCoralPlaceL2Count || 0) + 
      (e.autoCoralPlaceL3Count || 0) + (e.autoCoralPlaceL4Count || 0) +
      (e.teleopCoralPlaceL1Count || 0) + (e.teleopCoralPlaceL2Count || 0) + 
      (e.teleopCoralPlaceL3Count || 0) + (e.teleopCoralPlaceL4Count || 0), 0),
    
    // Auto Algae
    autoAlgaeNet: entries.reduce((sum, e) => sum + (e.autoAlgaePlaceNetShot || 0), 0),
    autoAlgaeProcessor: entries.reduce((sum, e) => sum + (e.autoAlgaePlaceProcessor || 0), 0),
    autoAlgaeTotal: entries.reduce((sum, e) => 
      sum + (e.autoAlgaePlaceNetShot || 0) + (e.autoAlgaePlaceProcessor || 0), 0),
    
    // Teleop Algae
    teleopAlgaeNet: entries.reduce((sum, e) => sum + (e.teleopAlgaePlaceNetShot || 0), 0),
    teleopAlgaeProcessor: entries.reduce((sum, e) => sum + (e.teleopAlgaePlaceProcessor || 0), 0),
    teleopAlgaeTotal: entries.reduce((sum, e) => 
      sum + (e.teleopAlgaePlaceNetShot || 0) + (e.teleopAlgaePlaceProcessor || 0), 0),
    
    // Combined Algae
    totalAlgaeNet: entries.reduce((sum, e) => 
      sum + (e.autoAlgaePlaceNetShot || 0) + (e.teleopAlgaePlaceNetShot || 0), 0),
    totalAlgaeProcessor: entries.reduce((sum, e) => 
      sum + (e.autoAlgaePlaceProcessor || 0) + (e.teleopAlgaePlaceProcessor || 0), 0),
    totalAlgae: entries.reduce((sum, e) => 
      sum + (e.autoAlgaePlaceNetShot || 0) + (e.autoAlgaePlaceProcessor || 0) +
      (e.teleopAlgaePlaceNetShot || 0) + (e.teleopAlgaePlaceProcessor || 0), 0),
    
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

/**
 * Create an empty alliance stats object (for incomplete alliances)
 */
function createEmptyAllianceStats(): AllianceStats {
  return {
    autoCoralL1: 0, autoCoralL2: 0, autoCoralL3: 0, autoCoralL4: 0, autoCoralTotal: 0,
    teleopCoralL1: 0, teleopCoralL2: 0, teleopCoralL3: 0, teleopCoralL4: 0, teleopCoralTotal: 0,
    totalCoralL1: 0, totalCoralL2: 0, totalCoralL3: 0, totalCoralL4: 0, totalCoral: 0,
    autoAlgaeNet: 0, autoAlgaeProcessor: 0, autoAlgaeTotal: 0,
    teleopAlgaeNet: 0, teleopAlgaeProcessor: 0, teleopAlgaeTotal: 0,
    totalAlgaeNet: 0, totalAlgaeProcessor: 0, totalAlgae: 0,
    deepClimbs: 0, shallowClimbs: 0, parks: 0, noEndgame: 0, climbFailures: 0,
    teamsPassedStartLine: 0,
    breakdowns: 0, defensePlayedCount: 0,
  };
}

/**
 * Aggregate scouting entries for a single match into alliance-level data
 * 
 * @param matchNumber - Match number to aggregate (as string)
 * @param eventName - Event name/key
 * @param allEntries - All scouting entries for the event
 * @returns Aggregated match data with red and blue alliance stats
 */
export function aggregateMatchData(
  matchNumber: string,
  eventName: string,
  allEntries: ScoutingEntry[]
): AggregatedMatchData {
  // Filter entries for this specific match
  const matchEntries = allEntries.filter(
    e => e.matchNumber === matchNumber && e.eventName === eventName
  );
  
  // Separate by alliance
  const redEntries = matchEntries.filter(e => 
    e.alliance?.toLowerCase().includes('red')
  );
  const blueEntries = matchEntries.filter(e => 
    e.alliance?.toLowerCase().includes('blue')
  );
  
  // Build alliance data
  const redAlliance = buildAllianceData(redEntries);
  const blueAlliance = buildAllianceData(blueEntries);
  
  return {
    matchNumber,
    eventName,
    matchKey: generateMatchKey(eventName, matchNumber),
    redAlliance,
    blueAlliance,
    timestamp: new Date(),
  };
}

/**
 * Build complete alliance data from entries
 */
function buildAllianceData(entries: ScoutingEntry[]): AllianceData {
  const teams = entries.map(e => e.selectTeam).filter((t): t is string => t !== undefined && t !== '');
  const scoutNames = entries.map(e => e.scoutName || 'Unknown').filter((s): s is string => s !== undefined);
  const aggregatedStats = calculateAllianceStats(entries);
  const isComplete = entries.length === 3;
  
  // For incomplete alliances, we can't determine which teams are missing without TBA data
  // That will be handled in Phase 2 when we fetch TBA match data
  const missingTeams: string[] = [];
  
  return {
    teams,
    entries,
    aggregatedStats,
    scoutNames,
    missingTeams,
    isComplete,
  };
}

/**
 * Generate a match key in TBA format (approximate, actual format comes from TBA)
 */
function generateMatchKey(eventKey: string, matchNumber: string): string {
  // For now, assume qualification matches
  // Actual match keys will come from TBA API in Phase 2
  return `${eventKey}_qm${matchNumber}`;
}

/**
 * Aggregate all matches for an event
 * 
 * @param eventName - Event name/key
 * @param allEntries - All scouting entries for the event
 * @returns Array of aggregated match data, one per unique match number
 */
export function aggregateEventMatches(
  eventName: string,
  allEntries: ScoutingEntry[]
): AggregatedMatchData[] {
  // Get unique match numbers for this event
  const matchNumbers = Array.from(
    new Set(
      allEntries
        .filter(e => e.eventName === eventName)
        .map(e => e.matchNumber)
    )
  ).sort((a, b) => {
    // Sort match numbers numerically (they're strings, so convert for sorting)
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    return numA - numB;
  });
  
  // Aggregate each match
  return matchNumbers.map(matchNumber => 
    aggregateMatchData(matchNumber, eventName, allEntries)
  );
}

/**
 * Get a summary of data completeness for an event
 * 
 * @param eventName - Event name/key
 * @param allEntries - All scouting entries for the event
 * @returns Summary of which matches have complete data
 */
export function getMatchDataSummary(
  eventName: string,
  allEntries: ScoutingEntry[]
): MatchDataSummary {
  const aggregatedMatches = aggregateEventMatches(eventName, allEntries);
  
  const completeMatches = aggregatedMatches.filter(
    m => m.redAlliance.isComplete && m.blueAlliance.isComplete
  ).length;
  
  const totalMatches = aggregatedMatches.length;
  const incompleteMatches = totalMatches - completeMatches;
  
  // Count total missing entries
  const missingDataCount = aggregatedMatches.reduce((sum, match) => {
    const redMissing = 3 - match.redAlliance.entries.length;
    const blueMissing = 3 - match.blueAlliance.entries.length;
    return sum + redMissing + blueMissing;
  }, 0);
  
  const completenessPercentage = totalMatches > 0 
    ? (completeMatches / totalMatches) * 100 
    : 0;
  
  const matches = aggregatedMatches.map(m => ({
    matchNumber: m.matchNumber,
    redComplete: m.redAlliance.isComplete,
    blueComplete: m.blueAlliance.isComplete,
    missingTeams: [
      ...m.redAlliance.missingTeams,
      ...m.blueAlliance.missingTeams,
    ],
  }));
  
  return {
    eventName,
    totalMatches,
    completeMatches,
    incompleteMatches,
    missingDataCount,
    completenessPercentage: Math.round(completenessPercentage * 10) / 10,
    matches,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Find which teams are missing scouting data for a match
 * (Requires TBA match data to know which teams should be present)
 * This will be fully implemented in Phase 2
 */
export function findMissingTeams(
  aggregatedMatch: AggregatedMatchData,
  expectedTeams: { red: string[]; blue: string[] }
): { red: string[]; blue: string[] } {
  const redMissing = expectedTeams.red.filter(
    team => !aggregatedMatch.redAlliance.teams.includes(team)
  );
  
  const blueMissing = expectedTeams.blue.filter(
    team => !aggregatedMatch.blueAlliance.teams.includes(team)
  );
  
  return { red: redMissing, blue: blueMissing };
}

/**
 * Get all matches that have incomplete data
 * 
 * @param eventName - Event name/key
 * @param allEntries - All scouting entries
 * @returns Array of match numbers that need more scouting data
 */
export function getIncompleteMatches(
  eventName: string,
  allEntries: ScoutingEntry[]
): string[] {
  const aggregatedMatches = aggregateEventMatches(eventName, allEntries);
  
  return aggregatedMatches
    .filter(m => !m.redAlliance.isComplete || !m.blueAlliance.isComplete)
    .map(m => m.matchNumber)
    .sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      return numA - numB;
    });
}

/**
 * Get scout accountability information for a match
 * Shows which scout recorded data for which team
 * 
 * @param aggregatedMatch - Aggregated match data
 * @returns Map of team number (as string) to scout name
 */
export function getScoutAccountability(
  aggregatedMatch: AggregatedMatchData
): Map<string, string> {
  const accountability = new Map<string, string>();
  
  // Add red alliance scouts
  aggregatedMatch.redAlliance.entries.forEach(entry => {
    if (entry.selectTeam) {
      accountability.set(entry.selectTeam, entry.scoutName || 'Unknown');
    }
  });
  
  // Add blue alliance scouts
  aggregatedMatch.blueAlliance.entries.forEach(entry => {
    if (entry.selectTeam) {
      accountability.set(entry.selectTeam, entry.scoutName || 'Unknown');
    }
  });
  
  return accountability;
}

/**
 * Format alliance stats for display
 * Returns a human-readable summary of alliance performance
 */
export function formatAllianceStatsSummary(stats: AllianceStats): string {
  return `
Coral: ${stats.totalCoral} total (L1:${stats.totalCoralL1} L2:${stats.totalCoralL2} L3:${stats.totalCoralL3} L4:${stats.totalCoralL4})
Algae: ${stats.totalAlgae} total (Net:${stats.totalAlgaeNet} Processor:${stats.totalAlgaeProcessor})
Endgame: ${stats.deepClimbs} deep, ${stats.shallowClimbs} shallow, ${stats.parks} parked
Auto: ${stats.teamsPassedStartLine}/3 crossed line
  `.trim();
}

// ============================================================================
// Phase 3: TBA Comparison & Validation Functions
// ============================================================================

import type { TBAMatchData } from './tbaMatchData';
import type {
  ScoutedAllianceData,
  TBAAllianceData,
  Discrepancy,
  DiscrepancySeverity,
  AllianceValidation,
  TeamValidation,
  MatchValidationResult,
  ValidationStatus,
  ConfidenceLevel,
  ValidationConfig,
  DataCategory
} from './matchValidationTypes';
import { DEFAULT_VALIDATION_CONFIG } from './matchValidationTypes';
import { extractTeamNumber } from './tbaUtils';

/**
 * Aggregate scouted data from multiple teams into alliance totals for comparison
 * @param scoutedEntries - Array of scouting entries for teams in the alliance
 * @param alliance - 'red' or 'blue'
 * @param matchNumber - Match number
 * @param eventName - Event key
 * @param expectedTeams - Array of expected team numbers (from TBA)
 * @returns Aggregated alliance data optimized for TBA comparison
 */
export function aggregateScoutedAllianceData(
  scoutedEntries: ScoutingEntry[],
  alliance: 'red' | 'blue',
  matchNumber: string,
  eventName: string,
  expectedTeams: string[]
): ScoutedAllianceData {
  const teams = scoutedEntries.map(e => e.selectTeam);
  const scoutNames = scoutedEntries.map(e => e.scoutName);
  const missingTeams = expectedTeams.filter(t => !teams.includes(t));

  // Sum all counts across teams
  const data: ScoutedAllianceData = {
    alliance,
    matchNumber,
    eventName,
    teams,
    scoutNames,

    // Auto coral
    autoCoralL1: scoutedEntries.reduce((sum, e) => sum + (e.autoCoralPlaceL1Count || 0), 0),
    autoCoralL2: scoutedEntries.reduce((sum, e) => sum + (e.autoCoralPlaceL2Count || 0), 0),
    autoCoralL3: scoutedEntries.reduce((sum, e) => sum + (e.autoCoralPlaceL3Count || 0), 0),
    autoCoralL4: scoutedEntries.reduce((sum, e) => sum + (e.autoCoralPlaceL4Count || 0), 0),
    autoCoralTotal: 0,  // Calculated below

    // Auto algae
    autoAlgaeNet: scoutedEntries.reduce((sum, e) => sum + (e.autoAlgaePlaceNetShot || 0), 0),
    autoAlgaeProcessor: scoutedEntries.reduce((sum, e) => sum + (e.autoAlgaePlaceProcessor || 0), 0),
    autoAlgaeTotal: 0,  // Calculated below

    // Auto mobility
    autoMobility: scoutedEntries.reduce((sum, e) => sum + (e.autoPassedStartLine ? 1 : 0), 0),

    // Teleop coral
    teleopCoralL1: scoutedEntries.reduce((sum, e) => sum + (e.teleopCoralPlaceL1Count || 0), 0),
    teleopCoralL2: scoutedEntries.reduce((sum, e) => sum + (e.teleopCoralPlaceL2Count || 0), 0),
    teleopCoralL3: scoutedEntries.reduce((sum, e) => sum + (e.teleopCoralPlaceL3Count || 0), 0),
    teleopCoralL4: scoutedEntries.reduce((sum, e) => sum + (e.teleopCoralPlaceL4Count || 0), 0),
    teleopCoralTotal: 0,  // Calculated below

    // Teleop algae
    teleopAlgaeNet: scoutedEntries.reduce((sum, e) => sum + (e.teleopAlgaePlaceNetShot || 0), 0),
    teleopAlgaeProcessor: scoutedEntries.reduce((sum, e) => sum + (e.teleopAlgaePlaceProcessor || 0), 0),
    teleopAlgaeTotal: 0,  // Calculated below

    // Endgame
    deepClimbs: scoutedEntries.reduce((sum, e) => sum + (e.deepClimbAttempted && !e.climbFailed ? 1 : 0), 0),
    shallowClimbs: scoutedEntries.reduce((sum, e) => sum + (e.shallowClimbAttempted && !e.climbFailed ? 1 : 0), 0),
    parks: scoutedEntries.reduce((sum, e) => sum + (e.parkAttempted ? 1 : 0), 0),
    climbFails: scoutedEntries.reduce((sum, e) => sum + (e.climbFailed ? 1 : 0), 0),

    // Other
    brokeDown: scoutedEntries.reduce((sum, e) => sum + (e.brokeDown ? 1 : 0), 0),
    playedDefense: scoutedEntries.reduce((sum, e) => sum + (e.playedDefense ? 1 : 0), 0),

    // Tracking
    missingTeams,
    scoutedTeamsCount: scoutedEntries.length
  };

  // Calculate totals
  data.autoCoralTotal = data.autoCoralL1 + data.autoCoralL2 + data.autoCoralL3 + data.autoCoralL4;
  data.autoAlgaeTotal = data.autoAlgaeNet + data.autoAlgaeProcessor;
  data.teleopCoralTotal = data.teleopCoralL1 + data.teleopCoralL2 + data.teleopCoralL3 + data.teleopCoralL4;
  data.teleopAlgaeTotal = data.teleopAlgaeNet + data.teleopAlgaeProcessor;

  return data;
}

/**
 * Extract TBA alliance data from TBA match data for comparison
 * @param tbaMatch - TBA match data
 * @param alliance - 'red' or 'blue'
 * @returns Extracted alliance data for comparison
 */
export function extractTBAAllianceData(
  tbaMatch: TBAMatchData,
  alliance: 'red' | 'blue'
): TBAAllianceData {
  const allianceData = tbaMatch.alliances[alliance];
  const breakdown = tbaMatch.score_breakdown?.[alliance];

  if (!breakdown) {
    // No score breakdown available - return minimal data
    return {
      alliance,
      teams: allianceData.team_keys.map(extractTeamNumber),
      totalPoints: allianceData.score,
      autoPoints: 0,
      teleopPoints: 0,
      foulPoints: 0,
      autoCoralL1: 0,
      autoCoralL2: 0,
      autoCoralL3: 0,
      autoCoralL4: 0,
      autoCoralTotal: 0,
      autoCoralPoints: 0,
      teleopCoralL1: 0,
      teleopCoralL2: 0,
      teleopCoralL3: 0,
      teleopCoralL4: 0,
      teleopCoralTotal: 0,
      teleopCoralPoints: 0,
      algaeNet: 0,
      algaeProcessor: 0,
      algaeTotal: 0,
      algaePoints: 0,
      mobilityCount: 0,
      mobilityPoints: 0,
      deepClimbs: 0,
      shallowClimbs: 0,
      parks: 0,
      endgamePoints: 0,
      autoBonusAchieved: false,
      coralBonusAchieved: false,
      bargeBonusAchieved: false,
      foulCount: 0,
      techFoulCount: 0
    };
  }

  // Count mobility
  const mobilityCount = [
    breakdown.autoLineRobot1 === "Yes" ? 1 : 0,
    breakdown.autoLineRobot2 === "Yes" ? 1 : 0,
    breakdown.autoLineRobot3 === "Yes" ? 1 : 0
  ].reduce((sum, val) => sum + val, 0);

  // Count endgame
  const endgameStates = [
    breakdown.endGameRobot1,
    breakdown.endGameRobot2,
    breakdown.endGameRobot3
  ];
  const deepClimbs = endgameStates.filter(s => s === "DeepCage").length;
  const shallowClimbs = endgameStates.filter(s => s === "ShallowCage").length;
  const parks = endgameStates.filter(s => s === "Parked").length;

  return {
    alliance,
    teams: allianceData.team_keys.map(extractTeamNumber),
    
    // Scores
    totalPoints: allianceData.score,
    autoPoints: breakdown.autoPoints,
    teleopPoints: breakdown.teleopPoints,
    foulPoints: breakdown.foulPoints,
    
    // Auto coral
    autoCoralL1: breakdown.autoReef.trough,
    autoCoralL2: breakdown.autoReef.tba_botRowCount,
    autoCoralL3: breakdown.autoReef.tba_midRowCount,
    autoCoralL4: breakdown.autoReef.tba_topRowCount,
    autoCoralTotal: breakdown.autoCoralCount,
    autoCoralPoints: breakdown.autoCoralPoints,
    
    // Teleop coral
    teleopCoralL1: breakdown.teleopReef.trough,
    teleopCoralL2: breakdown.teleopReef.tba_botRowCount,
    teleopCoralL3: breakdown.teleopReef.tba_midRowCount,
    teleopCoralL4: breakdown.teleopReef.tba_topRowCount,
    teleopCoralTotal: breakdown.teleopCoralCount,
    teleopCoralPoints: breakdown.teleopCoralPoints,
    
    // Algae (TBA combines auto + teleop)
    algaeNet: breakdown.netAlgaeCount,
    algaeProcessor: breakdown.wallAlgaeCount,
    algaeTotal: breakdown.netAlgaeCount + breakdown.wallAlgaeCount,
    algaePoints: breakdown.algaePoints,
    
    // Mobility
    mobilityCount,
    mobilityPoints: breakdown.autoMobilityPoints,
    
    // Endgame
    deepClimbs,
    shallowClimbs,
    parks,
    endgamePoints: breakdown.endGameBargePoints,
    
    // Bonuses
    autoBonusAchieved: breakdown.autoBonusAchieved,
    coralBonusAchieved: breakdown.coralBonusAchieved,
    bargeBonusAchieved: breakdown.bargeBonusAchieved,
    
    // Penalties
    foulCount: breakdown.foulCount,
    techFoulCount: breakdown.techFoulCount
  };
}

/**
 * Calculate discrepancy severity based on thresholds
 * @param difference - Absolute difference between scouted and TBA
 * @param percentDiff - Percentage difference
 * @param config - Validation configuration with thresholds
 * @param category - Data category for category-specific thresholds
 * @returns Severity level
 */
function calculateSeverity(
  difference: number,
  percentDiff: number,
  config: ValidationConfig,
  category?: DataCategory
): DiscrepancySeverity {
  // Get category-specific thresholds if available, otherwise use defaults
  const thresholds = (category && config.categoryThresholds?.[category]) || config.thresholds;

  // For low-count items, focus on absolute difference to avoid
  // "0 vs 1 = 100%" being flagged as critical
  
  // Check absolute thresholds first
  if (difference >= thresholds.criticalAbsolute) {
    return 'critical';
  }
  if (difference >= thresholds.warningAbsolute) {
    return 'warning';
  }
  if (difference >= thresholds.minorAbsolute) {
    return 'minor';
  }

  // For very small absolute differences (< warningAbsolute),
  // don't escalate based on percentage alone
  // This prevents "0 vs 1" or "1 vs 2" from being critical due to 100% difference
  if (difference < thresholds.warningAbsolute) {
    return 'none';
  }

  // For larger absolute differences, use percentage thresholds
  if (percentDiff >= thresholds.critical) return 'critical';
  if (percentDiff >= thresholds.warning) return 'warning';
  if (percentDiff >= thresholds.minor) return 'minor';

  return 'none';
}

/**
 * Create a discrepancy object for comparison results
 */
function createDiscrepancy(
  category: DataCategory,
  field: string,
  scoutedValue: number,
  tbaValue: number,
  config: ValidationConfig
): Discrepancy | null {
  const difference = Math.abs(scoutedValue - tbaValue);
  
  // Calculate percentage difference (handle division by zero)
  const max = Math.max(scoutedValue, tbaValue);
  const percentDiff = max === 0 ? 0 : (difference / max) * 100;

  const severity = calculateSeverity(difference, percentDiff, config, category);

  // Only return discrepancy if severity is not 'none'
  if (severity === 'none') {
    return null;
  }

  const sign = scoutedValue > tbaValue ? '+' : '-';
  
  return {
    category,
    field,
    scoutedValue,
    tbaValue,
    difference,
    percentDiff: Math.round(percentDiff * 10) / 10,  // Round to 1 decimal
    severity,
    message: `${field}: Scouted ${scoutedValue}, TBA ${tbaValue} (${sign}${difference}, ${Math.round(percentDiff)}%)`
  };
}

/**
 * Compare scouted alliance data with TBA alliance data
 * @param scoutedData - Aggregated scouted data
 * @param tbaData - TBA alliance data
 * @param config - Validation configuration
 * @returns Alliance validation result
 */
export function compareAllianceData(
  scoutedData: ScoutedAllianceData,
  tbaData: TBAAllianceData,
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): AllianceValidation {
  const discrepancies: Discrepancy[] = [];

  // Auto Coral Comparison
  if (config.checkAutoScoring) {
    const d1 = createDiscrepancy('auto-coral', 'Auto Coral L1', scoutedData.autoCoralL1, tbaData.autoCoralL1, config);
    const d2 = createDiscrepancy('auto-coral', 'Auto Coral L2', scoutedData.autoCoralL2, tbaData.autoCoralL2, config);
    const d3 = createDiscrepancy('auto-coral', 'Auto Coral L3', scoutedData.autoCoralL3, tbaData.autoCoralL3, config);
    const d4 = createDiscrepancy('auto-coral', 'Auto Coral L4', scoutedData.autoCoralL4, tbaData.autoCoralL4, config);
    const dTotal = createDiscrepancy('auto-coral', 'Auto Coral Total', scoutedData.autoCoralTotal, tbaData.autoCoralTotal, config);
    
    if (d1) discrepancies.push(d1);
    if (d2) discrepancies.push(d2);
    if (d3) discrepancies.push(d3);
    if (d4) discrepancies.push(d4);
    if (dTotal) discrepancies.push(dTotal);
  }

  // Teleop Coral Comparison
  // NOTE: TBA's teleopCoralLX are FINAL counts (includes auto), but our scouted data is teleop-only
  // So we need to compare: scouted_teleop vs (tba_final - tba_auto)
  if (config.checkTeleopScoring) {
    const tbaActualTeleopL1 = Math.max(0, tbaData.teleopCoralL1 - tbaData.autoCoralL1);
    const tbaActualTeleopL2 = Math.max(0, tbaData.teleopCoralL2 - tbaData.autoCoralL2);
    const tbaActualTeleopL3 = Math.max(0, tbaData.teleopCoralL3 - tbaData.autoCoralL3);
    const tbaActualTeleopL4 = Math.max(0, tbaData.teleopCoralL4 - tbaData.autoCoralL4);
    const tbaActualTeleopTotal = tbaActualTeleopL1 + tbaActualTeleopL2 + tbaActualTeleopL3 + tbaActualTeleopL4;
    
    const d1 = createDiscrepancy('teleop-coral', 'Teleop Coral L1', scoutedData.teleopCoralL1, tbaActualTeleopL1, config);
    const d2 = createDiscrepancy('teleop-coral', 'Teleop Coral L2', scoutedData.teleopCoralL2, tbaActualTeleopL2, config);
    const d3 = createDiscrepancy('teleop-coral', 'Teleop Coral L3', scoutedData.teleopCoralL3, tbaActualTeleopL3, config);
    const d4 = createDiscrepancy('teleop-coral', 'Teleop Coral L4', scoutedData.teleopCoralL4, tbaActualTeleopL4, config);
    const dTotal = createDiscrepancy('teleop-coral', 'Teleop Coral Total', scoutedData.teleopCoralTotal, tbaActualTeleopTotal, config);
    
    if (d1) discrepancies.push(d1);
    if (d2) discrepancies.push(d2);
    if (d3) discrepancies.push(d3);
    if (d4) discrepancies.push(d4);
    if (dTotal) discrepancies.push(dTotal);
  }

  // Algae Comparison (combined auto + teleop)
  const scoutedAlgaeNet = scoutedData.autoAlgaeNet + scoutedData.teleopAlgaeNet;
  const scoutedAlgaeProc = scoutedData.autoAlgaeProcessor + scoutedData.teleopAlgaeProcessor;
  const scoutedAlgaeTotal = scoutedAlgaeNet + scoutedAlgaeProc;
  
  const dAlgaeNet = createDiscrepancy('algae', 'Total Algae Net', scoutedAlgaeNet, tbaData.algaeNet, config);
  const dAlgaeProc = createDiscrepancy('algae', 'Total Algae Processor', scoutedAlgaeProc, tbaData.algaeProcessor, config);
  const dAlgaeTotal = createDiscrepancy('algae', 'Total Algae', scoutedAlgaeTotal, tbaData.algaeTotal, config);
  
  if (dAlgaeNet) discrepancies.push(dAlgaeNet);
  if (dAlgaeProc) discrepancies.push(dAlgaeProc);
  if (dAlgaeTotal) discrepancies.push(dAlgaeTotal);

  // Mobility Comparison
  const dMobility = createDiscrepancy('mobility', 'Mobility Count', scoutedData.autoMobility, tbaData.mobilityCount, config);
  if (dMobility) discrepancies.push(dMobility);

  // Endgame Comparison
  if (config.checkEndgame) {
    const dDeep = createDiscrepancy('endgame', 'Deep Climbs', scoutedData.deepClimbs, tbaData.deepClimbs, config);
    const dShallow = createDiscrepancy('endgame', 'Shallow Climbs', scoutedData.shallowClimbs, tbaData.shallowClimbs, config);
    const dPark = createDiscrepancy('endgame', 'Parks', scoutedData.parks, tbaData.parks, config);
    
    if (dDeep) discrepancies.push(dDeep);
    if (dShallow) discrepancies.push(dShallow);
    if (dPark) discrepancies.push(dPark);
  }

  // Calculate scouted score using official 2025 Reefscape scoring
  // Auto points
  const scoutedAutoCoralPoints = 
    (scoutedData.autoCoralL1 * 3) + 
    (scoutedData.autoCoralL2 * 4) + 
    (scoutedData.autoCoralL3 * 6) + 
    (scoutedData.autoCoralL4 * 7);
  
  const scoutedAutoAlgaePoints = 
    (scoutedData.autoAlgaeNet * 4) + 
    (scoutedData.autoAlgaeProcessor * 6);
  
  const scoutedMobilityPoints = scoutedData.autoMobility * 3;
  
  // Teleop points
  const scoutedTeleopCoralPoints = 
    (scoutedData.teleopCoralL1 * 2) + 
    (scoutedData.teleopCoralL2 * 3) + 
    (scoutedData.teleopCoralL3 * 4) + 
    (scoutedData.teleopCoralL4 * 5);
  
  const scoutedTeleopAlgaePoints = 
    (scoutedData.teleopAlgaeNet * 4) + 
    (scoutedData.teleopAlgaeProcessor * 6);
  
  // Endgame points
  const scoutedEndgamePoints = 
    (scoutedData.parks * 2) + 
    (scoutedData.shallowClimbs * 6) + 
    (scoutedData.deepClimbs * 12);
  
  // Total (excluding bonuses and penalties which we can't calculate from scouted data)
  const estimatedScoutedScore = 
    scoutedAutoCoralPoints + 
    scoutedAutoAlgaePoints + 
    scoutedMobilityPoints + 
    scoutedTeleopCoralPoints + 
    scoutedTeleopAlgaePoints + 
    scoutedEndgamePoints;

  // Calculate TBA's base score (breakdown points, excluding bonuses/fouls)
  const tbaBreakdownScore = 
    tbaData.autoCoralPoints + 
    tbaData.teleopCoralPoints + 
    tbaData.algaePoints + 
    tbaData.mobilityPoints + 
    tbaData.endgamePoints;

  // Debug logging for score calculation
  if (Math.abs(estimatedScoutedScore - tbaBreakdownScore) > 10) {
    console.log(`[${scoutedData.alliance.toUpperCase()}] Score Calculation Debug:`, {
      match: scoutedData.matchNumber,
      scoutedBreakdown: {
      autoCoralPts: scoutedAutoCoralPoints,
      autoAlgaePts: scoutedAutoAlgaePoints,
      mobilityPts: scoutedMobilityPoints,
      teleopCoralPts: scoutedTeleopCoralPoints,
      teleopAlgaePts: scoutedTeleopAlgaePoints,
      endgamePts: scoutedEndgamePoints,
      total: estimatedScoutedScore
      },
      tbaBreakdown: {
      autoCoralPts: tbaData.autoCoralPoints,
      algaePts: tbaData.algaePoints, // TBA combines auto+teleop algae
      mobilityPts: tbaData.mobilityPoints,
      teleopCoralPts: tbaData.teleopCoralPoints,
      endgamePts: tbaData.endgamePoints,
      total: tbaBreakdownScore
      },
      scoutedPieceCounts: {
      teleopL1: scoutedData.teleopCoralL1,
      teleopL2: scoutedData.teleopCoralL2,
      teleopL3: scoutedData.teleopCoralL3,
      teleopL4: scoutedData.teleopCoralL4,
      teleopTotal: scoutedData.teleopCoralTotal
      },
      tbaPieceCounts: {
      teleopL1: tbaData.teleopCoralL1,
      teleopL2: tbaData.teleopCoralL2,
      teleopL3: tbaData.teleopCoralL3,
      teleopL4: tbaData.teleopCoralL4,
      teleopTotal: tbaData.teleopCoralTotal
      },
      difference: estimatedScoutedScore - tbaBreakdownScore
    });
  }

  const scoreDifference = Math.abs(estimatedScoutedScore - tbaBreakdownScore);
  const scorePercentDiff = tbaBreakdownScore === 0 ? 0 : (scoreDifference / tbaBreakdownScore) * 100;

  // Determine overall status
  const criticalCount = discrepancies.filter(d => d.severity === 'critical').length;
  const warningCount = discrepancies.filter(d => d.severity === 'warning').length;
  const minorCount = discrepancies.filter(d => d.severity === 'minor').length;

  let status: ValidationStatus;
  if (criticalCount >= config.autoFlagThreshold) {
    // Multiple critical errors = failed (requires re-scout)
    status = 'failed';
  } else if (criticalCount > 0) {
    // Any critical errors = flagged for review
    status = 'flagged';
  } else if (warningCount > 2) {
    // Multiple warnings = flagged
    status = 'flagged';
  } else if (warningCount > 0 || minorCount > 3) {
    // Some warnings or many minors = flagged
    status = 'flagged';
  } else {
    // No issues or only a few minor discrepancies = passed
    status = 'passed';
  }

  // Determine confidence
  let confidence: ConfidenceLevel;
  if (scoutedData.missingTeams.length > 0) {
    confidence = 'low';  // Missing data
  } else if (criticalCount > 0) {
    confidence = 'low';
  } else if (warningCount > 2) {
    confidence = 'medium';
  } else {
    confidence = 'high';
  }

  return {
    alliance: scoutedData.alliance,
    status,
    confidence,
    discrepancies,
    totalScoutedPoints: estimatedScoutedScore,
    totalTBAPoints: tbaBreakdownScore,  // Use breakdown score (excludes fouls which we can't scout)
    scoreDifference,
    scorePercentDiff: Math.round(scorePercentDiff * 10) / 10,
    
    // Include raw data for detailed breakdown display
    scoutedData,
    tbaData,
    
    // Include calculation breakdown for debugging
    calculationBreakdown: {
      scouted: {
        autoCoralPts: scoutedAutoCoralPoints,
        autoAlgaePts: scoutedAutoAlgaePoints,
        mobilityPts: scoutedMobilityPoints,
        teleopCoralPts: scoutedTeleopCoralPoints,
        teleopAlgaePts: scoutedTeleopAlgaePoints,
        endgamePts: scoutedEndgamePoints
      },
      tba: {
        autoCoralPts: tbaData.autoCoralPoints,
        teleopCoralPts: tbaData.teleopCoralPoints,
        algaePts: tbaData.algaePoints,
        mobilityPts: tbaData.mobilityPoints,
        endgamePts: tbaData.endgamePoints
      }
    }
  };
}

/**
 * Validate a complete match by comparing scouted vs TBA data
 * @param eventKey - Event key
 * @param matchNumber - Match number
 * @param scoutedRedEntries - Scouted entries for red alliance
 * @param scoutedBlueEntries - Scouted entries for blue alliance
 * @param tbaMatch - TBA match data
 * @param config - Validation configuration
 * @param scoutedRedRaw - Raw database entries for red alliance (for correction metadata)
 * @param scoutedBlueRaw - Raw database entries for blue alliance (for correction metadata)
 * @returns Complete match validation result
 */
export function validateMatch(
  eventKey: string,
  matchNumber: string,
  scoutedRedEntries: ScoutingEntry[],
  scoutedBlueEntries: ScoutingEntry[],
  tbaMatch: TBAMatchData,
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG,
  scoutedRedRaw?: ScoutingEntryDB[],
  scoutedBlueRaw?: ScoutingEntryDB[]
): MatchValidationResult {
  // Extract TBA data
  const tbaRed = extractTBAAllianceData(tbaMatch, 'red');
  const tbaBlue = extractTBAAllianceData(tbaMatch, 'blue');

  // Aggregate scouted data
  const scoutedRed = aggregateScoutedAllianceData(
    scoutedRedEntries,
    'red',
    matchNumber,
    eventKey,
    tbaRed.teams
  );
  const scoutedBlue = aggregateScoutedAllianceData(
    scoutedBlueEntries,
    'blue',
    matchNumber,
    eventKey,
    tbaBlue.teams
  );

  // Compare alliances
  const redValidation = compareAllianceData(scoutedRed, tbaRed, config);
  const blueValidation = compareAllianceData(scoutedBlue, tbaBlue, config);

  // Aggregate discrepancies
  const allDiscrepancies = [
    ...redValidation.discrepancies,
    ...blueValidation.discrepancies
  ];
  const criticalCount = allDiscrepancies.filter(d => d.severity === 'critical').length;
  const warningCount = allDiscrepancies.filter(d => d.severity === 'warning').length;
  const minorCount = allDiscrepancies.filter(d => d.severity === 'minor').length;

  // Determine overall status
  let status: ValidationStatus;
  if (criticalCount >= config.requireReScoutThreshold) {
    // Multiple critical = failed (requires re-scout)
    status = 'failed';
  } else if (criticalCount >= config.autoFlagThreshold) {
    // Some critical = flagged for review
    status = 'flagged';
  } else if (warningCount > 2) {
    // Multiple warnings = flagged
    status = 'flagged';
  } else if (warningCount > 0 || minorCount > 6) {
    // Some warnings or many minors (>6 total across both alliances) = flagged
    status = 'flagged';
  } else {
    // No issues or only a few minor discrepancies = passed
    status = 'passed';
  }

  // Determine overall confidence
  let confidence: ConfidenceLevel;
  if (redValidation.confidence === 'low' || blueValidation.confidence === 'low') {
    confidence = 'low';
  } else if (redValidation.confidence === 'medium' || blueValidation.confidence === 'medium') {
    confidence = 'medium';
  } else {
    confidence = 'high';
  }

  // Build team validations
  const teams: TeamValidation[] = [];
  
  // Red teams
  tbaRed.teams.forEach(teamNum => {
    const hasData = scoutedRedEntries.some(e => e.selectTeam === teamNum);
    const scoutEntry = scoutedRedEntries.find(e => e.selectTeam === teamNum);
    const rawEntry = scoutedRedRaw?.find(e => e.teamNumber === teamNum);
    
    teams.push({
      teamNumber: teamNum,
      alliance: 'red',
      scoutName: scoutEntry?.scoutName || 'Unknown',
      hasScoutedData: hasData,
      discrepancies: [],  // Could break down by team in future
      confidence: hasData ? redValidation.confidence : 'low',
      flagForReview: !hasData || redValidation.status === 'flagged',
      notes: hasData ? [] : ['No scouted data for this team'],
      // Add correction metadata if available
      isCorrected: rawEntry?.isCorrected,
      correctionCount: rawEntry?.correctionCount,
      lastCorrectedAt: rawEntry?.lastCorrectedAt,
      lastCorrectedBy: rawEntry?.lastCorrectedBy,
      correctionNotes: rawEntry?.correctionNotes,
      originalScoutName: rawEntry?.originalScoutName,
      // Add scoring breakdown if data exists
      scoringBreakdown: scoutEntry ? {
        auto: {
          L1: scoutEntry.autoCoralPlaceL1Count || 0,
          L2: scoutEntry.autoCoralPlaceL2Count || 0,
          L3: scoutEntry.autoCoralPlaceL3Count || 0,
          L4: scoutEntry.autoCoralPlaceL4Count || 0,
          algaeNet: scoutEntry.autoAlgaePlaceNetShot || 0,
          algaeProcessor: scoutEntry.autoAlgaePlaceProcessor || 0,
          mobility: scoutEntry.autoPassedStartLine || false,
        },
        teleop: {
          L1: scoutEntry.teleopCoralPlaceL1Count || 0,
          L2: scoutEntry.teleopCoralPlaceL2Count || 0,
          L3: scoutEntry.teleopCoralPlaceL3Count || 0,
          L4: scoutEntry.teleopCoralPlaceL4Count || 0,
          algaeNet: scoutEntry.teleopAlgaePlaceNetShot || 0,
          algaeProcessor: scoutEntry.teleopAlgaePlaceProcessor || 0,
        },
        endgame: {
          deep: scoutEntry.deepClimbAttempted || false,
          shallow: scoutEntry.shallowClimbAttempted || false,
          park: scoutEntry.parkAttempted || false,
        },
      } : undefined,
    });
  });

  // Blue teams
  tbaBlue.teams.forEach(teamNum => {
    const hasData = scoutedBlueEntries.some(e => e.selectTeam === teamNum);
    const scoutEntry = scoutedBlueEntries.find(e => e.selectTeam === teamNum);
    const rawEntry = scoutedBlueRaw?.find(e => e.teamNumber === teamNum);
    
    teams.push({
      teamNumber: teamNum,
      alliance: 'blue',
      scoutName: scoutEntry?.scoutName || 'Unknown',
      hasScoutedData: hasData,
      discrepancies: [],
      confidence: hasData ? blueValidation.confidence : 'low',
      flagForReview: !hasData || blueValidation.status === 'flagged',
      notes: hasData ? [] : ['No scouted data for this team'],
      // Add correction metadata if available
      isCorrected: rawEntry?.isCorrected,
      correctionCount: rawEntry?.correctionCount,
      lastCorrectedAt: rawEntry?.lastCorrectedAt,
      lastCorrectedBy: rawEntry?.lastCorrectedBy,
      correctionNotes: rawEntry?.correctionNotes,
      originalScoutName: rawEntry?.originalScoutName,
      // Add scoring breakdown if data exists
      scoringBreakdown: scoutEntry ? {
        auto: {
          L1: scoutEntry.autoCoralPlaceL1Count || 0,
          L2: scoutEntry.autoCoralPlaceL2Count || 0,
          L3: scoutEntry.autoCoralPlaceL3Count || 0,
          L4: scoutEntry.autoCoralPlaceL4Count || 0,
          algaeNet: scoutEntry.autoAlgaePlaceNetShot || 0,
          algaeProcessor: scoutEntry.autoAlgaePlaceProcessor || 0,
          mobility: scoutEntry.autoPassedStartLine || false,
        },
        teleop: {
          L1: scoutEntry.teleopCoralPlaceL1Count || 0,
          L2: scoutEntry.teleopCoralPlaceL2Count || 0,
          L3: scoutEntry.teleopCoralPlaceL3Count || 0,
          L4: scoutEntry.teleopCoralPlaceL4Count || 0,
          algaeNet: scoutEntry.teleopAlgaePlaceNetShot || 0,
          algaeProcessor: scoutEntry.teleopAlgaePlaceProcessor || 0,
        },
        endgame: {
          deep: scoutEntry.deepClimbAttempted || false,
          shallow: scoutEntry.shallowClimbAttempted || false,
          park: scoutEntry.parkAttempted || false,
        },
      } : undefined,
    });
  });

  return {
    id: `${eventKey}_${tbaMatch.key}`,
    eventKey,
    matchKey: tbaMatch.key,
    matchNumber,
    compLevel: tbaMatch.comp_level,
    status,
    confidence,
    redAlliance: redValidation,
    blueAlliance: blueValidation,
    teams,
    totalDiscrepancies: allDiscrepancies.length,
    criticalDiscrepancies: criticalCount,
    warningDiscrepancies: warningCount,
    flaggedForReview: status === 'flagged' || status === 'failed',
    requiresReScout: status === 'failed',
    validatedAt: Date.now()
  };
}
