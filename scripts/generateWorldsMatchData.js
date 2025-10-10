// Script to generate World Championship scale match scouting data
// 125 qualification matches x 6 teams each = 750 entries for QR code scaling tests
// Run with: node scripts/generateWorldsMatchData.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data pools for realistic variation
const scoutName = ['SC', 'MR', 'AK', 'ET', 'AN', 'JD', 'KL', 'RW', 'TM', 'BH', 'LN', 'QS', 'VX', 'ZY'];
const eventName = '2025chmp'; // World Championship event
const alliances = ['redAlliance', 'blueAlliance'];

// Generate realistic team numbers for worlds (mix of established and newer teams)
const generateWorldsTeams = () => {
  const teams = [];
  
  // Add some established powerhouse teams
  const powerhouses = [254, 1114, 2056, 973, 1678, 148, 118, 1323, 1640, 2471, 5813, 2910, 5940, 3476, 1690, 2767, 624, 217, 1533, 3005];
  teams.push(...powerhouses);
  
  // Add mid-range competitive teams
  for (let i = 0; i < 60; i++) {
    teams.push(1000 + Math.floor(Math.random() * 7000));
  }
  
  // Add some newer teams
  for (let i = 0; i < 45; i++) {
    teams.push(8000 + Math.floor(Math.random() * 2000));
  }
  
  // Remove duplicates and return exactly 125 teams (we'll assign 6 per match)
  return [...new Set(teams)].slice(0, 125 * 6);
};

// Generate realistic start positions (most teams start at position 3-4)
const generateStartPoses = () => {
  const poses = {};
  for (let i = 0; i <= 5; i++) {
    poses[`startPoses${i}`] = false;
  }
  
  // Most teams start at positions 2, 3, or 4
  const startPos = Math.random() < 0.1 ? 
    (Math.random() < 0.5 ? 1 : 5) : // Occasionally positions 1 or 5
    (Math.random() < 0.33 ? 2 : (Math.random() < 0.5 ? 3 : 4)); // Usually 2, 3, or 4
  
  poses[`startPoses${startPos}`] = true;
  return poses;
};

// Generate realistic auto scoring data
const generateAutoScoring = () => {
  const autoData = {};
  
  // Coral placement in auto (most teams focus on L4)
  autoData.autoCoralPlaceL1Count = Math.random() < 0.05 ? Math.floor(Math.random() * 2) : 0;
  autoData.autoCoralPlaceL2Count = Math.random() < 0.1 ? Math.floor(Math.random() * 2) : 0;
  autoData.autoCoralPlaceL3Count = Math.random() < 0.2 ? Math.floor(Math.random() * 3) : 0;
  autoData.autoCoralPlaceL4Count = Math.floor(Math.random() * 5); // Most common
  autoData.autoCoralPlaceDropMissCount = Math.random() < 0.15 ? Math.floor(Math.random() * 2) : 0;
  
  // Coral pickup in auto
  autoData.autoCoralPickPreloadCount = Math.random() < 0.95 ? 1 : 0; // Almost everyone uses preload
  autoData.autoCoralPickStationCount = Math.floor(Math.random() * 4);
  autoData.autoCoralPickMark1Count = Math.random() < 0.1 ? Math.floor(Math.random() * 2) : 0;
  autoData.autoCoralPickMark2Count = Math.random() < 0.1 ? Math.floor(Math.random() * 2) : 0;
  autoData.autoCoralPickMark3Count = Math.random() < 0.05 ? Math.floor(Math.random() * 2) : 0;
  
  // Algae in auto (less common)
  autoData.autoAlgaePlaceNetShot = Math.random() < 0.2 ? Math.floor(Math.random() * 3) : 0;
  autoData.autoAlgaePlaceProcessor = Math.random() < 0.1 ? Math.floor(Math.random() * 2) : 0;
  autoData.autoAlgaePlaceDropMiss = Math.random() < 0.05 ? Math.floor(Math.random() * 2) : 0;
  autoData.autoAlgaePlaceRemove = Math.random() < 0.02 ? Math.floor(Math.random() * 2) : 0;
  autoData.autoAlgaePickReefCount = Math.random() < 0.15 ? Math.floor(Math.random() * 2) : 0;
  autoData.autoAlgaePickMark1Count = Math.random() < 0.05 ? Math.floor(Math.random() * 2) : 0;
  autoData.autoAlgaePickMark2Count = Math.random() < 0.05 ? Math.floor(Math.random() * 2) : 0;
  autoData.autoAlgaePickMark3Count = Math.random() < 0.02 ? Math.floor(Math.random() * 2) : 0;
  
  // Most teams pass the start line
  autoData.autoPassedStartLine = Math.random() < 0.85;
  
  return autoData;
};

