/**
 * Lead Scout Mode Component
 * Handles the lead scout's workflow:
 * - Generate room code for scouts to join
 * - Display room code and connection status
 * - Manage connected scouts
 * - Request/push data with filtering options
 * - Auto-reconnect scouts on refresh/disconnect
 * - View transfer history
 */

import Button from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  ConnectedScoutCard,
  DataTransferControls,
  TransferHistoryCard,
  RoomCodeConnection
} from '@/components/PeerTransferComponents';
import { DataFilteringControls } from '@/components/DataTransferComponents/DataFilteringControls';
import { type DataFilters } from '@/lib/dataFiltering';
import { loadScoutingData } from '@/lib/scoutingDataUtils';
import type { TransferDataType } from '@/contexts/WebRTCContext';
import { debugLog, getRelativeTime } from '@/lib/peerTransferUtils';

interface ConnectedScout {
  id: string;
  name: string;
  channel: RTCDataChannel | null;
}

interface ReceivedDataEntry {
  scoutName: string;
  data: unknown;
  timestamp: number;
}

interface LeadScoutModeProps {
  // Connection state
  connectedScouts: ConnectedScout[];
  receivedData: ReceivedDataEntry[];
  
  // Data state
  dataType: TransferDataType;
  setDataType: (type: TransferDataType) => void;
  filters: DataFilters;
  allScoutingData: Awaited<ReturnType<typeof loadScoutingData>> | null;
  historyCollapsed: boolean;
  setHistoryCollapsed: (collapsed: boolean) => void;
  
  // Requesting state
  requestingScouts: Set<string>;
  setRequestingScouts: React.Dispatch<React.SetStateAction<Set<string>>>;
  setImportedDataCount: (count: number) => void;
  
  // Handlers
  onBack: () => void;
  onRequestDataFromScout: (scoutId: string, filters: DataFilters, dataType: TransferDataType) => void;
  onRequestDataFromAll: (filters: DataFilters, dataType: TransferDataType) => void;
  onPushData: (dataType: TransferDataType, scouts: ConnectedScout[]) => void;
  onPushDataToScout: (scoutId: string, data: unknown, dataType: TransferDataType) => void;
  onDisconnectScout: (scoutId: string) => void;
  onAddToHistory: (entry: ReceivedDataEntry) => void;
  onClearHistory: () => void;
  onFiltersChange: (filters: DataFilters) => void;
  onApplyFilters: () => void;
}

export const LeadScoutMode = ({
  connectedScouts,
  receivedData,
  dataType,
  setDataType,
  filters,
  allScoutingData,
  historyCollapsed,
  setHistoryCollapsed,
  requestingScouts,
  setRequestingScouts,
  setImportedDataCount,
  onBack,
  onRequestDataFromScout,
  onRequestDataFromAll,
  onPushData,
  onPushDataToScout,
  onDisconnectScout,
  onAddToHistory,
  onClearHistory,
  onFiltersChange,
  onApplyFilters,
}: LeadScoutModeProps) => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-start px-4 pt-12 pb-8 md:pb-6 overflow-y-auto">
      <div className="flex flex-col items-start gap-6 max-w-md w-full">
        <Button onClick={onBack} variant="ghost" size="sm">
          ← Change Mode
        </Button>

        <div className="w-full">
          <h1 className="text-2xl font-bold mb-2">Lead Scout Session</h1>
          <p className="text-muted-foreground">
            Scouts connect using the room code below
          </p>
        </div>

        {/* Room Code Connection Card */}
        <RoomCodeConnection mode="lead" />

        {/* Data Filtering - Show if scouts are connected */}
        {connectedScouts.length > 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Filter Data Request (Optional)</CardTitle>
              <CardDescription>
                {allScoutingData && allScoutingData.entries.length > 0 
                  ? `Request specific data from scouts • Current dataset: ${allScoutingData.entries.length} entries`
                  : 'Request specific data from scouts'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataFilteringControls
                data={allScoutingData && allScoutingData.entries.length > 0 
                  ? allScoutingData as unknown as Parameters<typeof DataFilteringControls>[0]['data']
                  : undefined}
                filters={filters}
                onFiltersChange={onFiltersChange}
                onApplyFilters={onApplyFilters}
                useCompression={false}
                hideQRStats={true}
                hideApplyButton={true}
              />
            </CardContent>
          </Card>
        )}

        {/* Connected Scouts List */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Connected Scouts</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    // Force a re-render by updating state
                    console.log('🔄 Refreshing connected scouts state');
                    setRequestingScouts(new Set(requestingScouts));
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Badge variant="secondary">{connectedScouts.length} connected</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectedScouts.length === 0 ? (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No scouts connected yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {connectedScouts.map(scout => (
                  <ConnectedScoutCard
                    key={scout.id}
                    scout={scout}
                    isRequesting={requestingScouts.has(scout.id)}
                    receivedData={receivedData}
                    dataType={dataType}
                    onRequestData={(scoutId) => {
                      setRequestingScouts(prev => new Set(prev).add(scoutId));
                      debugLog('📤 Requesting', dataType, 'data from', scout.name, 'with filters:', filters);
                      onRequestDataFromScout(scoutId, filters, dataType);
                    }}
                    onPushData={onPushDataToScout}
                    onDisconnect={(scoutId) => {
                      onDisconnectScout(scoutId);
                    }}
                    onAddToHistory={onAddToHistory}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Transfer Controls */}
        {connectedScouts.length > 0 && (
          <DataTransferControls
            dataType={dataType}
            onDataTypeChange={(value) => setDataType(value)}
            readyScoutsCount={connectedScouts.filter(s => s.channel?.readyState === 'open').length}
            onRequestData={() => {
              // Mark all ready scouts as requesting
              const readyScouts = connectedScouts.filter(s => s.channel?.readyState === 'open');
              setRequestingScouts(new Set(readyScouts.map(s => s.id)));
              // Set imported count to current length so only NEW data after this request is imported
              // This prevents re-importing existing history data
              setImportedDataCount(receivedData.length);
              debugLog('📤 Requesting', dataType, 'data with filters:', filters);
              onRequestDataFromAll(filters, dataType);
            }}
            onPushData={() => onPushData(dataType, connectedScouts)}
          />
        )}

        {/* Data Transfer History */}
        {receivedData.length > 0 && (
          <TransferHistoryCard
            receivedData={receivedData}
            historyCollapsed={historyCollapsed}
            onToggleCollapse={() => setHistoryCollapsed(!historyCollapsed)}
            onClearHistory={onClearHistory}
            getRelativeTime={getRelativeTime}
          />
        )}
      </div>
    </div>
  );
};
