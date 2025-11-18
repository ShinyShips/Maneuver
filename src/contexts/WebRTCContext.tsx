/**
 * WebRTC Context - Maintains peer connections across the entire app
 * Connections persist even when navigating away from the transfer page
 */

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { DataFilters } from '@/lib/dataFiltering';

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

  // Cleanup
  disconnectScout: (scoutId: string) => void;
  disconnectAll: () => void;
}

const WebRTCContext = createContext<WebRTCContextValue | undefined>(undefined);

export function WebRTCProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'lead' | 'scout' | 'select'>('select');
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

  // Use refs to avoid stale closures
  const connectedScoutsRef = useRef<ConnectedScout[]>([]);
  const [connectedScouts, setConnectedScouts] = useState<ConnectedScout[]>([]);
  const pendingScoutsRef = useRef<Map<string, ConnectedScout>>(new Map());
  const scoutConnectionRef = useRef<RTCPeerConnection | null>(null);
  const scoutDataChannelRef = useRef<RTCDataChannel | null>(null);
  
  // Chunk reassembly storage
  const chunksRef = useRef<Map<string, { chunks: string[], totalChunks: number, scoutName: string, dataType?: TransferDataType }>>(new Map());

  // Update state when ref changes
  const updateConnectedScouts = useCallback(() => {
    setConnectedScouts([...connectedScoutsRef.current]);
  }, []);
  
  // Handle received message (with chunk reassembly)
  const handleReceivedMessage = useCallback((scoutName: string, rawMessage: string) => {
    try {
      const message = JSON.parse(rawMessage);
      console.log(`🔍 handleReceivedMessage from ${scoutName}, type: ${message.type}, dataType: ${message.dataType}`);
      
      // Skip request-data messages (these are for scouts, not leads)
      if (message.type === 'request-data') {
        return; // This is handled elsewhere
      }
      
      // Handle disconnected notification from lead
      if (message.type === 'disconnected') {
        console.log(`🔌 Lead has disconnected us`);
        // Emit event for PeerTransferPage to handle
        window.dispatchEvent(new CustomEvent('webrtc-disconnected-by-lead'));
        return;
      }
      
      // Handle request declined - just log it, PeerTransferPage will handle via event/toast
      if (message.type === 'request-declined') {
        console.log(`⛔ ${scoutName} declined data request`);
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
        console.log(`⛔ ${scoutName} declined pushed ${message.dataType || 'data'}`);
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
        console.log(`📦 Complete message dataType: ${message.dataType}`);
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
        
        console.log(`📦 Received chunk ${chunkIndex + 1}/${totalChunks} from ${scoutName}`);
        
        // Check if all chunks received
        const allReceived = transfer.chunks.every(c => c !== null);
        if (allReceived) {
          const completeData = transfer.chunks.join('');
          const parsedData = JSON.parse(completeData);
          
          // Check if this is a control message (like push-data)
          if (parsedData.type === 'push-data') {
            console.log(`📥 Reassembled push-data message: ${parsedData.dataType}`);
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
          console.log(`✅ Reassembled complete data from ${scoutName}`);
        }
      } else if (message.type) {
        // Unknown message type - log and ignore
        console.log(`⚠️ Unknown message type from ${scoutName}: ${message.type}`);
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
    const scoutId = crypto.randomUUID();
    const connection = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    
    console.log(`📡 Lead creating offer for scout: ${scoutName} (ID: ${scoutId})`);

    // Create data channel
    const dataChannel = connection.createDataChannel('scoutData');
    
    dataChannel.onopen = () => {
      console.log(`✅ Data channel opened for ${scoutName}`);
    };

    dataChannel.onmessage = (event) => {
      console.log(`📩 Received message from ${scoutName}`);
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
      console.log(`🔌 ${scoutName} ICE state: ${connection.iceConnectionState}`);
      const existingScout = connectedScoutsRef.current.find(s => s.id === scoutId);
      if (existingScout) {
        existingScout.status = connection.iceConnectionState === 'connected' ? 'connected' : 'connecting';
        updateConnectedScouts();
      }
    };

    connection.onconnectionstatechange = () => {
      console.log(`🔗 ${scoutName} Connection state: ${connection.connectionState}`);
      if (connection.connectionState === 'disconnected' || connection.connectionState === 'failed') {
        // Remove from connected scouts
        connectedScoutsRef.current = connectedScoutsRef.current.filter(s => s.id !== scoutId);
        updateConnectedScouts();
      }
    };

    // Create offer
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    // Wait for ICE gathering with timeout
    // In offline mode (no STUN), we only need local candidates which gather quickly
    await new Promise<void>((resolve) => {
      if (connection.iceGatheringState === 'complete') {
        console.log('✅ Lead ICE gathering already complete');
        resolve();
      } else {
        const timeout = setTimeout(() => {
          console.log(`⏱️ Lead ICE gathering timeout (state: ${connection.iceGatheringState}) - proceeding with available candidates`);
          connection.onicegatheringstatechange = null;
          resolve();
        }, 1000); // Reduced to 1 second for local-only candidates
        
        connection.onicegatheringstatechange = () => {
          console.log(`🧊 Lead ICE gathering state: ${connection.iceGatheringState}`);
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
    console.log(`✅ Offer created for ${scoutName}, size: ${offerString.length} chars`);

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
          const transferId = crypto.randomUUID();
          
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
        const transferId = crypto.randomUUID();
        
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
    
    // Save connection info for auto-reconnect
    setLastScoutName(scoutName);
    setLastOffer(offerString);
    localStorage.setItem('webrtc_last_connection', JSON.stringify({
      scoutName,
      offer: offerString,
      timestamp: Date.now()
    }));
    
    // Clean up any existing connection
    if (scoutConnectionRef.current) {
      scoutConnectionRef.current.close();
    }

    const connection = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    scoutConnectionRef.current = connection;

    connection.oniceconnectionstatechange = () => {
      setConnectionStatus(`ICE: ${connection.iceConnectionState}`);
      console.log(`🔌 Scout ICE state: ${connection.iceConnectionState}`);
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
        const transferId = crypto.randomUUID();
        
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
    console.log('🔌 Disconnecting all connections...');
    
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
