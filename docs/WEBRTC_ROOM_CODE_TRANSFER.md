# WebRTC Room Code Transfer - Lead Scout Data Transfer

## Overview

This system enables fast peer-to-peer data transfer between scout tablets using WebRTC with room code signaling. Requires internet connectivity (WiFi or cellular) for initial connection, then uses direct peer-to-peer channels for data transfer.

## How It Works

### Technology Stack

- **WebRTC**: Peer-to-peer data channels for direct device-to-device communication
- **Room Codes**: 6-digit codes for easy connection setup (replaces QR scanning)
- **Netlify Signaling Server**: Facilitates WebRTC connection establishment and auto-reconnect
- **Data Channels**: Reliable ordered data transfer once connection is established

### Connection Process

1. **Lead Scout Generates Room Code**
   - Creates WebRTC peer connection
   - Generates 6-digit numeric room code (e.g., "123456")
   - Displays code prominently for scouts to enter

2. **Scouts Join Room**
   - Each scout enters the 6-digit room code
   - Enters their name
   - Signaling server exchanges offers/answers automatically
   - Connection established via WebRTC data channel

3. **Auto-Reconnect**
   - Room code persists across page navigation
   - If disconnected, scouts auto-rejoin the room
   - Lead sees scouts reconnect automatically
   - No need to re-enter codes

4. **Data Transfer**
   - Lead clicks "Request Data from All" or "Push Data to All"
   - Scouts receive popup to approve
   - Data transfers instantly over peer-to-peer channel
   - Multiple scouts can be served simultaneously

## User Workflow

### Lead Scout (1 device)

1. Navigate to "Data Transfer" → "WiFi Transfer"
2. Tap "I'm the Lead Scout"
3. Tap "Generate Room Code"
4. **Share the 6-digit code** with all scouts (verbally, text message, or show on screen)
5. Wait for scouts to join (they appear as connected cards)
6. Once scouts connected, use:
   - "Request Data from All" - Pull data from scouts
   - "Push Data to All" - Send data to scouts (match schedules, profiles, etc.)
7. Connection persists - scouts can navigate away and stay connected
8. If disconnected, scouts auto-reconnect when you reopen the page

### Regular Scout (6+ devices)

1. Navigate to "Data Transfer" → "WiFi Transfer"
2. Tap "I'm a Scout"
3. Enter the 6-digit room code from lead
4. Enter your name
5. Tap "Join Room"
6. Wait for connection confirmation (Connected ✓)
7. **You can now navigate to other pages** - connection stays active
8. When lead requests/pushes data, approve in popup dialog
9. If disconnected, the app auto-reconnects in the background

## Technical Details

### WebRTC Configuration

```typescript
const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
```

Uses Google's public STUN servers for NAT traversal. Internet connection required for signaling.

### Room Code Format

- **Length**: 6 digits
- **Characters**: Numbers only (0-9)
- **Example**: `123456`, `789012`, `456789`
- **Persistence**: Stored in localStorage for auto-reconnect
- **Expiry**: Cleared when user manually disconnects or generates new code

### Data Channel Setup

- **Channel Name**: `data`
- **Ordered**: Yes
- **Reliable**: Yes
- **Message Format**: JSON (with chunking for large data)
- **Chunk Size**: 15KB (to avoid message size limits)

### State Management

The WebRTC Context manages:

- **Mode**: `'select'`, `'lead'`, or `'scout'`
- **Room Code**: 6-digit code for the session
- **Connection State**: connecting, connected, disconnected, failed
- **Connected Scouts**: Array of peer connections with metadata
- **Auto-Reconnect**: Monitors connection state and triggers reconnection
- **Received Data**: Log of all received data
- **Global Persistence**: Connections persist across page navigation

## Connection States

### Lead Scout States

1. **Not Started** → No role selected
2. **Generating** → Creating room code
3. **Waiting for Scouts** → Room code displayed, waiting for scouts to join
4. **Connected** → Scouts connected, ready to request/push data
5. **Disconnected** → Network issues, will auto-reconnect

### Scout States

