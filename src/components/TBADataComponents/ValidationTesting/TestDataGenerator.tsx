/**
 * Test Data Generator Component
 * 
 * UI component for generating validation test data within the app.
 * Fetches TBA data and creates scouted entries with controlled discrepancies.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Wand2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { db, saveScoutingEntries } from '@/lib/dexieDB';
import { generateEntryId, type ScoutingDataWithId } from '@/lib/scoutingDataUtils';
import type { ScoutingEntry } from '@/lib/scoutingTypes';
import { TestDistributionDisplay } from './TestDistributionDisplay';
import { DataStatsDisplay } from './DataStatsDisplay';
import { GenerationResultDisplay } from './GenerationResultDisplay';
import { DataManagementControls } from './DataManagementControls';
import { 
  TEST_DISTRIBUTION, 
  selectProfile, 
  generateMatchData,
  type TBAMatch 
} from '@/lib/testDataGenerationUtils';

interface TestDataGeneratorProps {
  eventKey: string;
  tbaApiKey?: string;
}

interface GenerationResult {
  totalMatches: number;
  totalEntries: number;
  profiles: Record<string, number>;
}

export const TestDataGenerator: React.FC<TestDataGeneratorProps> = ({ eventKey, tbaApiKey: propApiKey }) => {
  const [tbaApiKey, setTbaApiKey] = useState(propApiKey || '');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [dataStats, setDataStats] = useState<{ total: number; byMatch: Record<string, number> } | null>(null);

  // Update local API key when prop changes
  React.useEffect(() => {
    if (propApiKey) {
      setTbaApiKey(propApiKey);
    }
  }, [propApiKey]);

  const checkExistingData = async () => {
    try {
      const allEntries = await db.scoutingData.where('eventName').equals(eventKey).toArray();
      const byMatch: Record<string, number> = {};
      
      allEntries.forEach(entry => {
        const matchNum = entry.data.matchNumber as string;
        byMatch[matchNum] = (byMatch[matchNum] || 0) + 1;
      });
      
      setDataStats({ total: allEntries.length, byMatch });
      toast.success(`Found ${allEntries.length} entries for ${eventKey}`);
    } catch (error) {
      console.error('Error checking data:', error);
      toast.error('Failed to check existing data');
    }
  };

  const clearAllData = async () => {
    if (!window.confirm(`Are you sure you want to delete ALL scouting data for ${eventKey}? This cannot be undone.`)) {
      return;
    }
    
    try {
      const deleted = await db.scoutingData.where('eventName').equals(eventKey).delete();
      toast.success(`Deleted ${deleted} entries for ${eventKey}`);
      setDataStats(null);
      setResult(null);
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data');
    }
  };

  const handleGenerate = async () => {
    if (!tbaApiKey.trim()) {
      toast.error('Please enter your TBA API key');
      return;
    }

    if (!eventKey.trim()) {
      toast.error('Please enter an event key');
      return;
    }

    setGenerating(true);
    setProgress(0);
    setStatus('Fetching matches from TBA...');
    setResult(null);

    try {
      // Fetch TBA matches
      const response = await fetch(`https://www.thebluealliance.com/api/v3/event/${eventKey}/matches`, {
        headers: { 'X-TBA-Auth-Key': tbaApiKey }
      });

      if (!response.ok) {
        throw new Error(`TBA API error: ${response.status}`);
      }

      const matches = await response.json() as TBAMatch[];
      
      // Filter to qualification matches that have been played
      // Check for either score_breakdown or score_breakdown_2025
      const qualMatches = matches
        .filter((m) => {
          const hasScore = m.alliances?.red?.score !== null && m.alliances?.red?.score !== -1;
          const hasBreakdown = m.score_breakdown || m.score_breakdown_2025;
          return m.comp_level === 'qm' && hasScore && hasBreakdown;
        })
        .sort((a, b) => a.match_number - b.match_number);

      console.log(`Total matches: ${matches.length}`);
      console.log(`Qual matches: ${matches.filter(m => m.comp_level === 'qm').length}`);
      console.log(`Played matches: ${qualMatches.length}`);

      if (qualMatches.length === 0) {
        const diagnostics = {
          totalMatches: matches.length,
          qualMatches: matches.filter(m => m.comp_level === 'qm').length,
          playedMatches: matches.filter(m => m.alliances?.red?.score !== null && m.alliances?.red?.score !== -1).length,
          withBreakdown: matches.filter(m => m.score_breakdown || m.score_breakdown_2025).length,
          sampleMatch: matches[0] ? {
            match_number: matches[0].match_number,
            comp_level: matches[0].comp_level,
            hasScore: matches[0].alliances?.red?.score !== null,
            score: matches[0].alliances?.red?.score,
            hasBreakdown: !!(matches[0].score_breakdown || matches[0].score_breakdown_2025),
            breakdownKeys: Object.keys(matches[0].score_breakdown || matches[0].score_breakdown_2025 || {})
          } : null
        };
        
        console.error('Match diagnostics:', diagnostics);
        
        throw new Error(
          [
            'No played qualification matches found for this event.',
            '',
            `Total matches: ${diagnostics.totalMatches}`,
            `Qual matches: ${diagnostics.qualMatches}`,
            `Played matches: ${diagnostics.playedMatches}`,
            `With score breakdown: ${diagnostics.withBreakdown}`,
            '',
            'This could mean:',
            '1. Event hasn\'t started yet (no matches played)',
            '2. Event is scheduled but matches haven\'t been played',
            '3. TBA hasn\'t published score breakdowns yet',
            '',
            'Try a different event that has completed matches, like:',
            '- Past events from 2024 season',
            '- Events that have already finished in 2025'
          ].join('\n')
        );
      }

      setStatus(`Found ${qualMatches.length} matches. Clearing old data...`);
      setProgress(10);

      // Clear existing data for this event
      const deleted = await db.scoutingData.where('eventName').equals(eventKey).delete();
      console.log(`Deleted ${deleted} old entries for event ${eventKey}`);

      setStatus('Generating scouted data...');
      setProgress(20);

      // Generate entries
      const allEntries: ScoutingEntry[] = [];
      const profileCounts: Record<string, number> = {
        clean: 0, minor: 0, warning: 0, critical: 0, mixed: 0
      };

      for (let i = 0; i < qualMatches.length; i++) {
        const match = qualMatches[i];
        const profileInfo = selectProfile();
        const { entries, profile } = generateMatchData(match, profileInfo, eventKey);
        allEntries.push(...entries);
        profileCounts[profile]++;

        setProgress(20 + (i / qualMatches.length) * 60);
        setStatus(`Generating match ${match.match_number}/${qualMatches.length}...`);
      }

      setStatus('Storing in database...');
      setProgress(80);

      // Convert entries to proper format with IDs
      const entriesWithIds: ScoutingDataWithId[] = allEntries.map(entry => ({
        id: generateEntryId(entry as unknown as Record<string, unknown>),
        data: entry as unknown as Record<string, unknown>,
        timestamp: Date.now()
      }));

      // Store in database using proper save function
      await saveScoutingEntries(entriesWithIds);

      setProgress(100);
      setStatus('Complete!');

      const resultData = {
        totalMatches: qualMatches.length,
        totalEntries: allEntries.length,
        profiles: profileCounts
      };

      setResult(resultData);

      toast.success(`Generated ${allEntries.length} scouting entries for ${qualMatches.length} matches!`);

    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate test data');
      setStatus('Error occurred');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Generate Test Data
        </CardTitle>
        <CardDescription>
          Create scouted data based on TBA results with controlled discrepancies for testing validation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This will <strong>delete all existing scouted data</strong> for {eventKey} and replace it with generated test data.
          </AlertDescription>
        </Alert>

        <DataManagementControls
          tbaApiKey={tbaApiKey}
          onTbaApiKeyChange={setTbaApiKey}
          onCheckData={checkExistingData}
          onClearData={clearAllData}
          generating={generating}
          showApiKeyInput={!propApiKey}
        />

        {dataStats && (
          <DataStatsDisplay dataStats={dataStats} eventKey={eventKey} />
        )}

        <TestDistributionDisplay distribution={TEST_DISTRIBUTION} />

        {generating && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">{status}</p>
          </div>
        )}

        {result && <GenerationResultDisplay result={result} />}

        <Button
          onClick={handleGenerate}
          disabled={generating || !tbaApiKey}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Test Data
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p><strong>Next Steps:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Load TBA Match Validation Data for this event</li>
            <li>Go to Validation Testing section</li>
            <li>Click "Validate All Matches"</li>
            <li>Review results and verify discrepancy detection</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
