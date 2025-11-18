/**
 * Lead Scout Mode Component
 * Handles the lead scout's workflow:
 * - Generate QR codes for each scout
 * - Scan scout answer QRs to establish connections
 * - Manage connected scouts
 * - Request/push data with filtering options
 * - View transfer history
 */

import Button from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QRCodeCanvas } from 'qrcode.react';
import { AlertCircle, QrCode, Camera, RefreshCw } from 'lucide-react';
import {
  ConnectedScoutCard,
  QRScannerCard,
  DataTransferControls,
  TransferHistoryCard
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
  isConnecting: boolean;
  connectedScouts: ConnectedScout[];
  receivedData: ReceivedDataEntry[];
  
  // QR Connection state
  currentOffer: { offer: string; scoutRole: string } | null;
  selectedRole: string;
  setSelectedRole: (role: string) => void;
  showScanner: boolean;
  setShowScanner: (show: boolean) => void;
  
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
  onGenerateQR: () => void;
  onAnswerScan: (data: string) => void;
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
  isConnecting,
  connectedScouts,
  receivedData,
  currentOffer,
  selectedRole,
  setSelectedRole,
  showScanner,
  setShowScanner,
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
  onGenerateQR,
  onAnswerScan,
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
    <div className="h-screen w-full flex flex-col items-center justify-start px-4 pt-12 pb-32 overflow-y-auto">
      <div className="flex flex-col items-start gap-6 max-w-md w-full">
        <Button onClick={onBack} variant="ghost" size="sm">
          ← Change Mode
        </Button>

        <div className="w-full">
          <h1 className="text-2xl font-bold mb-2">Lead Scout Session</h1>
          <p className="text-muted-foreground">
            Connect each scout one at a time
          </p>
        </div>

        {/* Add New Scout Section */}
        {!currentOffer && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Connect New Scout
              </CardTitle>
              <CardDescription>
                Select scout role to generate their QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scoutRole">Scout Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="scoutRole">
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="red-1">Red 1</SelectItem>
                    <SelectItem value="red-2">Red 2</SelectItem>
                    <SelectItem value="red-3">Red 3</SelectItem>
                    <SelectItem value="blue-1">Blue 1</SelectItem>
                    <SelectItem value="blue-2">Blue 2</SelectItem>
                    <SelectItem value="blue-3">Blue 3</SelectItem>
                    <SelectItem value="other">Other (Custom Name)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={onGenerateQR}
                disabled={!selectedRole || isConnecting}
                className="w-full"
                size="lg"
              >
                <QrCode className="h-5 w-5 mr-2" />
                {isConnecting ? 'Generating...' : 'Generate QR Code'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Show Offer QR to Scout */}
        {currentOffer && !showScanner && (
          <Card className="w-full border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5" />
                Show to {currentOffer.scoutRole}
              </CardTitle>
              <CardDescription className="text-center">
                Step 1: {currentOffer.scoutRole} scans this QR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center py-4">
                <QRCodeCanvas 
                  value={currentOffer.offer} 
                  size={320}
                  level="L"
                  includeMargin
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                QR Size: {currentOffer.offer.length} chars
              </p>
              
              <Button
                onClick={() => setShowScanner(true)}
                className="w-full"
                size="lg"
              >
                <Camera className="h-5 w-5 mr-2" />
                Scan {currentOffer.scoutRole}'s Answer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Scan Scout Answer */}
        {currentOffer && showScanner && (
          <QRScannerCard
            title={`Scan ${currentOffer.scoutRole}'s Answer`}
            description="Step 2: Point camera at their QR code"
            onScan={onAnswerScan}
            onCancel={() => setShowScanner(false)}
            cancelButtonText="Back to QR"
          />
        )}

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
