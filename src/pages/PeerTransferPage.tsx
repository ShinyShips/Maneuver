/**
 * Peer-to-Peer Data Transfer Page with WebRTC QR Signaling
 * Lead Scout Mode: Generate QR per scout, scan answers, request data
 * Scout Mode: Scan lead's QR, display answer, respond to requests
 */

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { QRCodeCanvas } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Wifi, Users, Download, AlertCircle, CheckCircle2, UserCheck, QrCode, Camera } from 'lucide-react';
import { useWebRTCQRTransfer } from '@/hooks/useWebRTCQRTransfer';
import { useCurrentScout } from '@/hooks/useCurrentScout';
import { loadScoutingData, saveScoutingData, type ScoutingDataWithId } from '@/lib/scoutingDataUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PeerTransferPage = () => {
  const [mode, setMode] = useState<'select' | 'lead' | 'scout'>('select');
  const [showScanner, setShowScanner] = useState(false);
  const [newScoutName, setNewScoutName] = useState('');
  const [currentOffer, setCurrentOffer] = useState<{ scoutId: string; offer: string; scoutName: string } | null>(null);
  const [importedDataCount, setImportedDataCount] = useState(0); // Track how many items we've imported
  
  const { currentScout } = useCurrentScout();
  
  const {
    role,
    isConnecting,
    connectedScouts,
    receivedData,
    connectionStatus,
    scoutAnswer,
    scoutOfferReceived,
    dataRequestPending,
    requestingScoutName,
    startAsLead,
    createOfferForScout,
    processScoutAnswer,
    startAsScout,
    requestDataFromScout,
    requestDataFromAll,
    sendData,
    reset,
  } = useWebRTCQRTransfer();

  // Lead: Generate QR for new scout
  const handleGenerateQR = async () => {
    if (!newScoutName.trim()) return;
    const { scoutId, offer } = await createOfferForScout(newScoutName);
    setCurrentOffer({ scoutId, offer, scoutName: newScoutName });
    setNewScoutName('');
  };

  // Lead: Scan scout's answer QR
  const handleAnswerScan = async (result: string) => {
    try {
      if (!currentOffer) return;
      
      console.log('Scanned answer QR length:', result.length);
      console.log('Answer QR preview:', result.substring(0, 100) + '...');
      
      setShowScanner(false);
      await processScoutAnswer(currentOffer.scoutId, result);
      setCurrentOffer(null);
    } catch (err) {
      console.error('Failed to process answer QR:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Invalid QR code: ${errorMsg}\n\nTry scanning again with better lighting.`);
      setShowScanner(true);
    }
  };

  // Scout: Scan lead's offer QR
  const handleOfferScan = async (result: string) => {
    try {
      console.log('Scanned offer QR length:', result.length);
      console.log('Offer QR preview:', result.substring(0, 100) + '...');
      
      setShowScanner(false);
      const scoutName = currentScout?.name || 'Scout';
      await startAsScout(scoutName, result);
    } catch (err) {
      console.error('Failed to process QR code:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Invalid QR code: ${errorMsg}\n\nTry scanning again with better lighting.`);
      setShowScanner(true);
    }
  };

  // Scout: Handle data request from lead
  const handleAcceptRequest = async () => {
    try {
      const data = await loadScoutingData();
      console.log('Scout sending data:', data);
      console.log('Data size:', JSON.stringify(data).length, 'characters');
      sendData(data);
    } catch (err) {
      console.error('Failed to load/send data:', err);
      alert('Failed to send data. Check console for details.');
    }
  };

  // Auto-save received data
  useEffect(() => {
    // Only import new data that hasn't been imported yet
    if (receivedData.length > importedDataCount) {
      const latest = receivedData[receivedData.length - 1];
      const receivedDataObj = latest.data as { entries: ScoutingDataWithId[] };
      
      console.log(`✅ Received data from ${latest.scoutName}:`, receivedDataObj);
      console.log('Received data size:', JSON.stringify(receivedDataObj).length, 'characters');
      console.log('Data structure check:', {
        hasEntries: 'entries' in receivedDataObj,
        entriesType: Array.isArray(receivedDataObj.entries),
        entriesCount: receivedDataObj.entries?.length || 0,
        firstEntry: receivedDataObj.entries?.[0]
      });
      
      // Import data into database
      const importData = async () => {
        console.log(`📥 Attempting to import data from ${latest.scoutName}...`);
        try {
          await saveScoutingData(receivedDataObj);
          console.log(`✅ SUCCESS: Imported ${latest.scoutName}'s data (${receivedDataObj.entries?.length || 0} entries) into database`);
          alert(`✅ Successfully imported ${receivedDataObj.entries?.length || 0} entries from ${latest.scoutName}`);
          setImportedDataCount(receivedData.length); // Mark as imported
        } catch (err) {
          console.error(`❌ FAILED to import data from ${latest.scoutName}:`, err);
          alert(`Failed to import data from ${latest.scoutName}. Check console for details.`);
        }
      };
      
      importData();
    }
  }, [receivedData, importedDataCount]);

  // Mode Selection Screen
  if (mode === 'select') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center px-4 pb-32">
        <div className="flex flex-col items-center gap-6 max-w-md w-full">
          <Wifi className="h-16 w-16 text-primary" />
          <h1 className="text-3xl font-bold text-center">WebRTC Data Transfer</h1>
          <p className="text-muted-foreground text-center">
            Connect scouts directly using QR codes - no WiFi needed
          </p>

          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Quick Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div>
                <p className="font-semibold text-primary">Lead Scout:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                  <li>For each scout: enter name → show QR</li>
                  <li>Scan each scout's answer QR</li>
                  <li>Request data from all instantly</li>
                </ol>
              </div>
              
              <Separator />
              
              <div>
                <p className="font-semibold text-primary">Scouts:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                  <li>Scan lead's QR code</li>
                  <li>Show your answer QR to lead</li>
                  <li>Approve when lead requests data</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 w-full">
            <Button
              onClick={() => {
                startAsLead();
                setMode('lead');
              }}
              className="w-full h-14 text-lg"
              size="lg"
            >
              <UserCheck className="h-5 w-5 mr-2" />
              I'm the Lead Scout
            </Button>

            <Button
              onClick={() => setMode('scout')}
              variant="outline"
              className="w-full h-14 text-lg"
              size="lg"
            >
              <Wifi className="h-5 w-5 mr-2" />
              I'm a Scout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Lead Scout Mode
  if (mode === 'lead') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-start px-4 pt-12 pb-32 overflow-y-auto">
        <div className="flex flex-col items-start gap-6 max-w-md w-full">
          <Button
            onClick={() => {
              setMode('select');
            }}
            variant="ghost"
            size="sm"
          >
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
                  Enter scout name to generate their QR code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newScoutName">Scout Name</Label>
                  <Input
                    id="newScoutName"
                    placeholder="e.g., Alex"
                    value={newScoutName}
                    onChange={(e) => setNewScoutName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateQR()}
                  />
                </div>
                <Button
                  onClick={handleGenerateQR}
                  disabled={!newScoutName.trim() || isConnecting}
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
                  Show to {currentOffer.scoutName}
                </CardTitle>
                <CardDescription className="text-center">
                  Step 1: {currentOffer.scoutName} scans this QR
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
                  Scan {currentOffer.scoutName}'s Answer
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Scan Scout Answer */}
          {currentOffer && showScanner && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Scan {currentOffer.scoutName}'s Answer
                </CardTitle>
                <CardDescription>
                  Step 2: Point camera at their QR code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Scanner
                  onScan={(results) => {
                    const result = results[0]?.rawValue;
                    if (result) handleAnswerScan(result);
                  }}
                  onError={(error) => console.error(error)}
                  constraints={{ facingMode: 'environment' }}
                  styles={{ container: { width: '100%' } }}
                />
                <Button
                  onClick={() => setShowScanner(false)}
                  variant="outline"
                  className="w-full"
                >
                  Back to QR
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Connected Scouts List */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Connected Scouts
                <Badge variant="secondary">{connectedScouts.length} connected</Badge>
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
                    <div 
                      key={scout.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {scout.channel && scout.channel.readyState === 'open' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="font-medium">{scout.name}</span>
                        {scout.channel && scout.channel.readyState === 'open' && (
                          <Badge variant="outline" className="text-xs">Ready</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => requestDataFromScout(scout.id)}
                        disabled={!scout.channel || scout.channel.readyState !== 'open'}
                      >
                        Request
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request from All Button */}
          {connectedScouts.length > 0 && (
            <Button
              onClick={requestDataFromAll}
              disabled={!connectedScouts.some(s => s.channel?.readyState === 'open')}
              className="w-full h-14 text-lg"
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              Request Data from All Scouts
            </Button>
          )}

          {/* Received Data Log */}
          {receivedData.length > 0 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Received Data
                  <Badge>{receivedData.length} received</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {receivedData.map((log, idx) => (
                    <div key={idx} className="text-sm border-l-2 border-green-500 pl-3 py-1">
                      <p className="font-medium">{log.scoutName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Scout Mode
  if (mode === 'scout') {
    const scoutName = currentScout?.name || 'Scout';
    
    // Step 1: Scan lead's QR
    if (!role) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-start px-4 pt-12 pb-32 overflow-y-auto">
          <div className="flex flex-col items-start gap-6 max-w-md w-full">
            <Button onClick={() => setMode('select')} variant="ghost" size="sm">
              ← Back
            </Button>

            <div className="w-full">
              <h1 className="text-2xl font-bold mb-2">Scout Setup</h1>
              <p className="text-muted-foreground">
                Scan the lead scout's QR code
              </p>
            </div>

            <Card className="w-full">
              <CardHeader>
                <CardTitle>Ready to Connect</CardTitle>
                <CardDescription>Connecting as: {scoutName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showScanner ? (
                  <Button
                    onClick={() => setShowScanner(true)}
                    className="w-full"
                    size="lg"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Scan Lead's QR Code
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Scanner
                      onScan={(results) => {
                        const result = results[0]?.rawValue;
                        if (result) handleOfferScan(result);
                      }}
                      onError={(error) => console.error(error)}
                      constraints={{ facingMode: 'environment' }}
                      styles={{ container: { width: '100%' } }}
                    />
                    <Button
                      onClick={() => setShowScanner(false)}
                      variant="outline"
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Step 2: Show answer QR to lead
    if (scoutAnswer && !scoutOfferReceived) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-start px-4 pt-12 pb-32 overflow-y-auto">
          <div className="flex flex-col items-start gap-6 max-w-md w-full">
            <Button
              onClick={() => {
                reset();
                setMode('select');
              }}
              variant="ghost"
              size="sm"
            >
              ← Cancel
            </Button>

            <div className="w-full">
              <h1 className="text-2xl font-bold mb-2">Show to Lead Scout</h1>
              <p className="text-muted-foreground">
                Let the lead scan your answer QR code
              </p>
            </div>

            <Card className="w-full border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Your Answer QR
                </CardTitle>
                <CardDescription className="text-center">
                  {scoutName}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-6 space-y-4">
                <QRCodeCanvas 
                  value={scoutAnswer} 
                  size={320}
                  level="L"
                  includeMargin
                />
                <p className="text-xs text-center text-muted-foreground">
                  QR Size: {scoutAnswer.length} chars
                </p>
              </CardContent>
            </Card>

            <Card className="w-full bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>⏳ Waiting for connection...</strong>
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
                  Once the lead scout scans your QR, you'll be connected.
                </p>
                {connectionStatus !== 'not-started' && (
                  <p className="text-xs text-blue-800 dark:text-blue-200 mt-2 font-mono">
                    Status: {connectionStatus}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Step 3: Connected, waiting for requests
    return (
      <div className="h-screen w-full flex flex-col items-center justify-start px-4 pt-12 pb-32 overflow-y-auto">
        <div className="flex flex-col items-start gap-6 max-w-md w-full">
          <Button
            onClick={() => {
              reset();
              setMode('select');
            }}
            variant="ghost"
            size="sm"
          >
            ← Disconnect
          </Button>

          <Card className="w-full border-2 border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Connected as Scout
              </CardTitle>
              <CardDescription>Ready to send data when requested</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-lg font-semibold">{scoutName}</p>
                <Badge variant="secondary" className="mt-2">Ready ✓</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>✅ You're all set!</strong>
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200 mt-2">
                Keep this page open. You'll see a popup when the lead requests your data.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Request Dialog */}
        <AlertDialog open={dataRequestPending}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Data Request
              </AlertDialogTitle>
              <AlertDialogDescription>
                {requestingScoutName} is requesting your scouting data. Send your data?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Decline</AlertDialogCancel>
              <AlertDialogAction onClick={handleAcceptRequest}>Send Data</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
};

export default PeerTransferPage;
