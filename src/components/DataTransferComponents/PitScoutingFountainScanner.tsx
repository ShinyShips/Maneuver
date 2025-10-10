/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  importPitScoutingData
} from "@/lib/pitScoutingUtils";
import type { PitScoutingData } from "@/lib/pitScoutingTypes";
import UniversalFountainScanner from "./UniversalFountainScanner";

interface PitScoutingFountainScannerProps {
  onBack: () => void;
  onSwitchToGenerator: () => void;
}

const PitScoutingFountainScanner = ({ onBack, onSwitchToGenerator }: PitScoutingFountainScannerProps) => {
  const savePitScoutingDataFromFountain = async (data: unknown) => {
    // Handle the pit scouting data format
    let pitScoutingData: PitScoutingData;
    if (data && typeof data === 'object' && 'entries' in data && Array.isArray((data as any).entries)) {
      // Pit scouting data format
      pitScoutingData = data as PitScoutingData;
    } else {
      throw new Error('Invalid pit scouting data format');
    }
    
    // Import data with smart merging (append mode to avoid duplicates)
    const importResult = await importPitScoutingData(pitScoutingData, 'append');
    
    // Show import info
    const { imported, duplicatesSkipped } = importResult;
    if (duplicatesSkipped > 0) {
      console.log(`Imported: ${imported} new entries (${duplicatesSkipped} duplicates skipped)`);
    } else {
      console.log(`Imported: ${imported} new pit scouting entries`);
    }
  };

  const validatePitScoutingData = (data: unknown): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    const pitData = data as any;
    
    // Check if it has the expected structure
    if (!('entries' in pitData) || !Array.isArray(pitData.entries)) return false;
    
    // Check if entries have the expected pit scouting structure
    const firstEntry = pitData.entries[0];
    if (!firstEntry) return true; // Empty array is valid
    
    // Validate pit scouting entry structure
    const requiredFields = ['teamNumber', 'eventName', 'scoutName'];
    return requiredFields.every(field => field in firstEntry);
  };

  const getDataSummary = (data: unknown): string => {
    if (!data || typeof data !== 'object') return 'Invalid data';
    
    const pitData = data as any;
    if ('entries' in pitData && Array.isArray(pitData.entries)) {
      const entryCount = pitData.entries.length;
      return `${entryCount} pit scouting ${entryCount === 1 ? 'entry' : 'entries'}`;
    }
    
    return 'Unknown data format';
  };

  return (
    <UniversalFountainScanner
      onBack={onBack}
      onSwitchToGenerator={onSwitchToGenerator}
      dataType="pit-scouting"
      expectedPacketType="pit-scouting_fountain_packet"
      saveData={savePitScoutingDataFromFountain}
      validateData={validatePitScoutingData}
      getDataSummary={getDataSummary}
      title="Scan Pit Scouting Codes"
      description="Scan fountain codes to import pit scouting data. QR codes can be scanned in any order until reconstruction is complete."
      completionMessage="Pit scouting data imported successfully!"
    />
  );
};

export default PitScoutingFountainScanner;
