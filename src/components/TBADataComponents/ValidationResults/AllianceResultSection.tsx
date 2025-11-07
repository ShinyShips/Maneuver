/**
 * Alliance Result Section Component
 * 
 * Displays validation results for a single alliance (red or blue).
 * Shows status, discrepancy count, score difference, and detailed discrepancy list.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getStatusColor, getSeverityColor } from '@/lib/validationDisplayUtils';
import type { AllianceValidation } from '@/lib/matchValidationTypes';

interface AllianceResultSectionProps {
  alliance: AllianceValidation;
  allianceColor: 'red' | 'blue';
}

export const AllianceResultSection: React.FC<AllianceResultSectionProps> = ({ 
  alliance, 
  allianceColor 
}) => {
  const colorClass = allianceColor === 'red' 
    ? 'text-red-600 dark:text-red-400' 
    : 'text-blue-600 dark:text-blue-400';

  return (
    <div className="space-y-2">
      <h4 className={`font-medium ${colorClass}`}>
        {allianceColor === 'red' ? 'Red' : 'Blue'} Alliance
      </h4>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status:</span>
          <Badge className={getStatusColor(alliance.status)}>
            {alliance.status}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Discrepancies:</span>
          <span className="text-foreground">{alliance.discrepancies.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Score Difference:</span>
          <span className="text-foreground">{alliance.scoreDifference} pts</span>
        </div>
      </div>
      {alliance.discrepancies.length > 0 && (
        <div className="mt-2 space-y-1">
          {alliance.discrepancies.map((d, i) => (
            <div
              key={i}
              className="text-xs p-2 bg-card border rounded flex items-start gap-2"
            >
              <span className={`font-medium ${getSeverityColor(d.severity)}`}>
                [{d.severity.toUpperCase()}]
              </span>
              <span className="flex-1 text-foreground">{d.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
