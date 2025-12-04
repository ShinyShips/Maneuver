/**
 * Individual connected scout card with request/push/disconnect actions
 */

import { useState } from 'react';
import Button from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { TransferDataType } from '@/contexts/WebRTCContext';
import { debugLog } from '@/lib/peerTransferUtils';

interface ReceivedDataEntry {
  scoutName: string;
  data: unknown;
  timestamp: number;
}

interface ConnectedScout {
  id: string;
  name: string;
  channel?: RTCDataChannel | null;
}

interface ConnectedScoutCardProps {
  scout: ConnectedScout;
  isRequesting: boolean;
  receivedData: ReceivedDataEntry[];
  dataType: TransferDataType;
  onRequestData: (scoutId: string) => void;
  onPushData: (scoutId: string, data: unknown, dataType: TransferDataType) => void;
  onDisconnect: (scoutId: string) => void;
  onAddToHistory: (entry: ReceivedDataEntry) => void;
}

export function ConnectedScoutCard({
  scout,
  isRequesting,
  receivedData,
  dataType,
  onRequestData,
  onPushData,
  onDisconnect,
  onAddToHistory,
}: ConnectedScoutCardProps) {
  const [isPushing, setIsPushing] = useState(false);
  
  const isReady = scout.channel?.readyState === 'open';
  
  // Get the most recent data from this scout
  const scoutReceivedData = receivedData.filter(d => d.scoutName === scout.name);
  const receivedLog = scoutReceivedData[scoutReceivedData.length - 1];
  const hasReceived = !!receivedLog;

  const handlePush = async () => {
    setIsPushing(true);
    try {
      debugLog('📤 Pushing', dataType, 'data to', scout.name);
      let data: unknown;

      // Load data based on selected type
      switch (dataType) {
        case 'scouting': {
          const { loadScoutingData } = await import('@/lib/scoutingDataUtils');
          data = await loadScoutingData();
          break;
        }
        case 'pit-scouting': {
          const { loadPitScoutingData } = await import('@/lib/pitScoutingUtils');
          data = await loadPitScoutingData();
          break;
        }
        case 'match': {
          const matchDataStr = localStorage.getItem('matchData');
          const matches = matchDataStr ? JSON.parse(matchDataStr) : [];
          data = { matches };
          break;
        }
        case 'scout': {
          const { gameDB } = await import('@/lib/dexieDB');
          const scouts = await gameDB.scouts.toArray();
          const predictions = await gameDB.predictions.toArray();
          const achievements = await gameDB.scoutAchievements.toArray();
          data = { scouts, predictions, achievements };
          break;
        }
        case 'combined': {
          const { loadScoutingData } = await import('@/lib/scoutingDataUtils');
          const { gameDB } = await import('@/lib/dexieDB');
          
          const [scoutingData, scouts, predictions] = await Promise.all([
            loadScoutingData(),
            gameDB.scouts.toArray(),
            gameDB.predictions.toArray()
          ]);
          
          data = {
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
          break;
        }
      }

      onPushData(scout.id, data, dataType);
      
      // Add to history for tracking
      onAddToHistory({
        scoutName: scout.name,
        data: { type: 'pushed', dataType },
        timestamp: Date.now()
      });
      
      toast.info(`Pushed ${dataType} to ${scout.name}`);
    } catch (err) {
      console.error('Failed to push data:', err);
      toast.error('Failed to push data to ' + scout.name);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-2">
          {isRequesting ? (
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          ) : hasReceived ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : isReady ? (
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          )}
          <span className="font-medium">{scout.name}</span>
        </div>
        <div className="flex items-center gap-2 ml-6">
          {isRequesting && (
            <Badge variant="outline" className="text-xs text-blue-600 animate-pulse">
              Receiving...
            </Badge>
          )}
          {hasReceived && receivedLog && !isRequesting && (
            <span className="text-xs text-muted-foreground">
              Last received: {new Date(receivedLog.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          onClick={() => onRequestData(scout.id)}
          disabled={!isReady || isRequesting}
        >
          {isRequesting ? '...' : 'Request'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handlePush}
          disabled={!isReady || isPushing}
        >
          {isPushing ? '...' : 'Push'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDisconnect(scout.id)}
          className="px-2"
          title="Disconnect scout"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
