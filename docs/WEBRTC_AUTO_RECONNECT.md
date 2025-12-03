# WebRTC Auto-Reconnection with Netlify Signaling

## Overview
This implements automatic reconnection for WebRTC peer connections using a Netlify Function as a signaling server.

## Architecture

### Initial Connection (Room Code - Requires Internet)
1. Lead generates 6-digit room code
2. Scouts enter room code and name
3. Signaling server exchanges offers/answers automatically
4. WebRTC peer connections established
5. Room code saved in localStorage for reconnection

### Auto-Reconnection (Signaling Server - Requires Internet)
1. When ICE connection goes to `disconnected` or `failed`:
   - Both sides detect the disconnection
   - Both sides join the signaling room using the saved room code
   - Lead creates a new offer and sends via signaling server
   - Scout receives offer, creates answer, sends via signaling server
   - Connection re-established automatically
   
2. When lead navigates away and returns:
   - Scouts detect they're still in the room
   - Scouts send "scout-announce" message with name
   - Lead sees scout announcements and recreates connections
   - All scouts auto-reconnect without re-entering code

3. No manual reconnection needed!

## Components

### 1. Netlify Function (`netlify/functions/webrtc-signal.ts`)
- Simple HTTP polling-based signaling
- Stores messages in memory (ephemeral is fine)
- Endpoints:
  - `POST` - Send signaling messages (offer/answer/ICE/join/leave)
  - `GET` - Poll for new messages

### 2. Client Hook (`src/hooks/useWebRTCSignaling.ts`)
- Manages connection to signaling server
- Polls for messages every 2 seconds
- Sends offers/answers/ICE candidates
- Handles room join/leave

### 3. Integration with WebRTCContext
Need to add:
- Generate room code from initial connection
- Monitor ICE connection state
- Trigger auto-reconnection when disconnected
- Use signaling for offer/answer exchange during reconnection

## Room Code Generation
Lead generates a random 6-digit numeric code:
```typescript
function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
```
Examples: `123456`, `789012`, `456789`

Both lead and scout use this numeric room code for the signaling server.

## Benefits
- ✅ Simple room code entry for initial connection
- ✅ Auto-reconnection via signaling server
- ✅ No manual re-entry of room code after first connection
- ✅ Serverless - scales automatically with Netlify
- ✅ Minimal backend complexity

## Implementation Status

✅ TypeScript errors fixed in signaling files
✅ Room code generation integrated into WebRTCContext  
✅ ICE connection state monitoring added (both lead and scout)
✅ Auto-reconnect flag set when connection drops
✅ 30-second grace period before removing disconnected scouts

## Usage Example

### In PeerTransferPage or other component:

```typescript
import { useWebRTCSignaling } from '@/hooks/useWebRTCSignaling';

const {
  mode,
  roomCode,
  shouldAttemptReconnect,
  lastScoutName,
  startAsScout
} = useWebRTC();

// Use signaling when room code is available
const signaling = useWebRTCSignaling({
  roomId: roomCode,
  peerId: crypto.randomUUID(), // or use saved ID
  peerName: lastScoutName || 'Scout',
  role: mode === 'lead' ? 'lead' : 'scout',
  enabled: !!roomCode,
  onMessage: (message) => {
    if (message.type === 'offer' && mode === 'scout') {
      // Scout received new offer - create answer
      startAsScout(lastScoutName!, JSON.stringify(message.data));
    }
    // Handle other message types...
  }
});

// When shouldAttemptReconnect is true, use signaling to reconnect
useEffect(() => {
  if (shouldAttemptReconnect && roomCode && signaling.connected) {
    // Trigger reconnection via signaling server
    console.log('🔄 Initiating auto-reconnect via signaling');
  }
}, [shouldAttemptReconnect, roomCode, signaling.connected]);
```

## Testing Steps
1. Run `npm run dev` (uses netlify dev)
2. Open two browser windows
3. Connect lead and scout via room code
4. Simulate network interruption (browser DevTools → Network → Offline)
5. Re-enable network
6. Observe auto-reconnection
