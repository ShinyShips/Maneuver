// Pit assignment logic and utilities

import type { PitAssignment } from '@/lib/pitAssignmentTypes';
import type { TeamPosition } from '@/lib/spatialClustering';
import type { NexusPitMap } from '@/lib/nexusUtils';
import { createSpatialClusters } from './spatialClustering';

export interface AssignmentOptions {
  assignmentMode: 'sequential' | 'spatial' | 'manual';
  selectedEvent: string;
  scoutsList: string[];
  teams: number[];
  pitAddresses?: { [teamNumber: string]: string } | null;
  pitMapData?: NexusPitMap | null;
  enableDebugLogging?: boolean;
}

// Sequential assignment - divide teams into blocks
export function createSequentialAssignments(options: AssignmentOptions): PitAssignment[] {
  const { selectedEvent, scoutsList, teams } = options;
  const newAssignments: PitAssignment[] = [];
  
  // Sort teams numerically first
  const sortedTeams = [...teams].sort((a, b) => a - b);
  const totalTeams = sortedTeams.length;
  const totalScouts = scoutsList.length;
  
  // Calculate block size for each scout
  const baseBlockSize = Math.floor(totalTeams / totalScouts);
  const remainder = totalTeams % totalScouts;
  
  let teamIndex = 0;
  
  // Assign blocks to each scout
  scoutsList.forEach((scoutName, scoutIndex) => {
    const blockSize = scoutIndex < remainder ? baseBlockSize + 1 : baseBlockSize;
    
    for (let i = 0; i < blockSize && teamIndex < totalTeams; i++) {
      const teamNumber = sortedTeams[teamIndex];
      newAssignments.push({
        id: `${selectedEvent}-${teamNumber}`,
        eventKey: selectedEvent,
        teamNumber,
        scoutName,
        assignedAt: Date.now(),
        completed: false
      });
      teamIndex++;
    }
  });
  
  return newAssignments;
}

// Extract team positions from pit map data
export function extractTeamPositions(
  teams: number[],
  pitAddresses: { [teamNumber: string]: string } | null,
  pitMapData: NexusPitMap | null,
  enableDebugLogging = false
): TeamPosition[] {
  if (!pitMapData?.pits) {
    if (enableDebugLogging) {
      console.log('No pit map data available for spatial assignment');
    }
    return [];
  }

  const teamPositions: TeamPosition[] = [];
  
  if (pitAddresses) {
    // Use pit addresses to map teams to positions
    teams.forEach(teamNumber => {
      const pitAddress = pitAddresses[teamNumber.toString()];
      if (pitAddress && pitMapData.pits[pitAddress]) {
        const pit = pitMapData.pits[pitAddress] as { 
          x?: number; 
          y?: number; 
          cx?: number; 
          cy?: number;
          position?: { x?: number; y?: number };
          center?: { x?: number; y?: number };
        };
        const x = pit.x || pit.position?.x || pit.center?.x || 0;
        const y = pit.y || pit.position?.y || pit.center?.y || 0;
        
        if (x !== 0 || y !== 0) {
          teamPositions.push({ teamNumber, x, y });
        }
      }
    });
  } else {
    // Extract teams directly from pit map data
    Object.entries(pitMapData.pits || {}).forEach(([, pitData]) => {
      const typedPitData = pitData as { 
        team?: number; 
        x?: number; 
        y?: number;
        position?: { x?: number; y?: number };
        center?: { x?: number; y?: number };
      };
      
      if (typedPitData.team && teams.includes(typedPitData.team)) {
        const x = typedPitData.x || typedPitData.position?.x || typedPitData.center?.x || 0;
        const y = typedPitData.y || typedPitData.position?.y || typedPitData.center?.y || 0;
        
        if (x !== 0 || y !== 0) {
          teamPositions.push({ teamNumber: typedPitData.team, x, y });
        }
      }
    });
  }

  if (enableDebugLogging) {
    console.log('Team position extraction:', {
      totalTeams: teams.length,
      teamsWithPositions: teamPositions.length,
      extractionMethod: pitAddresses ? 'pit addresses' : 'direct pit data'
    });

    // Debug specific teams
    const debugTeams = [9977, 9990, 9986, 9994, 9433, 9971];
    console.log('\n=== Team Position Debug ===');
    debugTeams.forEach(teamNum => {
      const pos = teamPositions.find(p => p.teamNumber === teamNum);
      if (pos) {
        console.log(`Team ${teamNum}: (${pos.x}, ${pos.y})`);
      }
    });
  }

  return teamPositions;
}

