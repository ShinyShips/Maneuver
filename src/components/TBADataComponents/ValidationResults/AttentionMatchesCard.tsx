/**
 * Attention Matches Card Component
 * 
 * Displays matches that require attention - failed and flagged matches.
 * Failed matches require re-scouting, flagged matches need review.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, XCircle } from 'lucide-react';
import { formatMatchLabel } from '@/lib/validationDisplayUtils';
import type { MatchValidationResult } from '@/lib/matchValidationTypes';

interface AttentionMatchesCardProps {
  failedMatches: MatchValidationResult[];
  flaggedMatches: MatchValidationResult[];
  onMatchClick: (result: MatchValidationResult) => void;
}

export const AttentionMatchesCard: React.FC<AttentionMatchesCardProps> = ({
  failedMatches,
  flaggedMatches,
  onMatchClick
}) => {
  if (failedMatches.length === 0 && flaggedMatches.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Matches Requiring Attention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Failed Matches */}
        {failedMatches.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-600 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Failed - Re-Scout Required ({failedMatches.length})
            </h4>
            <div className="space-y-1">
              {failedMatches.map((result) => (
                <div
                  key={result.matchKey}
                  className="p-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                  onClick={() => onMatchClick(result)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatMatchLabel(result)}
                    </span>
                    <Badge className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400 border-0">
                      {result.criticalDiscrepancies} critical
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: {result.totalDiscrepancies} discrepancies
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flagged Matches */}
        {flaggedMatches.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Flagged for Review ({flaggedMatches.length})
            </h4>
            <div className="space-y-1">
              {flaggedMatches.slice(0, 10).map((result) => (
                <div
                  key={result.matchKey}
                  className="p-3 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-950/50 transition-colors"
                  onClick={() => onMatchClick(result)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatMatchLabel(result)}
                    </span>
                    <div className="flex gap-2">
                      {result.criticalDiscrepancies > 0 && (
                        <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700">
                          {result.criticalDiscrepancies} critical
                        </Badge>
                      )}
                      {result.warningDiscrepancies > 0 && (
                        <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700">
                          {result.warningDiscrepancies} warnings
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Confidence: {result.confidence}
                  </p>
                </div>
              ))}
              {flaggedMatches.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  ... and {flaggedMatches.length - 10} more
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
