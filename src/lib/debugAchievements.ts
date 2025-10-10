import { gameDB } from './dexieDB';
import { checkForNewAchievements } from './achievementUtils';
import { ACHIEVEMENT_DEFINITIONS } from './achievementTypes';

export const debugAchievements = async (scoutName: string) => {
  console.log('🔍 Debug analysis for', scoutName);
  
  // Get current scout data
  const scout = await gameDB.scouts.get(scoutName);
  if (!scout) {
    console.log('❌ Scout not found');
    return;
  }
  
  console.log('📊 Current scout stats:', {
    stakes: scout.stakes,
    totalPredictions: scout.totalPredictions,
    correctPredictions: scout.correctPredictions,
    accuracy: Math.round((scout.correctPredictions / scout.totalPredictions) * 100),
    currentStreak: scout.currentStreak,
    longestStreak: scout.longestStreak
  });
  
  // Get current achievements
  const achievements = await gameDB.scoutAchievements
    .where('scoutName')
    .equals(scoutName)
    .toArray();
  
  console.log('🏆 Current achievements:', achievements.length);
  achievements.forEach(achievement => {
    const def = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievement.achievementId);
    if (def) {
      console.log(`  - ${def.name} (+${def.stakesReward} stakes)`);
    }
  });
  
  // Calculate total stakes from achievements
  const totalStakesFromAchievements = achievements.reduce((sum, achievement) => {
    const def = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievement.achievementId);
    return sum + (def?.stakesReward || 0);
  }, 0);
  
  console.log('💰 Total stakes from achievements:', totalStakesFromAchievements);
  console.log('💰 Expected base stakes:', scout.stakes - totalStakesFromAchievements);
  
  // Check which stakes achievements should be unlocked
  const stakesAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => a.id.startsWith('stakes_'));
  console.log('🎯 Stakes achievements analysis:');
  
  stakesAchievements.forEach(achievement => {
    const isUnlocked = achievements.some(a => a.achievementId === achievement.id);
    const shouldBeUnlocked = scout.stakes >= achievement.requirements.value;
    const status = isUnlocked ? '✅' : (shouldBeUnlocked ? '❌ MISSING' : '⏳');
    
    console.log(`  ${status} ${achievement.name}: needs ${achievement.requirements.value}, has ${scout.stakes}`);
  });
  
  // Try manual achievement check
  console.log('🔄 Running manual achievement check...');
  const newAchievements = await checkForNewAchievements(scoutName);
  
  if (newAchievements.length > 0) {
    console.log('🎉 New achievements unlocked:', newAchievements.map(a => a.name));
  } else {
    console.log('ℹ️ No new achievements to unlock');
  }
  
  // Get updated scout data
  const updatedScout = await gameDB.scouts.get(scoutName);
  if (updatedScout && updatedScout.stakes !== scout.stakes) {
    console.log('💰 Stakes updated:', scout.stakes, '->', updatedScout.stakes);
  }
};

export const fixStakesAchievements = async () => {
  console.log('🔧 Attempting to fix stakes achievements...');
  
  const scouts = await gameDB.scouts.toArray();
  
  for (const scout of scouts) {
    console.log(`\n🔍 Checking ${scout.name}...`);
    await debugAchievements(scout.name);
  }
};
