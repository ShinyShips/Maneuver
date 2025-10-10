import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, X } from 'lucide-react';
import type { PitAssignment } from '@/lib/pitAssignmentTypes';
import type { NexusPitMap } from '@/lib/nexusUtils';
import { getScoutColor } from './shared/scoutUtils';
import { PitScoutLegend } from './shared/PitScoutLegend';
import { PitAssignmentActionButtons } from './shared/PitAssignmentActionButtons';
import PitMapCard from './PitMapCard';

interface TeamDisplaySectionProps {
  eventKey: string;
  teams: number[];
  assignments?: PitAssignment[];
  scoutsList?: string[];
  onToggleCompleted?: (assignmentId: string) => void;
  assignmentMode?: 'sequential' | 'spatial' | 'manual';
  onManualAssignment?: (teamNumber: number, scoutName: string) => void;
  onRemoveAssignment?: (teamNumber: number) => void;
  selectedScoutForAssignment?: string | null;
  onScoutSelectionChange?: (scoutName: string | null) => void;
  onConfirmAssignments?: () => void;
  onClearAllAssignments?: () => void;
  assignmentsConfirmed?: boolean;
  pitAddresses?: { [teamNumber: string]: string } | null;
  // Nexus pit map props
  pitMapData?: NexusPitMap | null;
  teamDataSource?: 'nexus' | 'tba';
}

