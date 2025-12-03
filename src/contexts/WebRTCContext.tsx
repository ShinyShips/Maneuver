/**
 * WebRTC Context - Maintains peer connections across the entire app
 * Connections persist even when navigating away from the transfer page
 */

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { DataFilters } from '@/lib/dataFiltering';
import { useWebRTCSignaling } from '@/hooks/useWebRTCSignaling';

// Utility: Generate UUID with fallback for non-secure contexts
function generateUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && 
        crypto.randomUUID && 
        typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    console.warn('crypto.randomUUID not available, using fallback');
  }
  
  // Fallback for non-secure contexts (HTTP, older browsers)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Configuration
// STUN servers help with NAT traversal on shared networks like venue WiFi
// All devices must be on the same network (e.g., event WiFi)
const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

// Data types that can be transferred
export type TransferDataType = 'scouting' | 'pit-scouting' | 'match' | 'scout' | 'combined';

// Types
export interface ConnectedScout {
  id: string;
  name: string;
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  channel: RTCDataChannel | null; // Alias for backward compatibility
  status: 'connecting' | 'connected' | 'disconnected';
  offer: string; // Add offer field for compatibility
  signalingPeerId?: string; // Signaling server peerId for targeting messages
}

export interface ReceivedData {
  scoutName: string;
  data: unknown;
  timestamp: number;
  dataType?: TransferDataType; // Track what type of data was received
}

interface WebRTCContextValue {
  // Mode
  mode: 'lead' | 'scout' | 'select';
  setMode: (mode: 'lead' | 'scout' | 'select') => void;

  // Lead functionality
  connectedScouts: ConnectedScout[];
  createOfferForScout: (scoutName: string) => Promise<{ scoutId: string; offer: string }>;
  processScoutAnswer: (scoutId: string, answerString: string) => Promise<void>;
  requestDataFromAll: (filters?: DataFilters, dataType?: TransferDataType) => void;
  requestDataFromScout: (scoutId: string, filters?: DataFilters, dataType?: TransferDataType) => void;
  pushDataToAll: (data: unknown, dataType: TransferDataType) => void;
  pushDataToScout: (scoutId: string, data: unknown, dataType: TransferDataType) => void;
  receivedData: ReceivedData[];
  clearReceivedData: () => void;
  addToReceivedData: (entry: ReceivedData) => void;

  // Scout functionality
  startAsScout: (scoutName: string, offerString: string) => Promise<string>;
  requestFilters: DataFilters | null;
  requestDataType: TransferDataType | null;
  sendData: (data: unknown, dataType?: TransferDataType) => void;
  sendControlMessage: (message: { type: string; [key: string]: unknown }) => void;
  dataRequested: boolean;
  setDataRequested: (requested: boolean) => void;
  dataPushed: boolean; // Lead pushing data to scout
  setDataPushed: (pushed: boolean) => void;
  pushedData: unknown | null; // Data pushed from lead
  pushedDataType: TransferDataType | null;
  connectionStatus: string;

  // Auto-reconnect
  shouldAttemptReconnect: boolean;
  setShouldAttemptReconnect: (should: boolean) => void;
  lastScoutName: string | null;
  lastOffer: string | null;
  roomCode: string | null; // Room code for signaling server
  setRoomCode: (code: string | null) => void;
  generateRoomCodeForLead: () => string;
  
  // Signaling (persistent across navigation)
  signaling: {
    connected: boolean;
    error: string | null;
    join: () => Promise<void>;
    leave: () => Promise<void>;
    sendOffer: (offer: RTCSessionDescriptionInit) => Promise<void>;
    sendAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
    sendIceCandidate: (candidate: RTCIceCandidate) => Promise<void>;
  } | null;

  // Cleanup
  disconnectScout: (scoutId: string) => void;
  disconnectAll: () => void;
}

const WebRTCContext = createContext<WebRTCContextValue | undefined>(undefined);

