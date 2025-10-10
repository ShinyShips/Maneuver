import { gameDB } from "@/lib/dexieDB";
import UniversalFountainGenerator from "./UniversalFountainGenerator";

interface ScoutProfilesFountainGeneratorProps {
  onBack: () => void;
  onSwitchToScanner: () => void;
}

const ScoutProfilesFountainGenerator = ({ onBack, onSwitchToScanner }: ScoutProfilesFountainGeneratorProps) => {
  const loadScoutProfilesData = async () => {
    try {
      
      // Get all scouts and predictions from the database
      const scoutsData = await gameDB.scouts.toArray();
      const predictionsData = await gameDB.predictions.toArray();
      
      
      if (scoutsData.length === 0 && predictionsData.length === 0) {
        return null;
      }
      
      // Combine both datasets
      const combinedData = {
        scouts: scoutsData,
        predictions: predictionsData,
        exportedAt: new Date().toISOString(),
        version: "1.0"
      };
      
      console.log("Scout profiles data prepared for fountain codes:", {
        scoutsCount: scoutsData.length,
        predictionsCount: predictionsData.length,
        totalDataSize: JSON.stringify(combinedData).length
      });
      
      return combinedData;
    } catch (error) {
      console.error("Error loading scout profiles data:", error);
      return null;
    }
  };

  return (
    <UniversalFountainGenerator
      onBack={onBack}
      onSwitchToScanner={onSwitchToScanner}
      dataType="scout"
      loadData={loadScoutProfilesData}
      title="Generate Scout Profiles Fountain Codes"
      description="Create multiple QR codes for reliable scout profiles transfer"
      noDataMessage="No scout profiles data found. Create scout profiles and make predictions first."
    />
  );
};

export default ScoutProfilesFountainGenerator;
