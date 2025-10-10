import React from 'react';
import { PitScoutSelectionBar } from './PitScoutSelectionBar';
import { PitAssignmentProgressBar } from './PitAssignmentProgressBar';
import { PitAssignmentActionButtons } from './PitAssignmentActionButtons';
import type { PitAssignment } from '@/lib/pitAssignmentTypes';

interface PitScoutLegendProps {
  scoutsList: string[];
  assignments: PitAssignment[];
  assignmentMode: 'sequential' | 'spatial' | 'manual';
  assignmentsConfirmed: boolean;
  selectedScoutForAssignment?: string | null;
  onScoutSelectionChange?: (scoutName: string | null) => void;
  onClearAllAssignments?: () => void;
  onConfirmAssignments?: () => void;
  hasAssignments: boolean;
  showMobileActions?: boolean;
  helpText?: string;
}

export const PitScoutLegend: React.FC<PitScoutLegendProps> = ({
  scoutsList,
  assignments,
  assignmentMode,
  assignmentsConfirmed,
  selectedScoutForAssignment,
  onScoutSelectionChange,
  onClearAllAssignments,
  onConfirmAssignments,
  hasAssignments,
  showMobileActions = false,
  helpText
}) => {
  return (
    <div className="mb-4 p-4 rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">
          {assignmentMode === 'manual' && !assignmentsConfirmed ? 'Scouts (Click to Select):' : 'Assignment Legend:'}
        </div>
        <div className="text-xs text-muted-foreground">
          {scoutsList.length} scouts
        </div>
      </div>

      <div className="mb-3">
        <PitScoutSelectionBar
          scoutsList={scoutsList}
          assignments={assignments}
          assignmentMode={assignmentMode}
          assignmentsConfirmed={assignmentsConfirmed}
          selectedScoutForAssignment={selectedScoutForAssignment}
          onScoutSelectionChange={onScoutSelectionChange}
          hasAssignments={hasAssignments}
        />
      </div>

      {/* Progress Bar - inside the scout selection card */}
      {hasAssignments && (
        <div className="mt-3 p-3">
          <PitAssignmentProgressBar assignments={assignments} />
          
          {/* Mobile Actions */}
          {showMobileActions && (
            <div className="md:hidden mt-3">
              <PitAssignmentActionButtons
                assignmentMode={assignmentMode}
                assignmentsConfirmed={assignmentsConfirmed}
                assignmentsLength={assignments.length}
                onClearAllAssignments={onClearAllAssignments}
                onConfirmAssignments={onConfirmAssignments}
                isMobile={true}
              />
            </div>
          )}
        </div>
      )}
      
      {helpText && (
        <div className="text-xs text-muted-foreground pt-4">
          {helpText}
        </div>
      )}
    </div>
  );
};
