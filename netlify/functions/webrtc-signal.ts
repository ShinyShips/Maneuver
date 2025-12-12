/**
 * WebRTC Signaling Server for Netlify Functions
 * Handles offer/answer exchange and ICE candidates for auto-reconnection
 */

import type { Handler, HandlerEvent } from '@netlify/functions';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join' | 'leave' | 'ping';
  roomId?: string;
  peerId?: string;
  peerName?: string;
  role?: 'lead' | 'scout';
  targetPeerId?: string; // Optional: specify which peer should receive this message
  data?: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, unknown>;
  deliveredTo?: Set<string>; // Track which peers have received this message
}

interface Room {
  id: string;
  lead?: {
    id: string;
    name: string;
    lastSeen: number;
  };
  scouts: Map<string, {
    id: string;
    name: string;
    lastSeen: number;
  }>;
  messages: SignalingMessage[];
  createdAt: number;
}

// In-memory storage (resets on cold start, but that's OK for signaling)
const rooms = new Map<string, Room>();

// Clean up old rooms every 30 minutes
const ROOM_TIMEOUT = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_TIMEOUT) {
      rooms.delete(roomId);
      console.log(`🧹 Cleaned up room: ${roomId}`);
    }
  }
}, ROOM_TIMEOUT);

export const handler: Handler = async (event: HandlerEvent) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'POST') {
      // Handle signaling messages
      console.log(`📨 POST request received, body length: ${event.body?.length || 0}`);
      
      let message: SignalingMessage;
      try {
        message = JSON.parse(event.body || '{}');
      } catch (parseErr) {
        console.error(`❌ Failed to parse JSON:`, parseErr);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON' }),
        };
      }
      
      const { type, roomId, peerId, peerName, role, data } = message;

      console.log(`📨 POST parsed: ${type} from ${role} ${peerName} (peerId: ${peerId}) in room ${roomId}`);

      // Handle ping (availability check)
      if (type === 'ping') {
        console.log('🏓 Ping received, responding with pong');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ pong: true }),
        };
      }

      if (!roomId || !peerId) {
        console.error(`❌ Bad request - roomId: ${roomId}, peerId: ${peerId}, type: ${type}, role: ${role}`);
        console.error(`❌ Full message:`, message);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing roomId or peerId', received: { roomId, peerId, type, role } }),
        };
      }

      // Get or create room
      let room = rooms.get(roomId);
      if (!room) {
        room = {
          id: roomId,
          scouts: new Map(),
          messages: [],
          createdAt: Date.now(),
        };
        rooms.set(roomId, room);
        console.log(`🆕 Created room: ${roomId}`);
      }

      const now = Date.now();

      // Handle different message types
      switch (type) {
        case 'join':
          if (role === 'lead') {
            room.lead = { id: peerId, name: peerName || 'Lead', lastSeen: now };
            console.log(`👑 Lead joined room ${roomId}: ${peerName} (peerId: ${peerId})`);
          } else if (role === 'scout') {
            room.scouts.set(peerId, { id: peerId, name: peerName || 'Scout', lastSeen: now });
            console.log(`🔍 Scout joined room ${roomId}: ${peerName} (peerId: ${peerId})`);
          }
          // Store the join message for others to see
          room.messages.push({ ...message, data, deliveredTo: new Set() });
          console.log(`💾 Stored ${type} message from ${peerId} (role: ${role}), total messages: ${room.messages.length}`);
          console.log(`   Room state: lead=${room.lead?.id}, scouts=${Array.from(room.scouts.keys()).join(',')}`);
          break;

        case 'leave':
          if (role === 'lead') {
            room.lead = undefined;
          } else {
            room.scouts.delete(peerId);
          }
          console.log(`👋 ${role} left room ${roomId}: ${peerId}`);
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Store the message for retrieval
          room.messages.push({ ...message, data, deliveredTo: new Set() });
          console.log(`📨 ${type} from ${peerId} in room ${roomId}`);
          break;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, room: {
          id: room.id,
          leadConnected: !!room.lead,
          scoutCount: room.scouts.size,
        }}),
      };
    }

    if (event.httpMethod === 'GET') {
      // Poll for messages
      const roomId = event.queryStringParameters?.roomId;
      const peerId = event.queryStringParameters?.peerId;

      if (!roomId || !peerId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing roomId or peerId' }),
        };
      }

      const room = rooms.get(roomId);
      if (!room) {
        // Return empty messages instead of 404 - room might not be created yet
        console.log(`⏳ Room ${roomId} not found during poll, returning empty (room may not be created yet)`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            messages: [],
            room: {
              id: roomId,
              leadConnected: false,
              scoutCount: 0,
              scouts: [],
            },
          }),
        };
      }

      // Get messages for this peer (messages from others, not from self)
      const messages = room.messages.filter((msg) => {
        const isOwnMessage = msg.peerId === peerId;
        const alreadyDelivered = msg.deliveredTo?.has(peerId);
        const isTargetedToSomeoneElse = msg.targetPeerId && msg.targetPeerId !== peerId;
        const shouldInclude = !isOwnMessage && !alreadyDelivered && !isTargetedToSomeoneElse;
        
        if (!shouldInclude) {
          console.log(`   ⏭️ Skipping ${msg.type} from ${msg.peerId}: own=${isOwnMessage}, delivered=${alreadyDelivered}, wrongTarget=${isTargetedToSomeoneElse}`);
        }
        
        return shouldInclude;
      });

      console.log(`📬 Peer ${peerId} polling - Room has ${room.messages.length} total messages`);
      console.log(`   Found ${messages.length} messages for this peer: ${messages.map(m => `${m.type}(from:${m.peerId})`).join(', ')}`);
      if (room.messages.length > 0) {
        console.log(`   All messages in room:`, room.messages.map(m => `${m.type}(from:${m.peerId},deliveredTo:${m.deliveredTo?.size || 0},hasThisPeer:${m.deliveredTo?.has(peerId)})`));
      }

      // Mark messages as delivered to this peer
      messages.forEach(msg => {
        if (!msg.deliveredTo) {
          msg.deliveredTo = new Set();
        }
        msg.deliveredTo.add(peerId);
        console.log(`   ✅ Marked ${msg.type} from ${msg.peerId} as delivered to ${peerId}`);
      });

      // Clean up messages that have been delivered to ALL relevant peers
      // A message is fully delivered when:
      // - For join messages: delivered to the lead (if role is scout) or to all scouts (if role is lead)
      // - For offer/answer/ice-candidate: delivered to the intended recipient
      const beforeCleanup = room.messages.length;
      room.messages = room.messages.filter((msg) => {
        if (!msg.deliveredTo) {
          console.log(`   ⚠️ Message ${msg.type} from ${msg.peerId} has no deliveredTo tracking - keeping it`);
          return true; // Keep if no delivery tracking
        }
        
        // For join messages from scout: keep until lead has received it
        if (msg.type === 'join' && msg.role === 'scout') {
          const shouldKeep = !room.lead || !msg.deliveredTo?.has(room.lead.id);
          console.log(`   Join from scout ${msg.peerId}: lead=${room.lead?.id}, delivered=${msg.deliveredTo.has(room.lead?.id || '')}, keeping=${shouldKeep}`);
          return shouldKeep;
        }
        
        // For join messages from lead: keep until all scouts have received it
        if (msg.type === 'join' && msg.role === 'lead') {
          const shouldKeep = Array.from(room.scouts.keys()).some(scoutId => !msg.deliveredTo?.has(scoutId));
          console.log(`   Join from lead ${msg.peerId}: scouts=${room.scouts.size}, keeping=${shouldKeep}`);
          return shouldKeep;
        }
        
        // For offer/answer/ice-candidate: these are targeted, keep until delivered once to someone other than sender
        // Clean up after being delivered to at least one other peer
        const shouldKeep = msg.deliveredTo.size <= 1; // Size 1 = only sender marked, not delivered to others yet
        console.log(`   ${msg.type} from ${msg.peerId}: deliveredTo.size=${msg.deliveredTo.size}, keeping=${shouldKeep}`);
        return shouldKeep;
      });
      const afterCleanup = room.messages.length;
      if (beforeCleanup !== afterCleanup) {
        console.log(`🗑️ Cleaned up ${beforeCleanup - afterCleanup} fully delivered messages, ${afterCleanup} remaining`);
      }


      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          messages,
          room: {
            id: room.id,
            leadConnected: !!room.lead,
            scoutCount: room.scouts.size,
            scouts: Array.from(room.scouts.values()).map(s => ({ id: s.id, name: s.name })),
          },
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Signaling error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
