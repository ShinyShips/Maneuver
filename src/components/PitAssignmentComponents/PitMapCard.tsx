import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, CheckCircle } from 'lucide-react';
import { PitScoutLegend } from './shared/PitScoutLegend';
import { getScoutColorMap } from './shared/scoutUtils';
import type { PitAssignment } from '@/lib/pitAssignmentTypes';
import type { NexusPitMap } from '@/lib/nexusUtils';

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

interface FlexibleAreaData {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  position?: { x?: number; y?: number };
  size?: { x?: number; y?: number };
  label?: string;
}

interface FlexibleLabelData {
  x?: number;
  y?: number;
  text?: string;
  label?: string;
  position?: { x?: number; y?: number };
}

interface PitMapCardProps {
  selectedEvent: string;
  pitMapData: NexusPitMap;
  pitAddresses: { [teamNumber: string]: string } | null;
  assignments: PitAssignment[];
  scoutsList: string[];
  assignmentMode: 'sequential' | 'spatial' | 'manual';
  assignmentsConfirmed: boolean;
  selectedScoutForAssignment: string | null;
  onScoutSelectionChange: (scout: string | null) => void;
  onClearAllAssignments: () => void;
  onConfirmAssignments: () => void;
  onManualAssignment: (teamNumber: number, scoutName: string) => void;
  onToggleCompleted: (assignmentId: string) => void;
}

