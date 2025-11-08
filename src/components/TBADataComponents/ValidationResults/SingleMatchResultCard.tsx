/**
 * Single Match Result Card Component
 * 
 * Displays detailed validation results for a single match.
 * Shows overall status, confidence, alliance results, and team information.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { getStatusColor, getStatusIcon, formatMatchLabel } from '@/lib/validationDisplayUtils';
import { AllianceResultSection } from './AllianceResultSection';
import type { MatchValidationResult } from '@/lib/matchValidationTypes';

interface SingleMatchResultCardProps {
  result: MatchValidationResult;
}

export const SingleMatchResultCard: React.FC<SingleMatchResultCardProps> = ({ result }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {formatMatchLabel(result)} Validation Result
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(result.status)}
            <span className="font-medium">Status:</span>
            <Badge className={getStatusColor(result.status)}>
              {result.status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Confidence:</span>
            <Badge variant="outline" className="capitalize">
              {result.confidence}
            </Badge>
          </div>
        </div>

        {/* Discrepancy Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-accent rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{result.totalDiscrepancies}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Critical</p>
            <p className="text-lg font-semibold text-red-600">
              {result.criticalDiscrepancies}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Warnings</p>
            <p className="text-lg font-semibold text-yellow-600">
              {result.warningDiscrepancies}
            </p>
          </div>
        </div>

        {/* Red Alliance */}
        <AllianceResultSection alliance={result.redAlliance} allianceColor="red" />

        {/* Blue Alliance */}
        <AllianceResultSection alliance={result.blueAlliance} allianceColor="blue" />

        {/* Teams */}
        <div className="space-y-2">
          <h4 className="font-medium">Teams</h4>
          <div className="grid grid-cols-2 gap-2">
            {result.teams.map((team) => (
              <div
                key={team.teamNumber}
                className="p-2 border rounded text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    Team {team.teamNumber}
                  </span>
                  <Badge
                    variant="outline"
                    className={team.alliance === 'red' ? 'border-red-300' : 'border-blue-300'}
                  >
                    {team.alliance}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Scout: {team.scoutName}
                </p>
                {!team.hasScoutedData && (
                  <p className="text-xs text-red-600 mt-1">No scouted data</p>
                )}
                {team.flagForReview && (
                  <p className="text-xs text-yellow-600 mt-1">⚠ Review required</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
