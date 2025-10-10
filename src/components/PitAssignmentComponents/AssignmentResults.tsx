import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckCircle, 
  Clock, 
  Download,
  Search,
  SortAsc,
  SortDesc,
  UserPlus,
  X
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import type { PitAssignment } from '@/lib/pitAssignmentTypes';
import { getScoutColor } from './shared/scoutUtils';
import { PitScoutLegend } from './shared/PitScoutLegend';
import { PitAssignmentActionButtons } from './shared/PitAssignmentActionButtons';
import { PitAssignmentProgressBar } from './shared/PitAssignmentProgressBar';

interface AssignmentResultsProps {
  assignments: PitAssignment[];
  onToggleCompleted: (assignmentId: string) => void;
  onClearAllAssignments?: () => void;
  // Manual assignment props
  assignmentMode?: 'sequential' | 'spatial' | 'manual';
  scoutsList?: string[];
  onManualAssignment?: (teamNumber: number, scoutName: string) => void;
  onRemoveAssignment?: (teamNumber: number) => void;
  selectedScoutForAssignment?: string | null;
  onScoutSelectionChange?: (scoutName: string | null) => void;
  assignmentsConfirmed?: boolean;
  allTeams?: number[]; // All teams for the event (for unassigned teams)
  onConfirmAssignments?: () => void; // New prop for confirming manual assignments
  pitAddresses?: { [teamNumber: string]: string } | null;
}

type SortOption = 'team' | 'scout' | 'status' | 'assigned';
type FilterOption = 'all' | 'completed' | 'pending';