// Generate realistic teleop scoring data
const generateTeleopScoring = () => {
  const teleopData = {};
  
  // Coral placement in teleop (higher numbers than auto)
  teleopData.teleopCoralPlaceL1Count = Math.floor(Math.random() * 6);
  teleopData.teleopCoralPlaceL2Count = Math.floor(Math.random() * 8);
  teleopData.teleopCoralPlaceL3Count = Math.floor(Math.random() * 10);
  teleopData.teleopCoralPlaceL4Count = Math.floor(Math.random() * 15);
  teleopData.teleopCoralPlaceDropMissCount = Math.random() < 0.2 ? Math.floor(Math.random() * 3) : 0;
  
  // Coral pickup in teleop
  const totalCoralPlaced = teleopData.teleopCoralPlaceL1Count + teleopData.teleopCoralPlaceL2Count + 
                          teleopData.teleopCoralPlaceL3Count + teleopData.teleopCoralPlaceL4Count;
  teleopData.teleopCoralPickStationCount = totalCoralPlaced + Math.floor(Math.random() * 3);
  teleopData.teleopCoralPickCarpetCount = Math.random() < 0.1 ? Math.floor(Math.random() * 2) : 0;
  
  // Algae in teleop
  teleopData.teleopAlgaePlaceNetShot = Math.floor(Math.random() * 8);
  teleopData.teleopAlgaePlaceProcessor = Math.floor(Math.random() * 4);
  teleopData.teleopAlgaePlaceDropMiss = Math.random() < 0.15 ? Math.floor(Math.random() * 3) : 0;
  teleopData.teleopAlgaePlaceRemove = Math.random() < 0.3 ? Math.floor(Math.random() * 4) : 0;
  teleopData.teleopAlgaePickReefCount = Math.floor(Math.random() * 6);
  teleopData.teleopAlgaePickCarpetCount = Math.random() < 0.05 ? Math.floor(Math.random() * 2) : 0;
  
  return teleopData;
};

// Generate realistic endgame data
const generateEndgame = () => {
  const endgameData = {};
  
  // Climb attempts (more teams attempt climbing at worlds)
  const climbRoll = Math.random();
  if (climbRoll < 0.6) {
    // Attempt deep climb
    endgameData.shallowClimbAttempted = false;
    endgameData.deepClimbAttempted = true;
    endgameData.parkAttempted = false;
    endgameData.climbFailed = Math.random() < 0.25; // 25% failure rate for deep climb
  } else if (climbRoll < 0.8) {
    // Attempt shallow climb
    endgameData.shallowClimbAttempted = true;
    endgameData.deepClimbAttempted = false;
    endgameData.parkAttempted = false;
    endgameData.climbFailed = Math.random() < 0.15; // 15% failure rate for shallow climb
  } else {
    // Just park
    endgameData.shallowClimbAttempted = false;
    endgameData.deepClimbAttempted = false;
    endgameData.parkAttempted = true;
    endgameData.climbFailed = false;
  }
  
  return endgameData;
};

// Generate other match characteristics
const generateMatchCharacteristics = () => {
  return {
    playedDefense: Math.random() < 0.15, // 15% play defense
    brokeDown: Math.random() < 0.08 // 8% break down
  };
};