1. **Not Started** → No role selected
2. **Entering Code** → Input room code and name
3. **Connecting** → Joining room, establishing WebRTC connection
4. **Connected** → Waiting for data requests/pushes
5. **Disconnected** → Network issues, auto-reconnecting in background

## Advantages

✅ **Fast Setup**: Enter 6-digit code, no QR scanning needed  
✅ **Auto-Reconnect**: Connections persist across page navigation and disconnects  
✅ **Global State**: Stay connected while using other app features  
✅ **Bulk Transfers**: Push data to multiple scouts simultaneously  
✅ **Automated Collection**: Request from all scouts with one button  
✅ **Reliable**: WebRTC data channels with chunking for large data  
✅ **Fast**: Direct peer-to-peer after initial signaling  
✅ **Easy Sharing**: Room codes can be shared verbally, via text, or displayed  

## Limitations

⚠️ **Internet Required**: All devices need WiFi or cellular data for signaling and NAT traversal  
⚠️ **Fallback Available**: Use QR Code transfer method when no network available  

## Troubleshooting

### "Connection Timeout" Error

- Verify all devices have internet connectivity (WiFi or cellular)
- Check that room code was entered correctly
- Try generating a new room code if timeout persists
- Timeout is 30 seconds - may need patience on slow networks

### Connection Doesn't Establish

- Ensure all devices have active internet connection
- Verify room code matches exactly (case-sensitive)
- Check browser console for WebRTC errors
- Try refreshing both lead and scout devices

### Data Request Not Appearing

- Check that connection shows "Connected" status on scout card
- Scout may need to approve popup - check for blocked popups
- Verify scout hasn't force-closed the app
- Connection persists across navigation, so scout can be on any page

### Auto-Reconnect Not Working

- Check internet connectivity on both devices
- Verify room code is still saved (check localStorage)
- Lead may need to reopen the page to trigger scout announcements
- Wait up to 30 seconds for reconnection attempt

### Scout Disconnected After Lead Navigation

- This is expected - scouts auto-reconnect when lead returns
- Lead should wait a few seconds after returning for scouts to announce
- If scouts don't reconnect, they can refresh their page
- Connection state persists globally

## Performance

- **Setup Time**: ~10-15 seconds for 6 scouts (just enter code once)
- **Data Transfer**: Near-instant once connected via peer-to-peer
- **Reconnection**: Automatic, takes 5-10 seconds after disconnect
- **Persistence**: Connections survive page navigation and refreshes

## Comparison with Other Methods

| Method | Setup | Collection | Infrastructure | Reliability | Reconnect |
|--------|-------|------------|----------------|-------------|-----------|
| **QR Data** | None | Slow (scan each) | None | High | N/A |
| **Manual File Share** | None | Medium (6 shares) | None | High | N/A |
| **WebRTC + Room Code** | Fast (enter code) | Fast (instant bulk) | Internet | High | Auto |

## Implemented Features ✅

✅ Room code based connections (replaces QR scanning)  
✅ Automatic reconnection on disconnect  
✅ Global connection state (persists across navigation)  
✅ Bulk data push to multiple scouts  
✅ Connection timeout with 30s countdown  
✅ Toast notifications for connection status  
✅ Scout re-announcement when lead rejoins  
✅ Duplicate connection prevention  
✅ Targeted messaging to prevent cross-scout interference  

## Code Architecture

### Context: `WebRTCContext.tsx`

Global WebRTC state management, connection lifecycle, auto-reconnect logic.

### Hook: `useWebRTCSignaling.ts`

Manages communication with Netlify signaling server, message polling.

### Page: `PeerTransferPage.tsx`

UI for role selection, room code input/display, connection status, data transfer controls.

### Components

- `RoomCodeConnection.tsx`: Room code input and connection UI
- `LeadScoutMode.tsx`: Lead scout interface with connected scout cards
- `ScoutMode.tsx`: Scout interface showing connection status
- `ConnectedScoutCard.tsx`: Displays connected scout with actions

### Netlify Function: `webrtc-signal.ts`

Serverless signaling server for WebRTC offer/answer/ICE exchange and room management.

### Libraries

- Native WebRTC APIs: Peer connections and data channels
- Sonner: Toast notifications
- shadcn/ui: UI components
