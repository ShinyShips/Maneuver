import { gameDB } from "@/lib/dexieDB";
import { loadScoutingData } from "@/lib/scoutingDataUtils";
import UniversalFountainGenerator from "./UniversalFountainGenerator";

interface CombinedDataFountainGeneratorProps {
  onBack: () => void;
  onSwitchToScanner: () => void;
}

const CombinedDataFountainGenerator = ({ onBack, onSwitchToScanner }: CombinedDataFountainGeneratorProps) => {
  const loadCombinedData = async () => {
    try {
      
      // Load scouting data
      const scoutingDataWithIds = await loadScoutingData();
      
      // Load scout profiles data
      const scoutsData = await gameDB.scouts.toArray();
      const predictionsData = await gameDB.predictions.toArray();
      
      
      // Check if we have any meaningful data
      const hasScoutingData = scoutingDataWithIds.entries.length > 0;
      const hasScoutData = scoutsData.length > 0 || predictionsData.length > 0;
      
      if (!hasScoutingData && !hasScoutData) {
        return null;
      }
      
      // Return the combined data in ScoutingDataCollection format for filtering support
      // This allows the UniversalFountainGenerator to apply filters to the scouting entries
      const combinedData = {
        entries: scoutingDataWithIds.entries,
        metadata: {
          exportedAt: new Date().toISOString(),
          version: "1.0",
          scoutingEntriesCount: scoutingDataWithIds.entries.length,
          scoutsCount: scoutsData.length,
          predictionsCount: predictionsData.length
        },
        // Store scout profiles in metadata so they're preserved after filtering
        scoutProfiles: {
          scouts: scoutsData,
          predictions: predictionsData
        }
      };
      
      return combinedData;
    } catch (error) {
      console.error("Error loading combined data:", error);
      return null;
    }
  };

  return (
    <UniversalFountainGenerator
      onBack={onBack}
      onSwitchToScanner={onSwitchToScanner}
      dataType="combined"
      loadData={loadCombinedData}
      title="Generate Combined Data Fountain Codes"
      description="Create multiple QR codes containing both scouting data and scout profiles for complete data transfer"
      noDataMessage="No scouting data or scout profiles found. Create some data first before exporting."
    />
  );
};

export default CombinedDataFountainGenerator;