export function WebRTCProvider({ children }: { children: ReactNode }) {
  // Persist mode to localStorage so it survives navigation
  const [mode, setModeState] = useState<'lead' | 'scout' | 'select'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('webrtc_mode');
      console.log('🎯 Restoring mode on mount:', saved);
      if (saved === 'lead' || saved === 'scout') {
        return saved;
      }
    }
    return 'select';
  });

  const setMode = useCallback((newMode: 'lead' | 'scout' | 'select') => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('webrtc_mode', newMode);
    }
  }, []);
  const [receivedData, setReceivedData] = useState<ReceivedData[]>([]);
  const [dataRequested, setDataRequested] = useState(false);
  const [requestFilters, setRequestFilters] = useState<DataFilters | null>(null);
  const [requestDataType, setRequestDataType] = useState<TransferDataType | null>(null);
  const [dataPushed, setDataPushed] = useState(false);
  const [pushedData, setPushedData] = useState<unknown | null>(null);
  const [pushedDataType, setPushedDataType] = useState<TransferDataType | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Not connected');
  
  // Auto-reconnect state
  const [shouldAttemptReconnect, setShouldAttemptReconnect] = useState(false);
  const reconnectAttemptRef = useRef(false);
  const [lastScoutName, setLastScoutName] = useState<string | null>(null);
  const [lastOffer, setLastOffer] = useState<string | null>(null);
  
  // Room code for persistent connections - restored from localStorage on mount
  const [roomCode, setRoomCodeState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      // Check mode to determine which storage key to use
      const savedMode = localStorage.getItem('webrtc_mode');
      const storageKey = savedMode === 'scout' ? 'webrtc_scout_room_code' : 'webrtc_room_code';
      const saved = localStorage.getItem(storageKey);
      
      console.log('🔑 Restoring room code on mount:', { savedMode, storageKey, saved });
      
      // Validate: must be a 6-digit number, not a UUID
      if (saved && /^\d{6}$/.test(saved)) {
        console.log('✅ Room code restored:', saved);
        return saved;
      }
      // Clear invalid/old format room codes
      if (saved) {
        console.log('❌ Invalid room code format, clearing:', saved);
        localStorage.removeItem(storageKey);
      }
    }
    return null;
  });

  // Wrapper to persist room code to localStorage (mode-aware)
  const setRoomCode = useCallback((code: string | null) => {
    setRoomCodeState(code);
    if (typeof window !== 'undefined') {
      // Lead uses 'webrtc_room_code', Scout uses 'webrtc_scout_room_code'
      const storageKey = mode === 'scout' ? 'webrtc_scout_room_code' : 'webrtc_room_code';
      if (code) {
        localStorage.setItem(storageKey, code);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }, [mode]);

  // Sync room code when mode changes (load from correct storage key)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageKey = mode === 'scout' ? 'webrtc_scout_room_code' : 'webrtc_room_code';
      const saved = localStorage.getItem(storageKey);
      if (saved && /^\d{6}$/.test(saved)) {
        setRoomCodeState(saved);
      } else if (mode === 'select') {
        // Clear room code when returning to select mode
        setRoomCodeState(null);
      }
    }
  }, [mode]);

  // Generate a new room code for the lead
  const generateRoomCodeForLead = useCallback(() => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomCode(code);
    console.log('🔑 Generated new room code:', code);
    return code;
  }, [setRoomCode]);

  // Use refs to avoid stale closures
  const connectedScoutsRef = useRef<ConnectedScout[]>([]);
  const [connectedScouts, setConnectedScouts] = useState<ConnectedScout[]>([]);
  const pendingScoutsRef = useRef<Map<string, ConnectedScout>>(new Map());
  const scoutConnectionRef = useRef<RTCPeerConnection | null>(null);
  const scoutDataChannelRef = useRef<RTCDataChannel | null>(null);
  const leadPeerIdRef = useRef<string | null>(null); // Track lead's signaling peerId
  
  // Buffer for ICE candidates that arrive before connections are ready
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map()); // peerId -> candidates[]
  
  // Chunk reassembly storage
  const chunksRef = useRef<Map<string, { chunks: string[], totalChunks: number, scoutName: string, dataType?: TransferDataType }>>(new Map());

  // Unique peer ID for this session (tab/window)
  // Generate fresh each time to support multiple scouts from same device
  const [peerId] = useState(() => generateUUID());

  // Display name for signaling
  const displayName = mode === 'lead' ? 'Lead Scout' : (() => {
    const scoutName = typeof window !== 'undefined' ? localStorage.getItem('scoutName') : null;
    const playerStation = typeof window !== 'undefined' ? localStorage.getItem('playerStation') : null;
    return scoutName && playerStation ? `${scoutName} (${playerStation})` : 'Scout';
  })();

  // Update state when ref changes
  const updateConnectedScouts = useCallback(() => {
    setConnectedScouts([...connectedScoutsRef.current]);
  }, []);
  
  // Handle received message (with chunk reassembly)
  const handleReceivedMessage = useCallback((scoutName: string, rawMessage: string) => {
    try {
      const message = JSON.parse(rawMessage);
      
      // Skip request-data messages (these are for scouts, not leads)
      if (message.type === 'request-data') {
        return; // This is handled elsewhere
      }
      
      // Handle disconnected notification from lead
      if (message.type === 'disconnected') {
        // Emit event for PeerTransferPage to handle
        window.dispatchEvent(new CustomEvent('webrtc-disconnected-by-lead'));
        return;
      }
      
      // Handle request declined - just log it, PeerTransferPage will handle via event/toast
      if (message.type === 'request-declined') {
        // Store the decline so we can show it in the UI
        setReceivedData(prev => [...prev, {
          scoutName,
          data: { type: 'declined' },
          timestamp: Date.now()
        }]);
        return;
      }
      
      // Handle push declined
      if (message.type === 'push-declined') {
        // Store the decline so we can show it in the UI
        setReceivedData(prev => [...prev, {
          scoutName,
          data: { type: 'push-declined', dataType: message.dataType },
          timestamp: Date.now()
        }]);
        return;
      }
      
      if (message.type === 'complete') {
        // Single complete message
        const data = JSON.parse(message.data);
        setReceivedData(prev => [...prev, { 
          scoutName, 
          data, 
          dataType: message.dataType,
          timestamp: Date.now() 
        }]);
      } else if (message.type === 'chunk') {
        // Chunked message - reassemble
        const { transferId, chunkIndex, totalChunks, data, dataType } = message;
        
        if (!chunksRef.current.has(transferId)) {
          chunksRef.current.set(transferId, { 
            chunks: new Array(totalChunks).fill(null), 
            totalChunks,
            scoutName,
            dataType
          });
        }
        
        const transfer = chunksRef.current.get(transferId)!;
        transfer.chunks[chunkIndex] = data;
        
        // Check if all chunks received
        const allReceived = transfer.chunks.every(c => c !== null);
        if (allReceived) {
          const completeData = transfer.chunks.join('');
          const parsedData = JSON.parse(completeData);
          
          // Check if this is a control message (like push-data)
          if (parsedData.type === 'push-data') {
            setPushedData(parsedData.data);
            setPushedDataType(parsedData.dataType);
            setDataPushed(true);
          } else {
            // Regular data transfer
            setReceivedData(prev => [...prev, { 
              scoutName, 
              data: parsedData,
              dataType: transfer.dataType,
              timestamp: Date.now() 
            }]);
          }
          
          chunksRef.current.delete(transferId);
        }
      } else if (message.type) {
        // Unknown message type - ignore
        if (import.meta.env.DEV) {
          console.log(`⚠️ Unknown message type from ${scoutName}: ${message.type}`);
        }
      } else {
        // Legacy format (no type field) - assume complete data
        setReceivedData(prev => [...prev, { 
          scoutName, 
          data: message, 
          timestamp: Date.now() 
        }]);
      }
    } catch (err) {
      console.error('Failed to parse received data:', err);
      console.error('Raw message length:', rawMessage.length);
      console.error('Raw message preview:', rawMessage.substring(0, 200));
    }
  }, []);

  // LEAD: Create offer for a specific scout
  const createOfferForScout = useCallback(async (scoutName: string): Promise<{ scoutId: string; offer: string }> => {
    const scoutId = generateUUID();
    const connection = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    
    console.log(`📡 Lead creating offer for scout: ${scoutName} (ID: ${scoutId})`);

    // Send ICE candidates to scout via signaling
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        // Look up the scout to get their signaling peerId
        const scout = pendingScoutsRef.current.get(scoutId) || connectedScoutsRef.current.find(s => s.id === scoutId);
        if (scout?.signalingPeerId) {
          console.log('🧊 Lead: Sending ICE candidate to scout', scout.name, 'targetPeerId:', scout.signalingPeerId);
          signalingRef.current?.sendIceCandidate(event.candidate, scout.signalingPeerId);
        } else {
          console.warn('⚠️ Lead: Cannot send ICE candidate, scout signalingPeerId not known yet');
        }
      }
    };

    // Create data channel
    const dataChannel = connection.createDataChannel('scoutData');
    
    dataChannel.onopen = () => {
      console.log(`✅ Data channel opened for scout: ${scoutName}`);
      
      // Move scout from pending to connected
      const pendingScout = pendingScoutsRef.current.get(scoutId);
      if (pendingScout) {
        pendingScout.status = 'connected';
        connectedScoutsRef.current.push(pendingScout);
        pendingScoutsRef.current.delete(scoutId);
        updateConnectedScouts();
        console.log(`✅ Scout ${scoutName} moved to connected list`);
      }
    };

    dataChannel.onmessage = (event) => {
      handleReceivedMessage(scoutName, event.data);
    };

    // Store in pending map (not connected yet)
    const scout: ConnectedScout = {
      id: scoutId,
      name: scoutName,
      connection,
      dataChannel,
      channel: dataChannel, // Alias for backward compatibility
      status: 'connecting',
      offer: '' // Will be set below
    };
    pendingScoutsRef.current.set(scoutId, scout);

    // Monitor connection state
    connection.oniceconnectionstatechange = () => {
      const state = connection.iceConnectionState;
      const existingScout = connectedScoutsRef.current.find(s => s.id === scoutId);
      if (existingScout) {
        existingScout.status = state === 'connected' ? 'connected' : 'connecting';
        updateConnectedScouts();
        
        // Detect disconnection - mark scout as disconnected but keep in list
        if (state === 'disconnected' || state === 'failed') {
          existingScout.status = 'disconnected';
          updateConnectedScouts();
        }
      }
    };

    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      
      // Only remove scout after extended disconnection (30 seconds)
      // This gives time for auto-reconnect to work
      if (state === 'disconnected' || state === 'failed') {
        setTimeout(() => {
          // Check if still disconnected after timeout
          if (connection.connectionState === 'disconnected' || connection.connectionState === 'failed') {
            connectedScoutsRef.current = connectedScoutsRef.current.filter(s => s.id !== scoutId);
            updateConnectedScouts();
          }
        }, 30000); // 30 second grace period for reconnection
      }
    };

    // Create offer
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    // Wait for ICE gathering with timeout
    // In offline mode (no STUN), we only need local candidates which gather quickly
    await new Promise<void>((resolve) => {
      if (connection.iceGatheringState === 'complete') {
        resolve();
      } else {
        const timeout = setTimeout(() => {
          connection.onicegatheringstatechange = null;
          resolve();
        }, 1000); // Reduced to 1 second for local-only candidates
        
        connection.onicegatheringstatechange = () => {
          if (connection.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            connection.onicegatheringstatechange = null;
            resolve();
          }
        };
      }
    });

    const offerString = JSON.stringify(connection.localDescription);
    scout.offer = offerString;

    return { scoutId, offer: offerString };
  }, [updateConnectedScouts, handleReceivedMessage]);

  // LEAD: Process answer from scout
  const processScoutAnswer = useCallback(async (scoutId: string, answerString: string): Promise<void> => {
    console.log(`📥 Processing answer for scout ID: ${scoutId}`);
    
    const scout = pendingScoutsRef.current.get(scoutId);
    if (!scout) {
      throw new Error(`No pending scout found with ID: ${scoutId}`);
    }

    if (scout.connection.signalingState === 'closed') {
      throw new Error('Connection is closed');
    }

    const answer: RTCSessionDescriptionInit = JSON.parse(answerString);
    await scout.connection.setRemoteDescription(answer);
    
    // Move from pending to connected
    pendingScoutsRef.current.delete(scoutId);
    connectedScoutsRef.current.push(scout);
    updateConnectedScouts();
    
    console.log(`✅ Scout ${scout.name} connected successfully`);
  }, [updateConnectedScouts]);

  // LEAD: Request data from all connected scouts
  const requestDataFromAll = useCallback((filters?: DataFilters, dataType?: TransferDataType) => {
    console.log(`📤 Requesting ${dataType || 'scouting'} data from ${connectedScoutsRef.current.length} scouts...`);
    if (filters) {
      console.log('📋 With filters:', filters);
    }
    
    // Don't clear received data - we handle avoiding reprocessing via importedDataCount
    // Clearing here removes the transfer history which we want to keep
    
    // Store filters and data type so scouts can access them
    setRequestFilters(filters || null);
    setRequestDataType(dataType || 'scouting');
    
    connectedScoutsRef.current.forEach(scout => {
      if (scout.dataChannel && scout.dataChannel.readyState === 'open') {
        console.log(`📤 Sending ${dataType || 'scouting'} request to ${scout.name}`);
        scout.dataChannel.send(JSON.stringify({ 
          type: 'request-data',
          filters: filters || null,
          dataType: dataType || 'scouting'
        }));
      } else {
        console.warn(`⚠️ Data channel not open for ${scout.name}`);
      }
    });
  }, []);

  // LEAD: Request data from a specific scout
  const requestDataFromScout = useCallback((scoutId: string, filters?: DataFilters, dataType?: TransferDataType) => {
    const scout = connectedScoutsRef.current.find(s => s.id === scoutId);
    if (!scout) {
      console.error(`❌ Scout ${scoutId} not found`);
      return;
    }

    console.log(`📤 Requesting ${dataType || 'scouting'} data from ${scout.name}...`);
    if (filters) {
      console.log('📋 With filters:', filters);
    }

    if (scout.dataChannel && scout.dataChannel.readyState === 'open') {
      scout.dataChannel.send(JSON.stringify({ 
        type: 'request-data',
        filters: filters || null,
        dataType: dataType || 'scouting'
      }));
    } else {
      console.warn(`⚠️ Data channel not open for ${scout.name}`);
    }
  }, []);

  // LEAD: Push data to all connected scouts
  const pushDataToAll = useCallback((data: unknown, dataType: TransferDataType) => {
    console.log(`📤 Pushing ${dataType} data to ${connectedScoutsRef.current.length} scouts...`);
    
    const dataString = JSON.stringify({ 
      type: 'push-data',
      dataType,
      data
    });
    const CHUNK_SIZE = 16000;

    connectedScoutsRef.current.forEach(scout => {
      if (scout.dataChannel && scout.dataChannel.readyState === 'open') {
        console.log(`📤 Pushing ${dataType} data to ${scout.name}`);
        
        if (dataString.length <= CHUNK_SIZE) {
          scout.dataChannel.send(dataString);
        } else {
          // Send as chunks
          const chunks = Math.ceil(dataString.length / CHUNK_SIZE);
          const transferId = generateUUID();
          
          for (let i = 0; i < chunks; i++) {
            const chunk = dataString.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            scout.dataChannel.send(JSON.stringify({
              type: 'chunk',
              transferId,
              chunkIndex: i,
              totalChunks: chunks,
              data: chunk,
              dataType
            }));
          }
        }
      } else {
        console.warn(`⚠️ Data channel not open for ${scout.name}`);
      }
    });
  }, []);

  // LEAD: Push data to a specific scout
  const pushDataToScout = useCallback((scoutId: string, data: unknown, dataType: TransferDataType) => {
    const scout = connectedScoutsRef.current.find(s => s.id === scoutId);
    if (!scout) {
      console.error(`❌ Scout ${scoutId} not found`);
      return;
    }

    console.log(`📤 Pushing ${dataType} data to ${scout.name}...`);
    
    const dataString = JSON.stringify({ 
      type: 'push-data',
      dataType,
      data
    });
    const CHUNK_SIZE = 16000;

    if (scout.dataChannel && scout.dataChannel.readyState === 'open') {
      if (dataString.length <= CHUNK_SIZE) {
        scout.dataChannel.send(dataString);
      } else {
        // Send as chunks
        const chunks = Math.ceil(dataString.length / CHUNK_SIZE);
        const transferId = generateUUID();
        
        for (let i = 0; i < chunks; i++) {
          const chunk = dataString.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          scout.dataChannel.send(JSON.stringify({
            type: 'chunk',
            transferId,
            chunkIndex: i,
            totalChunks: chunks,
            data: chunk,
            dataType
          }));
        }
      }
    } else {
      console.warn(`⚠️ Data channel not open for ${scout.name}`);
    }
  }, []);

  // SCOUT: Process offer and create answer
  const startAsScout = useCallback(async (scoutName: string, offerString: string): Promise<string> => {
    console.log(`📡 Scout ${scoutName} processing offer...`);
    
    // Set mode to scout
    setMode('scout');
    
    // Save connection info for auto-reconnect
    setLastScoutName(scoutName);
    setLastOffer(offerString);
    localStorage.setItem('webrtc_last_connection', JSON.stringify({
      scoutName,
      offer: offerString,
      roomCode: roomCode, // Use existing room code from context
      timestamp: Date.now()
    }));
    
    // Clean up any existing connection
    if (scoutConnectionRef.current) {
      scoutConnectionRef.current.close();
    }

    const connection = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    scoutConnectionRef.current = connection;

    // Send ICE candidates to lead via signaling
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 Scout: Sending ICE candidate to lead, targetPeerId:', leadPeerIdRef.current);
        signalingRef.current?.sendIceCandidate(event.candidate, leadPeerIdRef.current || undefined);
      }
    };

    connection.oniceconnectionstatechange = () => {
      const state = connection.iceConnectionState;
      setConnectionStatus(`ICE: ${state}`);
      console.log(`🔌 Scout ICE state: ${state}`);
      
      // Detect disconnection for auto-reconnect
      if (state === 'disconnected' || state === 'failed') {
        console.log('🔄 Connection lost - auto-reconnect available');
        // Set flag to enable reconnection UI
        setShouldAttemptReconnect(true);
      } else if (state === 'connected') {
        // Clear reconnect flag when successfully connected
        setShouldAttemptReconnect(false);
        reconnectAttemptRef.current = false;
      }
    };

    connection.onconnectionstatechange = () => {
      setConnectionStatus(`Connection: ${connection.connectionState}`);
      console.log(`🔗 Scout connection state: ${connection.connectionState}`);
    };

    // Handle incoming data channel
    connection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      scoutDataChannelRef.current = dataChannel;
      console.log('📨 Scout received data channel');

      dataChannel.onopen = () => {
        setConnectionStatus('Connected - Ready to send data');
        console.log('✅ Scout data channel opened');
      };

      dataChannel.onmessage = (event) => {
        console.log('📩 Scout received message');
        
        // Try to parse as control message first
        try {
          const message = JSON.parse(event.data);
          
          // Handle data request from lead
          if (message.type === 'request-data') {
            console.log(`📥 Lead is requesting ${message.dataType || 'scouting'} data`);
            if (message.filters) {
              console.log('📋 With filters:', message.filters);
              setRequestFilters(message.filters);
            } else {
              setRequestFilters(null);
            }
            setRequestDataType(message.dataType || 'scouting');
            setDataRequested(true);
            return; // Control message handled
          }
          
          // Handle data push from lead
          if (message.type === 'push-data') {
            console.log(`📥 Lead is pushing ${message.dataType} data`);
            setPushedData(message.data);
            setPushedDataType(message.dataType);
            setDataPushed(true);
            return; // Control message handled
          }
        } catch {
          // Not a control message, could be data - ignore parse error
        }
        
        // Forward all other messages to handleReceivedMessage for chunk reassembly
        handleReceivedMessage('lead', event.data);
      };
    };

    // Set remote description (offer)
    const offer: RTCSessionDescriptionInit = JSON.parse(offerString);
    await connection.setRemoteDescription(offer);

    // Process any buffered ICE candidates now that remote description is set
    const bufferKey = 'scout-buffer';
    const bufferedCandidates = pendingIceCandidatesRef.current.get(bufferKey);
    if (bufferedCandidates && bufferedCandidates.length > 0) {
      console.log(`📦 Context: Processing ${bufferedCandidates.length} buffered ICE candidates`);
      for (const candidateInit of bufferedCandidates) {
        try {
          await connection.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (err) {
          console.error('❌ Failed to add buffered ICE candidate:', err);
        }
      }
      pendingIceCandidatesRef.current.delete(bufferKey);
      console.log('✅ Context: All buffered ICE candidates processed');
    }

    // Create answer
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);

    // Wait for ICE gathering with timeout
    // In offline mode (no STUN), we only need local candidates which gather quickly
    await new Promise<void>((resolve) => {
      if (connection.iceGatheringState === 'complete') {
        console.log('✅ Scout ICE gathering already complete');
        resolve();
      } else {
        const timeout = setTimeout(() => {
          console.log(`⏱️ Scout ICE gathering timeout (state: ${connection.iceGatheringState}) - proceeding with available candidates`);
          connection.onicegatheringstatechange = null;
          resolve();
        }, 1000); // Reduced to 1 second for local-only candidates
        
        connection.onicegatheringstatechange = () => {
          console.log(`🧊 Scout ICE gathering state: ${connection.iceGatheringState}`);
          if (connection.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            connection.onicegatheringstatechange = null;
            resolve();
          }
        };
      }
    });

    const answerString = JSON.stringify(connection.localDescription);
    console.log(`✅ Answer created, size: ${answerString.length} chars`);

    return answerString;
  }, []);

  // SCOUT: Send a simple control message (like decline)
  const sendControlMessage = useCallback((message: { type: string; [key: string]: unknown }) => {
    const dataChannel = scoutDataChannelRef.current;
    
    if (!dataChannel || dataChannel.readyState !== 'open') {
      console.warn('Cannot send control message - data channel not open');
      return;
    }
    
    try {
      dataChannel.send(JSON.stringify(message));
      console.log('📤 Sent control message:', message.type);
    } catch (err) {
      console.error('Failed to send control message:', err);
    }
  }, []);

  // SCOUT: Send data to lead
  const sendData = useCallback((data: unknown, dataType?: TransferDataType) => {
    const dataChannel = scoutDataChannelRef.current;
    
    if (!dataChannel) {
      const error = 'ERROR: No data channel exists. Please scan the QR code from the lead scout first.';
      console.error('❌', error);
      alert(error);
      return;
    }
    
    if (dataChannel.readyState !== 'open') {
      const error = `ERROR: Data channel state is "${dataChannel.readyState}". Expected "open". Try reconnecting.`;
      console.error('❌', error);
      alert(error);
      return;
    }

    try {
      const dataString = JSON.stringify(data);
      const CHUNK_SIZE = 15000; // 15KB chunks to leave room for JSON wrapper overhead
      
      console.log(`📤 Scout sending ${dataType || 'data'}, size: ${dataString.length} chars`);
      
      if (dataString.length <= CHUNK_SIZE) {
        // Small enough to send directly
        dataChannel.send(JSON.stringify({ type: 'complete', data: dataString, dataType }));
        console.log('✅ Data sent successfully (single message)');
      } else {
        // Split into chunks
        const totalChunks = Math.ceil(dataString.length / CHUNK_SIZE);
        const transferId = generateUUID();
        
        console.log(`📦 Splitting into ${totalChunks} chunks`);
        
        for (let i = 0; i < totalChunks; i++) {
          const chunk = dataString.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          const message = JSON.stringify({
            type: 'chunk',
            transferId,
            chunkIndex: i,
            totalChunks,
            data: chunk,
            dataType
          });
          dataChannel.send(message);
          console.log(`📦 Sent chunk ${i + 1}/${totalChunks}`);
        }
        
        console.log('✅ All chunks sent successfully');
      }
    } catch (err) {
      const error = `ERROR sending data: ${err instanceof Error ? err.message : String(err)}`;
      console.error('❌', error);
      alert(error);
    }
  }, []);

  // Clear received data (called after successful import)
  const clearReceivedData = useCallback(() => {
    console.log('🧹 Clearing received data');
    setReceivedData([]);
  }, []);

  // Add entry to received data (for tracking pushes)
  const addToReceivedData = useCallback((entry: ReceivedData) => {
    setReceivedData(prev => [...prev, entry]);
  }, []);

  // Disconnect a specific scout
  const disconnectScout = useCallback((scoutId: string) => {
    console.log(`🔌 Disconnecting scout ${scoutId}...`);
    const scout = connectedScoutsRef.current.find(s => s.id === scoutId);
    if (scout) {
      // Send disconnect notification before closing
      if (scout.dataChannel?.readyState === 'open') {
        scout.dataChannel.send(JSON.stringify({ type: 'disconnected' }));
      }
      scout.connection.close();
      scout.dataChannel?.close();
      connectedScoutsRef.current = connectedScoutsRef.current.filter(s => s.id !== scoutId);
      updateConnectedScouts();
    }
  }, [updateConnectedScouts]);

  // Disconnect all connections
  const disconnectAll = useCallback(() => {
    // console.log('🔌 Disconnecting all connections...');
    
    // Close all lead connections
    connectedScoutsRef.current.forEach(scout => {
      scout.connection.close();
      scout.dataChannel?.close();
    });
    connectedScoutsRef.current = [];
    updateConnectedScouts();
    
    pendingScoutsRef.current.clear();

    // Close scout connection
    if (scoutConnectionRef.current) {
      scoutConnectionRef.current.close();
      scoutConnectionRef.current = null;
    }
    if (scoutDataChannelRef.current) {
      scoutDataChannelRef.current.close();
      scoutDataChannelRef.current = null;
    }

    setConnectionStatus('Not connected');
    setDataRequested(false);
    setReceivedData([]);
  }, [updateConnectedScouts]);

  // Auto-reconnect: Save connection info when scout connects
  useEffect(() => {
    if (mode === 'scout' && connectionStatus.includes('Connected')) {
      // Save connection info for auto-reconnect
      const connectionInfo = {
        mode: 'scout',
        timestamp: Date.now(),
        status: connectionStatus
      };
      localStorage.setItem('webrtc_connection_info', JSON.stringify(connectionInfo));
      console.log('💾 Saved connection info for auto-reconnect');
    }
  }, [mode, connectionStatus]);

  // Auto-reconnect: Detect when user returns and reconnect if needed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👀 App became visible');
        
        // Check if we should attempt reconnect
        const savedInfo = localStorage.getItem('webrtc_connection_info');
        if (!savedInfo) return;
        
        try {
          const connectionInfo = JSON.parse(savedInfo);
          
          // Only attempt reconnect if:
          // 1. We were in scout mode
          // 2. Connection was lost
          // 3. Haven't already attempted reconnect recently
          const timeSinceLastConnection = Date.now() - connectionInfo.timestamp;
          const shouldReconnect = 
            connectionInfo.mode === 'scout' &&
            mode === 'scout' &&
            !connectionStatus.includes('Connected') &&
            timeSinceLastConnection < 30 * 60 * 1000 && // Within last 30 minutes
            !reconnectAttemptRef.current;
          
          if (shouldReconnect) {
            console.log('🔄 Attempting auto-reconnect...');
            reconnectAttemptRef.current = true;
            setShouldAttemptReconnect(true);
            
            // Reset the flag after 5 seconds to allow another attempt if this fails
            setTimeout(() => {
              reconnectAttemptRef.current = false;
            }, 5000);
          }
        } catch (err) {
          console.error('Failed to parse connection info:', err);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mode, connectionStatus]);

  // Cleanup on unmount (only if app is closing)
  useEffect(() => {
    return () => {
      // Only disconnect if the app is actually unmounting
      // Don't disconnect on route changes
      console.log('📍 WebRTC Context cleanup (keeping connections alive)');
    };
  }, []);

  // Store function refs to avoid circular dependencies in signaling callback
  const createOfferRef = useRef(createOfferForScout);
  const processAnswerRef = useRef(processScoutAnswer);
  const startAsScoutRef = useRef(startAsScout);
  
  useEffect(() => {
    createOfferRef.current = createOfferForScout;
    processAnswerRef.current = processScoutAnswer;
    startAsScoutRef.current = startAsScout;
  }, [createOfferForScout, processScoutAnswer, startAsScout]);

  // Persistent signaling - stays alive across navigation
  const signalingEnabled = mode !== 'select' && !!roomCode;
  const signalingRoomId = roomCode || '';
  
  // Ref to store signaling instance to avoid circular dependency
  const signalingRef = useRef<ReturnType<typeof useWebRTCSignaling> | null>(null);
  
  const signaling = useWebRTCSignaling({
    roomId: signalingRoomId,
    peerId,
    peerName: displayName,
    role: mode === 'select' ? 'scout' : mode,
    enabled: signalingEnabled,
    onMessage: useCallback(async (message: { type: string; role?: string; peerId: string; peerName?: string; data?: unknown }) => {
      try {
        console.log('📨 Context signaling message:', message.type, 'from', message.peerName, '| My mode:', mode, '| Message role:', message.role);
        
        if (mode === 'lead' && message.type === 'join' && message.role === 'scout') {
          // Scout joined - create offer
          console.log('👑 Context: Scout joined, creating offer');
          const { scoutId, offer } = await createOfferRef.current(message.peerName || 'Scout');
          
          // Store mapping by signaling peerId for ICE candidate lookup
          // Scout is currently in pendingScoutsRef with scoutId as key
          const scout = pendingScoutsRef.current.get(scoutId);
          if (scout) {
            // Store the signaling peerId in the scout object
            scout.signalingPeerId = message.peerId;
            // Also store by signaling peerId so we can find it when ICE candidates arrive
            pendingScoutsRef.current.set(message.peerId, scout);
            console.log(`✅ Stored scout mapping: peerId ${message.peerId} -> scoutId ${scoutId}`);
          } else {
            console.error('❌ Could not find scout with scoutId:', scoutId);
          }
          
          console.log('📤 Context: Sending offer to scout with peerId:', message.peerId);
          if (!signalingRef.current) {
            console.error('❌ Signaling not available to send offer!');
            return;
          }
          // Send offer targeted to this specific scout's peerId
          await signalingRef.current.sendOffer(JSON.parse(offer), message.peerId);
          console.log('✅ Context: Offer sent to scout');
        }

        if (mode === 'lead' && message.type === 'answer') {
          // Process scout's answer
          console.log('📥 Context: Received answer from scout');
          const scout = pendingScoutsRef.current.get(message.peerId);
          if (scout) {
            console.log(`✅ Context: Processing answer for scout ${scout.name}`);
            await processAnswerRef.current(scout.id, JSON.stringify(message.data));
            pendingScoutsRef.current.delete(message.peerId);
            console.log('✅ Context: Answer processed, connection should establish');
          } else {
            console.warn('⚠️ Context: Received answer but no pending scout found for peerId:', message.peerId);
          }
        }

        if (mode === 'scout' && message.type === 'offer') {
          // Scout received offer - create answer
          console.log('📱 Context: Scout received offer from lead peerId:', message.peerId);
          // Store lead's peerId for targeting ICE candidates
          leadPeerIdRef.current = message.peerId;
          const answer = await startAsScoutRef.current(displayName, JSON.stringify(message.data));
          console.log('📤 Context: Sending answer back to lead...');
          
          if (!signalingRef.current) {
            console.error('❌ Signaling not available to send answer!');
            return;
          }
          
          // Send answer targeted to the lead's peerId
          await signalingRef.current.sendAnswer(JSON.parse(answer), message.peerId);
          console.log('✅ Context: Answer sent to lead');
        }

        if (message.type === 'ice-candidate') {
          // Received ICE candidate from peer
          console.log('🧊 Context: Received ICE candidate from', message.peerName, 'peerId:', message.peerId, 'mode:', mode);
          
          try {
            const candidate = new RTCIceCandidate(message.data as RTCIceCandidateInit);
            console.log('🧊 Context: ICE candidate created successfully');
            
            if (mode === 'lead') {
              console.log('🧊 Context: Lead mode - looking for scout connection...');
              console.log('Pending scouts:', Array.from(pendingScoutsRef.current.keys()));
              console.log('Connected scouts:', connectedScoutsRef.current.map(s => ({ id: s.id, name: s.name })));
              
              // Add to scout connection - check pending first, then connected
              console.log(`🔍 Looking up scout with peerId: ${message.peerId}`);
              let scout = pendingScoutsRef.current.get(message.peerId);
              console.log('📍 Found in pending?', !!scout);
              
              if (!scout) {
                // Also check by matching peerId to connected scouts
                console.log('🔍 Checking connected scouts...');
                scout = connectedScoutsRef.current.find(s => s.id === message.peerId);
                console.log('📍 Found in connected?', !!scout);
              }
              
              if (scout) {
                console.log(`✅ Scout found: ${scout.name}, connection exists: ${!!scout.connection}`);
              }
              
              if (scout?.connection) {
                console.log(`✅ Context: Adding ICE candidate to scout ${scout.name} (signaling state: ${scout.connection.signalingState})`);
                // Check if remote description is set
                if (scout.connection.remoteDescription) {
                  await scout.connection.addIceCandidate(candidate);
                  console.log('✅ Context: ICE candidate added successfully');
                } else {
                  console.warn('⚠️ Context: Remote description not set yet, cannot add ICE candidate');
                }
              } else {
                console.warn(`⚠️ Context: No scout connection found for peerId ${message.peerId}`);
                console.warn(`Pending scouts:`, Array.from(pendingScoutsRef.current.keys()));
                console.warn(`Connected scouts:`, connectedScoutsRef.current.map(s => s.id));
              }
            } else if (mode === 'scout') {
              // Add to scout's own connection
              if (scoutConnectionRef.current && scoutConnectionRef.current.remoteDescription) {
                console.log(`✅ Context: Adding ICE candidate (signaling state: ${scoutConnectionRef.current.signalingState})`);
                await scoutConnectionRef.current.addIceCandidate(candidate);
                console.log('✅ Context: ICE candidate added successfully');
              } else {
                // Buffer ICE candidate until connection is ready
                console.log('📦 Context: Buffering ICE candidate (connection not ready yet)');
                const bufferKey = 'scout-buffer'; // Scout only connects to one lead at a time
                if (!pendingIceCandidatesRef.current.has(bufferKey)) {
                  pendingIceCandidatesRef.current.set(bufferKey, []);
                }
                pendingIceCandidatesRef.current.get(bufferKey)!.push(message.data as RTCIceCandidateInit);
                console.log(`📦 Context: ${pendingIceCandidatesRef.current.get(bufferKey)!.length} candidates buffered`);
              }
            }
          } catch (err) {
            console.error('❌ Failed to add ICE candidate:', err);
          }
        }
      } catch (err) {
        console.error('❌ Context signaling error:', err);
      }
    }, [mode, displayName]),
  });
  
  // Store signaling in ref
  signalingRef.current = signaling;

  // Global auto-reconnect for scouts with saved room code
  // This allows scouts to automatically reconnect even when on other pages
  const hasAutoJoinedRef = useRef(false);
  useEffect(() => {
    // Only auto-join for scouts with a saved room code who aren't already connected
    if (mode === 'scout' && roomCode && signaling && !signaling.connected && !hasAutoJoinedRef.current) {
      const savedRoomCode = localStorage.getItem('webrtc_scout_room_code');
      if (savedRoomCode === roomCode) {
        console.log('🔄 Context: Auto-joining room', roomCode, 'from any page');
        hasAutoJoinedRef.current = true;
        // Small delay to ensure signaling is ready
        setTimeout(() => {
          signaling.join().catch(err => {
            console.error('❌ Auto-join failed:', err);
            hasAutoJoinedRef.current = false; // Allow retry
          });
        }, 500);
      }
    }
    
    // Reset flag when disconnecting or changing modes
    if (mode !== 'scout' || !roomCode) {
      hasAutoJoinedRef.current = false;
    }
  }, [mode, roomCode, signaling]);

  const value: WebRTCContextValue = {
    mode,
    setMode,
    connectedScouts,
    createOfferForScout,
    processScoutAnswer,
    requestDataFromAll,
    requestDataFromScout,
    pushDataToAll,
    pushDataToScout,
    receivedData,
    clearReceivedData,
    addToReceivedData,
    startAsScout,
    sendData,
    sendControlMessage,
    dataRequested,
    setDataRequested,
    dataPushed,
    setDataPushed,
    pushedData,
    pushedDataType,
    requestFilters,
    requestDataType,
    connectionStatus,
    shouldAttemptReconnect,
    setShouldAttemptReconnect,
    lastScoutName,
    lastOffer,
    roomCode,
    setRoomCode,
    generateRoomCodeForLead,
    signaling: signaling ? {
      connected: signaling.connected,
      error: signaling.error,
      join: signaling.join,
      leave: signaling.leave,
      sendOffer: signaling.sendOffer,
      sendAnswer: signaling.sendAnswer,
      sendIceCandidate: signaling.sendIceCandidate,
    } : null,
    disconnectScout,
    disconnectAll
  };

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTC() {
  const context = useContext(WebRTCContext);
  if (context === undefined) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
}
