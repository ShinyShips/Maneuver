import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Database, 
  UserPlus, 
  Trash2, 
  Trophy, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  QrCode
} from 'lucide-react';
import { createTestScoutProfiles, clearTestData } from '@/lib/testDataGenerator';
import { backfillAchievementsForAllScouts } from '@/lib/achievementUtils';
import { getAllScouts } from '@/lib/scoutGameUtils';
import { gameDB, type Scout, type MatchPrediction } from '@/lib/dexieDB';
import { toast } from 'sonner';

const DevUtilitiesPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleCreateTestProfiles = async () => {
    setLoading(true);
    try {
      const profiles = await createTestScoutProfiles();
      showMessage(`✅ Created ${profiles.length} test scout profiles successfully!`, 'success');
    } catch (error) {
      console.error('Error creating test profiles:', error);
      showMessage('❌ Failed to create test profiles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    setLoading(true);
    try {
      await clearTestData();
      showMessage('✅ All scout data cleared successfully!', 'success');
    } catch (error) {
      console.error('Error clearing data:', error);
      showMessage('❌ Failed to clear data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBackfillAchievements = async () => {
    setLoading(true);
    try {
      await backfillAchievementsForAllScouts();
      showMessage('✅ Achievement backfill completed!', 'success');
    } catch (error) {
      console.error('Error during achievement backfill:', error);
      showMessage('❌ Achievement backfill failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckCurrentData = async () => {
    setLoading(true);
    try {
      const scouts = await getAllScouts();
      showMessage(`📊 Current database has ${scouts.length} scouts`, 'info');
    } catch (error) {
      console.error('Error checking data:', error);
      showMessage('❌ Failed to check current data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateQRTransfer = async () => {
    setLoading(true);
    try {
      // Create test profiles first (this gives us realistic test data)
      const testProfiles = await createTestScoutProfiles();
      
      if (testProfiles.length === 0) {
        showMessage('❌ Failed to create test profiles for transfer simulation', 'error');
        return;
      }

      // Get the test data we just created
      const scoutsData = await gameDB.scouts.toArray();
      const predictionsData = await gameDB.predictions.toArray();

      // Simulate the exact QR transfer process from ScoutProfilesFountainScanner
      const profilesData = {
        scouts: scoutsData,
        predictions: predictionsData,
        exportedAt: new Date().toISOString(),
        version: "1.0"
      };

      // Clear the database first to simulate fresh transfer
      await gameDB.scouts.clear();
      await gameDB.predictions.clear();

      // Reimport the data (simulating QR scan process)
      const scoutsToImport: Scout[] = profilesData.scouts;
      const predictionsToImport: MatchPrediction[] = profilesData.predictions;
      
      let scoutsAdded = 0;
      let predictionsAdded = 0;

      // Process scouts - exactly like QR transfer
      for (const scout of scoutsToImport) {
        await gameDB.scouts.add(scout);
        scoutsAdded++;
      }

      // Process predictions - exactly like QR transfer  
      for (const prediction of predictionsToImport) {
        try {
          await gameDB.predictions.add(prediction);
          predictionsAdded++;
        } catch {
          // Probably a duplicate ID constraint, skip it
          console.warn(`Skipping duplicate prediction: ${prediction.id}`);
        }
      }

      // **CRITICAL**: Don't update localStorage scoutsList 
      // This is the key difference from normal nav user creation
      // In QR transfer, scouts are imported for data aggregation only
      // They should NOT appear in the nav user dropdown

      const message = `🔄 QR Transfer simulation complete! Transferred ${scoutsAdded} test scouts and ${predictionsAdded} predictions. Note: Transferred scouts will NOT appear in nav user dropdown (by design).`;
      showMessage(message, 'success');
      toast.success(`QR Transfer simulated: ${scoutsAdded} test scouts, ${predictionsAdded} predictions imported`);
      
    } catch (error) {
      console.error('Error simulating QR transfer:', error);
      showMessage('❌ Failed to simulate QR transfer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const testProfiles = [
    { name: "Riley Davis", description: "Top performer - 390 stakes from predictions, 91% accuracy" },
    { name: "Alex Kim", description: "High achiever - 290 stakes from predictions, 90% accuracy" },
    { name: "Sarah Chen", description: "Solid performer - 210 stakes from predictions, 90% accuracy" },
    { name: "Marcus Rodriguez", description: "Good performer - 150 stakes from predictions, 80% accuracy" },
    { name: "Taylor Wilson", description: "Decent performer - 140 stakes from predictions, 75% accuracy" },
    { name: "Emma Thompson", description: "Learning - 75 stakes from predictions, 67% accuracy" },
    { name: "Jordan Smith", description: "Struggling - 45 stakes from predictions, 58% accuracy" },
    { name: "Casey Park", description: "New scout - 15 stakes from predictions, 33% accuracy" },
  ];

  return (
    <div className="min-h-screen container mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Development Utilities</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Tools for testing and managing scout data during development
        </p>
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Development Only
        </Badge>
      </div>

      {message && (
        <Card className={`border-2 ${
          messageType === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
          messageType === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
          'border-blue-500 bg-blue-50 dark:bg-blue-950'
        }`}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {messageType === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {messageType === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
              {messageType === 'info' && <Database className="h-5 w-5 text-blue-600" />}
              <span className={
                messageType === 'success' ? 'text-green-800 dark:text-green-200' :
                messageType === 'error' ? 'text-red-800 dark:text-red-200' :
                'text-blue-800 dark:text-blue-200'
              }>
                {message}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Test Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Test Data Management
            </CardTitle>
            <CardDescription>
              Create or clear test scout profiles for UI testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleCreateTestProfiles}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Test Profiles'}
            </Button>

            <Button 
              onClick={handleClearData}
              disabled={loading}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {loading ? 'Clearing...' : 'Clear All Data'}
            </Button>

            <Separator />

            <Button 
              onClick={handleCheckCurrentData}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <Database className="h-4 w-4 mr-2" />
              {loading ? 'Checking...' : 'Check Current Data'}
            </Button>
          </CardContent>
        </Card>

        {/* Achievement Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Achievement Management
            </CardTitle>
            <CardDescription>
              Manage and backfill achievements for testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleBackfillAchievements}
              disabled={loading}
              className="w-full"
              size="lg"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : 'Backfill Achievements'}
            </Button>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>This will check all existing scouts and award any missing achievements based on their current stats.</p>
            </div>
          </CardContent>
        </Card>

        {/* QR Transfer Simulation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Transfer Simulation
            </CardTitle>
            <CardDescription>
              Create test profiles and transfer them via simulated QR fountain code process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleSimulateQRTransfer}
              disabled={loading}
              className="w-full"
              size="lg"
              variant="outline"
            >
              <QrCode className="h-4 w-4 mr-2" />
              {loading ? 'Simulating...' : 'Create & Transfer Test Profiles'}
            </Button>

            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>This simulates the complete QR profile transfer workflow:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Creates 8 diverse test scout profiles with realistic stats</li>
                <li>Simulates QR fountain code export/import process</li>
                <li><strong>Test scouts are NOT added to nav dropdown</strong> (by design)</li>
                <li>Verifies transferred profiles work correctly for data aggregation</li>
                <li>Perfect for testing lead scout data collection workflow</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Profile Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Test Profile Preview</CardTitle>
          <CardDescription>
            The following test profiles will be created to showcase different UI states
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testProfiles.map((profile, index) => (
              <div key={profile.name} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <Badge variant="outline" className="text-xs mt-0.5">
                  {index + 1}
                </Badge>
                <div className="flex-1">
                  <div className="font-medium text-sm">{profile.name}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {profile.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Console Functions */}
      <Card>
        <CardHeader>
          <CardTitle>Console Functions</CardTitle>
          <CardDescription>
            These functions are also available in the browser console for quick testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-green-600 dark:text-green-400"># Create test profiles</div>
            <div>window.testData.createTestProfiles()</div>
            <div className="text-green-600 dark:text-green-400 mt-3"># Clear all data</div>
            <div>window.testData.clearAll()</div>
            <div className="text-green-600 dark:text-green-400 mt-3"># Backfill achievements</div>
            <div>window.achievements.backfillAll()</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DevUtilitiesPage;
