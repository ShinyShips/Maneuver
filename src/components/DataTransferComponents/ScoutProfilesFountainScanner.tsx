import { gameDB, type Scout, type MatchPrediction } from "@/lib/dexieDB";
import UniversalFountainScanner from "./UniversalFountainScanner";
import ScoutAddConfirmDialog from "./ScoutAddConfirmDialog";
import { toast } from "sonner";
import { useState } from "react";

interface ScoutProfilesFountainScannerProps {
  onBack: () => void;
  onSwitchToGenerator: () => void;
}

interface ScoutProfilesData {
  scouts: Scout[];
  predictions: MatchPrediction[];
  exportedAt: string;
  version: string;
}

const ScoutProfilesFountainScanner = ({ onBack, onSwitchToGenerator }: ScoutProfilesFountainScannerProps) => {
  const [showScoutAddDialog, setShowScoutAddDialog] = useState(false);
  const [pendingScoutNames, setPendingScoutNames] = useState<string[]>([]);
  const [pendingImportData, setPendingImportData] = useState<{
    scoutsToImport: Scout[];
    predictionsToImport: MatchPrediction[];
  } | null>(null);
  const saveScoutProfilesData = async (data: unknown) => {    
    try {
      // Validate the received data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid scout profiles data format');
      }
      
      const profilesData = data as ScoutProfilesData;
      
      if (!profilesData.scouts || !Array.isArray(profilesData.scouts)) {
        throw new Error('No scouts array found in data');
      }
      
      if (!profilesData.predictions || !Array.isArray(profilesData.predictions)) {
        throw new Error('No predictions array found in data');
      }
      
      const scoutsToImport: Scout[] = profilesData.scouts;
      const predictionsToImport: MatchPrediction[] = profilesData.predictions;
      
      // Check which scouts would be new to the selectable list
      const existingScoutsList = localStorage.getItem("scoutsList");
      let scoutsListArray: string[] = [];
      
      if (existingScoutsList) {
        try {
          scoutsListArray = JSON.parse(existingScoutsList);
        } catch {
          scoutsListArray = [];
        }
      }
      
      const newScoutNames = scoutsToImport
        .map(s => s.name)
        .filter(name => !scoutsListArray.includes(name));
      
      // If there are new scouts, ask the user if they want to add them to selectable list
      if (newScoutNames.length > 0) {
        setPendingScoutNames(newScoutNames);
        setPendingImportData({ scoutsToImport, predictionsToImport });
        setShowScoutAddDialog(true);
        return; // Wait for user decision
      }
      
      // If no new scouts, proceed with import without updating selectable list
      await performImport(scoutsToImport, predictionsToImport, false);
      
    } catch (error) {
      console.error('Error importing scout profiles data:', error);
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const performImport = async (scoutsToImport: Scout[], predictionsToImport: MatchPrediction[], addToSelectableList: boolean) => {
    // Get existing data to merge intelligently
    const existingScouts = await gameDB.scouts.toArray();
    const existingPredictions = await gameDB.predictions.toArray();
    
    let scoutsAdded = 0;
    let scoutsUpdated = 0;
    let predictionsAdded = 0;
    
    // Process scouts - merge or update based on name
    for (const scout of scoutsToImport) {
      const existing = existingScouts.find(s => s.name === scout.name);
      
      if (existing) {
        // Update existing scout with higher values or newer timestamp
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
      } else {
        // Add new scout
        await gameDB.scouts.add(scout);
        scoutsAdded++;
      }
    }
    
    // Process predictions - avoid duplicates based on unique constraint
    for (const prediction of predictionsToImport) {
      const exists = existingPredictions.some(p => p.id === prediction.id);
      
      if (!exists) {
        try {
          await gameDB.predictions.add(prediction);
          predictionsAdded++;
        } catch {
          // Probably a duplicate ID constraint, skip it
          console.warn(`Skipping duplicate prediction: ${prediction.id}`);
        }
      }
    }
    
    // Only update localStorage scout list if user chose to add to selectable list
    if (addToSelectableList) {
      const allScoutNames = scoutsToImport.map(s => s.name);
      const existingScoutsList = localStorage.getItem("scoutsList");
      let scoutsListArray: string[] = [];
      
      if (existingScoutsList) {
        try {
          scoutsListArray = JSON.parse(existingScoutsList);
        } catch {
          scoutsListArray = [];
        }
      }
      
      // Merge and deduplicate
      const mergedScouts = [...new Set([...scoutsListArray, ...allScoutNames])].sort();
      localStorage.setItem("scoutsList", JSON.stringify(mergedScouts));
    }
    
    // Show summary to user
    const addedToSelectableMessage = addToSelectableList ? " and added to selectable scouts" : "";
    const message = `Import complete! Added ${scoutsAdded} new scouts, updated ${scoutsUpdated} existing scouts, and imported ${predictionsAdded} predictions${addedToSelectableMessage}.`;
    toast.success(message);
    
    // Notify other components that scout data has been updated
    window.dispatchEvent(new CustomEvent('scoutDataUpdated'));
  };

  const handleAddScoutsToSelectable = async () => {
    if (pendingImportData) {
      await performImport(pendingImportData.scoutsToImport, pendingImportData.predictionsToImport, true);
      setShowScoutAddDialog(false);
      setPendingImportData(null);
      setPendingScoutNames([]);
    }
  };

  const handleImportWithoutAdding = async () => {
    if (pendingImportData) {
      await performImport(pendingImportData.scoutsToImport, pendingImportData.predictionsToImport, false);
      setShowScoutAddDialog(false);
      setPendingImportData(null);
      setPendingScoutNames([]);
    }
  };

  const validateScoutProfilesData = (data: unknown): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    const profilesData = data as ScoutProfilesData;
    
    // Check for required structure
    if (!profilesData.scouts || !Array.isArray(profilesData.scouts)) return false;
    if (!profilesData.predictions || !Array.isArray(profilesData.predictions)) return false;
    
    // Validate at least one scout has required fields
    if (profilesData.scouts.length > 0) {
      const firstScout = profilesData.scouts[0];
      const requiredFields = ['name', 'stakes', 'totalPredictions', 'correctPredictions'];
      if (!requiredFields.every(field => field in firstScout)) return false;
    }
    
    return true;
  };

  const getScoutProfilesDataSummary = (data: unknown): string => {
    if (!data || typeof data !== 'object') return '0 profiles';
    
    const profilesData = data as ScoutProfilesData;
    
    const scoutsCount = profilesData.scouts?.length || 0;
    const predictionsCount = profilesData.predictions?.length || 0;
    
    return `${scoutsCount} scouts, ${predictionsCount} predictions`;
  };

  return (
    <>
      <UniversalFountainScanner
        onBack={onBack}
        onSwitchToGenerator={onSwitchToGenerator}
        dataType="scout"
        expectedPacketType="scout_fountain_packet"
        saveData={saveScoutProfilesData}
        validateData={validateScoutProfilesData}
        getDataSummary={getScoutProfilesDataSummary}
        title="Scan Scout Profiles Fountain Codes"
        description="Point your camera at the QR codes to receive scout profiles data"
        completionMessage="Scout profiles data has been successfully reconstructed and imported"
      />
      
      <ScoutAddConfirmDialog
        open={showScoutAddDialog}
        onOpenChange={setShowScoutAddDialog}
        pendingScoutNames={pendingScoutNames}
        onAddToSelectable={handleAddScoutsToSelectable}
        onImportOnly={handleImportWithoutAdding}
      />
    </>
  );
};

export default ScoutProfilesFountainScanner;
