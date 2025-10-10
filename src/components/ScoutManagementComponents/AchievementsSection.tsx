import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/animate-ui/radix/tabs";
import { AchievementCard } from './AchievementCard';
import { getScoutAchievements, getAchievementStats, backfillAchievementsForAllScouts } from '@/lib/achievementUtils';
import { getAchievementsByCategory, type Achievement } from '@/lib/achievementTypes';
import { Trophy, Target, Star, Users, Clock, TrendingUp, Zap, RefreshCw } from 'lucide-react';

interface AchievementsSectionProps {
  scoutName: string;
}

interface AchievementStats {
  totalAchievements: number;
  unlockedCount: number;
  completionPercentage: number;
  totalStakesFromAchievements: number;
  recentAchievements: Array<Achievement & { unlockedAt: number }>;
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({ scoutName }) => {
  const [unlocked, setUnlocked] = useState<Array<Achievement & { unlockedAt: number }>>([]);
  const [available, setAvailable] = useState<Array<Achievement & { progress: number }>>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const handleBackfillAchievements = async () => {
    setBackfillLoading(true);
    try {
      await backfillAchievementsForAllScouts();
      
      // Reload achievement data
      const achievements = await getScoutAchievements(scoutName);
      const achievementStats = await getAchievementStats(scoutName);
      
      setUnlocked(achievements.unlocked);
      setAvailable(achievements.available);
      setStats(achievementStats);
    } catch (error) {
      console.error('❌ Error during achievement backfill:', error);
    } finally {
      setBackfillLoading(false);
    }
  };

  useEffect(() => {
    const loadAchievements = async () => {
      if (!scoutName) return;
      
      setLoading(true);
      try {
        const achievements = await getScoutAchievements(scoutName);
        const achievementStats = await getAchievementStats(scoutName);
        
        setUnlocked(achievements.unlocked);
        setAvailable(achievements.available);
        setStats(achievementStats);
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();
  }, [scoutName]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'accuracy': return Target;
      case 'volume': return Trophy;
      case 'streaks': return Zap;
      case 'special': return Star;
      case 'social': return Users;
      case 'time': return Clock;
      case 'improvement': return TrendingUp;
      default: return Trophy;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'accuracy': return 'Accuracy';
      case 'volume': return 'Volume';
      case 'streaks': return 'Streaks';
      case 'special': return 'Special';
      case 'social': return 'Social';
      case 'time': return 'Time';
      case 'improvement': return 'Improvement';
      default: return category;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categories = getAchievementsByCategory();
  const availableByCategory: { [key: string]: Array<Achievement & { progress: number }> } = {};
  const unlockedByCategory: { [key: string]: Array<Achievement & { unlockedAt: number }> } = {};

  // Helper function to get tier order for sorting
  const getTierOrder = (tier: string) => {
    switch (tier) {
      case 'bronze': return 1;
      case 'silver': return 2;
      case 'gold': return 3;
      case 'platinum': return 4;
      case 'legendary': return 5;
      default: return 6;
    }
  };

  available.forEach(achievement => {
    if (!availableByCategory[achievement.category]) {
      availableByCategory[achievement.category] = [];
    }
    availableByCategory[achievement.category].push(achievement);
  });

  unlocked.forEach(achievement => {
    if (!unlockedByCategory[achievement.category]) {
      unlockedByCategory[achievement.category] = [];
    }
    unlockedByCategory[achievement.category].push(achievement);
  });

  // Sort achievements by tier (Bronze first) then by requirements value for consistency
  Object.keys(availableByCategory).forEach(category => {
    availableByCategory[category].sort((a, b) => {
      const tierDiff = getTierOrder(a.tier) - getTierOrder(b.tier);
      if (tierDiff !== 0) return tierDiff;
      return a.requirements.value - b.requirements.value;
    });
  });

  Object.keys(unlockedByCategory).forEach(category => {
    unlockedByCategory[category].sort((a, b) => {
      const tierDiff = getTierOrder(a.tier) - getTierOrder(b.tier);
      if (tierDiff !== 0) return tierDiff;
      return a.requirements.value - b.requirements.value;
    });
  });

  return (
    <Card>
      <CardHeader>
        <div className="space-y-3">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
          {stats && (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {stats.unlockedCount}/{stats.totalAchievements} Unlocked
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {stats.completionPercentage}% Complete
                </Badge>
                <Badge variant="secondary" className="text-xs text-yellow-600">
                  +{stats.totalStakesFromAchievements} Stakes
                </Badge>
              </div>
              {/* Check Achievements Button - Inline on larger screens */}
              <div className="lg:flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleBackfillAchievements}
                  disabled={backfillLoading}
                  className="w-full lg:w-auto flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${backfillLoading ? 'animate-spin' : ''}`} />
                  {backfillLoading ? 'Checking...' : 'Check Achievements'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full" 
          enableSwipe={true}
        >
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
            <TabsTrigger value="progress">In Progress</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            {Object.keys(categories).slice(0, 4).map(category => (
              <TabsTrigger key={category} value={category} className="hidden lg:flex">
                {getCategoryName(category)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {Object.entries(categories).map(([category, categoryAchievements]) => {
              const Icon = getCategoryIcon(category);
              const categoryUnlocked = unlockedByCategory[category] || [];
              const categoryAvailable = availableByCategory[category] || [];
              
              if (categoryUnlocked.length === 0 && categoryAvailable.length === 0) {
                return null;
              }

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Icon className="h-5 w-5" />
                    {getCategoryName(category)}
                    <Badge variant="outline" className="text-xs">
                      {categoryUnlocked.length}/{(categoryAchievements as Achievement[]).length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryUnlocked.map(achievement => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        isUnlocked={true}
                        unlockedAt={achievement.unlockedAt}
                        showProgress={false}
                      />
                    ))}
                    {categoryAvailable.map(achievement => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        isUnlocked={false}
                        progress={achievement.progress}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="unlocked" className="space-y-4">
            {unlocked.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No achievements unlocked yet</p>
                <p className="text-sm">Start making predictions to earn your first achievement!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unlocked
                  .sort((a, b) => {
                    const tierDiff = getTierOrder(a.tier) - getTierOrder(b.tier);
                    if (tierDiff !== 0) return tierDiff;
                    return a.requirements.value - b.requirements.value;
                  })
                  .map(achievement => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      isUnlocked={true}
                      unlockedAt={achievement.unlockedAt}
                      showProgress={false}
                    />
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            {available.filter(a => a.progress > 0).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No achievements in progress</p>
                <p className="text-sm">Continue scouting to make progress on achievements!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {available
                  .filter(achievement => achievement.progress > 0)
                  .sort((a, b) => b.progress - a.progress)
                  .map(achievement => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      isUnlocked={false}
                      progress={achievement.progress}
                    />
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            {stats?.recentAchievements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent achievements</p>
                <p className="text-sm">Keep scouting to unlock new achievements!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats?.recentAchievements.map(achievement => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    isUnlocked={true}
                    unlockedAt={achievement.unlockedAt}
                    showProgress={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {Object.keys(categories).map((category) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(unlockedByCategory[category] || []).map(achievement => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    isUnlocked={true}
                    unlockedAt={achievement.unlockedAt}
                    showProgress={false}
                  />
                ))}
                {(availableByCategory[category] || []).map(achievement => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    isUnlocked={false}
                    progress={achievement.progress}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
