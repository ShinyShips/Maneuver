/**
 * WebRTC QR Transfer Hook - Context Wrapper for Persistent Connections
 * Wraps the WebRTCContext to provide backward-compatible interface
 * Connections persist across route changes
 */

import { useState } from 'react';
import { useWebRTC } from '@/contexts/WebRTCContext';

export type Role = 'lead' | 'scout';

// Map context types to hook types
export interface ConnectedScout {
  id: string;
  name: string;
  connection: RTCPeerConnection;
  channel: RTCDataChannel | null;
  offer: string;
}

export interface ReceivedData {
  scoutName: string;
  timestamp: Date;
  data: unknown;
}

interface UseWebRTCQRTransferReturn {
  // State
  role: Role | null;
  isConnecting: boolean;
  connectedScouts: ConnectedScout[];
  receivedData: ReceivedData[];
  connectionStatus: string;
  
  // Scout-specific state
  scoutAnswer: string | null;
  scoutOfferReceived: boolean;
  dataRequestPending: boolean;
  requestingScoutName: string | null;
  
  // Actions
  startAsLead: () => void;
  createOfferForScout: (scoutName: string) => Promise<{ scoutId: string; offer: string }>;
  processScoutAnswer: (scoutId: string, answer: string) => Promise<void>;
  startAsScout: (scoutName: string, offer: string) => Promise<void>;
  requestDataFromScout: (scoutId: string) => void;
  requestDataFromAll: () => void;
  sendData: (data: unknown) => void;
  reset: () => void;
}

export function useWebRTCQRTransfer(): UseWebRTCQRTransferReturn {
  const context = useWebRTC();
  const [scoutAnswer, setScoutAnswer] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [scoutOfferReceived, setScoutOfferReceived] = useState(false);

  // Map context scouts to hook scouts format
  const connectedScouts: ConnectedScout[] = context.connectedScouts.map(scout => ({
    id: scout.id,
    name: scout.name,
    connection: scout.connection,
    channel: scout.dataChannel,
    offer: scout.offer
  }));

  // Map context received data to hook format (convert timestamp from number to Date)
  const receivedData: ReceivedData[] = context.receivedData.map(data => ({
    scoutName: data.scoutName,
    timestamp: new Date(data.timestamp),
    data: data.data
  }));

  // Determine role from mode
  const role: Role | null = context.mode === 'select' ? null : context.mode;

  // Check if scout is connected (data channel is open)
  // This updates scoutOfferReceived when connection is established
  if (context.mode === 'scout' && context.connectionStatus.includes('Connected') && !scoutOfferReceived) {
    setScoutOfferReceived(true);
  }

  // Start as lead
  const startAsLead = () => {
    context.setMode('lead');
  };

  // Create offer wraps context method
  const createOfferForScout = async (scoutName: string): Promise<{ scoutId: string; offer: string }> => {
    setIsConnecting(true);
    try {
      const result = await context.createOfferForScout(scoutName);
      return result;
    } finally {
      setIsConnecting(false);
    }
  };

  // Process answer wraps context method  
  const processScoutAnswer = async (scoutId: string, answer: string): Promise<void> => {
    await context.processScoutAnswer(scoutId, answer);
  };

  // Start as scout wraps context method
  const startAsScout = async (scoutName: string, offer: string): Promise<void> => {
    setIsConnecting(true);
    context.setMode('scout');
    try {
      const answer = await context.startAsScout(scoutName, offer);
      setScoutAnswer(answer);
    } finally {
      setIsConnecting(false);
    }
  };

  // Request data from specific scout
  const requestDataFromScout = (scoutId: string) => {
    console.log(`📤 Requesting data from scout ID: ${scoutId}`);
    const scout = context.connectedScouts.find(s => s.id === scoutId);
    if (!scout) {
      console.error(`❌ Scout not found: ${scoutId}`);
      return;
    }
    if (scout.dataChannel && scout.dataChannel.readyState === 'open') {
      console.log(`📤 Sending request to ${scout.name}`);
      scout.dataChannel.send(JSON.stringify({ type: 'request-data' }));
    } else {
      console.warn(`⚠️ Data channel not open for ${scout.name}, state: ${scout.dataChannel?.readyState}`);
    }
  };

  // Request from all wraps context method
  const requestDataFromAll = () => {
    context.requestDataFromAll();
  };

  // Send data wraps context method
  const sendData = (data: unknown) => {
    context.sendData(data);
    context.setDataRequested(false);
  };

  // Reset wraps context methods
  const reset = () => {
    context.disconnectAll();
    context.setMode('select');
    setScoutAnswer(null);
    setIsConnecting(false);
    setScoutOfferReceived(false);
  };

  return {
    role,
    isConnecting,
    connectedScouts,
    receivedData,
    connectionStatus: context.connectionStatus,
    scoutAnswer,
    scoutOfferReceived,
    dataRequestPending: context.dataRequested,
    requestingScoutName: 'Lead Scout',
    startAsLead,
    createOfferForScout,
    processScoutAnswer,
    startAsScout,
    requestDataFromScout,
    requestDataFromAll,
    sendData,
    reset,
  };
}
