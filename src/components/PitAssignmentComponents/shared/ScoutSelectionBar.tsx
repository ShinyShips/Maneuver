import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import type { PitAssignment } from '@/lib/pitAssignmentTypes';
import { getScoutColor } from './scoutUtils';

interface ScoutSelectionBarProps {
  scoutsList: string[];
  assignments: PitAssignment[];
  assignmentMode: 'sequential' | 'spatial' | 'manual';
  assignmentsConfirmed: boolean;
  selectedScoutForAssignment?: string | null;
  onScoutSelectionChange?: (scoutName: string | null) => void;
  hasAssignments: boolean;
}

export const ScoutSelectionBar: React.FC<ScoutSelectionBarProps> = ({
  scoutsList,
  assignments,
  assignmentMode,
  assignmentsConfirmed,
  selectedScoutForAssignment,
  onScoutSelectionChange,
  hasAssignments
}) => {
  const handleScoutSelect = (scoutName: string) => {
    if (selectedScoutForAssignment === scoutName) {
      onScoutSelectionChange?.(null);
    } else {
      onScoutSelectionChange?.(scoutName);
    }
  };

  const isInteractive = assignmentMode === 'manual' && !assignmentsConfirmed;

  return (
    <div className="flex flex-wrap gap-2">
      {scoutsList.map((scout, index) => {
        const scoutAssignments = assignments.filter(a => a.scoutName === scout);
        const completedCount = scoutAssignments.filter(a => a.completed).length;
        const totalCount = scoutAssignments.length;
        const isSelected = isInteractive && selectedScoutForAssignment === scout;
        
        return (
          <Button
            key={scout}
            variant={isSelected ? "default" : "outline"}
            size="default"
            className={`${getScoutColor(index)} px-2 ${
              isInteractive
                ? `transition-all hover:scale-105 active:scale-95 ${
                    isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-sm'
                  }` 
                : 'cursor-default'
            }`}
            title={
              isInteractive
                ? `${scout} - ${totalCount} teams assigned - Click to select for assignment`
                : `${completedCount}/${totalCount} teams completed`
            }
            onClick={isInteractive ? () => handleScoutSelect(scout) : undefined}
            disabled={false}
          >
            <div className="flex items-center gap-1">
              {isInteractive && (
                <Plus className="h-3 w-3" />
              )}
              <span>{scout} ({hasAssignments ? totalCount : 0})</span>
            </div>
          </Button>
        );
      })}
    </div>
  );
};
