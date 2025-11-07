import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { MatchValidationResult } from '@/lib/matchValidationTypes';

interface MatchSummaryCardProps {
  match: MatchValidationResult;
}

export const MatchSummaryCard: React.FC<MatchSummaryCardProps> = ({ match }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Match Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Total Discrepancies</div>
            <div className="text-2xl font-bold">{match.totalDiscrepancies}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Critical Issues</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {match.criticalDiscrepancies}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Warnings</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {match.warningDiscrepancies}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Confidence</div>
            <Badge variant={
              match.confidence === 'high' ? 'default' :
              match.confidence === 'medium' ? 'secondary' : 'destructive'
            } className="text-lg">
              {match.confidence.toUpperCase()}
            </Badge>
          </div>
        </div>
        
        {match.flaggedForReview && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Flagged for Review</span>
            </div>
          </div>
        )}
        
        {match.requiresReScout && (
          <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Requires Re-Scouting</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
