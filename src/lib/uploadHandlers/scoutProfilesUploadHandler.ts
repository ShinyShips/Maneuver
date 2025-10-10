import { toast } from "sonner";
import { gameDB, type Scout, type MatchPrediction } from "@/lib/dexieDB";
import type { UploadMode } from "./scoutingDataUploadHandler";

export const handleScoutProfilesUpload = async (jsonData: unknown, mode: UploadMode): Promise<void> => {
  if (!jsonData || typeof jsonData !== 'object' || !('scouts' in jsonData) || !('predictions' in jsonData)) {
    toast.error("Invalid scout profiles format");
    return;
  }

  const data = jsonData as { scouts: Scout[]; predictions: MatchPrediction[] };
  const scoutsToImport = data.scouts || [];
  const predictionsToImport = data.predictions || [];

  try {
    let scoutsAdded = 0;
    let scoutsUpdated = 0;
    let predictionsAdded = 0;

    if (mode === 'overwrite') {
      // Clear existing data
      await gameDB.scouts.clear();
      await gameDB.predictions.clear();
      
      // Add all new data
      await gameDB.scouts.bulkAdd(scoutsToImport);
      await gameDB.predictions.bulkAdd(predictionsToImport);
      
      scoutsAdded = scoutsToImport.length;
      predictionsAdded = predictionsToImport.length;
    } else {
      // Get existing data for smart merge/append
      const existingScouts = await gameDB.scouts.toArray();
      const existingPredictions = await gameDB.predictions.toArray();
      
      // Process scouts
      for (const scout of scoutsToImport) {
        const existing = existingScouts.find(s => s.name === scout.name);
        
        if (existing) {
          if (mode === 'smart-merge') {
            // Only update if new data is newer or has higher values
            const shouldUpdate = 
              scout.lastUpdated > existing.lastUpdated ||
              scout.stakes > existing.stakes ||
              scout.totalPredictions > existing.totalPredictions;
              
            if (shouldUpdate) {
              await gameDB.scouts.update(scout.name, {
                stakes: Math.max(scout.stakes, existing.stakes),
                totalPredictions: Math.max(scout.totalPredictions, existing.totalPredictions),
                correctPredictions: Math.max(scout.correctPredictions, existing.correctPredictions),
                currentStreak: scout.lastUpdated > existing.lastUpdated ? scout.currentStreak : existing.currentStreak,
                longestStreak: Math.max(scout.longestStreak, existing.longestStreak),
                lastUpdated: Math.max(scout.lastUpdated, existing.lastUpdated)
              });
              scoutsUpdated++;
            }
          } else if (mode === 'append') {
            // Force update in append mode
            await gameDB.scouts.put(scout);
            scoutsUpdated++;
          }
        } else {
          // Add new scout
          await gameDB.scouts.add(scout);
          scoutsAdded++;
        }
      }
      
      // Process predictions
      for (const prediction of predictionsToImport) {
        const exists = existingPredictions.some(p => p.id === prediction.id);
        
        if (!exists) {
          try {
            await gameDB.predictions.add(prediction);
            predictionsAdded++;
          } catch {
            // Duplicate constraint, skip in smart merge
            if (mode === 'append') {
              console.warn(`Skipping duplicate prediction: ${prediction.id}`);
            }
          }
        }
      }
    }

    const message = mode === 'overwrite' 
      ? `Overwritten with ${scoutsAdded} scouts and ${predictionsAdded} predictions`
      : `Profiles: ${scoutsAdded} new scouts, ${scoutsUpdated} updated scouts, ${predictionsAdded} predictions imported`;
    
    toast.success(message);
  } catch (error) {
    console.error('Error importing scout profiles:', error);
    toast.error("Failed to import scout profiles");
  }
};