export const TeamDisplaySection: React.FC<TeamDisplaySectionProps> = ({
  eventKey,
  teams,
  assignments = [],
  scoutsList = [],
  onToggleCompleted,
  assignmentMode = 'sequential',
  onManualAssignment,
  onRemoveAssignment,
  selectedScoutForAssignment,
  onScoutSelectionChange,
  onConfirmAssignments,
  onClearAllAssignments,
  assignmentsConfirmed = false,
  pitAddresses = null,
  pitMapData = null,
  teamDataSource
}) => {
  
  if (teams.length === 0) {
    return null;
  }

  // Determine whether to show pit map or team cards
  const shouldShowPitMap = teamDataSource === 'nexus' && pitMapData && pitAddresses;

  // If we have Nexus pit map data, render the interactive PitMapCard for visual assignment
  // Otherwise, render the traditional team cards grid for basic assignment view
  if (shouldShowPitMap) {
    return (
      <PitMapCard
        selectedEvent={eventKey}
        pitMapData={pitMapData!}
        pitAddresses={pitAddresses!}
        assignments={assignments}
        scoutsList={scoutsList}
        assignmentMode={assignmentMode}
        assignmentsConfirmed={assignmentsConfirmed}
        selectedScoutForAssignment={selectedScoutForAssignment || null}
        onScoutSelectionChange={onScoutSelectionChange || (() => {})}
        onClearAllAssignments={onClearAllAssignments || (() => {})}
        onConfirmAssignments={onConfirmAssignments || (() => {})}
        onManualAssignment={onManualAssignment || (() => {})}
        onToggleCompleted={onToggleCompleted || (() => {})}
      />
    );
  }

  // Create a map of team number to scout for quick lookup
  const teamToScout = new Map<number, string>();
  const teamToAssignment = new Map<number, PitAssignment>();
  assignments.forEach(assignment => {
    teamToScout.set(assignment.teamNumber, assignment.scoutName);
    teamToAssignment.set(assignment.teamNumber, assignment);
  });

  const hasAssignments = assignments.length > 0;

  const handleTeamClick = (teamNumber: number) => {
    if (assignmentMode === 'manual') {
      if (assignmentsConfirmed) {
        // When assignments are confirmed, toggle completion for assigned teams
        const assignment = teamToAssignment.get(teamNumber);
        if (assignment && onToggleCompleted) {
          onToggleCompleted(assignment.id);
        }
      } else {
        // Before confirmation, assign to selected scout if one is selected
        if (selectedScoutForAssignment && onManualAssignment) {
          onManualAssignment(teamNumber, selectedScoutForAssignment);
        }
      }
    } else if (hasAssignments && onToggleCompleted) {
      // In sequential mode with assignments, toggle completion
      const assignment = teamToAssignment.get(teamNumber);
      if (assignment) {
        onToggleCompleted(assignment.id);
      }
    }
  };

  const handleRemoveTeamAssignment = (teamNumber: number) => {
    if (onRemoveAssignment) {
      onRemoveAssignment(teamNumber);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex w-full items-center gap-2 justify-between ">
          <div className='flex items-center gap-2'>
            <Users className="h-5 w-5" />
            Teams for {eventKey} ({teams.length})
          </div>
          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center justify-center gap-2">
            <PitAssignmentActionButtons
              assignmentMode={assignmentMode}
              assignmentsConfirmed={assignmentsConfirmed}
              assignmentsLength={assignments.length}
              onClearAllAssignments={onClearAllAssignments}
              onConfirmAssignments={onConfirmAssignments}
              isMobile={false}
            />
          </div>
        </CardTitle>
        
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        {/* Scout Legend Section */}
        {scoutsList.length > 0 ? (
          <PitScoutLegend
            scoutsList={scoutsList}
            assignments={assignments}
            assignmentMode={assignmentMode}
            assignmentsConfirmed={assignmentsConfirmed}
            selectedScoutForAssignment={selectedScoutForAssignment}
            onScoutSelectionChange={onScoutSelectionChange}
            onClearAllAssignments={onClearAllAssignments}
            onConfirmAssignments={onConfirmAssignments}
            hasAssignments={hasAssignments}
            showMobileActions={true}
            helpText={
              assignmentMode === 'manual' 
                ? selectedScoutForAssignment
                  ? `💡 Selected: ${selectedScoutForAssignment} - Click team cards to assign • Right-click to remove assignment`
                  : hasAssignments 
                    ? '💡 Click a scout above, then click team cards to assign them • Right-click to remove assignment'
                    : 'Click a scout above, then click team cards to assign them to that scout'
                : '💡 Click team cards to mark as completed • Gray with ✓ = completed • Auto-marked when pit data exists'
            }
          />
        ) : (
          <div className="mb-4 p-3 rounded-lg border flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {assignmentMode === 'manual' ? 'Ready for Manual Assignment' : 'Ready for Assignment'}
              </div>
              <div className="text-xs text-muted-foreground">
                {teams.length} teams waiting
              </div>
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              {assignmentMode === 'manual' 
                ? 'Click "Start Manual Assignment" above, then select a scout and click team cards to assign them.'
                : 'These teams are available for pit scouting assignments. Add scouts above and click "Generate Assignments" to distribute teams.'
              }
            </div>
          </div>
        )}        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 sm:gap-3">
            {teams
              .sort((a, b) => a - b)
              .map((teamNumber) => {
                const assignedScout = teamToScout.get(teamNumber);
                const assignment = teamToAssignment.get(teamNumber);
                const scoutIndex = assignedScout ? scoutsList.indexOf(assignedScout) : -1;
                const isCompleted = assignment?.completed || false;
                const isAssigned = !!assignedScout;
                
                // Determine if card is clickable based on mode
                let isClickable = false;
                if (assignmentMode === 'manual') {
                  if (assignmentsConfirmed && isAssigned) {
                    // When assignments are confirmed, assigned teams are clickable for completion toggle
                    isClickable = !!onToggleCompleted;
                  } else {
                    // Before confirmation, clickable if scout selected or already assigned (for removal)
                    isClickable = !!selectedScoutForAssignment || isAssigned;
                  }
                } else {
                  isClickable = hasAssignments && !!onToggleCompleted; // clickable for completion toggle
                }
                
                let colorClass = '';
                if (assignmentMode === 'manual') {
                  if (isAssigned && scoutIndex >= 0) {
                    colorClass = getScoutColor(scoutIndex);
                  } else if (selectedScoutForAssignment) {
                    // Highlight as ready for assignment when scout is selected - use neutral gray
                    colorClass = 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/50 dark:text-gray-200 dark:border-gray-600';
                  } else {
                    colorClass = 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
                  }
                } else {
                  if (hasAssignments && scoutIndex >= 0) {
                    colorClass = getScoutColor(scoutIndex);
                    if (isCompleted) {
                      // Use a distinct dark color for completed assignments
                      colorClass = 'bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-500 opacity-75';
                    }
                  } else {
                    colorClass = 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700';
                  }
                }

                return (
                  <div
                    key={teamNumber}
                    className={`relative flex items-center justify-center p-2 sm:p-3 rounded-lg border transition-all duration-300 ${colorClass} ${
                      isClickable ? 'cursor-pointer hover:ring-2 hover:ring-blue-500/20 hover:scale-105 active:scale-95' : ''
                    } ${isCompleted ? 'transform rotate-1' : ''}`}
                    onClick={() => handleTeamClick(teamNumber)}
                    onContextMenu={(e) => {
                      if (assignmentMode === 'manual' && isAssigned && !assignmentsConfirmed) {
                        e.preventDefault();
                        handleRemoveTeamAssignment(teamNumber);
                      }
                    }}
                    title={
                      assignmentMode === 'manual'
                        ? isAssigned 
                          ? assignmentsConfirmed
                            ? `Team ${teamNumber} - Assigned to ${assignedScout} - Confirmed`
                            : `Team ${teamNumber} - Assigned to ${assignedScout} - Right-click to remove`
                          : selectedScoutForAssignment
                            ? `Team ${teamNumber} - Click to assign to ${selectedScoutForAssignment}`
                            : `Team ${teamNumber} - Select a scout above first`
                        : hasAssignments 
                          ? `${assignedScout || 'Unassigned'} - ${isCompleted ? 'Completed ✓' : 'Pending'} - Click to toggle`
                          : `Team ${teamNumber}`
                    }
                  >
                    <div className="flex flex-col items-center">
                      <span className={`font-semibold text-sm text-center transition-all duration-300 ${
                        isCompleted ? 'line-through text-lg' : ''
                      }`}>
                        {isCompleted ? '✓ ' : ''}{teamNumber}
                      </span>
                      
                      {/* Pit address display */}
                      {pitAddresses && pitAddresses[teamNumber.toString()] && (
                        <span className="text-xs text-muted-foreground bg-blue-100 px-1 rounded mt-1">
                          Pit {pitAddresses[teamNumber.toString()]}
                        </span>
                      )}
                    </div>
                    
                    {/* Manual assignment indicator */}
                    {assignmentMode === 'manual' && !isAssigned && selectedScoutForAssignment && (
                      <UserPlus className="absolute top-0 right-0 h-3 w-3 text-green-600" />
                    )}
                    
                    {/* Remove button for manual mode */}
                    {assignmentMode === 'manual' && isAssigned && !assignmentsConfirmed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0 h-4 w-4 p-0 bg-red-100 hover:bg-red-200 text-red-600 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTeamAssignment(teamNumber);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground text-center">
            {hasAssignments ? (
              (() => {
                const completedCount = assignments.filter(a => a.completed).length;
                const totalCount = assignments.length;
                return `${completedCount}/${totalCount} teams completed (${teams.length} total)`;
              })()
            ) : (
              `${teams.length} teams total`
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
