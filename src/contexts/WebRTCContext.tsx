/**
 * WebRTC Context - Maintains peer connections across the entire app
 * Connections persist even when navigating away from the transfer page
 */

import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

// Configuration
const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

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
}

interface WebRTCContextValue {
  // Mode
  mode: 'lead' | 'scout' | 'select';
  setMode: (mode: 'lead' | 'scout' | 'select') => void;

  // Lead functionality
  connectedScouts: ConnectedScout[];
  createOfferForScout: (scoutName: string) => Promise<{ scoutId: string; offer: string }>;
  processScoutAnswer: (scoutId: string, answerString: string) => Promise<void>;
  requestDataFromAll: () => void;
  receivedData: ReceivedData[];

  // Scout functionality
  startAsScout: (scoutName: string, offerString: string) => Promise<string>;
  sendData: (data: unknown) => void;
  dataRequested: boolean;
  setDataRequested: (requested: boolean) => void;
  connectionStatus: string;

  // Cleanup
  disconnectAll: () => void;
}

const WebRTCContext = createContext<WebRTCContextValue | undefined>(undefined);

export function WebRTCProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'lead' | 'scout' | 'select'>('select');
  const [receivedData, setReceivedData] = useState<ReceivedData[]>([]);
  const [dataRequested, setDataRequested] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Not connected');

  // Use refs to avoid stale closures
  const connectedScoutsRef = useRef<ConnectedScout[]>([]);
  const [connectedScouts, setConnectedScouts] = useState<ConnectedScout[]>([]);
  const pendingScoutsRef = useRef<Map<string, ConnectedScout>>(new Map());
  const scoutConnectionRef = useRef<RTCPeerConnection | null>(null);
  const scoutDataChannelRef = useRef<RTCDataChannel | null>(null);

  // Update state when ref changes
  const updateConnectedScouts = useCallback(() => {
    setConnectedScouts([...connectedScoutsRef.current]);
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
      console.log(`📩 Received data from ${scoutName}:`, event.data);
      try {
        const data = JSON.parse(event.data);
        setReceivedData(prev => [...prev, { 
          scoutName, 
          data, 
          timestamp: Date.now() 
        }]);
      } catch (err) {
        console.error('Failed to parse received data:', err);
      }
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
    await new Promise<void>((resolve) => {
      if (connection.iceGatheringState === 'complete') {
        resolve();
      } else {
        let timeout: NodeJS.Timeout;
        const handler = () => {
          if (connection.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve();
          }
        };
        connection.onicegatheringstatechange = handler;
        
        // Timeout after 3 seconds - offline mode doesn't need STUN servers
        timeout = setTimeout(() => {
          console.log('⏱️ Lead ICE gathering timeout - proceeding with local candidates only');
          connection.onicegatheringstatechange = null;
          resolve();
        }, 3000);
      }
    });

    const offerString = JSON.stringify(connection.localDescription);
    scout.offer = offerString;
    console.log(`✅ Offer created for ${scoutName}, size: ${offerString.length} chars`);

    return { scoutId, offer: offerString };
  }, [updateConnectedScouts]);

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
  const requestDataFromAll = useCallback(() => {
    console.log(`📤 Requesting data from ${connectedScoutsRef.current.length} scouts...`);
    
    connectedScoutsRef.current.forEach(scout => {
      if (scout.dataChannel && scout.dataChannel.readyState === 'open') {
        console.log(`📤 Sending request to ${scout.name}`);
        scout.dataChannel.send(JSON.stringify({ type: 'request-data' }));
      } else {
        console.warn(`⚠️ Data channel not open for ${scout.name}`);
      }
    });
  }, []);

  // SCOUT: Process offer and create answer
  const startAsScout = useCallback(async (scoutName: string, offerString: string): Promise<string> => {
    console.log(`📡 Scout ${scoutName} processing offer...`);
    
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
        console.log('📩 Scout received message:', event.data);
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'request-data') {
            console.log('📥 Lead is requesting data');
            setDataRequested(true);
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };
    };

    // Set remote description (offer)
    const offer: RTCSessionDescriptionInit = JSON.parse(offerString);
    await connection.setRemoteDescription(offer);

    // Create answer
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);

    // Wait for ICE gathering with timeout
    await new Promise<void>((resolve) => {
      if (connection.iceGatheringState === 'complete') {
        resolve();
      } else {
        let timeout: NodeJS.Timeout;
        const handler = () => {
          if (connection.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve();
          }
        };
        connection.onicegatheringstatechange = handler;
        
        // Timeout after 3 seconds - offline mode doesn't need STUN servers
        timeout = setTimeout(() => {
          console.log('⏱️ ICE gathering timeout - proceeding with local candidates only');
          connection.onicegatheringstatechange = null;
          resolve();
        }, 3000);
      }
    });

    const answerString = JSON.stringify(connection.localDescription);
    console.log(`✅ Answer created, size: ${answerString.length} chars`);

    return answerString;
  }, []);

  // SCOUT: Send data to lead
  const sendData = useCallback((data: unknown) => {
    const dataChannel = scoutDataChannelRef.current;
    if (!dataChannel || dataChannel.readyState !== 'open') {
      console.error('❌ Data channel not open');
      alert('Not connected to lead scout. Please scan QR code first.');
      return;
    }

    const dataString = JSON.stringify(data);
    console.log(`📤 Scout sending data, size: ${dataString.length} chars`);
    dataChannel.send(dataString);
    console.log('✅ Data sent successfully');
  }, []);

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
    receivedData,
    startAsScout,
    sendData,
    dataRequested,
    setDataRequested,
    connectionStatus,
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
