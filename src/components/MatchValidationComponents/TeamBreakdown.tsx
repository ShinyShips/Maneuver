import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { MatchValidationResult } from '@/lib/matchValidationTypes';

interface TeamBreakdownProps {
  teams: NonNullable<MatchValidationResult['teams']>;
  onRescoutTeam: (teamNumber: string, alliance: 'red' | 'blue') => void;
}

export const TeamBreakdown: React.FC<TeamBreakdownProps> = ({
  teams,
  onRescoutTeam,
}) => {
  if (!teams || teams.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {teams.map((team) => (
            <div
              key={team.teamNumber}
              className="border rounded-lg p-4 space-y-3"
            >
              {/* Team Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={team.alliance === 'red' ? 'bg-red-100 dark:bg-red-950' : 'bg-blue-100 dark:bg-blue-950'}
                  >
                    {team.teamNumber}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      {team.hasScoutedData ? team.scoutName : 'No Data'}
                      {team.isCorrected && (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          Corrected
                        </Badge>
                      )}
                    </div>
                    {team.notes.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {team.notes.join(', ')}
                      </div>
                    )}
                    {team.isCorrected && team.correctionCount && team.correctionCount > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {team.correctionCount} {team.correctionCount === 1 ? 'correction' : 'corrections'}
                        {team.lastCorrectedBy && ` by ${team.lastCorrectedBy}`}
                        {team.lastCorrectedAt && ` • ${new Date(team.lastCorrectedAt).toLocaleString()}`}
                      </div>
                    )}
                    {team.correctionNotes && (
                      <div className="text-xs text-amber-700 dark:text-amber-400 italic mt-1">
                        Note: {team.correctionNotes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {team.flagForReview && (
                    <Badge variant="destructive" className="text-xs">
                      Review
                    </Badge>
                  )}
                  <Badge variant={
                    team.confidence === 'high' ? 'default' :
                    team.confidence === 'medium' ? 'secondary' : 'destructive'
                  } className="text-xs">
                    {team.confidence}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRescoutTeam(team.teamNumber, team.alliance)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Re-Scout
                  </Button>
                </div>
              </div>

              {/* Scoring Breakdown */}
              {team.hasScoutedData && team.scoringBreakdown ? (
                <div className="grid grid-cols-3 gap-4 text-xs bg-muted/30 p-3 rounded-md">
                  {/* Auto Column */}
                  <div>
                    <div className="font-semibold text-muted-foreground mb-2">Auto</div>
                    <div className="space-y-1">
                      {team.scoringBreakdown.auto.L1 > 0 && (
                        <div className="flex justify-between">
                          <span>L1:</span>
                          <span className="font-medium">{team.scoringBreakdown.auto.L1}</span>
                        </div>
                      )}
                      {team.scoringBreakdown.auto.L2 > 0 && (
                        <div className="flex justify-between">
                          <span>L2:</span>
                          <span className="font-medium">{team.scoringBreakdown.auto.L2}</span>
                        </div>
                      )}
                      {team.scoringBreakdown.auto.L3 > 0 && (
                        <div className="flex justify-between">
                          <span>L3:</span>
                          <span className="font-medium">{team.scoringBreakdown.auto.L3}</span>
                        </div>
                      )}
                      {team.scoringBreakdown.auto.L4 > 0 && (
                        <div className="flex justify-between">
                          <span>L4:</span>
                          <span className="font-medium">{team.scoringBreakdown.auto.L4}</span>
                        </div>
                      )}
                      {team.scoringBreakdown.auto.algaeNet > 0 && (
                        <div className="flex justify-between">
                          <span>Algae Net:</span>
                          <span className="font-medium">{team.scoringBreakdown.auto.algaeNet}</span>
                        </div>
                      )}
                      {team.scoringBreakdown.auto.algaeProcessor > 0 && (
                        <div className="flex justify-between">
                          <span>Algae Proc:</span>
                          <span className="font-medium">{team.scoringBreakdown.auto.algaeProcessor}</span>
                        </div>
                      )}
                      {team.scoringBreakdown.auto.mobility && (
                        <div className="flex justify-between">
                          <span>Mobility:</span>
                          <span className="font-medium text-green-600">✓</span>
                        </div>
                      )}
                      {!team.scoringBreakdown.auto.L1 && !team.scoringBreakdown.auto.L2 && 
                       !team.scoringBreakdown.auto.L3 && !team.scoringBreakdown.auto.L4 &&
                       !team.scoringBreakdown.auto.algaeNet && !team.scoringBreakdown.auto.algaeProcessor &&
                       !team.scoringBreakdown.auto.mobility && (
                        <div className="text-muted-foreground italic">None</div>
                      )}
                    </div>
                  </div>

                  {/* Teleop Column */}
                  <div>
                    <div className="font-semibold text-muted-foreground mb-2">Teleop</div>
                    <div className="space-y-1">
                      {team.scoringBreakdown.teleop.L1 > 0 && (
                        <div className="flex justify-between">
                          <span>L1:</span>
                          <span className="font-medium">{team.scoringBreakdown.teleop.L1}</span>
                        </div>
                      )}
                      {team.scoringBreakdown.teleop.L2 > 0 && (
                        <div className="flex justify-between">
                          <span>L2:</span>
                          <span className="font-medium">{team.scoringBreakdown.teleop.L2}</span>
                        </div>
                      )}
                      {team.scoringBreakdown.teleop.L3 > 0 && (
                        <div className="flex justify-between">
                          <span>L3:</span>
                          <span className="font-medium">{team.scoringBreakdown.teleop.L3}</span>
                        </div>
                      )}
                      {team.scoringBreakdown.teleop.L4 > 0 && (
                        <div className="flex justify-between">
                          <span>L4:</span>
                          <span className="font-medium">{team.scoringBreakdown.teleop.L4}</span>
                        </div>
                      )}
                      {team.scoringBreakdown.teleop.algaeNet > 0 && (
                        <div className="flex justify-between">
                          <span>Algae Net:</span>
                          <span className="font-medium">{team.scoringBreakdown.teleop.algaeNet}</span>
                        </div>
                      )}
                      {team.scoringBreakdown.teleop.algaeProcessor > 0 && (
                        <div className="flex justify-between">
                          <span>Algae Proc:</span>
                          <span className="font-medium">{team.scoringBreakdown.teleop.algaeProcessor}</span>
                        </div>
                      )}
                      {!team.scoringBreakdown.teleop.L1 && !team.scoringBreakdown.teleop.L2 && 
                       !team.scoringBreakdown.teleop.L3 && !team.scoringBreakdown.teleop.L4 &&
                       !team.scoringBreakdown.teleop.algaeNet && !team.scoringBreakdown.teleop.algaeProcessor && (
                        <div className="text-muted-foreground italic">None</div>
                      )}
                    </div>
                  </div>

                  {/* Endgame Column */}
                  <div>
                    <div className="font-semibold text-muted-foreground mb-2">Endgame</div>
                    <div className="space-y-1">
                      {team.scoringBreakdown.endgame.deep && (
                        <div className="flex justify-between">
                          <span>Deep Climb:</span>
                          <span className="font-medium text-green-600">✓</span>
                        </div>
                      )}
                      {team.scoringBreakdown.endgame.shallow && (
                        <div className="flex justify-between">
                          <span>Shallow Climb:</span>
                          <span className="font-medium text-green-600">✓</span>
                        </div>
                      )}
                      {team.scoringBreakdown.endgame.park && (
                        <div className="flex justify-between">
                          <span>Park:</span>
                          <span className="font-medium text-green-600">✓</span>
                        </div>
                      )}
                      {!team.scoringBreakdown.endgame.deep && !team.scoringBreakdown.endgame.shallow && 
                       !team.scoringBreakdown.endgame.park && (
                        <div className="text-muted-foreground italic">None</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : team.hasScoutedData ? (
                <div className="text-xs text-muted-foreground italic p-3 bg-muted/20 rounded-md">
                  Scoring breakdown not available. Re-validate this match to see detailed breakdown.
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
