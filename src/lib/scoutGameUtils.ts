import type { Scout } from './dexieDB';
import { 
  getOrCreateScout,
  getScout, 
  getAllScouts,
  updateScoutPoints,
  updateScoutStats,
  updateScoutWithPredictionResult,
  createMatchPrediction,
  getPredictionForMatch,
  getAllPredictionsForScout,
  getAllPredictionsForMatch,
  markPredictionAsVerified,
  deleteScout,
  clearGameData
} from './dexieDB';
import { checkForNewAchievements } from './achievementUtils';
import type { Achievement } from './achievementTypes';

// Stake values for different activities
export const STAKE_VALUES = {
  CORRECT_PREDICTION: 10,
  INCORRECT_PREDICTION: 0,
  PARTICIPATION_BONUS: 1,
  STREAK_BONUS_BASE: 2, // Base streak bonus (2 stakes for 2+ in a row)
} as const;

// Calculate streak bonus stakes based on streak length
export const calculateStreakBonus = (streakLength: number): number => {
  if (streakLength < 2) return 0;
  return STAKE_VALUES.STREAK_BONUS_BASE * (streakLength - 1);
};

// Get or create a scout by name (linked to sidebar selection)
export const getOrCreateScoutByName = async (name: string): Promise<Scout> => {
  return await getOrCreateScout(name);
};

// Calculate scout accuracy percentage
export const calculateAccuracy = (scout: Scout): number => {
  if (scout.totalPredictions === 0) return 0;
  return Math.round((scout.correctPredictions / scout.totalPredictions) * 100);
};

// Get leaderboard
export const getLeaderboard = async (): Promise<Scout[]> => {
  return await getAllScouts();
};

// Wrapper function to update scout stats with achievement checking
export const updateScoutStatsWithAchievements = async (
  name: string, 
  newStakes: number, 
  correctPredictions: number, 
  totalPredictions: number,
  currentStreak?: number,
  longestStreak?: number
): Promise<{ newAchievements: Achievement[] }> => {
  // Update the stats first
  await updateScoutStats(name, newStakes, correctPredictions, totalPredictions, currentStreak, longestStreak);
  
  // Check for new achievements
  const newAchievements = await checkForNewAchievements(name);
  
  return { newAchievements };
};

// Wrapper function to update scout with prediction result and achievement checking
export const updateScoutWithPredictionAndAchievements = async (
  name: string,
  isCorrect: boolean,
  basePoints: number,
  eventName: string,
  matchNumber: string
): Promise<{ newAchievements: Achievement[] }> => {
  // Update with prediction result first
  await updateScoutWithPredictionResult(name, isCorrect, basePoints, eventName, matchNumber);
  
  // Check for new achievements
  const newAchievements = await checkForNewAchievements(name);
  
  return { newAchievements };
};

export {
  getScout,
  getAllScouts,
  updateScoutPoints,
  updateScoutStats,
  updateScoutWithPredictionResult,
  createMatchPrediction,
  getPredictionForMatch,
  getAllPredictionsForScout,
  getAllPredictionsForMatch,
  markPredictionAsVerified,
  deleteScout,
  clearGameData
};
