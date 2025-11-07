import {
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Route,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider"
import { analytics } from '@/lib/analytics';

import MainLayout from "@/layouts/MainLayout";
import NotFoundPage from "@/pages/NotFoundPage";

import HomePage from "@/pages/HomePage";
import GameStartPage from "@/pages/GameStartPage";
import AutoStartPage from "@/pages/AutoStartPage";
// import ParseDataPage from "@/pages/ParseDataPage";
import APIDataPage from "@/pages/APIDataPage";
import ClearDataPage from "@/pages/ClearDataPage";
import QRDataTransferPage from "@/pages/QRDataTransferPage";
import JSONDataTransferPage from "@/pages/JSONDataTransferPage";
import MatchDataQRPage from "@/pages/MatchDataQRPage";
import MatchStrategyPage from "@/pages/MatchStrategyPage";
import { AutoScoringPage, TeleopScoringPage } from "@/pages/ScoringPage";
import EndgamePage from "@/pages/EndgamePage";
import TeamStatsPage from "@/pages/TeamStatsPage";
import PitScoutingPage from "@/pages/PitScoutingPage";
import PitAssignmentsPage from "@/pages/PitAssignmentsPage";
import PickListPage from "./pages/PickListPage";
import StrategyOverviewPage from "./pages/StrategyOverviewPage";
import ScoutManagementDashboardPage from "./pages/ScoutManagementDashboardPage";
import AchievementsPage from "./pages/AchievementsPage";
import DevUtilitiesPage from "./pages/DevUtilitiesPage";
import { MatchValidationPage } from "./pages/MatchValidationPage";
import { InstallPrompt } from '@/components/InstallPrompt';
import { StatusBarSpacer } from '@/components/StatusBarSpacer';
import { SplashScreen } from '@/components/SplashScreen';
import { FullscreenProvider } from '@/contexts/FullscreenContext';



function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/api-data" element={<APIDataPage />} />

        <Route path="/clear-data" element={<ClearDataPage />} /> 
        {/* <Route path="/parse-data" element={<ParseDataPage />} /> */}
        <Route path="/game-start" element={<GameStartPage />} />
        <Route path="/auto-start" element={<AutoStartPage />} />
        <Route path="/qr-data-transfer" element={<QRDataTransferPage />} />
        <Route path="/json-transfer" element={<JSONDataTransferPage />} />
        <Route path="/match-data-qr" element={<MatchDataQRPage />} />
        <Route path="/match-strategy" element={<MatchStrategyPage />} />
        <Route path="/auto-scoring" element={<AutoScoringPage />} />
        <Route path="/teleop-scoring" element={<TeleopScoringPage />} />
        <Route path="/endgame" element={<EndgamePage />} />
        <Route path="/team-stats" element={<TeamStatsPage />} />
        <Route path="/pit-scouting" element={<PitScoutingPage />} />
        <Route path="/pit-assignments" element={<PitAssignmentsPage />} />
        <Route path="/strategy-overview" element={<StrategyOverviewPage />} />
        <Route path="/pick-list" element={<PickListPage />} />
        <Route path="/match-validation" element={<MatchValidationPage />} />
        <Route path="/scout-management" element={<ScoutManagementDashboardPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/dev-utilities" element={<DevUtilitiesPage />} />
        {/* Add more routes as needed */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    )
  );

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }

    // Track PWA install prompt
    window.addEventListener('beforeinstallprompt', () => {
      analytics.trackEvent('pwa_install_prompt_shown');
    });

    // Track if app was launched as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      analytics.trackPWALaunched();
    }

    // Debug analytics in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        analytics.debug();
        // Make analytics available globally for testing
        (window as typeof window & { analytics: typeof analytics }).analytics = analytics;
        
        // Make achievement functions available globally for debugging
        import('./lib/achievementUtils').then(achievementUtils => {
          (window as typeof window & { achievements: { backfillAll: () => Promise<void>, checkForNewAchievements: (name: string) => Promise<unknown[]> } }).achievements = {
            backfillAll: achievementUtils.backfillAchievementsForAllScouts,
            checkForNewAchievements: achievementUtils.checkForNewAchievements
          };
        });

        // Make test data generator available globally for testing
        import('./lib/testDataGenerator').then(testData => {
          (window as typeof window & { testData: { createTestProfiles: () => Promise<unknown>, clearAll: () => Promise<void> } }).testData = {
            createTestProfiles: testData.createTestScoutProfiles,
            clearAll: testData.clearTestData
          };
          console.log('🧪 Test data functions available:');
          console.log('  - window.testData.createTestProfiles() - Create test scout profiles');
          console.log('  - window.testData.clearAll() - Clear all scout data');
        });

        // Make gameDB available for debugging
        import('./lib/dexieDB').then(db => {
          (window as typeof window & { gameDB: typeof db.gameDB }).gameDB = db.gameDB;
          console.log('🗄️ Database available at window.gameDB');
        });

        // Debug function to check scout data
        (window as typeof window & { debugScoutData: (name: string) => Promise<void> }).debugScoutData = async (scoutName: string) => {
          const { gameDB } = await import('./lib/dexieDB');
          const scout = await gameDB.scouts.get(scoutName);
          console.log(`Scout data for ${scoutName}:`, scout);
          
          const achievements = await gameDB.scoutAchievements.where('scoutName').equals(scoutName).toArray();
          console.log(`Achievements for ${scoutName}:`, achievements);
          
          // Check specific stake achievements
          const { checkAchievement, ACHIEVEMENT_DEFINITIONS } = await import('./lib/achievementTypes');
          const stakeAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => a.id.startsWith('stakes_'));
          
          stakeAchievements.forEach(achievement => {
            const isUnlocked = achievements.some(a => a.achievementId === achievement.id);
            const meetsRequirements = checkAchievement(achievement, scout!);
            console.log(`${achievement.name}: unlocked=${isUnlocked}, meetsReq=${meetsRequirements}, stakesFromPredictions=${scout?.stakesFromPredictions}`);
          });
        };

        console.log('🐛 Debug function available: window.debugScoutData("Riley Davis")');
      }, 2000);
    }

  }, []);
  
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <FullscreenProvider>
        <div className="min-h-screen bg-background">
          <RouterProvider router={router} />
          <InstallPrompt />
          <StatusBarSpacer />
        </div>
      </FullscreenProvider>
    </ThemeProvider>
  );
}

export default App
