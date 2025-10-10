import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProcessingResult {
  matchNumber: number;
  winner: string;
  predictionsCount: number;
  correctPredictions: number;
  stakesAwarded: number;
}

interface ProcessingResultsProps {
  results: ProcessingResult[];
}

export const ProcessingResults: React.FC<ProcessingResultsProps> = ({ results }) => {
  if (results.length === 0) {
    return null;
  }

  const totalCorrect = results.reduce((sum, r) => sum + r.correctPredictions, 0);
  const totalPredictions = results.reduce((sum, r) => sum + r.predictionsCount, 0);
  const totalStakes = results.reduce((sum, r) => sum + r.stakesAwarded, 0);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Processing Results</CardTitle>
        <p className="text-sm text-muted-foreground mb-4">
          Summary of verified predictions and stakes awarded to scouts
        </p>
        
        {/* Summary at the top */}
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="space-y-2 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
            <span className="font-semibold text-green-700 dark:text-green-300 text-lg block">
              Total Summary:
            </span>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-green-700 dark:text-green-300">
              <span className="text-base">
                <span className="font-medium">{totalCorrect}/{totalPredictions}</span> correct predictions
              </span>
              <span className="font-semibold text-lg">
                {totalStakes} stakes awarded
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 max-h-96 overflow-y-auto">
        <div className="space-y-4">
          {results.map((result) => (
            <div
              key={result.matchNumber}
              className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              {/* Mobile layout: Two rows */}
              <div className="space-y-2 sm:hidden">
                {/* Mobile Row 1: Match number and predictions */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-base">Match {result.matchNumber}</span>
                  <span className="text-gray-600 dark:text-gray-300 text-sm">
                    Predictions: <span className="font-medium">{result.correctPredictions}/{result.predictionsCount}</span>
                    {result.predictionsCount === 0 && (
                      <span className="text-yellow-600 ml-1 text-xs">(verified)</span>
                    )}
                  </span>
                </div>
                
                {/* Mobile Row 2: Badge and stakes */}
                <div className="flex items-center justify-between gap-2">
                  <Badge 
                    variant={result.winner === 'red' ? 'destructive' : 'default'}
                    className={`px-3 py-1 w-fit ${result.winner === 'red' ? 'bg-red-500' : 'bg-blue-500'}`}
                  >
                    {result.winner === 'red' ? 'Red Wins' : result.winner === 'blue' ? 'Blue Wins' : 'Tie'}
                  </Badge>
                  <span className="font-semibold text-green-600 text-base">
                    +{result.stakesAwarded} stakes
                  </span>
                </div>
              </div>
              
              {/* Desktop layout: Two groups with justify-between */}
              <div className="hidden sm:flex sm:items-center sm:justify-between">
                {/* Group 1: Match number and winner badge */}
                <div className="flex items-center gap-4">
                  <span className="font-medium text-base">Match {result.matchNumber}</span>
                  <Badge 
                    variant={result.winner === 'red' ? 'destructive' : 'default'}
                    className={`px-3 py-1 w-fit ${result.winner === 'red' ? 'bg-red-500' : 'bg-blue-500'}`}
                  >
                    {result.winner === 'red' ? 'Red Wins' : result.winner === 'blue' ? 'Blue Wins' : 'Tie'}
                  </Badge>
                </div>
                
                {/* Group 2: Predictions and stakes */}
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    Predictions: <span className="font-medium">{result.correctPredictions}/{result.predictionsCount}</span>
                    {result.predictionsCount === 0 && (
                      <span className="text-yellow-600 ml-2 text-xs">(already verified)</span>
                    )}
                  </span>
                  <span className="font-semibold text-green-600 text-base">
                    +{result.stakesAwarded} stakes
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
