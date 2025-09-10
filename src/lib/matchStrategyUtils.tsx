/* eslint-disable @typescript-eslint/no-explicit-any */

// Import centralized ScoutingEntry type
import type { ScoutingEntry } from './scoutingTypes';

export interface TeamStats {
  matchesPlayed: number;
  overall: {
    totalPiecesScored: number;
    avgTotalPoints: number;
    avgCoral: number;
    avgAlgae: number;
  };
  auto: {
    mobilityRate: number;
    avgCoral: number;
    avgAlgae: number;
    avgTotalPoints: number;
    startingPositions: Array<{ position: string; percentage: number }>;
  };
  teleop: {
    avgCoral: number;
    avgAlgae: number;
    avgTotalPoints: number;
  };
  endgame: {
    climbRate: number;
    parkRate: number;
    shallowClimbRate: number;
    deepClimbRate: number;
    avgTotalPoints: number;
  };
}

export const parseScoutingEntry = (dataObject: Record<string, unknown>): ScoutingEntry => {
  // Convert object properties to ScoutingEntry structure
  return {
    matchNumber: dataObject.matchNumber?.toString() || "",
    alliance: dataObject.alliance?.toString() || "",
    scouterInitials: dataObject.scouterInitials?.toString() || "",
    selectTeam: dataObject.selectTeam?.toString() || "",
    eventName: dataObject.eventName?.toString() || "",
    startPoses0: Boolean(dataObject.startPoses0),
    startPoses1: Boolean(dataObject.startPoses1),
    startPoses2: Boolean(dataObject.startPoses2),
    startPoses3: Boolean(dataObject.startPoses3),
    startPoses4: Boolean(dataObject.startPoses4),
    startPoses5: Boolean(dataObject.startPoses5),
    autoCoralPlaceL1Count: Number(dataObject.autoCoralPlaceL1Count) || 0,
    autoCoralPlaceL2Count: Number(dataObject.autoCoralPlaceL2Count) || 0,
    autoCoralPlaceL3Count: Number(dataObject.autoCoralPlaceL3Count) || 0,
    autoCoralPlaceL4Count: Number(dataObject.autoCoralPlaceL4Count) || 0,
    autoCoralPlaceDropMissCount: Number(dataObject.autoCoralPlaceDropMissCount) || 0,
    autoCoralPickPreloadCount: Number(dataObject.autoCoralPickPreloadCount) || 0,
    autoCoralPickStationCount: Number(dataObject.autoCoralPickStationCount) || 0,
    autoCoralPickMark1Count: Number(dataObject.autoCoralPickMark1Count) || 0,
    autoCoralPickMark2Count: Number(dataObject.autoCoralPickMark2Count) || 0,
    autoCoralPickMark3Count: Number(dataObject.autoCoralPickMark3Count) || 0,
    autoAlgaePlaceNetShot: Number(dataObject.autoAlgaePlaceNetShot) || 0,
    autoAlgaePlaceProcessor: Number(dataObject.autoAlgaePlaceProcessor) || 0,
    autoAlgaePlaceDropMiss: Number(dataObject.autoAlgaePlaceDropMiss) || 0,
    autoAlgaePlaceRemove: Number(dataObject.autoAlgaePlaceRemove) || 0,
    autoAlgaePickReefCount: Number(dataObject.autoAlgaePickReefCount) || 0,
    autoAlgaePickMark1Count: Number(dataObject.autoAlgaePickMark1Count) || 0,
    autoAlgaePickMark2Count: Number(dataObject.autoAlgaePickMark2Count) || 0,
    autoAlgaePickMark3Count: Number(dataObject.autoAlgaePickMark3Count) || 0,
    autoPassedStartLine: Boolean(dataObject.autoPassedStartLine),
    teleopCoralPlaceL1Count: Number(dataObject.teleopCoralPlaceL1Count) || 0,
    teleopCoralPlaceL2Count: Number(dataObject.teleopCoralPlaceL2Count) || 0,
    teleopCoralPlaceL3Count: Number(dataObject.teleopCoralPlaceL3Count) || 0,
    teleopCoralPlaceL4Count: Number(dataObject.teleopCoralPlaceL4Count) || 0,
    teleopCoralPlaceDropMissCount: Number(dataObject.teleopCoralPlaceDropMissCount) || 0,
    teleopCoralPickStationCount: Number(dataObject.teleopCoralPickStationCount) || 0,
    teleopCoralPickCarpetCount: Number(dataObject.teleopCoralPickCarpetCount) || 0,
    teleopAlgaePlaceNetShot: Number(dataObject.teleopAlgaePlaceNetShot) || 0,
    teleopAlgaePlaceProcessor: Number(dataObject.teleopAlgaePlaceProcessor) || 0,
    teleopAlgaePlaceDropMiss: Number(dataObject.teleopAlgaePlaceDropMiss) || 0,
    teleopAlgaePlaceRemove: Number(dataObject.teleopAlgaePlaceRemove) || 0,
    teleopAlgaePickReefCount: Number(dataObject.teleopAlgaePickReefCount) || 0,
    teleopAlgaePickCarpetCount: Number(dataObject.teleopAlgaePickCarpetCount) || 0,
    shallowClimbAttempted: Boolean(dataObject.shallowClimbAttempted),
    deepClimbAttempted: Boolean(dataObject.deepClimbAttempted),
    parkAttempted: Boolean(dataObject.parkAttempted),
    climbFailed: Boolean(dataObject.climbFailed),
    playedDefense: Boolean(dataObject.playedDefense),
    brokeDown: Boolean(dataObject.brokeDown),
    comment: dataObject.comment?.toString() || ""
  };
};

