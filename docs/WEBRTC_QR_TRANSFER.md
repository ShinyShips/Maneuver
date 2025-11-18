# WebRTC QR Code Signaling - Lead Scout Data Transfer

## Overview

This system enables completely offline peer-to-peer data transfer between scout tablets using WebRTC with QR code signaling. No WiFi infrastructure, no internet, no servers required - just QR codes to establish connections.

## How It Works

### Technology Stack

- **WebRTC**: Peer-to-peer data channels for direct device-to-device communication
- **QR Code Signaling**: Manual exchange of connection offers/answers via camera scanning
- **Data Channels**: Reliable ordered data transfer once connection is established

### Connection Process

1. **Lead Scout Generates Offer**
   - Creates WebRTC peer connection
   - Generates SDP offer with ICE candidates
   - Displays offer as QR code

2. **Scouts Scan Offer**
   - Each scout scans lead's QR code with camera
   - Parses offer and creates peer connection
   - Generates SDP answer

3. **Lead Scout Scans Answers**
   - Scouts display their answer as QR code
   - Lead scans each scout's answer QR
   - Connection established via WebRTC data channel

4. **Data Transfer**
   - Lead clicks "Request Data from All"
   - Scouts receive popup to approve
   - Data transfers instantly over peer-to-peer channel

## User Workflow

### Lead Scout (1 device)

1. Navigate to "Data Transfer" → "Lead Scout Transfer"
2. Tap "I'm the Lead Scout"
3. **For each scout** (repeat 6 times):
   - Enter scout's name
   - Tap "Generate QR for [Scout Name]"
   - **Show QR to that scout**
   - Tap "Scan [Scout Name]'s Answer"
   - Point camera at scout's answer QR
   - Connection confirmed ✓
4. Once all scouts connected, tap "Request Data from All Scouts"
5. Data received automatically, displayed in log

### Regular Scout (6+ devices)

1. Navigate to "Data Transfer" → "Lead Scout Transfer"
2. Tap "I'm a Scout"
3. Enter your name
4. Tap "Scan Lead's QR Code"
5. **Point camera at lead's QR** (wait for your turn)
6. **Show your answer QR to lead scout**
7. Wait for connection confirmation (Ready ✓)
8. When lead requests data, tap "Send Data" in popup

## Technical Details

### WebRTC Configuration

```typescript
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
```

Uses Google's public STUN servers for NAT traversal (no internet required once connection established).

### Data Channel Setup

- **Channel Name**: `data`
- **Ordered**: Yes
- **Reliable**: Yes
- **Message Format**: JSON

### QR Code Format

- **Encoding**: JSON string of RTCSessionDescription
- **Error Correction**: Low (L) - faster scanning
- **Size**: 280x280 pixels
- **Margin**: Included

### State Management

The `useWebRTCQRTransfer` hook manages:

- **Role**: `'lead'` or `'scout'`
- **Connection State**: connecting, connected, ready
- **Connected Scouts**: Array of peer connections
- **Data Channels**: Open channels for each scout
- **Received Data**: Log of all received data

## Connection States

### Lead Scout States

1. **Not Started** → No role selected
2. **Generating** → Creating offer QR
3. **Showing Offer** → QR displayed for scouts to scan
4. **Scanning Answers** → Processing scout answer QRs
5. **Connected** → All scouts connected, ready to request data

### Scout States

1. **Not Started** → No role selected
2. **Ready to Scan** → Name entered, ready for lead's QR
3. **Generating Answer** → Creating answer QR after scanning offer
4. **Showing Answer** → QR displayed for lead to scan
5. **Connected** → Waiting for data requests

## Advantages

✅ **No Infrastructure**: Works without WiFi hotspots or routers  
✅ **Fully Offline**: No internet required at any point  
✅ **Automated Collection**: After setup, lead can request from all with one button  
✅ **Reliable**: WebRTC data channels guarantee delivery  
✅ **Fast**: Direct peer-to-peer, no intermediate hops  

## Limitations

⚠️ **Setup Time**: Requires 12 QR scans for 6 scouts (2 per scout: 1 offer + 1 answer)  
⚠️ **Camera Required**: All devices must have working cameras  
⚠️ **Manual Process**: QR scanning cannot be fully automated  
⚠️ **Same Session**: Scouts must reconnect each time lead starts new session  

## Troubleshooting

### "Invalid QR Code" Error

- Ensure QR is fully visible in camera frame
- Try different angles or lighting
- Verify QR is generated from current session (not old screenshot)

### Connection Doesn't Establish

- Check that scout's answer QR was scanned successfully
- Verify both devices showing "Ready" or "Connected" status
- Try resetting and rescanning if stuck

### Data Request Not Appearing

- Ensure data channel shows "Ready" status
- Check that scout hasn't closed/minimized the app
- Verify lead and scout are using same session

### Can't Scan QR Code

- Allow camera permissions in browser
- Try switching between front/back cameras
- Ensure adequate lighting
- Clean camera lens

## Performance

- **Setup Time**: ~60-90 seconds for 6 scouts (12 QR scans total)
- **Data Transfer**: Near-instant once connected
- **Reconnection**: Required each session (WebRTC connections don't persist)

## Comparison with Other Methods

| Method | Setup | Collection | Infrastructure | Reliability |
|--------|-------|------------|----------------|-------------|
| **QR Data** | None | Slow (scan each) | None | High |
| **Manual File Share** | None | Medium (6 shares) | None | High |
| **WebRTC + QR** | Medium (7 scans) | Fast (instant) | None | High |
| **HTTP Server** | Low | Fast (instant) | WiFi hotspot | Medium |

## Future Enhancements

- Persist connections between app launches
- Clipboard-based signaling alternative to QR
- Batch QR scanning (scan multiple at once)
- Automatic reconnection if connection drops
- Connection quality indicators

## Code Architecture

### Hook: `useWebRTCQRTransfer.ts`

Manages WebRTC peer connections, data channels, offer/answer exchange.

### Page: `PeerTransferPage.tsx`

UI for role selection, QR display/scanning, connection status, data transfer controls.

### Libraries

- `qrcode.react`: QR code generation
- `@yudiel/react-qr-scanner`: QR code scanning
- Native WebRTC APIs: Peer connections and data channels
