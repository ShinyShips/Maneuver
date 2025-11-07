/**
 * All Results List Card Component
 * 
 * Displays a scrollable list of all validation results.
 * Each result is clickable to view details.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStatusColor, getStatusIcon, formatMatchLabel } from '@/lib/validationDisplayUtils';
import type { MatchValidationResult } from '@/lib/matchValidationTypes';

interface AllResultsListCardProps {
  results: MatchValidationResult[];
  onMatchClick: (result: MatchValidationResult) => void;
}

export const AllResultsListCard: React.FC<AllResultsListCardProps> = ({
  results,
  onMatchClick
}) => {
  if (results.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Validation Results ({results.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {results.map((result) => (
            <div
              key={result.matchKey}
              className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              onClick={() => onMatchClick(result)}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(result.status)}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatMatchLabel(result)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {result.totalDiscrepancies > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {result.totalDiscrepancies} issues
                  </Badge>
                )}
                <Badge className={getStatusColor(result.status)}>
                  {result.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
