// Debug utilities for pit assignments and spatial clustering
import { getStoredPitData } from '@/lib/nexusUtils';

export interface DebugTeamInfo {
  teamNumber: number;
  coordinates?: { x: number; y: number };
  cluster?: number;
  scout?: string;
}

// Set up debug functions for development
export function setupDebugFunctions(): void {
  // Manual extraction helper
  (window as unknown as Record<string, unknown>).manuallyExtractNexusTeams = (eventKey: string) => {
    console.log(`Attempting to manually extract teams for event: ${eventKey}`);
    
    // Check if pit data exists  
    const pitData = getStoredPitData(eventKey);
    console.log('Found pit data:', pitData);
    
    // Try to extract teams directly from pit map data
    if (pitData.map && pitData.map.pits) {
      console.log('Extracting from pit map...');
      const teams: number[] = [];
      
      Object.values(pitData.map.pits).forEach((pit: unknown) => {
        if (pit && typeof pit === 'object' && 'team' in pit) {
          const teamNumber = Number(pit.team);
          if (!isNaN(teamNumber)) {
            teams.push(teamNumber);
          }
        }
      });
      
      console.log('Extracted teams from pit map:', teams.sort((a, b) => a - b));
      
      if (teams.length > 0) {
        // Store in localStorage
        const nexusKey = `nexus_event_teams_${eventKey}`;
        localStorage.setItem(nexusKey, JSON.stringify(teams));
        console.log(`Stored ${teams.length} teams to ${nexusKey}`);
      }
    } else if (pitData.addresses && Object.keys(pitData.addresses).length > 0) {
      console.log('Extracting from addresses...');
      const teams = Object.keys(pitData.addresses).map(Number).filter(n => !isNaN(n));
      console.log('Extracted teams from addresses:', teams.sort((a, b) => a - b));
      
      if (teams.length > 0) {
        const nexusKey = `nexus_event_teams_${eventKey}`;
        localStorage.setItem(nexusKey, JSON.stringify(teams));
        console.log(`Stored ${teams.length} teams to ${nexusKey}`);
      }
    } else {
      console.log('No pit data found to extract teams from');
    }
  };
  
  // List available pit data
  (window as unknown as Record<string, unknown>).listAvailablePitData = () => {
    console.log('=== Available Pit Data ===');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('nexus_pit_data_') || key.includes('nexus_pit_addresses_'))) {
        const data = localStorage.getItem(key);
        const parsed = data ? JSON.parse(data) : null;
        console.log(`${key}:`, parsed);
      }
    }
  };
  
  // Debug localStorage
  (window as unknown as Record<string, unknown>).debugPitAssignments = () => {
    console.log('=== Manual Debug localStorage ===');
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('nexus') || key.includes('tba'))) {
        allKeys.push(key);
      }
    }
    console.log('All nexus/tba keys:', allKeys);
    
    allKeys.forEach(key => {
      const data = localStorage.getItem(key);
      try {
        const parsed = JSON.parse(data || '{}');
        console.log(`${key}:`, parsed);
      } catch {
        console.log(`${key}: (parsing failed)`, data);
      }
    });
  };
}

// Debug specific teams and their spatial assignments
export function debugTeamAssignments(
  teams: DebugTeamInfo[],
  targetTeams: number[] = [9977, 9990, 8876, 9991]
): void {
  console.log('\n=== Team Assignment Debug ===');
  
  targetTeams.forEach(teamNumber => {
    const team = teams.find(t => t.teamNumber === teamNumber);
    if (team) {
      console.log(`Team ${teamNumber}:`, {
        coordinates: team.coordinates,
        cluster: team.cluster,
        scout: team.scout
      });
    } else {
      console.log(`Team ${teamNumber}: Not found`);
    }
  });
}

// Log spatial assignment statistics
export function logSpatialStats(
  totalTeams: number,
  teamsWithPositions: number,
  clusterSizes: number[],
  scoutNames: string[]
): void {
  console.log('Spatial assignment completed:', {
    totalTeamsRequested: totalTeams,
    totalTeamsWithPositions: teamsWithPositions,
    missingPositions: totalTeams - teamsWithPositions,
    clusterSizes,
    scoutAssignments: scoutNames.map((name, index) => ({
      scout: name,
      teams: clusterSizes[index] || 0
    }))
  });
}
