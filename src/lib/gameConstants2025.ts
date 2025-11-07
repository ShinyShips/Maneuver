/**
 * 2025 FIRST Reefscape Game Constants
 * Official scoring values for the 2025 FRC game
 */

// ============================================================================
// Auto Scoring
// ============================================================================

export const AUTO_CORAL_POINTS = {
  L1: 3,
  L2: 4,
  L3: 6,
  L4: 7,
} as const;

export const AUTO_ALGAE_POINTS = {
  NET: 4,
  PROCESSOR: 6,  // Processor is 6 points (opponent can score it for 4, net benefit is 2)
} as const;

export const AUTO_MOBILITY_POINTS = 3;

// ============================================================================
// Teleop Scoring
// ============================================================================

export const TELEOP_CORAL_POINTS = {
  L1: 2,
  L2: 3,
  L3: 4,
  L4: 5,
} as const;

export const TELEOP_ALGAE_POINTS = {
  NET: 4,
  PROCESSOR: 6,  // Processor is 6 points (opponent can score it for 4, net benefit is 2)
} as const;

// ============================================================================
// Endgame Scoring
// ============================================================================

export const ENDGAME_POINTS = {
  PARK: 2,
  SHALLOW_CLIMB: 6,
  DEEP_CLIMB: 12,
} as const;

// ============================================================================
// Bonus Thresholds
// ============================================================================

export const BONUS_THRESHOLDS = {
  // Auto Bonus: All 3 robots must leave starting zone
  AUTO_BONUS: {
    ROBOTS_REQUIRED: 3,
    POINTS: 3, // 3 bonus points per robot (in addition to mobility)
  },
  
  // Coral Bonus: Complete a vertical line (L1-L4 all filled)
  CORAL_BONUS: {
    LINES_REQUIRED: 1,
    // Bonus points TBD by game manual
  },
  
  // Barge Bonus: 8+ coral on barge cage
  BARGE_BONUS: {
    CORAL_REQUIRED: 8,
    // Bonus points TBD by game manual
  },
} as const;

// ============================================================================
// Penalty Values
// ============================================================================

export const PENALTY_POINTS = {
  FOUL: 3, // Added to opponent's score
  TECH_FOUL: 8, // Added to opponent's score
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate auto points for a given coral placement
 */
export const calculateAutoCoralPoints = (l1: number, l2: number, l3: number, l4: number): number => {
  return (
    l1 * AUTO_CORAL_POINTS.L1 +
    l2 * AUTO_CORAL_POINTS.L2 +
    l3 * AUTO_CORAL_POINTS.L3 +
    l4 * AUTO_CORAL_POINTS.L4
  );
};

/**
 * Calculate teleop points for a given coral placement
 */
export const calculateTeleopCoralPoints = (l1: number, l2: number, l3: number, l4: number): number => {
  return (
    l1 * TELEOP_CORAL_POINTS.L1 +
    l2 * TELEOP_CORAL_POINTS.L2 +
    l3 * TELEOP_CORAL_POINTS.L3 +
    l4 * TELEOP_CORAL_POINTS.L4
  );
};

/**
 * Calculate algae points
 */
export const calculateAlgaePoints = (net: number, processor: number, isAuto: boolean = false): number => {
  // Algae scoring is the same for auto and teleop
  return net * (isAuto ? AUTO_ALGAE_POINTS.NET : TELEOP_ALGAE_POINTS.NET) + 
         processor * (isAuto ? AUTO_ALGAE_POINTS.PROCESSOR : TELEOP_ALGAE_POINTS.PROCESSOR);
};

/**
 * Calculate endgame points
 */
export const calculateEndgamePoints = (
  parks: number,
  shallowClimbs: number,
  deepClimbs: number
): number => {
  return (
    parks * ENDGAME_POINTS.PARK +
    shallowClimbs * ENDGAME_POINTS.SHALLOW_CLIMB +
    deepClimbs * ENDGAME_POINTS.DEEP_CLIMB
  );
};

/**
 * Calculate total match points (excluding bonuses and penalties)
 */
export const calculateMatchPoints = (params: {
  // Auto
  autoCoralL1: number;
  autoCoralL2: number;
  autoCoralL3: number;
  autoCoralL4: number;
  autoAlgaeNet: number;
  autoAlgaeProcessor: number;
  autoMobility: number;
  
  // Teleop
  teleopCoralL1: number;
  teleopCoralL2: number;
  teleopCoralL3: number;
  teleopCoralL4: number;
  teleopAlgaeNet: number;
  teleopAlgaeProcessor: number;
  
  // Endgame
  parks: number;
  shallowClimbs: number;
  deepClimbs: number;
}): number => {
  const autoCoralPoints = calculateAutoCoralPoints(
    params.autoCoralL1,
    params.autoCoralL2,
    params.autoCoralL3,
    params.autoCoralL4
  );
  
  const teleopCoralPoints = calculateTeleopCoralPoints(
    params.teleopCoralL1,
    params.teleopCoralL2,
    params.teleopCoralL3,
    params.teleopCoralL4
  );
  
  const autoAlgaePoints = calculateAlgaePoints(params.autoAlgaeNet, params.autoAlgaeProcessor, true);
  const teleopAlgaePoints = calculateAlgaePoints(params.teleopAlgaeNet, params.teleopAlgaeProcessor, false);
  const mobilityPoints = params.autoMobility * AUTO_MOBILITY_POINTS;
  const endgamePoints = calculateEndgamePoints(params.parks, params.shallowClimbs, params.deepClimbs);
  
  return autoCoralPoints + teleopCoralPoints + autoAlgaePoints + teleopAlgaePoints + mobilityPoints + endgamePoints;
};

// ============================================================================
// Export Type Definitions
// ============================================================================

export type CoralLevel = keyof typeof AUTO_CORAL_POINTS;
export type AlgaeLocation = keyof typeof AUTO_ALGAE_POINTS;
export type EndgameAction = keyof typeof ENDGAME_POINTS;
