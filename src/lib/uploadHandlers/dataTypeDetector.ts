// Function to detect data type from JSON content
export const detectDataType = (jsonData: unknown): 'scouting' | 'scoutProfiles' | 'pitScouting' | 'pitScoutingImagesOnly' | null => {
  if (!jsonData || typeof jsonData !== 'object') return null;

  const data = jsonData as Record<string, unknown>;

  // Check for scout profiles format
  if ('scouts' in data && 'predictions' in data) {
    return 'scoutProfiles';
  }

  // Check for pit scouting images-only format
  if ('type' in data && data.type === 'pit-scouting-images-only' && 'entries' in data && Array.isArray(data.entries)) {
    return 'pitScoutingImagesOnly';
  }

  // Check for pit scouting format
  if ('entries' in data && Array.isArray(data.entries)) {
    const entries = data.entries as unknown[];
    if (entries.length > 0 && typeof entries[0] === 'object' && entries[0] !== null) {
      const entry = entries[0] as Record<string, unknown>;
      if (entry.teamNumber && entry.scoutName && 
          (entry.drivetrain !== undefined || entry.weight !== undefined || 
           entry.reportedAutoScoring !== undefined || entry.reportedTeleopScoring !== undefined)) {
        return 'pitScouting';
      }
    }
  }

  // Check for modern scouting data format (with entries and IDs)
  if ('entries' in data && Array.isArray(data.entries)) {
    const entries = data.entries as unknown[];
    if (entries.length > 0 && typeof entries[0] === 'object' && entries[0] !== null) {
      const entry = entries[0] as Record<string, unknown>;
      if ('id' in entry && 'data' in entry && typeof entry.data === 'object') {
        return 'scouting';
      }
    }
  }

  // Check for legacy scouting data format
  if ('data' in data && Array.isArray(data.data)) {
    return 'scouting';
  }

  // Check for array format (could be scouting data)
  if (Array.isArray(jsonData)) {
    return 'scouting';
  }

  return null;
};
