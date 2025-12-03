# WebRTC Transfer - Data Types & Bidirectional Transfer

## New Features Added

### 1. Multiple Data Types Support

The WebRTC transfer now supports the same data types as QR and JSON transfers:

```typescript
type TransferDataType = 'scouting' | 'pit-scouting' | 'match' | 'scout' | 'combined';
```

### 2. Lead → Scout (Request Data)

**Request from all scouts:**
```typescript
requestDataFromAll(filters?: DataFilters, dataType?: TransferDataType)
```

**Request from specific scout:**
```typescript
requestDataFromScout(scoutId: string, filters?: DataFilters, dataType?: TransferDataType)
```

**Example:**
```typescript
// Request pit scouting data from all scouts
requestDataFromAll(undefined, 'pit-scouting');

// Request filtered match data from specific scout
requestDataFromScout(scoutId, { matchRange: { type: 'preset', preset: 'last10' } }, 'match');
```

### 3. Lead → Scout (Push Data)

**Push to all scouts:**
```typescript
pushDataToAll(data: unknown, dataType: TransferDataType)
```

**Push to specific scout:**
```typescript
pushDataToScout(scoutId: string, data: unknown, dataType: TransferDataType)
```

**Example:**
```typescript
// Push match schedule to all scouts
const matchData = await loadMatchScheduleData();
pushDataToAll(matchData, 'match');

// Push scout profiles to specific scout
const profiles = await loadScoutProfiles();
pushDataToScout(scoutId, profiles, 'scout');
```

## Scout Side Changes

### New State Variables

```typescript
// When lead requests data
requestDataType: TransferDataType | null  // What type of data is being requested

// When lead pushes data
dataPushed: boolean                       // Has lead pushed data?
pushedData: unknown | null                // The data that was pushed
pushedDataType: TransferDataType | null   // Type of pushed data
```

### Usage Pattern

**Scout receiving request:**
```typescript
if (dataRequested) {
  const dataType = requestDataType || 'scouting';
  
  // Load the appropriate data type
  let data;
  switch(dataType) {
    case 'scouting':
      data = await loadScoutingData();
      break;
    case 'pit-scouting':
      data = await loadPitScoutingData();
      break;
    case 'match':
      data = await loadMatchScheduleData();
      break;
    // etc...
  }
  
  // Apply filters if provided
  if (requestFilters) {
    data = applyFilters(data, requestFilters);
  }
  
  sendData(data);
}
```

**Scout receiving pushed data:**
```typescript
if (dataPushed) {
  const dataType = pushedDataType;
  const data = pushedData;
  
  // Import the data
  switch(dataType) {
    case 'match':
      await importMatchScheduleData(data);
      break;
    case 'scout':
      await importScoutProfiles(data);
      break;
    // etc...
  }
  
  setDataPushed(false);
  toast.success(`${dataType} data received from lead`);
}
```

## Lead Side Changes

### Received Data Tracking

```typescript
interface ReceivedData {
  scoutName: string;
  data: unknown;
  dataType?: TransferDataType;  // NEW: Track what type was received
  timestamp: number;
}
```

### Usage Pattern

```typescript
// Request specific data type
const handleRequestPitData = () => {
  requestDataFromAll(filters, 'pit-scouting');
};

// Process received data by type
useEffect(() => {
  receivedData.forEach(async (received) => {
    const { scoutName, data, dataType } = received;
    
    switch(dataType) {
      case 'scouting':
        await importScoutingData(data);
        break;
      case 'pit-scouting':
        await importPitScoutingData(data);
        break;
      case 'match':
        await importMatchData(data);
        break;
      // etc...
    }
  });
}, [receivedData]);

// Push data to scouts
const handlePushMatchSchedule = async () => {
  const matchData = await loadMatchScheduleData();
  pushDataToAll(matchData, 'match');
  toast.success('Match schedule pushed to all scouts');
};
```

## Message Protocol

### Request Message (Lead → Scout)
```json
{
  "type": "request-data",
  "filters": { /* DataFilters */ },
  "dataType": "pit-scouting"
}
```

### Push Message (Lead → Scout)
```json
{
  "type": "push-data",
  "dataType": "match",
  "data": { /* actual data */ }
}
```

### Response Message (Scout → Lead)
```json
{
  "type": "complete",
  "dataType": "pit-scouting",
  "data": "{ /* JSON stringified data */ }"
}
```

Or chunked:
```json
{
  "type": "chunk",
  "transferId": "uuid",
  "chunkIndex": 0,
  "totalChunks": 5,
  "dataType": "scouting",
  "data": "chunk data..."
}
```

## UI Integration

### Data Type Selector

Add to PeerTransferPage:

```typescript
const [dataType, setDataType] = useState<TransferDataType>('scouting');

<Select value={dataType} onValueChange={setDataType}>
  <SelectItem value="scouting">Scouting Data</SelectItem>
  <SelectItem value="pit-scouting">Pit Scouting</SelectItem>
  <SelectItem value="match">Match Schedule</SelectItem>
  <SelectItem value="scout">Scout Profiles</SelectItem>
  <SelectItem value="combined">Combined Data</SelectItem>
</Select>
```

### Request Button

```typescript
<Button onClick={() => requestDataFromAll(filters, dataType)}>
  Request {dataType} Data from All Scouts
</Button>
```

### Push Button

```typescript
<Button onClick={() => handlePushData(dataType)}>
  Push {dataType} Data to All Scouts
</Button>
```

## Next Steps

## ✅ Implementation Complete

### Lead-Side Changes
1. **PeerTransferPage.tsx**
   - ✅ Added data type selector with all 5 types
   - ✅ Request button passes selected dataType to all scouts
   - ✅ Push button loads appropriate data and sends to scouts
   - ✅ Individual request buttons include dataType parameter
   - ✅ Dynamic button labels based on selected type

2. **Data Loading**
   - ✅ Scouting: `loadScoutingData()`
   - ✅ Pit Scouting: `loadPitScoutingData()`
   - ✅ Match: `localStorage.getItem('matchData')`
   - ✅ Scout: `gameDB.scouts/predictions/achievements`
   - ✅ Combined: All of the above in parallel

### Scout-Side Changes
1. **WebRTCDataRequestDialog.tsx** - Updated
   - ✅ Shows requested data type with visual badge
   - ✅ Loads correct data type based on requestDataType
   - ✅ Applies filters to scouting/combined data
   - ✅ Handles all 5 data types

2. **WebRTCPushedDataDialog.tsx** - New Component
   - ✅ Shows what type of data is being pushed
   - ✅ Displays data summary (item counts)
   - ✅ Accept/Decline buttons
   - ✅ Auto-imports to correct database on accept
   - ✅ Handles all data types with proper routing

3. **App.tsx**
   - ✅ Added WebRTCPushedDataDialog to global components

### Testing Checklist
- [ ] Test each data type: scouting, pit-scouting, match, scout, combined
- [ ] Test request with filters (scouting data)
- [ ] Test push to all scouts
- [ ] Test push to individual scout  
- [ ] Test with multiple scouts connected
- [ ] Verify data imports correctly
- [ ] Test accept/decline for both request and push
- [ ] Verify chunking for large transfers
