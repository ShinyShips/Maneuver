import { useCallback } from 'react';
import type { TransferDataType } from '@/contexts/WebRTCContext';
import { toast } from 'sonner';

const DEBUG = import.meta.env.DEV;
const debugLog = (...args: unknown[]) => {
  if (DEBUG) console.log(...args);
};

interface UsePeerTransferPushOptions {
  addToReceivedData: (entry: { scoutName: string; data: unknown; timestamp: number }) => void;
  pushDataToAll: (data: unknown, dataType: TransferDataType) => void;
}

export function usePeerTransferPush({ addToReceivedData, pushDataToAll }: UsePeerTransferPushOptions) {
  
  const loadDataByType = useCallback(async (dataType: TransferDataType): Promise<unknown> => {
    switch (dataType) {
      case 'scouting': {
        const { loadScoutingData } = await import('@/lib/scoutingDataUtils');
        const data = await loadScoutingData();
        debugLog('Loaded scouting data:', data.entries?.length || 0, 'entries');
        return data;
      }
      case 'pit-scouting': {
        const { loadPitScoutingData } = await import('@/lib/pitScoutingUtils');
        const data = await loadPitScoutingData();
        debugLog('Loaded pit scouting data:', (data as { entries?: unknown[] }).entries?.length || 0, 'entries');
        return data;
      }
      case 'match': {
        const matchDataStr = localStorage.getItem('matchData');
        const matches = matchDataStr ? JSON.parse(matchDataStr) : [];
        debugLog('Loaded match data:', Array.isArray(matches) ? matches.length : 0, 'matches');
        return { matches };
      }
      case 'scout': {
        const { gameDB } = await import('@/lib/dexieDB');
        const scouts = await gameDB.scouts.toArray();
        const predictions = await gameDB.predictions.toArray();
        const achievements = await gameDB.scoutAchievements.toArray();
        debugLog('Loaded scout profiles:', scouts.length, 'scouts');
        return { scouts, predictions, achievements };
      }
      case 'combined': {
        const { loadScoutingData } = await import('@/lib/scoutingDataUtils');
        const { gameDB } = await import('@/lib/dexieDB');
        
        const [scoutingData, scouts, predictions] = await Promise.all([
          loadScoutingData(),
          gameDB.scouts.toArray(),
          gameDB.predictions.toArray()
        ]);
        
        const data = {
          entries: scoutingData.entries,
          metadata: {
            exportedAt: new Date().toISOString(),
            version: "1.0",
            scoutingEntriesCount: scoutingData.entries.length,
            scoutsCount: scouts.length,
            predictionsCount: predictions.length
          },
          scoutProfiles: {
            scouts,
            predictions
          }
        };
        debugLog('Loaded combined data:', {
          scouting: scoutingData.entries?.length || 0,
          scouts: scouts.length,
          predictions: predictions.length
        });
        return data;
      }
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }, []);

  const pushData = useCallback(async (
    dataType: TransferDataType,
    connectedScouts: Array<{ name: string; channel?: RTCDataChannel | null }>
  ) => {
    try {
      debugLog('📤 Pushing', dataType, 'data to all scouts');
      
      const data = await loadDataByType(dataType);
      
      // Push data to all scouts
      pushDataToAll(data, dataType);
      
      // Add entries to received data for each scout that was pushed to
      const readyScouts = connectedScouts.filter(s => s.channel?.readyState === 'open');
      readyScouts.forEach(scout => {
        addToReceivedData({
          scoutName: scout.name,
          data: { type: 'pushed', dataType },
          timestamp: Date.now()
        });
      });
      
      toast.success(`Pushed ${dataType} data to ${readyScouts.length} scouts`);
    } catch (err) {
      console.error('Failed to push data:', err);
      toast.error('Failed to push data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [loadDataByType, pushDataToAll, addToReceivedData]);

  return {
    pushData,
    loadDataByType
  };
}
