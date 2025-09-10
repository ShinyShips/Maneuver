// Import centralized ScoutingEntry type
export type { ScoutingEntry } from './scoutingTypes';

export interface TeamStats {
  matchesPlayed: number;

  avgAutoCoralL1: number;
  avgAutoCoralL2: number;
  avgAutoCoralL3: number;
  avgAutoCoralL4: number;
  avgTeleopCoralL1: number;
  avgTeleopCoralL2: number;
  avgTeleopCoralL3: number;
  avgTeleopCoralL4: number;
  avgAutoAlgaeNet: number;
  avgAutoAlgaeProcessor: number;
  avgTeleopAlgaeNet: number;
  avgTeleopAlgaeProcessor: number;

  avgTotalPoints: number;
  avgAutoPoints: number;
  avgTeleopPoints: number;
  avgEndgamePoints: number;

  mobilityRate: number;
  climbRate: number;
  defenseRate: number;
  breakdownRate: number;

  shallowClimbRate: number;
  deepClimbRate: number;
  parkRate: number;
  climbFailRate: number;

  startPositions: {
    position0: number;
    position1: number;
    position2: number;
    position3: number;
    position4: number;
    position5: number;
  };

  matchResults: MatchResult[];
}

export interface MatchResult {
  matchNumber: string;
  alliance: string;
  eventName: string;
  totalPoints: number;
  autoPoints: number;
  teleopPoints: number;
  endgamePoints: number;
  climbed: boolean;
  brokeDown: boolean;
  startPosition: number;
  comment: string;
}
