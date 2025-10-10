import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Award, Star } from 'lucide-react';
import { AchievementsSection } from '@/components/ScoutManagementComponents/AchievementsSection';
import { getAchievementLeaderboard } from '@/lib/achievementUtils';
import { useCurrentScout } from '@/hooks/useCurrentScout';
import { ACHIEVEMENT_TIERS, type Achievement } from '@/lib/achievementTypes';

interface AchievementLeaderboardEntry {
  scoutName: string;
  achievementCount: number;
  totalStakesFromAchievements: number;
  recentUnlock?: Achievement & { unlockedAt: number };
}

const AchievementsPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<AchievementLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentScout } = useCurrentScout();

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const data = await getAchievementLeaderboard();
        setLeaderboard(data);
      } catch (error) {
        console.error('Error loading achievement leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  if (!currentScout) {
    return (
      <div className="min-h-screen container mx-auto p-4 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Achievements</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select a scout to view their achievements
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Achievements</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your progress and unlock rewards
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Achievements Section - Takes up 3 columns */}
        <div className="lg:col-span-3">
          <AchievementsSection scoutName={currentScout.name} />
        </div>

        {/* Leaderboard Sidebar - Takes up 1 column */}
        <div className="space-y-6">
          {/* Achievement Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Achievement Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No achievements yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.slice(0, 10).map((entry, index) => (
                    <div 
                      key={entry.scoutName} 
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        entry.scoutName === currentScout.name 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-center w-6 h-6">
                        {index < 3 ? (
                          <Badge 
                            variant="default"
                            className={
                              index === 0 ? "bg-yellow-500 hover:bg-yellow-600" : // Gold
                              index === 1 ? "bg-gray-400 hover:bg-gray-500" :     // Silver  
                              "bg-amber-600 hover:bg-amber-700"                   // Bronze
                            }
                          >
                            {index + 1}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">#{index + 1}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {entry.scoutName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {entry.achievementCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            +{entry.totalStakesFromAchievements}
                          </span>
                        </div>
                        {entry.recentUnlock && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs">{entry.recentUnlock.icon}</span>
                            <span className="text-xs text-gray-400 truncate">
                              {entry.recentUnlock.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievement Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {leaderboard.length}
                </div>
                <div className="text-xs text-gray-500">Active Scouts</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {leaderboard.reduce((sum, entry) => sum + entry.achievementCount, 0)}
                </div>
                <div className="text-xs text-gray-500">Total Achievements</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {leaderboard.reduce((sum, entry) => sum + entry.totalStakesFromAchievements, 0)}
                </div>
                <div className="text-xs text-gray-500">Stakes from Achievements</div>
              </div>

              {/* Achievement Tier Legend */}
              <div className="space-y-2 pt-4 border-t">
                <h4 className="text-sm font-medium">Achievement Tiers</h4>
                <div className="space-y-1">
                  {Object.entries(ACHIEVEMENT_TIERS).map(([tier, style]) => (
                    <div key={tier} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded border-2"
                        style={{ 
                          backgroundColor: style.color + '20',
                          borderColor: style.color 
                        }}
                      />
                      <span className="capitalize">{tier}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AchievementsPage;
