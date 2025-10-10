interface ScoringAction {
  type: string;
  location: string;
  level?: string;
  pieceType?: string;
  phase: string;
  timestamp: number;
  value?: boolean;
}

interface ScoutingInputs {
  matchNumber: string;
  alliance: string;
  scoutName: string;
  selectTeam: string;
  eventName?: string;
  startPoses: boolean[];
  autoActions: ScoringAction[];
  teleopActions: ScoringAction[];
  autoPassedStartLine: boolean;
  teleopPlayedDefense: boolean;
  shallowClimbAttempted: boolean;
  deepClimbAttempted: boolean;
  parkAttempted: boolean;
  climbFailed: boolean;
  brokeDown: boolean;
  comment: string;
}

export const transformToLegacyFormat = (inputs: ScoutingInputs) => {
  let autoCoralPlaceL1Count = 0;
  let autoCoralPlaceL2Count = 0;
  let autoCoralPlaceL3Count = 0;
  let autoCoralPlaceL4Count = 0;
  let autoCoralPlaceDropMissCount = 0;
  
  let autoCoralPickPreloadCount = 0;
  let autoCoralPickStationCount = 0;
  let autoCoralPickMark1Count = 0;
  let autoCoralPickMark2Count = 0;
  let autoCoralPickMark3Count = 0;
  
  let autoAlgaePlaceNetShot = 0;
  let autoAlgaePlaceProcessor = 0;
  let autoAlgaePlaceDropMiss = 0;
  let autoAlgaePlaceRemove = 0;
  
  let autoAlgaePickReefCount = 0;
  let autoAlgaePickMark1Count = 0;
  let autoAlgaePickMark2Count = 0;
  let autoAlgaePickMark3Count = 0;
  
  let teleopCoralPlaceL1Count = 0;
  let teleopCoralPlaceL2Count = 0;
  let teleopCoralPlaceL3Count = 0;
  let teleopCoralPlaceL4Count = 0;
  let teleopCoralPlaceDropMissCount = 0;
  
  let teleopCoralPickStationCount = 0;
  let teleopCoralPickCarpetCount = 0;
  
  let teleopAlgaePlaceNetShot = 0;
  let teleopAlgaePlaceProcessor = 0;
  let teleopAlgaePlaceDropMiss = 0;
  let teleopAlgaePlaceRemove = 0;
  
  let teleopAlgaePickReefCount = 0;
  let teleopAlgaePickCarpetCount = 0;

  // Process auto actions
  inputs.autoActions?.forEach(action => {
    if (action.type === "score" && action.pieceType === "coral" && action.location === "reef") {
      if (action.level === "l1") autoCoralPlaceL1Count++;
      else if (action.level === "l2") autoCoralPlaceL2Count++;
      else if (action.level === "l3") autoCoralPlaceL3Count++;
      else if (action.level === "l4") autoCoralPlaceL4Count++;
      else if (action.level === "miss") autoCoralPlaceDropMissCount++;
    } else if (action.type === "pickup" && action.pieceType === "coral") {
      if (action.location === "preload") autoCoralPickPreloadCount++;
      else if (action.location === "station") autoCoralPickStationCount++;
      else if (action.location === "mark1") autoCoralPickMark1Count++;
      else if (action.location === "mark2") autoCoralPickMark2Count++;
      else if (action.location === "mark3") autoCoralPickMark3Count++;
    } else if (action.type === "score" && action.pieceType === "algae") {
      if (action.location === "net") autoAlgaePlaceNetShot++;
      else if (action.location === "processor") autoAlgaePlaceProcessor++;
      else if (action.location === "miss") autoAlgaePlaceDropMiss++;
    } else if (action.type === "action" && action.pieceType === "algae" && action.location === "remove") {
      autoAlgaePlaceRemove++;
    } else if (action.type === "pickup" && action.pieceType === "algae") {
      if (action.location === "reef") autoAlgaePickReefCount++;
      else if (action.location === "mark1") autoAlgaePickMark1Count++;
      else if (action.location === "mark2") autoAlgaePickMark2Count++;
      else if (action.location === "mark3") autoAlgaePickMark3Count++;
    }
  });

  // Process teleop actions
  inputs.teleopActions?.forEach(action => {
    if (action.type === "score" && action.pieceType === "coral" && action.location === "reef") {
      if (action.level === "l1") teleopCoralPlaceL1Count++;
      else if (action.level === "l2") teleopCoralPlaceL2Count++;
      else if (action.level === "l3") teleopCoralPlaceL3Count++;
      else if (action.level === "l4") teleopCoralPlaceL4Count++;
      else if (action.level === "miss") teleopCoralPlaceDropMissCount++;
    } else if (action.type === "pickup" && action.pieceType === "coral") {
      if (action.location === "station") teleopCoralPickStationCount++;
      else if (action.location === "carpet") teleopCoralPickCarpetCount++;
    } else if (action.type === "score" && action.pieceType === "algae") {
      if (action.location === "net") teleopAlgaePlaceNetShot++;
      else if (action.location === "processor") teleopAlgaePlaceProcessor++;
      else if (action.location === "miss") teleopAlgaePlaceDropMiss++;
    } else if (action.type === "action" && action.pieceType === "algae" && action.location === "remove") {
      teleopAlgaePlaceRemove++;
    } else if (action.type === "pickup" && action.pieceType === "algae") {
      if (action.location === "reef") teleopAlgaePickReefCount++;
      else if (action.location === "carpet") teleopAlgaePickCarpetCount++;
    }
  });

  // Return array of values in the exact order expected by the CSV headers
  return [
    inputs.matchNumber,
    inputs.alliance === "red" ? "redAlliance" : "blueAlliance",
    inputs.scoutName,
    inputs.selectTeam,
    
    // Starting positions (6 positions)
    inputs.startPoses[0] || false,
    inputs.startPoses[1] || false,
    inputs.startPoses[2] || false,
    inputs.startPoses[3] || false,
    inputs.startPoses[4] || false,
    inputs.startPoses[5] || false,
    
    // Auto coral scoring counts
    autoCoralPlaceL1Count,
    autoCoralPlaceL2Count,
    autoCoralPlaceL3Count,
    autoCoralPlaceL4Count,
    autoCoralPlaceDropMissCount,
    
    // Auto coral pickup counts
    autoCoralPickPreloadCount,
    autoCoralPickStationCount,
    autoCoralPickMark1Count,
    autoCoralPickMark2Count,
    autoCoralPickMark3Count,
    
    // Auto algae scoring counts
    autoAlgaePlaceNetShot,
    autoAlgaePlaceProcessor,
    autoAlgaePlaceDropMiss,
    autoAlgaePlaceRemove,
    
    // Auto algae pickup counts
    autoAlgaePickReefCount,
    autoAlgaePickMark1Count,
    autoAlgaePickMark2Count,
    autoAlgaePickMark3Count,
    
    // Auto passed start line
    inputs.autoPassedStartLine,
    
    // Teleop coral scoring counts
    teleopCoralPlaceL1Count,
    teleopCoralPlaceL2Count,
    teleopCoralPlaceL3Count,
    teleopCoralPlaceL4Count,
    teleopCoralPlaceDropMissCount,
    
    // Teleop coral pickup counts
    teleopCoralPickStationCount,
    teleopCoralPickCarpetCount,
    
    // Teleop algae scoring counts
    teleopAlgaePlaceNetShot,
    teleopAlgaePlaceProcessor,
    teleopAlgaePlaceDropMiss,
    teleopAlgaePlaceRemove,
    
    // Teleop algae pickup counts
    teleopAlgaePickReefCount,
    teleopAlgaePickCarpetCount,
    
    // Endgame
    inputs.shallowClimbAttempted || false,
    inputs.deepClimbAttempted || false,
    inputs.parkAttempted || false,
    inputs.climbFailed || false,
    inputs.teleopPlayedDefense || false,
    inputs.brokeDown || false,
    inputs.comment || ""
  ];
};