// Generate realistic comments
const generateComment = (matchNumber, teamNumber, brokeDown, playedDefense) => {
  if (brokeDown) {
    const breakdownReasons = [
      'robot stopped working in auto',
      'drive issues throughout match',
      'mechanism failure early in teleop',
      'electrical problems',
      'lost communication',
      'battery died mid-match'
    ];
    return `Match ${matchNumber}: ${breakdownReasons[Math.floor(Math.random() * breakdownReasons.length)]}`;
  }
  
  if (playedDefense) {
    const defenseComments = [
      'strong defensive play against alliance',
      'pinned opposing robots multiple times',
      'effective blocking strategy',
      'disrupted opponent scoring runs'
    ];
    return `Match ${matchNumber}: ${defenseComments[Math.floor(Math.random() * defenseComments.length)]}`;
  }
  
  const generalComments = [
    'solid performance overall',
    'strong autonomous period',
    'excellent teleop scoring',
    'good team coordination',
    'consistent performance',
    'improved from previous matches',
    'fast and accurate scoring',
    'strategic gameplay',
    ''
  ];
  
  const comment = generalComments[Math.floor(Math.random() * generalComments.length)];
  return comment ? `Match ${matchNumber}: ${comment}` : '';
};

// Generate single match entry
const generateMatchEntry = (matchNumber, alliance, teamNumber, scoutName) => {
  const startPoses = generateStartPoses();
  const autoScoring = generateAutoScoring();
  const teleopScoring = generateTeleopScoring();
  const endgame = generateEndgame();
  const characteristics = generateMatchCharacteristics();
  
  return {
    matchNumber: matchNumber.toString(),
    alliance,
    scoutName,
    selectTeam: teamNumber.toString(),
    ...startPoses,
    ...autoScoring,
    ...teleopScoring,
    ...endgame,
    ...characteristics,
    comment: generateComment(matchNumber, teamNumber, characteristics.brokeDown, characteristics.playedDefense),
    eventName
  };
};

// Main generation function
const generateWorldsMatchData = () => {
  const teams = generateWorldsTeams();
  const matchData = [];
  
  console.log(`Generating data for ${teams.length} teams across 125 qualification matches...`);
  
  let teamIndex = 0;
  
  // Generate 125 qualification matches
  for (let matchNum = 1; matchNum <= 125; matchNum++) {
    // Each match has 6 teams (3 red, 3 blue)
    
    // Red alliance
    for (let i = 0; i < 3; i++) {
      const teamNumber = teams[teamIndex % teams.length];
      const scout = scoutName[Math.floor(Math.random() * scoutName.length)];
      
      matchData.push(generateMatchEntry(matchNum, 'redAlliance', teamNumber, scout));
      teamIndex++;
    }
    
    // Blue alliance
    for (let i = 0; i < 3; i++) {
      const teamNumber = teams[teamIndex % teams.length];
      const scout = scoutName[Math.floor(Math.random() * scoutName.length)];
      
      matchData.push(generateMatchEntry(matchNum, 'blueAlliance', teamNumber, scout));
      teamIndex++;
    }
    
    if (matchNum % 25 === 0) {
      console.log(`Generated matches 1-${matchNum} (${matchData.length} entries so far)`);
    }
  }
  
  console.log(`Generated ${matchData.length} total match entries`);
  return matchData;
};

// Generate and save the data
console.log('Starting World Championship scale match data generation...');
const worldsData = generateWorldsMatchData();

const outputPath = path.join(__dirname, '..', 'src', 'lib', 'testData', 'worldsMatchScoutingData.json');
fs.writeFileSync(outputPath, JSON.stringify(worldsData, null, 2));

console.log(`\n✅ Successfully generated ${worldsData.length} match scouting entries!`);
console.log(`📁 Saved to: ${outputPath}`);
console.log(`📊 Data represents 125 qualification matches with 6 teams each`);
console.log(`🎯 Perfect for testing QR code scaling at World Championship level events`);

// Generate some statistics
const uniqueTeams = new Set(worldsData.map(entry => entry.selectTeam)).size;
const uniqueMatches = new Set(worldsData.map(entry => entry.matchNumber)).size;
const redEntries = worldsData.filter(entry => entry.alliance === 'redAlliance').length;
const blueEntries = worldsData.filter(entry => entry.alliance === 'blueAlliance').length;

console.log(`\n📈 Statistics:`);
console.log(`   • Unique teams: ${uniqueTeams}`);
console.log(`   • Unique matches: ${uniqueMatches}`);
console.log(`   • Red alliance entries: ${redEntries}`);
console.log(`   • Blue alliance entries: ${blueEntries}`);
console.log(`   • Average entries per team: ${(worldsData.length / uniqueTeams).toFixed(1)}`);