const PitMapCard: React.FC<PitMapCardProps> = ({
  selectedEvent,
  pitMapData,
  pitAddresses,
  assignments,
  scoutsList,
  assignmentMode,
  assignmentsConfirmed,
  selectedScoutForAssignment,
  onScoutSelectionChange,
  onClearAllAssignments,
  onConfirmAssignments,
  onManualAssignment,
  onToggleCompleted,
}) => {
  // Generate consistent colors for scouts
  const scoutColors = React.useMemo(() => {
    return getScoutColorMap(scoutsList);
  }, [scoutsList]);

  // Calculate bounds from only the elements we're rendering (pits and areas)
  const calculateViewBox = () => {
    let minX = 0, minY = 0, maxX = 800, maxY = 600;
    const padding = 50;
    
    // Find bounds from only pits and areas (ignore walls since we don't render them)
    const allPoints: {x: number, y: number}[] = [];
    
    if (pitMapData.pits) {
      Object.values(pitMapData.pits).forEach((pit: FlexiblePitData) => {
        if (pit.position?.x !== undefined && pit.position?.y !== undefined) {
          allPoints.push({x: pit.position.x, y: pit.position.y});
          // Also include the full pit area
          if (pit.size?.x !== undefined && pit.size?.y !== undefined) {
            allPoints.push({
              x: pit.position.x + pit.size.x, 
              y: pit.position.y + pit.size.y
            });
          }
        }
      });
    }
    
    if (pitMapData.areas) {
      Object.values(pitMapData.areas).forEach((area: FlexibleAreaData) => {
        if (area.position?.x !== undefined && area.position?.y !== undefined) {
          allPoints.push({x: area.position.x, y: area.position.y});
          if (area.size?.x !== undefined && area.size?.y !== undefined) {
            allPoints.push({
              x: area.position.x + area.size.x, 
              y: area.position.y + area.size.y
            });
          }
        }
      });
    }
    
    if (allPoints.length > 0) {
      minX = Math.min(...allPoints.map(p => p.x)) - padding;
      minY = Math.min(...allPoints.map(p => p.y)) - padding;
      maxX = Math.max(...allPoints.map(p => p.x)) + padding;
      maxY = Math.max(...allPoints.map(p => p.y)) + padding;
    }
    
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  };

  // Check if assignments indicate spatial proximity
  const isSpatialAssignment = () => {
    return assignments.some((_, index) => {
      if (index === 0) return false;
      const currentTeam = assignments[index].teamNumber;
      const prevTeam = assignments[index - 1].teamNumber;
      const currentPitId = pitAddresses?.[currentTeam.toString()];
      const prevPitId = pitAddresses?.[prevTeam.toString()];
      
      if (!currentPitId || !prevPitId || !pitMapData?.pits) return false;
      
      const currentPit = pitMapData.pits[currentPitId];
      const prevPit = pitMapData.pits[prevPitId];
      
      if (!currentPit || !prevPit) return false;
      
      // Check if spatially close (within reasonable distance)
      const currentPitTyped = currentPit as FlexiblePitData;
      const prevPitTyped = prevPit as FlexiblePitData;
      
      const currentX = currentPitTyped.position?.x || currentPitTyped.x || 0;
      const currentY = currentPitTyped.position?.y || currentPitTyped.y || 0;
      const prevX = prevPitTyped.position?.x || prevPitTyped.x || 0;
      const prevY = prevPitTyped.position?.y || prevPitTyped.y || 0;
      
      const distance = Math.sqrt(
        Math.pow(currentX - prevX, 2) + 
        Math.pow(currentY - prevY, 2)
      );
      return distance < 100; // Arbitrary threshold for "close"
    });
  };

  const viewBox = calculateViewBox();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Pit Map - {selectedEvent}
          </CardTitle>
          
          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {assignments.length > 0 && (
              <Button
                onClick={onClearAllAssignments}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                Clear All Assignments
              </Button>
            )}
            
            {assignmentMode === 'manual' && !assignmentsConfirmed && assignments.length > 0 && (
              <Button
                onClick={onConfirmAssignments}
                size="sm"
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Confirm Assignments ({assignments.length} teams)
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Interactive pit map showing team locations from Nexus data
            </span>
            <div className="flex items-center gap-4">
              {pitMapData.pits && (
                <span className="text-sm">
                  {Object.keys(pitMapData.pits).length} pit locations
                </span>
              )}
              {pitAddresses && (
                <span className="text-sm text-blue-600">
                  {Object.keys(pitAddresses).length} teams assigned
                </span>
              )}
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="md:hidden flex flex-wrap gap-2 items-center">
            {assignments.length > 0 && (
              <Button
                onClick={onClearAllAssignments}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                Clear All Assignments
              </Button>
            )}
            
            {assignmentMode === 'manual' && !assignmentsConfirmed && assignments.length > 0 && (
              <Button
                onClick={onConfirmAssignments}
                size="sm"
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Confirm Assignments ({assignments.length} teams)
              </Button>
            )}
          </div>

          {/* Assignment Interface and Scout Legend */}
          {assignmentMode === 'manual' && !assignmentsConfirmed && (
            <PitScoutLegend
              scoutsList={scoutsList}
              assignments={assignments}
              assignmentMode={assignmentMode}
              assignmentsConfirmed={assignmentsConfirmed}
              selectedScoutForAssignment={selectedScoutForAssignment}
              onScoutSelectionChange={onScoutSelectionChange}
              onClearAllAssignments={onClearAllAssignments}
              onConfirmAssignments={onConfirmAssignments}
              hasAssignments={assignments.length > 0}
              showMobileActions={true}
              helpText="Click on pit locations to assign teams to the selected scout"
            />
          )}
          
          {/* Show legend for confirmed assignments */}
          {assignments.length > 0 && assignmentsConfirmed && (
            <PitScoutLegend
              scoutsList={scoutsList}
              assignments={assignments}
              assignmentMode={assignmentMode}
              assignmentsConfirmed={assignmentsConfirmed}
              hasAssignments={true}
              onClearAllAssignments={onClearAllAssignments}
              showMobileActions={true}
              helpText="Assignments confirmed. Click on pit locations to mark them as completed/incomplete."
            />
          )}
          
          {/* SVG Pit Map */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
            <svg
              viewBox={viewBox}
              className="w-full border rounded"
              style={{ height: 'auto', minHeight: '600px', maxHeight: '800px' }}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Background */}
              <rect 
                x={viewBox.split(' ')[0]} 
                y={viewBox.split(' ')[1]} 
                width={viewBox.split(' ')[2]} 
                height={viewBox.split(' ')[3]} 
                fill="white" 
                stroke="#e5e7eb" 
                strokeWidth="1" 
              />
          
              {/* Render pit areas */}
              {pitMapData.areas && Object.entries(pitMapData.areas).map(([areaId, area]: [string, FlexibleAreaData]) => {
                const x = area.position?.x || area.x || 0;
                const y = area.position?.y || area.y || 0;
                const width = area.size?.x || area.width || 50;
                const height = area.size?.y || area.height || 50;
                
                return (
                  <g key={areaId}>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill="#f3f4f6"
                      stroke="#9ca3af"
                      strokeWidth="2"
                      rx="3"
                    />
                    <text
                      x={x + width/2}
                      y={y + height/2}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#374151"
                      fontWeight="500"
                    >
                      {area.label}
                    </text>
                  </g>
                );
              })}
              
              {/* Render pit locations with click-to-assign functionality */}
              {pitMapData.pits && Object.entries(pitMapData.pits).map(([pitId, pit]: [string, FlexiblePitData]) => {
                const teamNumber = pit.team ? (typeof pit.team === 'string' ? parseInt(pit.team) : pit.team) : null;
                const x = pit.position?.x || 0;
                const y = pit.position?.y || 0;
                const width = pit.size?.x || 100;
                const height = pit.size?.y || 100;
                
                // Find assignment for this team
                const assignment = teamNumber ? assignments.find(a => a.teamNumber === teamNumber) : null;
                const isAssigned = !!assignment;
                const isCompleted = assignment?.completed || false;
                const isClickableForAssignment = assignmentMode === 'manual' && !assignmentsConfirmed && selectedScoutForAssignment && teamNumber;
                const isClickableForCompletion = assignmentsConfirmed && isAssigned && teamNumber;
                const isClickable = isClickableForAssignment || isClickableForCompletion;
                
                // Get colors based on assignment
                let fillColor = "rgba(229, 231, 235, 0.3)"; // Empty pit default
                let strokeColor = "#9ca3af"; // Empty pit default
                
                if (teamNumber) {
                  if (isAssigned && assignment.scoutName) {
                    const scoutColor = scoutColors[assignment.scoutName];
                    if (scoutColor) {
                      fillColor = isCompleted ? scoutColor.bg : scoutColor.bg;
                      strokeColor = scoutColor.border;
                      // Add opacity for non-completed assignments
                      if (!isCompleted) {
                        fillColor = scoutColor.bg + 'dd'; // Add transparency
                      }
                    }
                  } else {
                    // Unassigned team
                    fillColor = "#374151";
                    strokeColor = "#1f2937";
                  }
                }
                
                // Override stroke for clickable state
                if (isClickable) {
                  if (isClickableForAssignment) {
                    strokeColor = "#10b981"; // Green for assignment
                  } else if (isClickableForCompletion) {
                    strokeColor = "#f59e0b"; // Amber for completion toggle
                  }
                }
                
                return (
                  <g key={pitId}>
                    {/* Pit rectangle with scout colors */}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isClickable ? "3" : "2"}
                      strokeDasharray={isClickableForAssignment ? "5,5" : "0"}
                      rx="4"
                      className={isClickable ? "cursor-pointer" : ""}
                      onClick={() => {
                        if (isClickableForAssignment && selectedScoutForAssignment) {
                          onManualAssignment(teamNumber, selectedScoutForAssignment);
                        } else if (isClickableForCompletion && assignment) {
                          onToggleCompleted(assignment.id);
                        }
                      }}
                    />
                    
                    {teamNumber && (
                      <>
                        {/* Team number */}
                        <text
                          x={x + width/2}
                          y={y + height/2 - 5}
                          textAnchor="middle"
                          fontSize="18"
                          fill="white"
                          fontWeight="bold"
                          className={isClickable ? "cursor-pointer" : ""}
                          onClick={() => {
                            if (isClickableForAssignment && selectedScoutForAssignment) {
                              onManualAssignment(teamNumber, selectedScoutForAssignment);
                            } else if (isClickableForCompletion && assignment) {
                              onToggleCompleted(assignment.id);
                            }
                          }}
                        >
                          {teamNumber}
                        </text>
                        
                        {/* Scout name when assigned */}
                        {isAssigned && (
                          <text
                            x={x + width/2}
                            y={y + height/2 + 12}
                            textAnchor="middle"
                            fontSize="10"
                            fill="white"
                            fontWeight="500"
                          >
                            {assignment.scoutName}
                          </text>
                        )}
                        
                        {/* Completion checkmark overlay */}
                        {isCompleted && (
                          <>
                            <circle
                              cx={x + width - 15}
                              cy={y + 15}
                              r="10"
                              fill="#10b981"
                              stroke="white"
                              strokeWidth="2"
                            />
                            <text
                              x={x + width - 15}
                              y={y + 20}
                              textAnchor="middle"
                              fontSize="12"
                              fill="white"
                              fontWeight="bold"
                            >
                              ✓
                            </text>
                          </>
                        )}
                      </>
                    )}
                    
                    {/* Empty pit display */}
                    {!teamNumber && (
                      <text
                        x={x + width/2}
                        y={y + height/2}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#6b7280"
                      >
                        {pitId}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Render labels */}
              {pitMapData.labels && Object.entries(pitMapData.labels).map(([labelId, label]: [string, FlexibleLabelData]) => (
                <text
                  key={labelId}
                  x={label.position?.x || label.x}
                  y={label.position?.y || label.y}
                  fontSize="16"
                  fill="#374151"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {label.label || label.text}
                </text>
              ))}
          
              {/* Arrow marker definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#f59e0b"
                  />
                </marker>
              </defs>
            </svg>
          </div>
          
          {/* Simple Map Status Legend */}
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 border border-gray-400 rounded"></div>
              <span>Empty pits</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-700 border border-gray-900 rounded"></div>
              <span>Unassigned teams</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 border border-green-800 rounded"></div>
              <span>Completed</span>
            </div>
            {assignmentsConfirmed && assignments.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 border-2 border-amber-600 rounded"></div>
                <span>Click to toggle completion</span>
              </div>
            )}
          </div>
          
          {/* Spatial Assignment Info */}
          {assignmentsConfirmed && assignments.length > 0 && (
            <div className="text-center text-xs text-muted-foreground mt-2">
              {isSpatialAssignment() ? 
                '🗺️ Teams assigned using spatial proximity for optimal scouting routes' : 
                '📝 Teams assigned in numerical sequence'
              }
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PitMapCard;