/**
 * Transforms the new action-based scoring data into object format
 * for the new IndexedDB-based system
 */
export const transformToObjectFormat = (inputs: ScoutingInputs): Record<string, unknown> => {
  // Initialize all count values to 0
  let autoCoralPlaceL1Count = 0;
  let autoCoralPlaceL2Count = 0;
  let autoCoralPlaceL3Count = 0;
  let autoCoralPlaceL4Count = 0;
  let autoCoralPlaceDropMissCount = 0;
  
  let autoCoralPickPreloadCount = 0;
  let autoCoralPickStationCount = 0;
  let autoCoralPickMark1Count = 0;
  let autoCoralPickMark2Count = 0;
  let autoCoralPickMark3Count = 0;
  
  let autoAlgaePlaceNetShot = 0;
  let autoAlgaePlaceProcessor = 0;
  let autoAlgaePlaceDropMiss = 0;
  let autoAlgaePlaceRemove = 0;
  
  let autoAlgaePickReefCount = 0;
  let autoAlgaePickMark1Count = 0;
  let autoAlgaePickMark2Count = 0;
  let autoAlgaePickMark3Count = 0;
  
  let teleopCoralPlaceL1Count = 0;
  let teleopCoralPlaceL2Count = 0;
  let teleopCoralPlaceL3Count = 0;
  let teleopCoralPlaceL4Count = 0;
  let teleopCoralPlaceDropMissCount = 0;
  
  let teleopCoralPickStationCount = 0;
  let teleopCoralPickCarpetCount = 0;
  
  let teleopAlgaePlaceNetShot = 0;
  let teleopAlgaePlaceProcessor = 0;
  let teleopAlgaePlaceDropMiss = 0;
  let teleopAlgaePlaceRemove = 0;
  
  let teleopAlgaePickReefCount = 0;
  let teleopAlgaePickCarpetCount = 0;

  // Process auto actions
  inputs.autoActions?.forEach(action => {
    if (action.type === "score" && action.pieceType === "coral" && action.location === "reef") {
      if (action.level === "l1") autoCoralPlaceL1Count++;
      else if (action.level === "l2") autoCoralPlaceL2Count++;
      else if (action.level === "l3") autoCoralPlaceL3Count++;
      else if (action.level === "l4") autoCoralPlaceL4Count++;
      else if (action.level === "miss") autoCoralPlaceDropMissCount++;
    } else if (action.type === "pickup" && action.pieceType === "coral") {
      if (action.location === "preload") autoCoralPickPreloadCount++;
      else if (action.location === "station") autoCoralPickStationCount++;
      else if (action.location === "mark1") autoCoralPickMark1Count++;
      else if (action.location === "mark2") autoCoralPickMark2Count++;
      else if (action.location === "mark3") autoCoralPickMark3Count++;
    } else if (action.type === "score" && action.pieceType === "algae") {
      if (action.location === "net") autoAlgaePlaceNetShot++;
      else if (action.location === "processor") autoAlgaePlaceProcessor++;
      else if (action.location === "miss") autoAlgaePlaceDropMiss++;
    } else if (action.type === "action" && action.pieceType === "algae" && action.location === "remove") {
      autoAlgaePlaceRemove++;
    } else if (action.type === "pickup" && action.pieceType === "algae") {
      if (action.location === "reef") autoAlgaePickReefCount++;
      else if (action.location === "mark1") autoAlgaePickMark1Count++;
      else if (action.location === "mark2") autoAlgaePickMark2Count++;
      else if (action.location === "mark3") autoAlgaePickMark3Count++;
    }
  });

  // Process teleop actions
  inputs.teleopActions?.forEach(action => {
    if (action.type === "score" && action.pieceType === "coral" && action.location === "reef") {
      if (action.level === "l1") teleopCoralPlaceL1Count++;
      else if (action.level === "l2") teleopCoralPlaceL2Count++;
      else if (action.level === "l3") teleopCoralPlaceL3Count++;
      else if (action.level === "l4") teleopCoralPlaceL4Count++;
      else if (action.level === "miss") teleopCoralPlaceDropMissCount++;
    } else if (action.type === "pickup" && action.pieceType === "coral") {
      if (action.location === "station") teleopCoralPickStationCount++;
      else if (action.location === "carpet") teleopCoralPickCarpetCount++;
    } else if (action.type === "score" && action.pieceType === "algae") {
      if (action.location === "net") teleopAlgaePlaceNetShot++;
      else if (action.location === "processor") teleopAlgaePlaceProcessor++;
      else if (action.location === "miss") teleopAlgaePlaceDropMiss++;
    } else if (action.type === "action" && action.pieceType === "algae" && action.location === "remove") {
      teleopAlgaePlaceRemove++;
    } else if (action.type === "pickup" && action.pieceType === "algae") {
      if (action.location === "reef") teleopAlgaePickReefCount++;
      else if (action.location === "carpet") teleopAlgaePickCarpetCount++;
    }
  });

  // Return object with named properties
  return {
    matchNumber: inputs.matchNumber,
    alliance: inputs.alliance === "red" ? "redAlliance" : "blueAlliance",
    scoutName: inputs.scoutName,
    selectTeam: inputs.selectTeam,
    eventName: inputs.eventName || "",
    
    // Starting positions (6 positions)
    startPoses0: inputs.startPoses[0] || false,
    startPoses1: inputs.startPoses[1] || false,
    startPoses2: inputs.startPoses[2] || false,
    startPoses3: inputs.startPoses[3] || false,
    startPoses4: inputs.startPoses[4] || false,
    startPoses5: inputs.startPoses[5] || false,
    
    // Auto coral scoring counts
    autoCoralPlaceL1Count,
    autoCoralPlaceL2Count,
    autoCoralPlaceL3Count,
    autoCoralPlaceL4Count,
    autoCoralPlaceDropMissCount,
    
    // Auto coral pickup counts
    autoCoralPickPreloadCount,
    autoCoralPickStationCount,
    autoCoralPickMark1Count,
    autoCoralPickMark2Count,
    autoCoralPickMark3Count,
    
    // Auto algae scoring counts
    autoAlgaePlaceNetShot,
    autoAlgaePlaceProcessor,
    autoAlgaePlaceDropMiss,
    autoAlgaePlaceRemove,
    
    // Auto algae pickup counts
    autoAlgaePickReefCount,
    autoAlgaePickMark1Count,
    autoAlgaePickMark2Count,
    autoAlgaePickMark3Count,
    
    // Auto passed start line
    autoPassedStartLine: inputs.autoPassedStartLine,
    
    // Teleop coral scoring counts
    teleopCoralPlaceL1Count,
    teleopCoralPlaceL2Count,
    teleopCoralPlaceL3Count,
    teleopCoralPlaceL4Count,
    teleopCoralPlaceDropMissCount,
    
    // Teleop coral pickup counts
    teleopCoralPickStationCount,
    teleopCoralPickCarpetCount,
    
    // Teleop algae scoring counts
    teleopAlgaePlaceNetShot,
    teleopAlgaePlaceProcessor,
    teleopAlgaePlaceDropMiss,
    teleopAlgaePlaceRemove,
    
    // Teleop algae pickup counts
    teleopAlgaePickReefCount,
    teleopAlgaePickCarpetCount,
    
    // Endgame
    shallowClimbAttempted: inputs.shallowClimbAttempted || false,
    deepClimbAttempted: inputs.deepClimbAttempted || false,
    parkAttempted: inputs.parkAttempted || false,
    climbFailed: inputs.climbFailed || false,
    playedDefense: inputs.teleopPlayedDefense || false,
    brokeDown: inputs.brokeDown || false,
    comment: inputs.comment || ""
  };
};