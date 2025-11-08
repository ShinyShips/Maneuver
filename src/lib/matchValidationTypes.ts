/**
 * Match Validation Types
 * 
 * Type definitions for Phase 3: Validation Logic
 * Used for comparing scouted data against TBA official data
 */

// ============================================================================
// Core Validation Types
// ============================================================================

/**
 * Severity level of a discrepancy between scouted and TBA data
 */
export type DiscrepancySeverity = 'critical' | 'warning' | 'minor' | 'none';

/**
 * Overall validation status for a match
 */
export type ValidationStatus = 
  | 'pending'        // Not yet validated
  | 'passed'         // No significant discrepancies
  | 'flagged'        // Discrepancies detected, review recommended
  | 'failed'         // Major discrepancies, re-scouting required
  | 'no-tba-data';   // TBA data not available

/**
 * Confidence level in the scouted data
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Category of data being compared
 */
export type DataCategory = 
  | 'auto-coral'
  | 'teleop-coral'
  | 'algae'
  | 'endgame'
  | 'mobility'
  | 'fouls'
  | 'total-score';

// ============================================================================
// Discrepancy Reporting
// ============================================================================

/**
 * Represents a single discrepancy between scouted and TBA data
 */
export interface Discrepancy {
  category: DataCategory;
  field: string;  // Specific field name (e.g., "autoCoralL4Count")
  scoutedValue: number;
  tbaValue: number;
  difference: number;  // Absolute difference
  percentDiff: number;  // Percentage difference (0-100)
  severity: DiscrepancySeverity;
  message: string;  // Human-readable description
}

/**
 * Alliance-level validation result
 */
export interface AllianceValidation {
  alliance: 'red' | 'blue';
  status: ValidationStatus;
  confidence: ConfidenceLevel;
  discrepancies: Discrepancy[];
  totalScoutedPoints: number;
  totalTBAPoints: number;
  scoreDifference: number;
  scorePercentDiff: number;
  
  // Raw data for detailed breakdown (optional, for debugging)
  scoutedData?: ScoutedAllianceData;
  tbaData?: TBAAllianceData;
  
  // Calculation breakdown for debugging score differences
  calculationBreakdown?: {
    scouted: {
      autoCoralPts: number;
      autoAlgaePts: number;
      mobilityPts: number;
      teleopCoralPts: number;
      teleopAlgaePts: number;
      endgamePts: number;
    };
    tba: {
      autoCoralPts: number;
      teleopCoralPts: number;
      algaePts: number;
      mobilityPts: number;
      endgamePts: number;
    };
  };
}

/**
 * Team-level validation result
 */
export interface TeamValidation {
  teamNumber: string;
  alliance: 'red' | 'blue';
  scoutName: string;
  hasScoutedData: boolean;
  discrepancies: Discrepancy[];
  confidence: ConfidenceLevel;
  flagForReview: boolean;
  notes: string[];
  // Correction metadata
  isCorrected?: boolean;
  correctionCount?: number;
  lastCorrectedAt?: number;
  lastCorrectedBy?: string;
  correctionNotes?: string;
  originalScoutName?: string;
  // Scoring breakdown for identifying which teams contributed what
  scoringBreakdown?: {
    auto: {
      L1: number;
      L2: number;
      L3: number;
      L4: number;
      algaeNet: number;
      algaeProcessor: number;
      mobility: boolean;
    };
    teleop: {
      L1: number;
      L2: number;
      L3: number;
      L4: number;
      algaeNet: number;
      algaeProcessor: number;
    };
    endgame: {
      deep: boolean;
      shallow: boolean;
      park: boolean;
    };
  };
}

/**
 * Complete match validation result
 */
export interface MatchValidationResult {
  id: string;  // Unique ID for storage
  eventKey: string;
  matchKey: string;  // TBA match key (e.g., "2025mrcmp_qm1")
  matchNumber: string;
  compLevel: string;  // "qm", "qf", "sf", "f"
  
  // Overall status
  status: ValidationStatus;
  confidence: ConfidenceLevel;
  
  // Alliance results
  redAlliance: AllianceValidation;
  blueAlliance: AllianceValidation;
  
  // Team results
  teams: TeamValidation[];
  
  // Summary
  totalDiscrepancies: number;
  criticalDiscrepancies: number;
  warningDiscrepancies: number;
  flaggedForReview: boolean;
  requiresReScout: boolean;
  
  // Metadata
  validatedAt: number;  // Unix timestamp
  validatedBy?: string;  // Optional validator name
  notes?: string;
}

// ============================================================================
// Validation Configuration
// ============================================================================

/**
 * Thresholds for determining discrepancy severity
 */
export interface ValidationThresholds {
  // Percentage difference thresholds
  critical: number;  // > this % = critical (e.g., 25%)
  warning: number;   // > this % = warning (e.g., 15%)
  minor: number;     // > this % = minor (e.g., 5%)
  // Below minor = none
  
  // Absolute difference thresholds (for low-count items)
  criticalAbsolute: number;  // > this count = critical (e.g., 5)
  warningAbsolute: number;   // > this count = warning (e.g., 3)
  minorAbsolute: number;     // > this count = minor (e.g., 1)
}

/**
 * Per-category threshold overrides
 * If not specified for a category, falls back to default thresholds
 */
