# Pit Scouting Feature

This pit scouting feature allows teams to collect baseline information about robots before matches begin. This data is self-reported by teams and can help with strategic planning.

## Features

### Data Collection
- **Robot Photo**: Take a photo of the robot in the pit
- **Weight**: Record the robot's weight in pounds
- **Drivetrain**: Select from common drivetrain types (Swerve Drive, Tank Drive, Mecanum Drive, Other)
- **Programming Language**: Track what language the team uses (Java, C++, Python, LabVIEW, Other)

### Scoring Capabilities
- **Coral Scoring**: Track reported capabilities for Auto and Teleop coral scoring (Levels 1-4)
- **Algae Scoring**: Track reported capabilities for Auto and Teleop algae scoring (Net shots, Processor)

### Auto Capabilities
- **Starting Positions**: Track which starting positions (0-5) the robot can use for autonomous and what a robot can score from that position

### Endgame Capabilities
- **Climb Types**: Track if the robot can perform shallow climb, deep climb, or park

### Additional Information
- **Notes**: Free-form text field for additional observations or special features

## Usage

1. **Navigate to Pit Scouting**: Go to Strategy → Pit Scouting in the sidebar
2. **Enter Basic Info**: Fill in team number, event name, and your initials
3. **Take Photo**: Use the camera button to take a photo of the robot
4. **Fill Technical Specs**: Enter weight, drivetrain, and programming language
5. **Mark Capabilities**: Check all reported scoring, auto, and endgame capabilities
6. **Add Notes**: Include any additional observations
7. **Save**: Click "Save Pit Data" to store the information

## Data Management

### Viewing Pit Data
- Pit scouting data is integrated into the Team Stats page
- Access via the "Pit Data" tab when viewing a specific team
- Data is filtered by selected event if applicable

### Data Storage
- Data is stored locally using localStorage
- Each team can have multiple pit scouting entries (one per event)
- Existing entries are automatically loaded and can be updated

### Data Export/Import
- Pit scouting data can be cleared via the Clear Data page
- CSV export functionality is available through the pit scouting utils

## Implementation Details

### Files Created/Modified
- `src/lib/pitScoutingTypes.ts` - Type definitions
- `src/lib/pitScoutingUtils.ts` - Data management utilities
- `src/pages/PitScoutingPage.tsx` - Main pit scouting form
- `src/components/TeamStatsComponents/PitScoutingData.tsx` - Data viewer component
- `src/App.tsx` - Added routing
- `src/components/DashboardComponents/app-sidebar.tsx` - Added navigation
- `src/pages/TeamStatsPage.tsx` - Added pit data tab
- `src/pages/ClearDataPage.tsx` - Added pit data clearing

### Data Structure
```typescript
interface PitScoutingEntry {
  id: string;
  teamNumber: string;
  eventName: string;
  scoutName: string;
  timestamp: number;
  robotPhoto?: string; // Base64 encoded
  weight?: number;
  drivetrain?: string;
  programmingLanguage?: string;
  reportedScoring?: {
    // Auto and teleop capabilities for coral and algae
  };
  reportedAutoCapabilities?: {
    // Starting positions 0-5
  };
  reportedEndgame?: {
    // Climb and park capabilities
  };
  notes?: string;
}
```

## Future Enhancements

Potential improvements could include:
- Integration with JSON data transfer for backup/restore
- Migration ot IndexedDB
- Photo compression and optimization
- Advanced search and filtering
- Export to match scouting systems
