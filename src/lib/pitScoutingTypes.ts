export interface AutoPositionScoring {
  coralL1: number;
  coralL2: number;
  coralL3: number;
  coralL4: number;
  algaeNet: number;
  algaeProcessor: number;
}

export interface TeleopScoring {
  coralL1: number;
  coralL2: number;
  coralL3: number;
  coralL4: number;
  totalAlgae: number;
  algaeNetShots: boolean;
  algaeProcessor: boolean;
}

export interface GroundPickupCapabilities {
  coralGroundPickup: boolean;
  algaeGroundPickup: boolean;
}

export interface PitScoutingEntry {
  id: string;
  teamNumber: string;
  eventName: string;
  scoutName: string;
  timestamp: number;
  
  // Basic Information
  robotPhoto?: string; // Base64 encoded image
  weight?: number; // in pounds
  drivetrain?: string;
  programmingLanguage?: string;
  
  // Ground Pickup Capabilities
  groundPickupCapabilities?: GroundPickupCapabilities;
  
  // Reported Auto Scoring by Position (0-4 only)
  reportedAutoScoring?: {
    position0: AutoPositionScoring;
    position1: AutoPositionScoring;
    position2: AutoPositionScoring;
    position3: AutoPositionScoring;
    position4: AutoPositionScoring;
  };
  
  // Reported Teleop Scoring
  reportedTeleopScoring?: TeleopScoring;
  
  // Endgame capabilities
  reportedEndgame?: {
    canShallowClimb?: boolean;
    canDeepClimb?: boolean;
    canPark?: boolean;
  };
  
  // Additional notes
  notes?: string;
}

export interface PitScoutingData {
  entries: PitScoutingEntry[];
  lastUpdated: number;
}

// Drivetrain options
export const DRIVETRAIN_OPTIONS = [
  "Swerve Drive",
  "Tank Drive",
  "Mecanum Drive",
  "Other"
] as const;

// Programming language options
export const PROGRAMMING_LANGUAGES = [
  "Java",
  "C++",
  "Python",
  "LabVIEW",
  "Other"
] as const;

export type DrivetrainType = typeof DRIVETRAIN_OPTIONS[number];
export type ProgrammingLanguageType = typeof PROGRAMMING_LANGUAGES[number];