export interface CategoryThresholds {
  'auto-coral'?: ValidationThresholds;
  'teleop-coral'?: ValidationThresholds;
  'algae'?: ValidationThresholds;
  'endgame'?: ValidationThresholds;
  'mobility'?: ValidationThresholds;
  'fouls'?: ValidationThresholds;
  'total-score'?: ValidationThresholds;
}

/**
 * Configuration for validation behavior
 */
export interface ValidationConfig {
  thresholds: ValidationThresholds;  // Default thresholds
  categoryThresholds?: CategoryThresholds;  // Per-category overrides
  
  // Flags for enabling/disabling specific checks
  checkAutoScoring: boolean;
  checkTeleopScoring: boolean;
  checkEndgame: boolean;
  checkFouls: boolean;
  checkTotalScore: boolean;
  
  // Confidence calculation settings
  minMatchesForHighConfidence: number;  // Scout needs this many matches
  maxDiscrepanciesForHighConfidence: number;
  
  // Re-scouting recommendations
  autoFlagThreshold: number;  // Auto-flag if this many critical discrepancies
  requireReScoutThreshold: number;  // Require re-scout if severity exceeds this
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  thresholds: {
    critical: 25,  // 25% difference
    warning: 15,   // 15% difference
    minor: 5,      // 5% difference
    criticalAbsolute: 5,
    warningAbsolute: 3,
    minorAbsolute: 1
  },
  categoryThresholds: {
    // Per-category overrides can be added here
    // Example: 'algae': { critical: 50, warning: 30, minor: 10, ... }
  },
  checkAutoScoring: true,
  checkTeleopScoring: true,
  checkEndgame: true,
  checkFouls: true,
  checkTotalScore: true,
  minMatchesForHighConfidence: 10,
  maxDiscrepanciesForHighConfidence: 2,
  autoFlagThreshold: 2,  // 2+ critical = auto-flag
  requireReScoutThreshold: 3  // 3+ critical = require re-scout
};

// ============================================================================
// Aggregated Data for Comparison
// ============================================================================

/**
 * Aggregated scouted data for one alliance (sum of all team data)
 */
export interface ScoutedAllianceData {
  alliance: 'red' | 'blue';
  matchNumber: string;
  eventName: string;
  teams: string[];  // Team numbers
  scoutNames: string[];
  
  // Auto scoring (totals)
  autoCoralL1: number;
  autoCoralL2: number;
  autoCoralL3: number;
  autoCoralL4: number;
  autoCoralTotal: number;
  
  autoAlgaeNet: number;
  autoAlgaeProcessor: number;
  autoAlgaeTotal: number;
  
  autoMobility: number;  // Count of robots that crossed line
  
  // Teleop scoring (totals)
  teleopCoralL1: number;
  teleopCoralL2: number;
  teleopCoralL3: number;
  teleopCoralL4: number;
  teleopCoralTotal: number;
  
  teleopAlgaeNet: number;
  teleopAlgaeProcessor: number;
  teleopAlgaeTotal: number;
  
  // Endgame (counts)
  deepClimbs: number;
  shallowClimbs: number;
  parks: number;
  climbFails: number;
  
  // Other
  brokeDown: number;
  playedDefense: number;
  
  // Missing data tracking
  missingTeams: string[];  // Teams in match but not scouted
  scoutedTeamsCount: number;
}

/**
 * TBA alliance data extracted for comparison
 */
export interface TBAAllianceData {
  alliance: 'red' | 'blue';
  teams: string[];  // Team numbers (without "frc" prefix)
  
  // Scores
  totalPoints: number;
  autoPoints: number;
  teleopPoints: number;
  foulPoints: number;
  
  // Auto coral (from grid)
  autoCoralL1: number;
  autoCoralL2: number;
  autoCoralL3: number;
  autoCoralL4: number;
  autoCoralTotal: number;
  autoCoralPoints: number;
  
  // Teleop coral (from grid)
  teleopCoralL1: number;
  teleopCoralL2: number;
  teleopCoralL3: number;
  teleopCoralL4: number;
  teleopCoralTotal: number;
  teleopCoralPoints: number;
  
  // Algae (combined auto + teleop in TBA data)
  algaeNet: number;
  algaeProcessor: number;
  algaeTotal: number;
  algaePoints: number;
  
  // Mobility
  mobilityCount: number;
  mobilityPoints: number;
  
  // Endgame
  deepClimbs: number;
  shallowClimbs: number;
  parks: number;
  endgamePoints: number;
  
  // Bonuses
  autoBonusAchieved: boolean;
  coralBonusAchieved: boolean;
  bargeBonusAchieved: boolean;
  
  // Penalties
  foulCount: number;
  techFoulCount: number;
}

// ============================================================================
// Validation Storage
// ============================================================================

/**
 * Database entry for validation result (for IndexedDB)
 */
export interface ValidationResultDB {
  id: string;  // Primary key: `${eventKey}_${matchKey}`
  eventKey: string;
  matchKey: string;
  matchNumber: string;
  result: MatchValidationResult;
  timestamp: number;
}

/**
 * Summary statistics for validation across multiple matches
 */
export interface ValidationSummary {
  eventKey: string;
  totalMatches: number;
  validatedMatches: number;
  pendingMatches: number;
  passedMatches: number;
  flaggedMatches: number;
  failedMatches: number;
  noTBADataMatches: number;
  
  totalDiscrepancies: number;
  criticalDiscrepancies: number;
  warningDiscrepancies: number;
  minorDiscrepancies: number;
  
  averageConfidence: ConfidenceLevel;
  matchesRequiringReScout: number;
  
  generatedAt: number;
}
