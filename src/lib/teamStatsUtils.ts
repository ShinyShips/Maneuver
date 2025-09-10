import type { ScoutingEntry } from './scoutingTypes';
import type { TeamStats, MatchResult } from './teamStatsTypes';

export const parseScoutingEntry = (dataObject: Record<string, unknown>): ScoutingEntry => {
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

export const calculateTeamStats = (
  teamNumber: string, 
  scoutingData: Record<string, unknown>[], 
  selectedEvent?: string
): TeamStats | null => {
  if (!teamNumber) return null;

  let teamDataObjects = scoutingData.filter((dataObject: Record<string, unknown>) => dataObject.selectTeam?.toString() === teamNumber);
  
  // Filter by event if one is selected
  if (selectedEvent && selectedEvent !== "all") {
    teamDataObjects = teamDataObjects.filter((dataObject: Record<string, unknown>) => dataObject.eventName?.toString() === selectedEvent);
  }
  
  if (teamDataObjects.length === 0) {
    return null;
  }

  const teamEntries = teamDataObjects.map(parseScoutingEntry);
  const matchCount = teamEntries.length;

  // Calculate averages
  const totals = teamEntries.reduce((acc, entry) => {
    // Auto coral
    acc.autoCoralL1 += entry.autoCoralPlaceL1Count;
    acc.autoCoralL2 += entry.autoCoralPlaceL2Count;
    acc.autoCoralL3 += entry.autoCoralPlaceL3Count;
    acc.autoCoralL4 += entry.autoCoralPlaceL4Count;
    
    acc.teleopCoralL1 += entry.teleopCoralPlaceL1Count;
    acc.teleopCoralL2 += entry.teleopCoralPlaceL2Count;
    acc.teleopCoralL3 += entry.teleopCoralPlaceL3Count;
    acc.teleopCoralL4 += entry.teleopCoralPlaceL4Count;
    
    acc.autoAlgaeNet += entry.autoAlgaePlaceNetShot;
    acc.autoAlgaeProcessor += entry.autoAlgaePlaceProcessor;
    
    acc.teleopAlgaeNet += entry.teleopAlgaePlaceNetShot;
    acc.teleopAlgaeProcessor += entry.teleopAlgaePlaceProcessor;
    
    // Counts
    acc.mobility += entry.autoPassedStartLine ? 1 : 0;
    acc.defense += entry.playedDefense ? 1 : 0;
    acc.breakdown += entry.brokeDown ? 1 : 0;
    acc.shallowClimb += entry.shallowClimbAttempted ? 1 : 0;
    acc.deepClimb += entry.deepClimbAttempted ? 1 : 0;
    acc.park += entry.parkAttempted ? 1 : 0;
    acc.climbFail += entry.climbFailed ? 1 : 0;
    
    acc.startPos0 += entry.startPoses0 ? 1 : 0;
    acc.startPos1 += entry.startPoses1 ? 1 : 0;
    acc.startPos2 += entry.startPoses2 ? 1 : 0;
    acc.startPos3 += entry.startPoses3 ? 1 : 0;
    acc.startPos4 += entry.startPoses4 ? 1 : 0;
    acc.startPos5 += entry.startPoses5 ? 1 : 0;
    
    return acc;
  }, {
    autoCoralL1: 0, autoCoralL2: 0, autoCoralL3: 0, autoCoralL4: 0,
    teleopCoralL1: 0, teleopCoralL2: 0, teleopCoralL3: 0, teleopCoralL4: 0,
    autoAlgaeNet: 0, autoAlgaeProcessor: 0, teleopAlgaeNet: 0, teleopAlgaeProcessor: 0,
    mobility: 0, defense: 0, breakdown: 0, shallowClimb: 0, deepClimb: 0, park: 0, climbFail: 0,
    startPos0: 0, startPos1: 0, startPos2: 0, startPos3: 0, startPos4: 0, startPos5: 0
  });

  // Calculate match results with points
  const matchResults: MatchResult[] = teamEntries.map(entry => {
    // Auto points
    const autoCoralPoints = (entry.autoCoralPlaceL1Count * 3) + (entry.autoCoralPlaceL2Count * 4) + 
                         (entry.autoCoralPlaceL3Count * 6) + (entry.autoCoralPlaceL4Count * 7);
    const autoAlgaePoints = (entry.autoAlgaePlaceNetShot * 4) + (entry.autoAlgaePlaceProcessor * 2);
    const autoMobilityPoints = entry.autoPassedStartLine ? 3 : 0;
    const autoPoints = autoCoralPoints + autoAlgaePoints + autoMobilityPoints;
    
    // Teleop points
    const teleopCoralPoints = (entry.teleopCoralPlaceL1Count * 2) + (entry.teleopCoralPlaceL2Count * 3) + 
                           (entry.teleopCoralPlaceL3Count * 4) + (entry.teleopCoralPlaceL4Count * 5);
    const teleopAlgaePoints = (entry.teleopAlgaePlaceNetShot * 4) + (entry.teleopAlgaePlaceProcessor * 2);
    const teleopPoints = teleopCoralPoints + teleopAlgaePoints;
    
    let endgamePoints = 0;
    if ((entry.parkAttempted && !entry.climbFailed) || (entry.shallowClimbAttempted && entry.climbFailed) || (entry.deepClimbAttempted && entry.climbFailed)) endgamePoints += 2;
    if (entry.shallowClimbAttempted && !entry.climbFailed) endgamePoints += 6;
    if (entry.deepClimbAttempted && !entry.climbFailed) endgamePoints += 12;
    
    // Determine start position
    let startPosition = -1;
    if (entry.startPoses0) startPosition = 0;
    else if (entry.startPoses1) startPosition = 1;
    else if (entry.startPoses2) startPosition = 2;
    else if (entry.startPoses3) startPosition = 3;
    else if (entry.startPoses4) startPosition = 4;
    else if (entry.startPoses5) startPosition = 5;
    
    return {
      matchNumber: entry.matchNumber,
      alliance: entry.alliance,
      eventName: entry.eventName,
      totalPoints: autoPoints + teleopPoints + endgamePoints,
      autoPoints,
      teleopPoints,
      endgamePoints,
      climbed: (entry.shallowClimbAttempted || entry.deepClimbAttempted) && !entry.climbFailed,
      brokeDown: entry.brokeDown,
      startPosition,
      comment: entry.comment
    };
  });

  // Calculate average points
  const avgAutoPoints = matchResults.reduce((sum, match) => sum + match.autoPoints, 0) / matchCount;
  const avgTeleopPoints = matchResults.reduce((sum, match) => sum + match.teleopPoints, 0) / matchCount;
  const avgEndgamePoints = matchResults.reduce((sum, match) => sum + match.endgamePoints, 0) / matchCount;

  return {
    matchesPlayed: matchCount,
    avgAutoCoralL1: Math.round((totals.autoCoralL1 / matchCount) * 10) / 10,
    avgAutoCoralL2: Math.round((totals.autoCoralL2 / matchCount) * 10) / 10,
    avgAutoCoralL3: Math.round((totals.autoCoralL3 / matchCount) * 10) / 10,
    avgAutoCoralL4: Math.round((totals.autoCoralL4 / matchCount) * 10) / 10,
    avgTeleopCoralL1: Math.round((totals.teleopCoralL1 / matchCount) * 10) / 10,
    avgTeleopCoralL2: Math.round((totals.teleopCoralL2 / matchCount) * 10) / 10,
    avgTeleopCoralL3: Math.round((totals.teleopCoralL3 / matchCount) * 10) / 10,
    avgTeleopCoralL4: Math.round((totals.teleopCoralL4 / matchCount) * 10) / 10,
    avgAutoAlgaeNet: Math.round((totals.autoAlgaeNet / matchCount) * 10) / 10,
    avgAutoAlgaeProcessor: Math.round((totals.autoAlgaeProcessor / matchCount) * 10) / 10,
    avgTeleopAlgaeNet: Math.round((totals.teleopAlgaeNet / matchCount) * 10) / 10,
    avgTeleopAlgaeProcessor: Math.round((totals.teleopAlgaeProcessor / matchCount) * 10) / 10,
    avgTotalPoints: Math.round((avgAutoPoints + avgTeleopPoints + avgEndgamePoints) * 10) / 10,
    avgAutoPoints: Math.round(avgAutoPoints * 10) / 10,
    avgTeleopPoints: Math.round(avgTeleopPoints * 10) / 10,
    avgEndgamePoints: Math.round(avgEndgamePoints * 10) / 10,
    mobilityRate: Math.round((totals.mobility / matchCount) * 100),
    climbRate: Math.round(((totals.shallowClimb + totals.deepClimb - totals.climbFail) / matchCount) * 100),
    defenseRate: Math.round((totals.defense / matchCount) * 100),
    breakdownRate: Math.round((totals.breakdown / matchCount) * 100),
    shallowClimbRate: Math.round((totals.shallowClimb / matchCount) * 100),
    deepClimbRate: Math.round((totals.deepClimb / matchCount) * 100),
    parkRate: Math.round((totals.park / matchCount) * 100),
    climbFailRate: Math.round((totals.climbFail / matchCount) * 100),
    startPositions: {
      position0: Math.round((totals.startPos0 / matchCount) * 100),
      position1: Math.round((totals.startPos1 / matchCount) * 100),
      position2: Math.round((totals.startPos2 / matchCount) * 100),
      position3: Math.round((totals.startPos3 / matchCount) * 100),
      position4: Math.round((totals.startPos4 / matchCount) * 100),
      position5: Math.round((totals.startPos5 / matchCount) * 100)
    },
    matchResults: matchResults.sort((a, b) => Number(a.matchNumber) - Number(b.matchNumber))
  };
};
