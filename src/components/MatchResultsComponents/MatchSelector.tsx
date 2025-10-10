import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/animate-ui/radix/checkbox';
import { Loader2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { getMatchResult, type TBAMatch } from '@/lib/tbaUtils';
import {
  getAllPredictionsForMatch,
  updateScoutWithPredictionResult,
  markPredictionAsVerified,
  STAKE_VALUES
} from '@/lib/scoutGameUtils';

interface MatchSelectorProps {
  matches: TBAMatch[];
  onProcessingComplete: (results: Array<{
    matchNumber: number;
    winner: string;
    predictionsCount: number;
    correctPredictions: number;
    stakesAwarded: number;
  }>) => void;
}

export const MatchSelector: React.FC<MatchSelectorProps> = ({
  matches,
  onProcessingComplete
}) => {
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  const toggleMatchSelection = (matchKey: string) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(matchKey)) {
      newSelected.delete(matchKey);
    } else {
      newSelected.add(matchKey);
    }
    setSelectedMatches(newSelected);
  };

  const selectAllMatches = () => {
    setSelectedMatches(new Set(matches.map(m => m.key)));
  };

  const clearSelection = () => {
    setSelectedMatches(new Set());
  };

  const processSelectedMatches = async () => {
    if (selectedMatches.size === 0) {
      toast.error('Please select at least one match to process');
      return;
    }

    const currentEventKey = localStorage.getItem('currentEventKey');
    if (!currentEventKey) {
      toast.error('No event key found. Please load matches first.');
      return;
    }

    setProcessing(true);
    const results = [];

    try {
      for (const matchKey of selectedMatches) {
        const match = matches.find(m => m.key === matchKey);
        if (!match) continue;

        const matchResult = getMatchResult(match);
        const matchNumber = match.match_number.toString();

        // Get all predictions for this match
        const predictions = await getAllPredictionsForMatch(currentEventKey, matchNumber);
        
        // Filter out already verified predictions to prevent double awarding
        const unverifiedPredictions = predictions.filter(p => !p.verified);
        
        let correctPredictions = 0;
        let totalStakesAwarded = 0;
        const skippedVerified = predictions.length - unverifiedPredictions.length;

        // Process each unverified prediction
        for (const prediction of unverifiedPredictions) {
          const isCorrect = prediction.predictedWinner === matchResult.winner;
          
          if (isCorrect) {
            correctPredictions++;
          }

          // Use the new streak-aware function to update scout stats and calculate stakes
          const stakesAwarded = await updateScoutWithPredictionResult(
            prediction.scoutName,
            isCorrect,
            STAKE_VALUES.CORRECT_PREDICTION,
            currentEventKey,
            matchNumber
          );
          
          totalStakesAwarded += stakesAwarded;

          // Mark this prediction as verified to prevent future double-processing
          await markPredictionAsVerified(prediction.id);
        }

        results.push({
          matchNumber: match.match_number,
          winner: matchResult.winner,
          predictionsCount: unverifiedPredictions.length,
          correctPredictions,
          stakesAwarded: totalStakesAwarded
        });

        // Log information about skipped predictions if any
        if (skippedVerified > 0) {
          console.log(`Match ${match.match_number}: Skipped ${skippedVerified} already verified predictions`);
        }
      }

      onProcessingComplete(results);
      
      const totalCorrect = results.reduce((sum, r) => sum + r.correctPredictions, 0);
      const totalPredictions = results.reduce((sum, r) => sum + r.predictionsCount, 0);
      const totalStakes = results.reduce((sum, r) => sum + r.stakesAwarded, 0);

      if (totalPredictions === 0) {
        toast.info(`Processed ${selectedMatches.size} matches: All predictions were already verified. No new stakes awarded.`);
      } else {
        toast.success(
          `Processed ${selectedMatches.size} matches: ${totalCorrect}/${totalPredictions} new correct predictions, ${totalStakes} stakes awarded`
        );
      }

      // Clear selection after processing
      setSelectedMatches(new Set());

    } catch (error) {
      console.error('Error processing predictions:', error);
      toast.error('Failed to process predictions. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatMatchKey = (match: TBAMatch) => {
    return `${match.event_key}_qm${match.match_number}`;
  };

  if (matches.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">Qualification Matches ({matches.length})</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select matches to verify predictions and award stakes to scouts
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-end">
            <Button variant="outline" size="sm" onClick={selectAllMatches} className="px-4 flex-1 sm:flex-none">
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection} className="px-4 flex-1 sm:flex-none">
              Clear
            </Button>
            <Button 
              onClick={processSelectedMatches}
              disabled={selectedMatches.size === 0 || processing}
              className="bg-green-600 hover:bg-green-700 text-white px-4 w-full sm:w-auto"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing ({selectedMatches.size})
                </>
              ) : (
                `Process Selected (${selectedMatches.size})`
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {matches.map((match) => {
            const result = getMatchResult(match);
            const isSelected = selectedMatches.has(match.key);
            
            return (
              <div
                key={match.key}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                }`}
                onClick={(e) => {
                  // Don't trigger if the click came from the checkbox itself
                  if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
                    return;
                  }
                  toggleMatchSelection(match.key);
                }}
              >
                <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleMatchSelection(match.key)}
                          className="h-4 w-4"
                        />
                        <span className="font-medium text-base">Match {match.match_number}</span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono sm:hidden">
                        {formatMatchKey(match)}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                      <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={result.winner === 'red' ? 'destructive' : 'outline'}
                            className={`px-3 py-1 ${result.winner === 'red' ? 'bg-red-500' : ''}`}
                          >
                            Red: {result.redScore}
                          </Badge>
                          <Badge 
                            variant={result.winner === 'blue' ? 'default' : 'outline'}
                            className={`px-3 py-1 ${result.winner === 'blue' ? 'bg-blue-500' : ''}`}
                          >
                            Blue: {result.blueScore}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:hidden">
                          {result.winner === 'tie' ? (
                            <Badge variant="secondary" className="px-3 py-1">Tie</Badge>
                          ) : (
                            <>
                              <Trophy className={`h-4 w-4 ${
                                result.winner === 'red' ? 'text-red-500' : 'text-blue-500'
                              }`} />
                              <span className={`text-sm font-medium ${
                                result.winner === 'red' ? 'text-red-600' : 'text-blue-600'
                              }`}>
                                {result.winner === 'red' ? 'Red Wins' : 'Blue Wins'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="hidden sm:flex items-center gap-2">
                        {result.winner === 'tie' ? (
                          <Badge variant="secondary" className="px-3 py-1">Tie</Badge>
                        ) : (
                          <>
                            <Trophy className={`h-4 w-4 ${
                              result.winner === 'red' ? 'text-red-500' : 'text-blue-500'
                            }`} />
                            <span className={`text-sm font-medium ${
                              result.winner === 'red' ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {result.winner === 'red' ? 'Red Wins' : 'Blue Wins'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden sm:block text-xs text-gray-500 font-mono text-right">
                    {formatMatchKey(match)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
