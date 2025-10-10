import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Target, ChevronRight, RefreshCw } from 'lucide-react';
import { getAchievementStats, getNextAchievements, backfillAchievementsForAllScouts } from '@/lib/achievementUtils';
import { ACHIEVEMENT_TIERS, type Achievement } from '@/lib/achievementTypes';

interface AchievementOverviewProps {
  scoutName: string;
  onViewAll?: () => void;
  onDataRefresh?: () => void;
}

interface AchievementStats {
  totalAchievements: number;
  unlockedCount: number;
  completionPercentage: number;
  totalStakesFromAchievements: number;
  recentAchievements: Array<Achievement & { unlockedAt: number }>;
}

export const AchievementOverview: React.FC<AchievementOverviewProps> = ({ 
  scoutName, 
  onViewAll,
  onDataRefresh
}) => {
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [nextAchievements, setNextAchievements] = useState<Array<Achievement & { progress: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [backfillLoading, setBackfillLoading] = useState(false);

  const handleBackfillAchievements = async () => {
    setBackfillLoading(true);
    try {
      await backfillAchievementsForAllScouts();
      
      // Reload achievement data
      const [achievementStats, upcomingAchievements] = await Promise.all([
        getAchievementStats(scoutName),
        getNextAchievements(scoutName, 2)
      ]);
      
      setStats(achievementStats);
      setNextAchievements(upcomingAchievements);
      
      // Notify parent to refresh other data if needed
      if (onDataRefresh) {
        onDataRefresh();
      }
    } catch (error) {
      console.error('❌ Error during achievement backfill:', error);
    } finally {
      setBackfillLoading(false);
    }
  };

  useEffect(() => {
    const loadOverview = async () => {
      if (!scoutName) return;
      
      setLoading(true);
      try {
        const [achievementStats, upcomingAchievements] = await Promise.all([
          getAchievementStats(scoutName),
          getNextAchievements(scoutName, 2)
        ]);
        
        setStats(achievementStats);
        setNextAchievements(upcomingAchievements);
      } catch (error) {
        console.error('Error loading achievement overview:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, [scoutName]);

  if (loading || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.unlockedCount}</div>
            <div className="text-xs text-gray-500">Unlocked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completionPercentage}%</div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">+{stats.totalStakesFromAchievements}</div>
            <div className="text-xs text-gray-500">Stakes</div>
          </div>
        </div>

        {stats.recentAchievements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <Star className="h-4 w-4" />
              Recent Achievement
            </h4>
            <div className="p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">{stats.recentAchievements[0].icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{stats.recentAchievements[0].name}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {stats.recentAchievements[0].description}
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${ACHIEVEMENT_TIERS[stats.recentAchievements[0].tier].textColor}`}
                >
                  {stats.recentAchievements[0].tier}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {nextAchievements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <Target className="h-4 w-4" />
              Next Goals
            </h4>
            <div className="space-y-2">
              {nextAchievements.map(achievement => (
                <div key={achievement.id} className="p-2 rounded bg-gray-50 dark:bg-gray-800 border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{achievement.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{achievement.name}</div>
                      <div className="text-xs text-gray-500 truncate">{achievement.description}</div>
                      {achievement.progress > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <Progress 
                            value={achievement.progress}
                            className="flex-1 h-1.5"
                          />
                          <span className="text-xs text-gray-500">{Math.round(achievement.progress)}%</span>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      +{achievement.stakesReward}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Check Achievements Button */}
        <div className="pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackfillAchievements}
            disabled={backfillLoading}
            className="w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${backfillLoading ? 'animate-spin' : ''}`} />
            {backfillLoading ? 'Checking Achievements...' : 'Check Achievements'}
          </Button>
        </div>

        {stats.unlockedCount === 0 && nextAchievements.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start making predictions to unlock achievements!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