export const createTeamStatsCalculator = (scoutingData: any[]) => {
  return (teamNumber: string): TeamStats | null => {
    if (!teamNumber) return null;

    const teamDataObjects = scoutingData.filter((dataObject: Record<string, unknown>) => 
      dataObject.selectTeam?.toString() === teamNumber
    );
    
    if (teamDataObjects.length === 0) {
      return {
        matchesPlayed: 0,
        overall: {
          totalPiecesScored: 0,
          avgTotalPoints: 0,
          avgCoral: 0,
          avgAlgae: 0
        },
        auto: {
          mobilityRate: 0,
          avgCoral: 0,
          avgAlgae: 0,
          startingPositions: [],
          avgTotalPoints: 0
        },
        teleop: {
          avgCoral: 0,
          avgAlgae: 0,
          avgTotalPoints: 0
        },
        endgame: {
          climbRate: 0,
          parkRate: 0,
          shallowClimbRate: 0,
          deepClimbRate: 0,
          avgTotalPoints: 0
        }
      };
    }

    const teamEntries = teamDataObjects.map(parseScoutingEntry);
    const matchCount = teamEntries.length;

    // Calculate overall stats
    const totalPiecesScored = teamEntries.reduce((sum, entry) => {
      const autoCoralScored = entry.autoCoralPlaceL1Count + entry.autoCoralPlaceL2Count + 
                           entry.autoCoralPlaceL3Count + entry.autoCoralPlaceL4Count;
      const teleopCoralScored = entry.teleopCoralPlaceL1Count + entry.teleopCoralPlaceL2Count + 
                             entry.teleopCoralPlaceL3Count + entry.teleopCoralPlaceL4Count;
      const autoAlgaeScored = entry.autoAlgaePlaceNetShot + entry.autoAlgaePlaceProcessor;
      const teleopAlgaeScored = entry.teleopAlgaePlaceNetShot + entry.teleopAlgaePlaceProcessor;
      
      return sum + autoCoralScored + teleopCoralScored + autoAlgaeScored + teleopAlgaeScored;
    }, 0);

    const totalCoral = teamEntries.reduce((sum, entry) => {
      return sum + entry.autoCoralPlaceL1Count + entry.autoCoralPlaceL2Count + 
             entry.autoCoralPlaceL3Count + entry.autoCoralPlaceL4Count +
             entry.teleopCoralPlaceL1Count + entry.teleopCoralPlaceL2Count + 
             entry.teleopCoralPlaceL3Count + entry.teleopCoralPlaceL4Count;
    }, 0);

    const totalAlgae = teamEntries.reduce((sum, entry) => {
      return sum + entry.autoAlgaePlaceNetShot + entry.autoAlgaePlaceProcessor +
             entry.teleopAlgaePlaceNetShot + entry.teleopAlgaePlaceProcessor;
    }, 0);

    const autoPoints = teamEntries.reduce((sum, entry) => {
      const autoCoralPoints = (entry.autoCoralPlaceL1Count * 3) + (entry.autoCoralPlaceL2Count * 4) + 
                           (entry.autoCoralPlaceL3Count * 6) + (entry.autoCoralPlaceL4Count * 7);
      const autoAlgaePoints = (entry.autoAlgaePlaceNetShot * 4) + (entry.autoAlgaePlaceProcessor * 2);
      const autoMobilityPoints = entry.autoPassedStartLine ? 3 : 0;

      return sum + autoCoralPoints + autoAlgaePoints + autoMobilityPoints;
    }, 0);

    const teleopPoints = teamEntries.reduce((sum, entry) => {
      const teleopCoralPoints = (entry.teleopCoralPlaceL1Count * 2) + (entry.teleopCoralPlaceL2Count * 3) + 
                             (entry.teleopCoralPlaceL3Count * 4) + (entry.teleopCoralPlaceL4Count * 5);
      const teleopAlgaePoints = (entry.teleopAlgaePlaceNetShot * 4) + (entry.teleopAlgaePlaceProcessor * 2);

      return sum + teleopCoralPoints + teleopAlgaePoints;
    }, 0);

    const endgamePoints = teamEntries.reduce((sum, entry) => {
      let points = 0;
      if ((entry.parkAttempted && !entry.climbFailed) || (entry.shallowClimbAttempted && entry.climbFailed) || (entry.deepClimbAttempted && entry.climbFailed)) points += 2;
      if (entry.shallowClimbAttempted && !entry.climbFailed) points += 6;
      if (entry.deepClimbAttempted && !entry.climbFailed) points += 12;

      return sum + points;
    }, 0);

    const totalPoints = autoPoints + teleopPoints + endgamePoints;

    // Calculate auto stats
    const mobilityCount = teamEntries.filter(entry => entry.autoPassedStartLine).length;
    const autoCoralTotal = teamEntries.reduce((sum, entry) => {
      return sum + entry.autoCoralPlaceL1Count + entry.autoCoralPlaceL2Count + 
             entry.autoCoralPlaceL3Count + entry.autoCoralPlaceL4Count;
    }, 0);
    const autoAlgaeTotal = teamEntries.reduce((sum, entry) => {
      return sum + entry.autoAlgaePlaceNetShot + entry.autoAlgaePlaceProcessor;
    }, 0);

    // Calculate starting positions
    const startingPositions = [];
    const positions = ['Pos 0', 'Pos 1', 'Pos 2', 'Pos 3', 'Pos 4', 'Pos 5'];
    const positionCounts = [
      teamEntries.filter(entry => entry.startPoses0).length,
      teamEntries.filter(entry => entry.startPoses1).length,
      teamEntries.filter(entry => entry.startPoses2).length,
      teamEntries.filter(entry => entry.startPoses3).length,
      teamEntries.filter(entry => entry.startPoses4).length,
      teamEntries.filter(entry => entry.startPoses5).length
    ];

    for (let i = 0; i < positions.length; i++) {
      const percentage = Math.round((positionCounts[i] / matchCount) * 100);
      if (percentage > 0) {
        startingPositions.push({ position: positions[i], percentage });
      }
    }

    // Calculate teleop stats
    const teleopCoralTotal = teamEntries.reduce((sum, entry) => {
      return sum + entry.teleopCoralPlaceL1Count + entry.teleopCoralPlaceL2Count + 
             entry.teleopCoralPlaceL3Count + entry.teleopCoralPlaceL4Count;
    }, 0);
    const teleopAlgaeTotal = teamEntries.reduce((sum, entry) => {
      return sum + entry.teleopAlgaePlaceNetShot + entry.teleopAlgaePlaceProcessor;
    }, 0);

    // Calculate endgame stats
    const successfulClimbs = teamEntries.filter(entry => 
      (entry.shallowClimbAttempted || entry.deepClimbAttempted) && !entry.climbFailed
    ).length;
    const parkCount = teamEntries.filter(entry => entry.parkAttempted && !entry.climbFailed).length;
    const shallowClimbCount = teamEntries.filter(entry => entry.shallowClimbAttempted && !entry.climbFailed).length;
    const deepClimbCount = teamEntries.filter(entry => entry.deepClimbAttempted && !entry.climbFailed).length;

    return {
      matchesPlayed: matchCount,
      overall: {
        totalPiecesScored: Math.round((totalPiecesScored / matchCount) * 10) / 10,
        avgTotalPoints: Math.round((totalPoints / matchCount) * 10) / 10,
        avgCoral: Math.round((totalCoral / matchCount) * 10) / 10,
        avgAlgae: Math.round((totalAlgae / matchCount) * 10) / 10
      },
      auto: {
        mobilityRate: Math.round((mobilityCount / matchCount) * 100),
        avgCoral: Math.round((autoCoralTotal / matchCount) * 10) / 10,
        avgAlgae: Math.round((autoAlgaeTotal / matchCount) * 10) / 10,
        avgTotalPoints: Math.round((autoPoints / matchCount) * 10) / 10,
        startingPositions
      },
      teleop: {
        avgCoral: Math.round((teleopCoralTotal / matchCount) * 10) / 10,
        avgAlgae: Math.round((teleopAlgaeTotal / matchCount) * 10) / 10,
        avgTotalPoints: Math.round((teleopPoints / matchCount) * 10) / 10
      },
      endgame: {
        climbRate: Math.round((successfulClimbs / matchCount) * 100),
        parkRate: Math.round((parkCount / matchCount) * 100),
        shallowClimbRate: Math.round((shallowClimbCount / matchCount) * 100),
        deepClimbRate: Math.round((deepClimbCount / matchCount) * 100),
        avgTotalPoints: Math.round((endgamePoints / matchCount) * 10) / 10
      }
    };
  };
};
