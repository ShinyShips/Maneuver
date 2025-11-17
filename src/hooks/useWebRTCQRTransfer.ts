/**
 * useWebRTCQRTransfer - Wrapper hook for WebRTC context with state management
 * Provides a simplified interface for the peer transfer page
 */

import { useState, useCallback } from 'react';
import { useWebRTC } from '@/contexts/WebRTCContext';

export function useWebRTCQRTransfer() {
  const context = useWebRTC();
  const [scoutAnswer, setScoutAnswer] = useState<string | null>(null);
  
  // Wrap startAsScout to capture the answer and set mode
  const startAsScout = useCallback(async (scoutName: string, offerString: string) => {
    context.setMode('scout'); // Set mode to scout before processing
    const answer = await context.startAsScout(scoutName, offerString);
    setScoutAnswer(answer);
    return answer;
  }, [context]);
  
  return {
    // Mode
    role: context.mode === 'scout' ? 'scout' : context.mode === 'lead' ? 'lead' : null,
    
    // Lead functionality
    connectedScouts: context.connectedScouts,
    receivedData: context.receivedData,
    clearReceivedData: context.clearReceivedData,
    isConnecting: false, // Not tracking this state anymore
    
    // Scout functionality  
    connectionStatus: context.connectionStatus,
    scoutAnswer,
    scoutOfferReceived: context.mode === 'scout' && context.connectionStatus.includes('Connected'),
    
    // Actions
    startAsLead: () => context.setMode('lead'),
    createOfferForScout: context.createOfferForScout,
    processScoutAnswer: context.processScoutAnswer,
    startAsScout,
    requestDataFromScout: (scoutId: string, filters?: Parameters<typeof context.requestDataFromAll>[0]) => {
      const scout = context.connectedScouts.find(s => s.id === scoutId);
      if (scout?.dataChannel) {
        scout.dataChannel.send(JSON.stringify({ 
          type: 'request-data',
          filters: filters || null
        }));
      }
    },
    requestDataFromAll: context.requestDataFromAll,
    reset: () => {
      context.disconnectAll();
      context.setMode('select');
      setScoutAnswer(null);
    },
  };
}
