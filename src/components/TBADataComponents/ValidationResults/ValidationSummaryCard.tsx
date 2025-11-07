/**
 * Validation Summary Card Component
 * 
 * Displays aggregate statistics from validation results.
 * Shows total validated, passed, flagged, failed matches,
 * and detailed discrepancy counts.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { ValidationSummary } from '@/lib/matchValidationTypes';

interface ValidationSummaryCardProps {
  summary: ValidationSummary;
}

export const ValidationSummaryCard: React.FC<ValidationSummaryCardProps> = ({ summary }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Validation Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Validated</p>
            <p className="text-2xl font-bold">{summary.validatedMatches}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Passed</p>
            <p className="text-2xl font-bold text-green-500 dark:text-green-400">{summary.passedMatches}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Flagged</p>
            <p className="text-2xl font-bold text-yellow-500 dark:text-yellow-400">{summary.flaggedMatches}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold text-red-500 dark:text-red-400">{summary.failedMatches}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Discrepancies</p>
              <p className="font-medium">{summary.totalDiscrepancies}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Critical</p>
              <p className="font-medium text-red-500 dark:text-red-400">{summary.criticalDiscrepancies}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Warnings</p>
              <p className="font-medium text-yellow-500 dark:text-yellow-400">{summary.warningDiscrepancies}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg Confidence</p>
              <p className="font-medium capitalize">{summary.averageConfidence}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