export const AssignmentResults: React.FC<AssignmentResultsProps> = ({
  assignments,
  onToggleCompleted,
  onClearAllAssignments,
  assignmentMode = 'sequential',
  scoutsList = [],
  onManualAssignment,
  onRemoveAssignment,
  selectedScoutForAssignment,
  onScoutSelectionChange,
  assignmentsConfirmed = false,
  allTeams = [],
  onConfirmAssignments,
  pitAddresses = null
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('team');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Calculate display data - combine assigned and unassigned teams
  const getDisplayData = () => {
    const assignmentMap = new Map(assignments.map(a => [a.teamNumber, a]));
    const allTeamsSet = new Set([...allTeams, ...assignments.map(a => a.teamNumber)]);
    
    return Array.from(allTeamsSet).map(teamNumber => {
      const assignment = assignmentMap.get(teamNumber);
      return {
        teamNumber,
        assignment,
        scoutName: assignment?.scoutName || null,
        completed: assignment?.completed || false,
        assigned: !!assignment
      };
    });
  };

  const displayData = getDisplayData();
  
  // Filter and sort display data
  const filteredAndSortedData = displayData
    .filter(item => {
      // Search filter
      const searchMatch = searchFilter === '' || 
        item.teamNumber.toString().includes(searchFilter) ||
        (item.scoutName && item.scoutName.toLowerCase().includes(searchFilter.toLowerCase()));
      
      // Status filter
      const statusMatch = statusFilter === 'all' ||
        (statusFilter === 'completed' && item.completed) ||
        (statusFilter === 'pending' && !item.completed);
      
      return searchMatch && statusMatch;
    })
    .sort((a, b) => {
      let result = 0;
      switch (sortBy) {
        case 'team':
          result = a.teamNumber - b.teamNumber;
          break;
        case 'scout': {
          const scoutA = a.scoutName || '';
          const scoutB = b.scoutName || '';
          result = scoutA.localeCompare(scoutB);
          break;
        }
        case 'status':
          result = Number(a.completed) - Number(b.completed);
          break;
        case 'assigned':
          result = Number(a.assigned) - Number(b.assigned);
          break;
      }
      return sortDirection === 'asc' ? result : -result;
    });

  const completedCount = assignments.filter(a => a.completed).length;
  const pendingCount = assignments.length - completedCount;

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('asc');
    }
  };

  const handleTeamAssign = (teamNumber: number) => {
    if (assignmentMode === 'manual' && selectedScoutForAssignment && onManualAssignment) {
      onManualAssignment(teamNumber, selectedScoutForAssignment);
    }
  };

  const handleRemoveTeamAssignment = (teamNumber: number) => {
    if (onRemoveAssignment) {
      onRemoveAssignment(teamNumber);
    }
  };

  const exportAssignments = () => {
    const csvContent = [
      ['Team Number', 'Scout', 'Status', 'Assigned At'],
      ...assignments.map(assignment => [
        assignment.teamNumber.toString(),
        assignment.scoutName,
        assignment.completed ? 'Completed' : 'Pending',
        new Date(assignment.assignedAt).toLocaleDateString()
      ])
    ];

    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pit-assignments.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getSortIcon = (option: SortOption) => {
    if (sortBy !== option) return null;
    return sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex w-full items-center gap-2 justify-between">
          <div className='flex items-center gap-2'>
            <CheckCircle className="h-5 w-5" />
            Assignment Results ({displayData.length} teams)
          </div>
          {/* Confirmation buttons in header - matching team display style */}
          <div className="hidden md:flex items-center justify-center gap-2">
            <PitAssignmentActionButtons
              assignmentMode={assignmentMode}
              assignmentsConfirmed={assignmentsConfirmed}
              assignmentsLength={assignments.length}
              onClearAllAssignments={onClearAllAssignments}
              onConfirmAssignments={onConfirmAssignments}
              isMobile={false}
            />
            <Button 
              onClick={exportAssignments}
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              disabled={assignments.length === 0}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardTitle>
        
        <div className="flex gap-4 mt-2 text-sm">
          <div className="flex items-center gap-1">
            <Badge variant="secondary">{completedCount}</Badge>
            <span className="text-muted-foreground">Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline">{pendingCount}</Badge>
            <span className="text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline">{displayData.length - assignments.length}</Badge>
            <span className="text-muted-foreground">Unassigned</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Scout Selection - Manual Mode Only */}
        {assignmentMode === 'manual' && scoutsList.length > 0 && (
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
            helpText={
              !assignmentsConfirmed ? (
                selectedScoutForAssignment
                  ? `💡 Selected: ${selectedScoutForAssignment} - Click team rows below to assign`
                  : 'Select a scout above, then click team rows to assign them to that scout'
              ) : (
                '💡 Click team rows to mark as completed • Auto-marked when pit data exists'
              )
            }
          />
        )}

        {/* Progress Bar - for non-manual modes or when no scouts */}
        {(assignmentMode !== 'manual' || scoutsList.length === 0) && assignments.length > 0 && (
          <div className="mb-4 p-4 rounded-lg">
            <PitAssignmentProgressBar assignments={assignments} />
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams or scouts..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('completed')}
            >
              Completed
            </Button>
          </div>
        </div>

        {/* Teams Table */}
        <div className="rounded-md border">
          {/* Desktop Header */}
          <div className="hidden md:block bg-muted/50 px-4 py-3 font-medium text-sm border-b">
            <div className="grid grid-cols-5 gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('team')}
                className="justify-start h-auto p-0 font-medium"
              >
                Team {getSortIcon('team')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('scout')}
                className="justify-start h-auto p-0 font-medium"
              >
                Scout {getSortIcon('scout')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('status')}
                className="justify-start h-auto p-0 font-medium"
              >
                Status {getSortIcon('status')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('assigned')}
                className="justify-start h-auto p-0 font-medium"
              >
                Assigned {getSortIcon('assigned')}
              </Button>
              <span>Action</span>
            </div>
          </div>
          
          {/* Mobile Header */}
          <div className="md:hidden bg-muted/50 px-3 py-2 font-medium text-sm border-b">
            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('team')}
                className="justify-start h-auto p-0 font-medium"
              >
                Team {getSortIcon('team')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('status')}
                className="justify-start h-auto p-0 font-medium"
              >
                Status {getSortIcon('status')}
              </Button>
            </div>
          </div>
          
          <div className="divide-y">
            {filteredAndSortedData.map((item) => {
              const scoutIndex = item.scoutName ? scoutsList.indexOf(item.scoutName) : -1;
              const canAssign = assignmentMode === 'manual' && selectedScoutForAssignment && !item.assigned && !assignmentsConfirmed;
              const canRemove = assignmentMode === 'manual' && item.assigned && !assignmentsConfirmed;
              const canToggleComplete = item.assigned && (assignmentsConfirmed || assignmentMode === 'sequential');
              
              return (
                <div 
                  key={item.teamNumber} 
                  className={`px-3 md:px-4 py-4 md:py-3 ${canAssign ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
                  onClick={() => canAssign && handleTeamAssign(item.teamNumber)}
                >
                  {/* Desktop Layout */}
                  <div className="hidden md:grid grid-cols-5 gap-4 items-center">
                    <div className="font-medium flex items-center gap-2">
                      <div className="flex flex-col">
                        <span>Team {item.teamNumber}</span>
                        {pitAddresses && pitAddresses[item.teamNumber.toString()] && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-1 rounded">
                            Pit {pitAddresses[item.teamNumber.toString()]}
                          </span>
                        )}
                      </div>
                      {canAssign && <UserPlus className="h-3 w-3 text-green-600" />}
                    </div>
                    <div className="text-sm flex items-center gap-2">
                      {item.scoutName ? (
                        <Badge 
                          variant="outline" 
                          className={scoutIndex >= 0 ? getScoutColor(scoutIndex) : ''}
                        >
                          {item.scoutName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground italic">Not assigned</span>
                      )}
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 bg-red-100 hover:bg-red-200 text-red-600 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTeamAssignment(item.teamNumber);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div>
                      {item.assigned ? (
                        item.completed ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          Unassigned
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.assigned ? (
                        assignmentsConfirmed ? 'Confirmed' : 'Draft'
                      ) : (
                        canAssign ? 'Click to assign' : '-'
                      )}
                    </div>
                    <div>
                      {canToggleComplete && (
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => item.assignment && onToggleCompleted(item.assignment.id)}
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Mobile Layout */}
                  <div className="md:hidden space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-base">Team {item.teamNumber}</span>
                          {pitAddresses && pitAddresses[item.teamNumber.toString()] && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-1 rounded">
                              Pit {pitAddresses[item.teamNumber.toString()]}
                            </span>
                          )}
                        </div>
                        {canAssign && <UserPlus className="h-4 w-4 text-green-600" />}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.assigned ? (
                          item.completed ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            Unassigned
                          </Badge>
                        )}
                        {canToggleComplete && (
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={() => item.assignment && onToggleCompleted(item.assignment.id)}
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Scout:</span>
                        {item.scoutName ? (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${scoutIndex >= 0 ? getScoutColor(scoutIndex) : ''}`}
                          >
                            {item.scoutName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Not assigned</span>
                        )}
                        {canRemove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 bg-red-100 hover:bg-red-200 text-red-600 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTeamAssignment(item.teamNumber);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {item.assigned ? (
                          assignmentsConfirmed ? 'Confirmed' : 'Draft'
                        ) : (
                          canAssign ? 'Click to assign' : '-'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {filteredAndSortedData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No teams match your current filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
