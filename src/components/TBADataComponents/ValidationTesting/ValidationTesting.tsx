/**
 * Validation Testing Component
 * 
 * Test harness for the match validation system.
 * Tests validation logic with real scouted and TBA data.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Loader2, FileText } from 'lucide-react';
import { useMatchValidation } from '@/hooks';
import type { MatchValidationResult } from '@/lib/matchValidationTypes';
import { sortValidationResults, checkForDuplicates } from '@/lib/validationDisplayUtils';
import { TestDataGenerator } from './TestDataGenerator';
import { 
  ValidationSummaryCard,
  SingleMatchResultCard,
  AttentionMatchesCard,
  AllResultsListCard
} from '../ValidationResults';

interface ValidationTestingProps {
  eventKey: string;
  tbaApiKey?: string;
}

export const ValidationTesting: React.FC<ValidationTestingProps> = ({ eventKey, tbaApiKey }) => {
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [testResult, setTestResult] = useState<MatchValidationResult | null>(null);
  
  const {
    isValidating,
    error,
    progress,
    validationResults,
    summary,
    validateMatch,
    validateEvent,
    clearResults,
    getFlaggedMatches,
    getFailedMatches
  } = useMatchValidation({
    eventKey,
    autoLoad: true
  });

  // Sort validation results for display
  const sortedValidationResults = React.useMemo(() => {
    return sortValidationResults(validationResults);
  }, [validationResults]);

  const handleTestSingleMatch = async () => {
    if (!selectedMatch) return;
    const result = await validateMatch(selectedMatch);
    setTestResult(result);
  };

  const handleTestEvent = async () => {
    await validateEvent();
  };

  const handleCheckForDuplicates = () => {
    checkForDuplicates(validationResults);
  };

  return (
    <div className="space-y-6">
      {/* Test Data Generator */}
      <TestDataGenerator eventKey={eventKey} tbaApiKey={tbaApiKey} />

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Validation Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single Match Test */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Test Single Match</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedMatch}
                onChange={(e) => setSelectedMatch(e.target.value)}
                placeholder="Enter match number (e.g., 15)"
                className="flex-1 px-3 py-2 border rounded-md"
                disabled={isValidating}
              />
              <Button 
                className='p-2'
                onClick={handleTestSingleMatch}
                disabled={isValidating || !selectedMatch}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate Match'
                )}
              </Button>
            </div>
          </div>

          {/* Event Test */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Test Entire Event</h3>
            <div className="flex gap-2">
              <Button 
                onClick={handleTestEvent}
                disabled={isValidating}
                className="flex-1"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating Event...
                  </>
                ) : (
                  'Validate All Matches'
                )}
              </Button>
              <Button
                className='p-2'
                variant="outline"
                onClick={clearResults}
                disabled={isValidating}
              >
                Clear Results
              </Button>
              <Button 
                variant="outline"
                onClick={handleCheckForDuplicates}
                disabled={isValidating || validationResults.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                Check
              </Button>
            </div>
          </div>

          {/* Progress */}
          {progress && (
            <div className="space-y-2 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Progress: {progress.current} / {progress.total}</span>
                <span className="text-muted-foreground">Match {progress.currentMatch}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Phase: {progress.phase.replace(/-/g, ' ')}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summary && <ValidationSummaryCard summary={summary} />}

      {/* Single Match Result */}
      {testResult && <SingleMatchResultCard result={testResult} />}

      {/* Flagged/Failed Matches */}
      <AttentionMatchesCard
        failedMatches={getFailedMatches()}
        flaggedMatches={getFlaggedMatches()}
        onMatchClick={setTestResult}
      />

      {/* All Results List */}
      <AllResultsListCard
        results={sortedValidationResults}
        onMatchClick={setTestResult}
      />
    </div>
  );
};
