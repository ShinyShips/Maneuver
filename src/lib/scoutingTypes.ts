/**
 * Core scouting data types and interfaces
 * Centralized location for all scouting entry definitions
 */

export interface ScoutingEntry {
  matchNumber: string;
  alliance: string;
  scouterInitials: string;
  selectTeam: string;
  eventName: string;
  startPoses0: boolean;
  startPoses1: boolean;
  startPoses2: boolean;
  startPoses3: boolean;
  startPoses4: boolean;
  startPoses5: boolean;
  autoCoralPlaceL1Count: number;
  autoCoralPlaceL2Count: number;
  autoCoralPlaceL3Count: number;
  autoCoralPlaceL4Count: number;
  autoCoralPlaceDropMissCount: number;

  autoCoralPickPreloadCount: number;
  autoCoralPickStationCount: number;
  autoCoralPickMark1Count: number;
  autoCoralPickMark2Count: number;
  autoCoralPickMark3Count: number;

  autoAlgaePlaceNetShot: number;
  autoAlgaePlaceProcessor: number;
  autoAlgaePlaceDropMiss: number;
  autoAlgaePlaceRemove: number;

  autoAlgaePickReefCount: number;
  autoAlgaePickMark1Count: number;
  autoAlgaePickMark2Count: number;
  autoAlgaePickMark3Count: number;

  autoPassedStartLine: boolean;

  teleopCoralPlaceL1Count: number;
  teleopCoralPlaceL2Count: number;
  teleopCoralPlaceL3Count: number;
  teleopCoralPlaceL4Count: number;
  teleopCoralPlaceDropMissCount: number;
  teleopCoralPickStationCount: number;
  teleopCoralPickCarpetCount: number;

  teleopAlgaePlaceNetShot: number;
  teleopAlgaePlaceProcessor: number;
  teleopAlgaePlaceDropMiss: number;
  teleopAlgaePlaceRemove: number;
  teleopAlgaePickReefCount: number;
  teleopAlgaePickCarpetCount: number;

  shallowClimbAttempted: boolean;
  deepClimbAttempted: boolean;
  parkAttempted: boolean;
  climbFailed: boolean;

  playedDefense: boolean;
  brokeDown: boolean;
  comment: string;
}

// Data collection interface for multiple entries
export interface ScoutingDataEntry {
  id?: string;
  data: ScoutingEntry;
  timestamp?: number;
}

export interface ScoutingDataCollection {
  entries: ScoutingDataEntry[];
  metadata?: {
    version?: string;
    exportTimestamp?: number;
    eventName?: string;
  };
}
