/**
 * useWebRTCQRTransfer - Wrapper hook for WebRTC context with state management
 * Provides a simplified interface for the peer transfer page
 */

import { useState, useCallback } from 'react';
import { useWebRTC, type TransferDataType } from '@/contexts/WebRTCContext';
import type { DataFilters } from '@/lib/dataFiltering';

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
  
  // Request data from specific scout with filters and data type
  const requestDataFromScout = useCallback((
    scoutId: string, 
    filters?: DataFilters,
    dataType: TransferDataType = 'scouting'
  ) => {
    context.requestDataFromScout(scoutId, filters, dataType);
  }, [context]);

  // Request data from all scouts with filters and data type
  const requestDataFromAll = useCallback((
    filters?: DataFilters,
    dataType: TransferDataType = 'scouting'
  ) => {
    context.requestDataFromAll(filters, dataType);
  }, [context]);

  // Push data to all scouts
  const pushDataToAll = useCallback((
    data: any,
    dataType: TransferDataType
  ) => {
    context.pushDataToAll(data, dataType);
  }, [context]);

  // Push data to specific scout
  const pushDataToScout = useCallback((
    scoutId: string,
    data: any,
    dataType: TransferDataType
  ) => {
    context.pushDataToScout(scoutId, data, dataType);
  }, [context]);
  
  return {
    // Mode
    role: context.mode === 'scout' ? 'scout' : context.mode === 'lead' ? 'lead' : null,
    
    // Lead functionality
    connectedScouts: context.connectedScouts,
    receivedData: context.receivedData,
    clearReceivedData: context.clearReceivedData,
    addToReceivedData: context.addToReceivedData,
    isConnecting: false, // Not tracking this state anymore
    
    // Scout functionality  
    connectionStatus: context.connectionStatus,
    scoutAnswer,
    scoutOfferReceived: context.mode === 'scout' && context.connectionStatus.includes('Connected'),
    dataRequested: context.dataRequested,
    setDataRequested: context.setDataRequested,
    requestDataType: context.requestDataType,
    requestFilters: context.requestFilters,
    dataPushed: context.dataPushed,
    setDataPushed: context.setDataPushed,
    pushedData: context.pushedData,
    pushedDataType: context.pushedDataType,
    sendData: context.sendData,
    sendControlMessage: context.sendControlMessage,
    
    // Auto-reconnect
    shouldAttemptReconnect: context.shouldAttemptReconnect,
    setShouldAttemptReconnect: context.setShouldAttemptReconnect,
    lastScoutName: context.lastScoutName,
    lastOffer: context.lastOffer,
    
    // Actions
    startAsLead: () => context.setMode('lead'),
    createOfferForScout: context.createOfferForScout,
    processScoutAnswer: context.processScoutAnswer,
    startAsScout,
    requestDataFromScout,
    requestDataFromAll,
    pushDataToAll,
    pushDataToScout,
    disconnectScout: context.disconnectScout,
    reset: () => {
      context.disconnectAll();
      context.setMode('select');
      setScoutAnswer(null);
    },
  };
}