// Spatial assignment using clustering algorithm
export function createSpatialAssignments(options: AssignmentOptions): PitAssignment[] {
  const { selectedEvent, scoutsList, teams, pitAddresses, pitMapData, enableDebugLogging = false } = options;
  
  // Extract team positions
  const teamPositions = extractTeamPositions(teams, pitAddresses || null, pitMapData || null, enableDebugLogging);
  
  if (teamPositions.length === 0) {
    if (enableDebugLogging) {
      console.log('No teams with valid positions found, falling back to sequential assignment');
    }
    return createSequentialAssignments(options);
  }

  if (enableDebugLogging) {
    console.log('Spatial assignment debug:', {
      currentTeams: teams.length,
      pitAddresses: pitAddresses ? Object.keys(pitAddresses).length : 0,
      pitMapPits: pitMapData?.pits ? Object.keys(pitMapData.pits).length : 0,
      teamPositions: teamPositions.length,
      samplePit: pitMapData?.pits ? Object.values(pitMapData.pits)[0] : null
    });
  }

  // Perform spatial clustering
  const spatialClusters = createSpatialClusters(teamPositions, scoutsList.length);
  
  // Assign clusters to scouts
  const newAssignments: PitAssignment[] = [];
  
  if (enableDebugLogging) {
    console.log('\n=== Cluster to Scout Assignment ===');
  }
  
  spatialClusters.forEach((cluster: TeamPosition[], index: number) => {
    const scoutName = scoutsList[index % scoutsList.length];
    
    if (enableDebugLogging) {
      console.log(`Cluster ${index} → ${scoutName}:`, cluster.map((t: TeamPosition) => t.teamNumber).sort((a: number, b: number) => a - b));
    }
    
    cluster.forEach((teamPosition: TeamPosition) => {
      newAssignments.push({
        id: `${selectedEvent}-${teamPosition.teamNumber}`,
        eventKey: selectedEvent,
        teamNumber: teamPosition.teamNumber,
        scoutName,
        assignedAt: Date.now(),
        completed: false
      });
    });
  });

  if (enableDebugLogging) {
    console.log('Spatial assignment completed:', {
      totalTeamsWithPositions: teamPositions.length,
      totalTeamsRequested: teams.length,
      assignments: newAssignments.length,
      scoutCounts: scoutsList.map(name => ({
        scout: name,
        teams: newAssignments.filter(a => a.scoutName === name).length
      }))
    });
  }

  return newAssignments;
}

// Main assignment function
export function createPitAssignments(options: AssignmentOptions): PitAssignment[] {
  const { assignmentMode } = options;
  
  switch (assignmentMode) {
    case 'sequential':
      return createSequentialAssignments(options);
    case 'spatial':
      return createSpatialAssignments(options);
    case 'manual':
      return []; // Manual mode starts with empty assignments
    default:
      throw new Error(`Unknown assignment mode: ${assignmentMode}`);
  }
}

// Utility functions for manual assignments
export function addManualAssignment(
  currentAssignments: PitAssignment[],
  teamNumber: number,
  scoutName: string,
  selectedEvent: string
): PitAssignment[] {
  const assignmentId = `${selectedEvent}-${teamNumber}`;
  
  // Remove any existing assignment for this team
  const filtered = currentAssignments.filter(a => a.teamNumber !== teamNumber);
  
  // Add new assignment
  return [...filtered, {
    id: assignmentId,
    eventKey: selectedEvent,
    teamNumber,
    scoutName,
    assignedAt: Date.now(),
    completed: false
  }];
}

export function removeManualAssignment(
  currentAssignments: PitAssignment[],
  teamNumber: number
): PitAssignment[] {
  return currentAssignments.filter(a => a.teamNumber !== teamNumber);
}

export function toggleAssignmentCompleted(
  currentAssignments: PitAssignment[],
  assignmentId: string
): PitAssignment[] {
  return currentAssignments.map(assignment => 
    assignment.id === assignmentId 
      ? { ...assignment, completed: !assignment.completed }
      : assignment
  );
}
