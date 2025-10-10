import { gameDB } from './dexieDB';
import type { ScoutAchievement } from './dexieDB';
import { 
  ACHIEVEMENT_DEFINITIONS, 
  checkAchievement, 
  getAchievementProgress,
  type Achievement 
} from './achievementTypes';
import { updateScoutPoints } from './dexieDB';

export const checkForNewAchievements = async (scoutName: string): Promise<Achievement[]> => {
  const scout = await gameDB.scouts.get(scoutName);
  if (!scout) return [];

  const unlockedAchievements = await gameDB.scoutAchievements
    .where('scoutName')
    .equals(scoutName)
    .toArray();
  
  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId));
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedIds.has(achievement.id)) continue;
    
    if (checkAchievement(achievement, scout)) {
      
      if (achievement.requirements.type === 'special') {
        if (achievement.id === 'early_bird') {
          const totalScouts = await gameDB.scouts.count();
          if (totalScouts > 5) continue;
        }
      }
      
      const scoutAchievement: ScoutAchievement = {
        scoutName,
        achievementId: achievement.id,
        unlockedAt: Date.now(),
        progress: 100
      };
      
      await gameDB.scoutAchievements.add(scoutAchievement);
      
      if (achievement.stakesReward > 0) {
        await updateScoutPoints(scoutName, achievement.stakesReward);
      }
      
      newlyUnlocked.push(achievement);
    }
  }

  if (newlyUnlocked.length > 0) {
    console.log('🏆 Total new achievements unlocked for', scoutName, ':', newlyUnlocked.map(a => a.name));
  }

  return newlyUnlocked;
};

export const backfillAchievementsForAllScouts = async (): Promise<void> => {
  
  const allScouts = await gameDB.scouts.toArray();
  
  for (const scout of allScouts) {
    const newAchievements = await checkForNewAchievements(scout.name);
    
    if (newAchievements.length > 0) {
      console.log('🏆 Backfilled', newAchievements.length, 'achievements for', scout.name);
    }
  }
  
};

export const getScoutAchievements = async (scoutName: string): Promise<{
  unlocked: Array<Achievement & { unlockedAt: number }>;
  available: Array<Achievement & { progress: number }>;
  hidden: Array<Achievement & { progress: number }>;
}> => {
  const scout = await gameDB.scouts.get(scoutName);
  if (!scout) {
    return { unlocked: [], available: [], hidden: [] };
  }

  const unlockedAchievements = await gameDB.scoutAchievements
    .where('scoutName')
    .equals(scoutName)
    .toArray();
  
  const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId));
  const unlockedMap = new Map(unlockedAchievements.map(a => [a.achievementId, a]));

  const unlocked: Array<Achievement & { unlockedAt: number }> = [];
  const available: Array<Achievement & { progress: number }> = [];
  const hidden: Array<Achievement & { progress: number }> = [];

  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedIds.has(achievement.id)) {
      const scoutAchievement = unlockedMap.get(achievement.id)!;
      unlocked.push({
        ...achievement,
        unlockedAt: scoutAchievement.unlockedAt
      });
    } else {
      const progress = getAchievementProgress(achievement, scout);
      const achievementWithProgress = { ...achievement, progress };
      
      if (achievement.hidden && progress < 100) {
        hidden.push(achievementWithProgress);
      } else {
        available.push(achievementWithProgress);
      }
    }
  }

  unlocked.sort((a, b) => b.unlockedAt - a.unlockedAt);

  available.sort((a, b) => b.progress - a.progress);  return { unlocked, available, hidden };
};

export const getAchievementStats = async (scoutName: string): Promise<{
  totalAchievements: number;
  unlockedCount: number;
  completionPercentage: number;
  totalStakesFromAchievements: number;
  recentAchievements: Array<Achievement & { unlockedAt: number }>;
}> => {
  const { unlocked } = await getScoutAchievements(scoutName);
  const visibleAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => !a.hidden);
  
  const totalStakesFromAchievements = unlocked.reduce((sum, achievement) => {
    return sum + achievement.stakesReward;
  }, 0);

  const recentAchievements = unlocked
    .slice(0, 3) // Last 3 achievements
    .sort((a, b) => b.unlockedAt - a.unlockedAt);

  return {
    totalAchievements: visibleAchievements.length,
    unlockedCount: unlocked.filter(a => !ACHIEVEMENT_DEFINITIONS.find(def => def.id === a.id)?.hidden).length,
    completionPercentage: Math.round((unlocked.length / ACHIEVEMENT_DEFINITIONS.length) * 100),
    totalStakesFromAchievements,
    recentAchievements
  };
};

export const getAchievementLeaderboard = async (): Promise<Array<{
  scoutName: string;
  achievementCount: number;
  totalStakesFromAchievements: number;
  recentUnlock?: Achievement & { unlockedAt: number };
}>> => {
  const allScouts = await gameDB.scouts.toArray();
  const leaderboard = [];

  for (const scout of allScouts) {
    const stats = await getAchievementStats(scout.name);
    const { unlocked } = await getScoutAchievements(scout.name);
    
    leaderboard.push({
      scoutName: scout.name,
      achievementCount: stats.unlockedCount,
      totalStakesFromAchievements: stats.totalStakesFromAchievements,
      recentUnlock: unlocked[0] // Most recent achievement
    });
  }

  leaderboard.sort((a, b) => {
    if (a.achievementCount !== b.achievementCount) {
      return b.achievementCount - a.achievementCount;
    }
    return b.totalStakesFromAchievements - a.totalStakesFromAchievements;
  });

  return leaderboard;
};

export const checkAllScoutAchievements = async (): Promise<{
  [scoutName: string]: Achievement[];
}> => {
  const allScouts = await gameDB.scouts.toArray();
  const results: { [scoutName: string]: Achievement[] } = {};

  for (const scout of allScouts) {
    const newAchievements = await checkForNewAchievements(scout.name);
    if (newAchievements.length > 0) {
      results[scout.name] = newAchievements;
    }
  }

  return results;
};

export const getNextAchievements = async (scoutName: string, limit = 3): Promise<Array<Achievement & { progress: number }>> => {
  const { available } = await getScoutAchievements(scoutName);
  
  const nextAchievements = available
    .filter(a => a.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, limit);

  if (nextAchievements.length < limit) {
    const zeroProgressAchievements = available
      .filter(a => a.progress === 0)
      .slice(0, limit - nextAchievements.length);
    
    nextAchievements.push(...zeroProgressAchievements);
  }

  return nextAchievements;
};
