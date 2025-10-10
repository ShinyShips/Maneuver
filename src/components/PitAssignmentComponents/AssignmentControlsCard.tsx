import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shuffle } from 'lucide-react';
import { createSpatialClusters, type TeamPosition } from '@/lib/spatialClustering';
import type { NexusPitMap } from '@/lib/nexusUtils';
import type { PitAssignment } from '@/lib/pitAssignmentTypes';

// Define flexible types for pit map data that accounts for various formats
interface FlexiblePitData {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  team?: string | number;
  teamNumber?: number;
  position?: { x?: number; y?: number };
  size?: { x?: number; y?: number };
}

interface AssignmentControlsCardProps {
  assignmentMode: 'sequential' | 'spatial' | 'manual';
  pitMapData: NexusPitMap | null;
  pitAddresses: { [teamNumber: string]: string } | null;
  currentTeams: number[];
  scoutsList: string[];
  selectedEvent: string;
  hasAssignments: boolean;
  onAssignmentModeChange: (mode: 'sequential' | 'spatial' | 'manual') => void;
  onAssignmentsGenerated: (assignments: PitAssignment[], confirmed: boolean) => void;
}

const AssignmentControlsCard: React.FC<AssignmentControlsCardProps> = ({
  assignmentMode,
  pitMapData,
  pitAddresses,
  currentTeams,
  scoutsList,
  selectedEvent,
  hasAssignments,
  onAssignmentModeChange,
  onAssignmentsGenerated,
}) => {
  const handleModeChange = (mode: 'sequential' | 'spatial' | 'manual') => {
    onAssignmentModeChange(mode);
  };

  const handleGenerateAssignments = () => {
    if (scoutsList.length === 0) {
      return;
    }

    const newAssignments: PitAssignment[] = [];
    
    if (assignmentMode === 'sequential') {
      // Sort teams numerically first
      const sortedTeams = [...currentTeams].sort((a, b) => a - b);
      const totalTeams = sortedTeams.length;
      const totalScouts = scoutsList.length;
      
      // Calculate block size for each scout
      const baseBlockSize = Math.floor(totalTeams / totalScouts);
      const remainder = totalTeams % totalScouts;
      
      let teamIndex = 0;
      
      // Assign blocks to each scout
      scoutsList.forEach((scoutName, scoutIndex) => {
        // First 'remainder' scouts get one extra team
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
      
      onAssignmentsGenerated(newAssignments, true); // Sequential assignments are automatically confirmed
    } else if (assignmentMode === 'spatial') {
      // Spatial assignment based on pit map locations
      if (!pitMapData?.pits) {
        return;
      }

      // Create team-position mapping
      const teamPositions: { teamNumber: number; x: number; y: number }[] = [];
      
      if (pitAddresses) {
        // Method 1: Use pit addresses mapping (when available)
        currentTeams.forEach(teamNumber => {
          const pitId = pitAddresses[teamNumber.toString()];
          if (pitId && pitMapData.pits[pitId]) {
            const pit = pitMapData.pits[pitId] as FlexiblePitData;
            // Check for coordinates in multiple possible formats
            const x = pit.position?.x || pit.x || 0;
            const y = pit.position?.y || pit.y || 0;
            
            if (x !== 0 || y !== 0) { // Accept any non-zero coordinates
              teamPositions.push({
                teamNumber,
                x,
                y
              });
            }
          }
        });
      } else {
        // Method 2: Extract teams directly from pit map data (when pit addresses not available)
        Object.entries(pitMapData.pits).forEach(([, pitData]) => {
          const typedPitData = pitData as FlexiblePitData;
          const teamNumber = typedPitData.team ? (typeof typedPitData.team === 'string' ? parseInt(typedPitData.team) : typedPitData.team) : null;
          if (teamNumber && currentTeams.includes(teamNumber)) {
            // Check for coordinates in multiple possible formats
            const x = typedPitData.position?.x || typedPitData.x || 0;
            const y = typedPitData.position?.y || typedPitData.y || 0;
            
            if (x !== 0 || y !== 0) { // Accept any non-zero coordinates
              teamPositions.push({
                teamNumber,
                x,
                y
              });
            }
          }
        });
      }

      if (teamPositions.length === 0) {
        return;
      }

      // Simple spatial clustering: sort by Y coordinate first, then X coordinate
      // This creates horizontal strips that are easier for scouts to navigate
      teamPositions.sort((a, b) => {
        // Primary sort by Y coordinate (top to bottom)
        if (Math.abs(a.y - b.y) > 50) { // Group teams within 50 units vertically
          return a.y - b.y;
        }
        // Secondary sort by X coordinate (left to right)
        return a.x - b.x;
      });

      // Advanced spatial clustering: Create compact regions that minimize walking
      const spatialClusters = createSpatialClusters(teamPositions, scoutsList.length);
      
      // Assign clusters to scouts
      spatialClusters.forEach((cluster: TeamPosition[], index: number) => {
        const scoutName = scoutsList[index % scoutsList.length];
        
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

      onAssignmentsGenerated(newAssignments, true); // Spatial assignments are automatically confirmed
    } else if (assignmentMode === 'manual') {
      // For manual mode, start with empty assignments - users will click to assign
      onAssignmentsGenerated([], false);
    }
  };

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shuffle className="h-5 w-5" />
          Assignment Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Assignment Mode:</label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={assignmentMode === 'sequential' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('sequential')}
              >
                Block Assignment
              </Button>
              {pitMapData && (
                <Button
                  variant={assignmentMode === 'spatial' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleModeChange('spatial')}
                >
                  Spatial Assignment
                </Button>
              )}
              <Button
                variant={assignmentMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeChange('manual')}
              >
                Manual Assignment
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {assignmentMode === 'sequential' 
                ? `Block Assignment: Teams are divided into consecutive blocks, with each scout getting ~${Math.ceil(currentTeams.length / scoutsList.length)} teams in sequence`
                : assignmentMode === 'spatial'
                ? 'Spatial Assignment: Teams are assigned based on their physical proximity in the pit map, creating geographic zones for each scout'
                : 'Manual Assignment: Click on team cards to assign them to specific scouts one by one'
              }
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              disabled={hasAssignments || (assignmentMode !== 'sequential' && assignmentMode !== 'spatial')}
              onClick={handleGenerateAssignments}
              className="flex items-center gap-2"
            >
              <Shuffle className="h-4 w-4" />
              Generate Assignments
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssignmentControlsCard;
