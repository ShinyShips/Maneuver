/**
 * Peer-to-Peer Data Transfer Page with WebRTC QR Signaling
 * Lead Scout Mode: Generate QR per scout, scan answers, request data
 * Scout Mode: Scan lead's QR, display answer, respond to requests
 */

import { useState, useEffect } from 'react';

// Debug logging helper - only logs in development
const DEBUG = import.meta.env.DEV;
const debugLog = (...args: unknown[]) => {
  if (DEBUG) console.log(...args);
};
import Button from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QRCodeCanvas } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Wifi, Users, Download, Upload, AlertCircle, CheckCircle2, UserCheck, QrCode, Camera, Loader2, RefreshCw } from 'lucide-react';
import { useWebRTCQRTransfer } from '@/hooks/useWebRTCQRTransfer';
import { detectConflicts, type ScoutingDataWithId, type ConflictInfo } from '@/lib/scoutingDataUtils';
import { convertTeamRole } from '@/lib/utils';
import { useConflictResolution } from '@/hooks/useConflictResolution';
import ConflictResolutionDialog from '@/components/DataTransferComponents/ConflictResolutionDialog';
import { BatchConflictDialog } from '@/components/DataTransferComponents/BatchConflictDialog';
import { DataFilteringControls } from '@/components/DataTransferComponents/DataFilteringControls';
import { createDefaultFilters, type DataFilters } from '@/lib/dataFiltering';
import { loadScoutingData } from '@/lib/scoutingDataUtils';
import { toast } from 'sonner';
import type { TransferDataType } from '@/contexts/WebRTCContext';

const PeerTransferPage = () => {
  const [mode, setMode] = useState<'select' | 'lead' | 'scout'>('select');
  const [showScanner, setShowScanner] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [currentOffer, setCurrentOffer] = useState<{ scoutId: string; offer: string; scoutRole: string } | null>(null);
  const [importedDataCount, setImportedDataCount] = useState(0); // Track how many items we've imported
  const [requestingScouts, setRequestingScouts] = useState<Set<string>>(new Set()); // Track which scouts we're requesting from
  
  // Filtering state
  const [filters, setFilters] = useState<DataFilters>(createDefaultFilters());
  const [allScoutingData, setAllScoutingData] = useState<Awaited<ReturnType<typeof loadScoutingData>> | null>(null);
  
  // Data type selection
  const [dataType, setDataType] = useState<TransferDataType>('scouting');
  
  // Dialog states
  const [showCustomNameDialog, setShowCustomNameDialog] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showRoleMismatchDialog, setShowRoleMismatchDialog] = useState(false);
  const [roleMismatchInfo, setRoleMismatchInfo] = useState<{ expected: string; actual: string; scoutId: string } | null>(null);
  
  // Batch review and conflict resolution state
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchReviewEntries, setBatchReviewEntries] = useState<ScoutingDataWithId[]>([]);
  const [pendingConflicts, setPendingConflicts] = useState<ConflictInfo[]>([]);
  
  // Use conflict resolution hook
  const {
    showConflictDialog,
    setShowConflictDialog,
    currentConflicts,
    setCurrentConflicts,
    currentConflictIndex,
    setCurrentConflictIndex,
    setConflictResolutions,
    handleConflictResolution,
    handleBatchResolve,
    handleUndo,
    canUndo,
    handleBatchReviewDecision: handleBatchReviewDecisionBase,
    isProcessing
  } = useConflictResolution();
  
  // Get current tablet's role
  const myRole = localStorage.getItem("playerStation") || 'unknown';
  
  const {
    role,
    isConnecting,
    connectedScouts,
    receivedData,
    clearReceivedData,
    connectionStatus,
    scoutAnswer,
    scoutOfferReceived,
    startAsLead,
    createOfferForScout,
    processScoutAnswer,
    startAsScout,
    requestDataFromScout,
    requestDataFromAll,
    pushDataToAll,
    pushDataToScout,
    reset,
  } = useWebRTCQRTransfer();

  // Load scouting data for filter preview (lead mode)
  useEffect(() => {
    if (mode === 'lead') {
      loadScoutingData().then(data => setAllScoutingData(data)).catch(err => {
        console.error('Failed to load scouting data for filter preview:', err);
      });
    }
  }, [mode]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: DataFilters) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    // Filters are applied on request - no action needed here
    debugLog('📋 Filters updated:', filters);
  };

  // Lead: Generate QR for selected role
  const handleGenerateQR = async () => {
    if (!selectedRole) return;
    
    if (selectedRole === 'other') {
      setShowCustomNameDialog(true);
      return;
    }
    
    const roleDisplay = convertTeamRole(selectedRole) || selectedRole;
    const { scoutId, offer } = await createOfferForScout(roleDisplay);
    setCurrentOffer({ scoutId, offer, scoutRole: roleDisplay });
    setSelectedRole('');
  };
  
  // Handle custom name submission
  const handleCustomNameSubmit = async () => {
    if (!customNameInput || customNameInput.trim() === '') {
      setErrorMessage('Please enter a valid name');
      setShowErrorDialog(true);
      return;
    }
    
    const roleDisplay = customNameInput.trim();
    setShowCustomNameDialog(false);
    setCustomNameInput('');
    setSelectedRole('');
    
    const { scoutId, offer } = await createOfferForScout(roleDisplay);
    setCurrentOffer({ scoutId, offer, scoutRole: roleDisplay });
  };

  // Lead: Scan scout's answer QR
  const handleAnswerScan = async (result: string) => {
    try {
      if (!currentOffer) return;
      
      console.log('Scanned answer QR length:', result.length);
      console.log('Answer QR preview:', result.substring(0, 100) + '...');
      
      setShowScanner(false);
      await processScoutAnswer(currentOffer.scoutId, result);
      
      // After connection, check if the scout's role matches
      const offerScoutId = currentOffer.scoutId;
      const offerScoutRole = currentOffer.scoutRole;
      
      setTimeout(() => {
        const connectedScout = connectedScouts.find(s => s.id === offerScoutId);
        if (connectedScout && connectedScout.name !== offerScoutRole) {
          setRoleMismatchInfo({
            expected: offerScoutRole,
            actual: connectedScout.name,
            scoutId: offerScoutId
          });
          setShowRoleMismatchDialog(true);
        }
      }, 1000); // Wait for connection to establish
      
      setCurrentOffer(null);
    } catch (err) {
      console.error('Failed to process answer QR:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(`Invalid QR code: ${errorMsg}\n\nTry scanning again with better lighting.`);
      setShowErrorDialog(true);
      setShowScanner(true);
    }
  };
  
  // Handle role mismatch disconnect
  const handleRoleMismatchDisconnect = () => {
    if (roleMismatchInfo) {
      const connectedScout = connectedScouts.find(s => s.id === roleMismatchInfo.scoutId);
      if (connectedScout) {
        connectedScout.connection.close();
        connectedScout.dataChannel?.close();
      }
    }
    setShowRoleMismatchDialog(false);
    setRoleMismatchInfo(null);
  };
  
  // Wrapper for batch review that handles closing dialog and resetting state
  const handleBatchReviewDecision = async (decision: 'replace-all' | 'skip-all' | 'review-each') => {
    debugLog(`📋 Batch review decision: ${decision}`);
    const result = await handleBatchReviewDecisionBase(batchReviewEntries, pendingConflicts, decision);
    debugLog(`📋 hasMoreConflicts: ${result.hasMoreConflicts}`);
    
    // Close batch dialog if no more conflicts
    if (!result.hasMoreConflicts) {
      setShowBatchDialog(false);
      setBatchReviewEntries([]);
      setPendingConflicts([]);
      // Clear received data and reset import counter since processing is complete
      debugLog('🧹 Clearing received data after batch review complete');
      clearReceivedData();
      setImportedDataCount(0); // Reset so next request will be processed
    } else {
      // Move to conflict dialog (review-each selected, or there are pending conflicts)
      setShowBatchDialog(false);
      // Don't clear received data yet - will be cleared after conflicts are resolved
      debugLog('⏭️ Moving to conflict dialog, not clearing data yet');
    }
  };

  // Scout: Scan lead's offer QR
  const handleOfferScan = async (result: string) => {
    try {
      console.log('Scanned offer QR length:', result.length);
      console.log('Offer QR preview:', result.substring(0, 100) + '...');
      
      setShowScanner(false);
      const roleDisplay = convertTeamRole(myRole) || myRole;
      
      await startAsScout(roleDisplay, result);
    } catch (err) {
      console.error('Failed to process QR code:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(`Invalid QR code: ${errorMsg}\n\nTry scanning again with better lighting.`);
      setShowErrorDialog(true);
      setShowScanner(true);
    }
  };

  // Auto-save received data
  useEffect(() => {
    debugLog('📦 Auto-import check:', { 
      receivedDataLength: receivedData.length, 
      importedDataCount,
      shouldImport: receivedData.length > importedDataCount
    });
    
    // Only import new data that hasn't been imported yet
    if (receivedData.length > importedDataCount) {
      debugLog('✅ Condition met, starting import...');
      const latest = receivedData[receivedData.length - 1];
      
      // Check if this is a decline message first (before accessing entries)
      const declineData = latest.data as { type?: string; dataType?: string; entries?: ScoutingDataWithId[] };
      
      if (declineData.type === 'declined') {
        toast.error(`${latest.scoutName} declined the data request`);
        setImportedDataCount(receivedData.length); // Mark as processed
        return;
      }
      
      if (declineData.type === 'push-declined') {
        const dataTypeLabel = declineData.dataType || 'data';
        toast.warning(`${latest.scoutName} declined pushed ${dataTypeLabel}`);
        setImportedDataCount(receivedData.length); // Mark as processed
        return;
      }
      
      // Now we know it's actual data, check what type it is
      const receivedDataObj = latest.data;
      const receivedDataType = (latest as { dataType?: string }).dataType;
      
      console.log(`✅ Received data from ${latest.scoutName}, type: ${receivedDataType}:`, receivedDataObj);
      console.log('Received data size:', JSON.stringify(receivedDataObj).length, 'characters');
      
      // Clear requesting state for this scout
      const scoutId = connectedScouts.find(s => s.name === latest.scoutName)?.id;
      if (scoutId) {
        setRequestingScouts(prev => {
          const next = new Set(prev);
          next.delete(scoutId);
          return next;
        });
      }
      
      // Import data into database based on type
      const importData = async () => {
        debugLog(`📥 Attempting to import ${receivedDataType} data from ${latest.scoutName}...`);
        try {
          // Handle different data types
          if (receivedDataType === 'scout') {
            // Scout profiles: { scouts, predictions, achievements }
            console.log('📊 Scout profile data structure:', receivedDataObj);
            
            const scoutData = receivedDataObj as { scouts?: unknown[]; predictions?: unknown[]; achievements?: unknown[] };
            const { gameDB } = await import('@/lib/dexieDB');
            
            let importedCount = 0;
            if (scoutData.scouts && Array.isArray(scoutData.scouts)) {
              await gameDB.scouts.bulkPut(scoutData.scouts as never[]);
              importedCount += scoutData.scouts.length;
              console.log(`✅ Imported ${scoutData.scouts.length} scouts`);
            }
            if (scoutData.predictions && Array.isArray(scoutData.predictions)) {
              await gameDB.predictions.bulkPut(scoutData.predictions as never[]);
              importedCount += scoutData.predictions.length;
              console.log(`✅ Imported ${scoutData.predictions.length} predictions`);
            }
            if (scoutData.achievements && Array.isArray(scoutData.achievements)) {
              await gameDB.scoutAchievements.bulkPut(scoutData.achievements as never[]);
              importedCount += scoutData.achievements.length;
              console.log(`✅ Imported ${scoutData.achievements.length} achievements`);
            }
            
            if (importedCount > 0) {
              toast.success(`Imported ${importedCount} scout profile items from ${latest.scoutName}`);
            } else {
              toast.warning(`No scout profile data to import from ${latest.scoutName}`);
            }
            console.log('✅ Scout profile import complete, returning early');
            setImportedDataCount(receivedData.length);
            return;
          }
          
          console.log('⚠️ Not scout type, continuing to other handlers...');
          
          if (receivedDataType === 'match') {
            // Match data: { matches }
            const matchData = receivedDataObj as { matches?: unknown[] };
            if (matchData.matches && Array.isArray(matchData.matches)) {
              localStorage.setItem('matchData', JSON.stringify(matchData.matches));
              toast.success(`Imported ${matchData.matches.length} matches from ${latest.scoutName}`);
            }
            setImportedDataCount(receivedData.length);
            return;
          }
          
          if (receivedDataType === 'pit-scouting') {
            // Pit scouting data: { entries }
            const pitData = receivedDataObj as { entries?: unknown[] };
            if (pitData.entries && Array.isArray(pitData.entries)) {
              const { pitDB } = await import('@/lib/dexieDB');
              await pitDB.pitScoutingData.bulkPut(pitData.entries as never[]);
              toast.success(`Imported ${pitData.entries.length} pit scouting entries from ${latest.scoutName}`);
            }
            setImportedDataCount(receivedData.length);
            return;
          }
          
          // Handle scouting data and combined (which has entries + optional scoutProfiles)
          const scoutingDataObj = receivedDataObj as { 
            entries?: ScoutingDataWithId[]; 
            scoutProfiles?: { scouts?: unknown[]; predictions?: unknown[] }
          };
          const newDataWithIds = scoutingDataObj.entries;
          
          if (!newDataWithIds || !Array.isArray(newDataWithIds)) {
            console.error('No valid entries found in received data');
            toast.error(`Invalid data structure from ${latest.scoutName}`);
            setImportedDataCount(receivedData.length);
            return;
          }
          
          // If this is combined data, also import scout profiles
          if (receivedDataType === 'combined' && scoutingDataObj.scoutProfiles) {
            const { gameDB } = await import('@/lib/dexieDB');
            let profileCount = 0;
            
            if (scoutingDataObj.scoutProfiles.scouts && Array.isArray(scoutingDataObj.scoutProfiles.scouts)) {
              await gameDB.scouts.bulkPut(scoutingDataObj.scoutProfiles.scouts as never[]);
              profileCount += scoutingDataObj.scoutProfiles.scouts.length;
              console.log(`✅ Imported ${scoutingDataObj.scoutProfiles.scouts.length} scout profiles`);
            }
            
            if (scoutingDataObj.scoutProfiles.predictions && Array.isArray(scoutingDataObj.scoutProfiles.predictions)) {
              await gameDB.predictions.bulkPut(scoutingDataObj.scoutProfiles.predictions as never[]);
              profileCount += scoutingDataObj.scoutProfiles.predictions.length;
              console.log(`✅ Imported ${scoutingDataObj.scoutProfiles.predictions.length} predictions`);
            }
            
            console.log(`✅ Combined data: imported ${profileCount} profile items`);
          }
          
          console.log('📊 Incoming data count:', newDataWithIds.length);
          console.log('📊 Sample entry:', newDataWithIds[0]);
          console.log('📊 Sample entry.data:', newDataWithIds[0]?.data);
          console.log('📊 Sample entry.data fields:', newDataWithIds[0]?.data ? Object.keys(newDataWithIds[0].data) : 'no data');
          
          // Check if data has the required fields for conflict detection
          const firstEntry = newDataWithIds[0];
          if (firstEntry?.data) {
            const data = firstEntry.data as Record<string, unknown>;
            console.log('📊 Key fields check:', {
              hasId: !!firstEntry.id,
              hasMatchNumber: 'matchNumber' in data,
              hasSelectTeam: 'selectTeam' in data || 'teamNumber' in data,
              hasAlliance: 'alliance' in data,
              hasEventName: 'eventName' in data,
              matchNumber: data.matchNumber,
              selectTeam: data.selectTeam || data.teamNumber,
              alliance: data.alliance,
              eventName: data.eventName
            });
          }
          
          // Check local database before conflict detection
          const { db: dexieDb } = await import('@/lib/dexieDB');
          const localCount = await dexieDb.scoutingData.count();
          console.log('📊 Local database count BEFORE import:', localCount);
          
          // If local DB is empty, log first few local entries for debugging
          if (localCount > 0) {
            const sampleLocal = await dexieDb.scoutingData.limit(3).toArray();
            console.log('📊 Sample local entries:', sampleLocal);
          }
          
          // Detect conflicts using the same system as other transfer methods
          debugLog('🔍 Starting conflict detection...');
          const conflictStartTime = performance.now();
          const conflictResult = await detectConflicts(newDataWithIds);
          const conflictEndTime = performance.now();
          debugLog(`⏱️ Conflict detection took ${(conflictEndTime - conflictStartTime).toFixed(2)}ms`);
          
          console.log('📊 Conflict detection results:', {
            autoImport: conflictResult.autoImport.length,
            autoReplace: conflictResult.autoReplace.length,
            batchReview: conflictResult.batchReview.length,
            conflicts: conflictResult.conflicts.length
          });
          
          const { saveScoutingEntry, db } = await import('@/lib/dexieDB');
          const results = { added: 0, replaced: 0, conflictsToReview: 0 };
          
          // Auto-import: Save new entries
          if (conflictResult.autoImport.length > 0) {
            for (const entry of conflictResult.autoImport) {
              await saveScoutingEntry(entry);
            }
            results.added = conflictResult.autoImport.length;
          }
          
          // Auto-replace: Delete old, save new (with correction metadata preserved)
          if (conflictResult.autoReplace.length > 0) {
            for (const entry of conflictResult.autoReplace) {
              const incomingData = entry.data;
              const matchNumber = String(incomingData.matchNumber || '');
              const teamNumber = String(incomingData.selectTeam || incomingData.teamNumber || '');
              const alliance = String(incomingData.alliance || '').toLowerCase().replace('alliance', '').trim();
              const eventName = String(incomingData.eventName || '');
              
              const existing = await db.scoutingData
                .toArray()
                .then(entries => entries.find(e => 
                  e.matchNumber === matchNumber &&
                  e.teamNumber === teamNumber &&
                  e.alliance?.toLowerCase().replace('alliance', '').trim() === alliance &&
                  e.eventName === eventName
                ));
              
              if (existing) {
                await db.scoutingData.delete(existing.id);
              }
              await saveScoutingEntry(entry);
            }
            results.replaced = conflictResult.autoReplace.length;
          }
          
          // Batch review: Let user decide on duplicates
          if (conflictResult.batchReview.length > 0) {
            debugLog('📋 Showing batch review dialog for duplicates');
            setBatchReviewEntries(conflictResult.batchReview);
            setPendingConflicts(conflictResult.conflicts);
            setShowBatchDialog(true);
            
            toast.success(
              `Imported ${results.added} new entries, ` +
              `Replaced ${results.replaced} existing entries. ` +
              `${conflictResult.batchReview.length} duplicates need review.`
            );
            setImportedDataCount(receivedData.length);
            return;
          }
          
          // Conflicts: Store for user resolution
          if (conflictResult.conflicts.length > 0) {
            debugLog('⚠️ Showing conflict resolution dialog');
            results.conflictsToReview = conflictResult.conflicts.length;
            setCurrentConflicts(conflictResult.conflicts);
            setCurrentConflictIndex(0);
            setConflictResolutions(new Map());
            
            toast.success(
              `Imported ${results.added} new entries, ` +
              `Replaced ${results.replaced} existing entries. ` +
              `${results.conflictsToReview} conflicts need review.`
            );
            
            setShowConflictDialog(true);
            setImportedDataCount(receivedData.length);
            return;
          }
          
          // No conflicts - success (or all skipped as duplicates)
          console.log(`✅ SUCCESS: Imported ${latest.scoutName}'s data (${newDataWithIds.length} entries) into database`);
          console.log('📊 Final results:', results);
          
          // Check if everything was skipped as duplicates
          const totalProcessed = results.added + results.replaced + results.conflictsToReview;
          const skippedCount = newDataWithIds.length - totalProcessed;
          
          if (skippedCount > 0 && totalProcessed === 0) {
            // All entries were duplicates
            toast.info(
              `All ${skippedCount} entries from ${latest.scoutName} already exist in database (skipped as duplicates)`
            );
          } else if (skippedCount > 0) {
            // Some processed, some skipped
            toast.success(
              `Import complete! ${results.added} new, ${results.replaced} replaced, ${skippedCount} duplicates skipped.`
            );
          } else {
            // All processed
            toast.success(
              `Import complete! ${results.added} new entries, ${results.replaced} entries replaced.`
            );
          }
          setImportedDataCount(receivedData.length);
        } catch (err) {
          console.error(`❌ FAILED to import data from ${latest.scoutName}:`, err);
          setErrorMessage(`Failed to import data from ${latest.scoutName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setShowErrorDialog(true);
        }
      };
      
      importData();
    }
  }, [receivedData, importedDataCount, connectedScouts, setCurrentConflicts, setCurrentConflictIndex, setConflictResolutions, setShowConflictDialog, clearReceivedData]);

  // Render main content based on mode
  const renderContent = () => {
    // Mode Selection Screen
    if (mode === 'select') {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center px-4 pb-32">
          <div className="flex flex-col items-center gap-6 max-w-md w-full">
          <Wifi className="h-16 w-16 text-primary" />
          <h1 className="text-3xl font-bold text-center">WebRTC Data Transfer</h1>
          <p className="text-muted-foreground text-center">
            Fast peer-to-peer transfer when network available
          </p>

          {/* Network Requirements */}
          <Alert className="w-full">
            <Wifi className="h-4 w-4" />
            <AlertDescription>
              <strong>Requirements:</strong> All devices need internet connectivity (WiFi or cellular data) for WebRTC to establish peer connections.
              <br/><br/>
              <strong>Best for:</strong> Practice sessions, pit area, off-season events, testing environments, or if venue provides WiFi.
              <br/><br/>
              <strong>No network available?</strong> Use the standard QR Code transfer method instead.
            </AlertDescription>
          </Alert>

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
                  onClick={handleGenerateQR}
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
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Scan {currentOffer.scoutRole}'s Answer
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
                  onFiltersChange={handleFiltersChange}
                  onApplyFilters={handleApplyFilters}
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
                  {connectedScouts.map(scout => {
                    const isReady = scout.channel?.readyState === 'open';
                    const isRequesting = requestingScouts.has(scout.id);
                    // Get the most recent data from this scout (last in array)
                    const scoutReceivedData = receivedData.filter(d => d.scoutName === scout.name);
                    const receivedLog = scoutReceivedData[scoutReceivedData.length - 1];
                    const hasReceived = !!receivedLog;
                    
                    return (
                      <div 
                        key={scout.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
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
                              <Badge variant="outline" className="text-xs text-blue-600 animate-pulse">Receiving...</Badge>
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
                            onClick={() => {
                              setRequestingScouts(prev => new Set(prev).add(scout.id));
                              debugLog('📤 Requesting', dataType, 'data from', scout.name, 'with filters:', filters);
                              requestDataFromScout(scout.id, filters, dataType);
                            }}
                            disabled={!isReady || isRequesting}
                          >
                            {isRequesting ? '...' : 'Request'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                debugLog('📤 Pushing', dataType, 'data to', scout.name);
                                let data: unknown;

                                // Load data based on selected type (same logic as push to all)
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

                                pushDataToScout(scout.id, data, dataType);
                                toast.info(`Pushing ${dataType} to ${scout.name}...`);
                              } catch (err) {
                                console.error('Failed to push data:', err);
                                toast.error('Failed to push data to ' + scout.name);
                              }
                            }}
                            disabled={!isReady}
                          >
                            Push
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Transfer Controls */}
          {connectedScouts.length > 0 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Data Transfer</CardTitle>
                <CardDescription>
                  Select data type, then request from or push to scouts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Data Type Selector */}
                <div className="space-y-2">
                  <Label htmlFor="dataType">Data Type</Label>
                  <Select value={dataType} onValueChange={(value: TransferDataType) => setDataType(value)}>
                    <SelectTrigger id="dataType">
                      <SelectValue placeholder="Select data type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scouting">Scouting Data</SelectItem>
                      <SelectItem value="pit-scouting">Pit Scouting (no images)</SelectItem>
                      <SelectItem value="match">Match Schedule</SelectItem>
                      <SelectItem value="scout">Scout Profiles</SelectItem>
                      <SelectItem value="combined">Combined (Scouting + Profiles)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Request Button */}
                <Button
                  onClick={() => {
                    // Mark all ready scouts as requesting
                    const readyScouts = connectedScouts.filter(s => s.channel?.readyState === 'open');
                    setRequestingScouts(new Set(readyScouts.map(s => s.id)));
                    // Reset imported count for fresh import tracking
                    setImportedDataCount(0);
                    debugLog('📤 Requesting', dataType, 'data with filters:', filters);
                    requestDataFromAll(filters, dataType);
                  }}
                  disabled={connectedScouts.filter(s => s.channel?.readyState === 'open').length === 0}
                  className="w-full"
                  size="lg"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Request {dataType === 'scouting' ? 'Scouting' : 
                           dataType === 'pit-scouting' ? 'Pit Scouting' :
                           dataType === 'match' ? 'Match' :
                           dataType === 'scout' ? 'Scout Profile' :
                           'Combined'} Data ({connectedScouts.filter(s => s.channel?.readyState === 'open').length} scouts)
                </Button>

                {/* Push Button */}
                <Button
                  onClick={async () => {
                    try {
                      debugLog('📤 Pushing', dataType, 'data to all scouts');
                      let data: any;

                      // Load data based on selected type
                      switch (dataType) {
                        case 'scouting': {
                          const { loadScoutingData } = await import('@/lib/scoutingDataUtils');
                          data = await loadScoutingData();
                          debugLog('Loaded scouting data:', data.entries?.length || 0, 'entries');
                          break;
                        }
                        case 'pit-scouting': {
                          const { loadPitScoutingData } = await import('@/lib/pitScoutingUtils');
                          data = await loadPitScoutingData();
                          debugLog('Loaded pit scouting data:', data.entries?.length || 0, 'entries');
                          break;
                        }
                        case 'match': {
                          const matchDataStr = localStorage.getItem('matchData');
                          const matches = matchDataStr ? JSON.parse(matchDataStr) : [];
                          data = { matches };
                          debugLog('Loaded match data:', Array.isArray(matches) ? matches.length : 0, 'matches');
                          break;
                        }
                        case 'scout': {
                          const { gameDB } = await import('@/lib/dexieDB');
                          const scouts = await gameDB.scouts.toArray();
                          const predictions = await gameDB.predictions.toArray();
                          const achievements = await gameDB.scoutAchievements.toArray();
                          data = { scouts, predictions, achievements };
                          debugLog('Loaded scout profiles:', scouts.length, 'scouts');
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
                          debugLog('Loaded combined data:', {
                            scouting: scoutingData.entries?.length || 0,
                            scouts: scouts.length,
                            predictions: predictions.length
                          });
                          break;
                        }
                      }

                      // Push data to all scouts
                      pushDataToAll(data, dataType);
                      toast.success(`Pushed ${dataType} data to ${connectedScouts.filter(s => s.channel?.readyState === 'open').length} scouts`);
                    } catch (err) {
                      console.error('Failed to push data:', err);
                      toast.error('Failed to push data: ' + (err instanceof Error ? err.message : 'Unknown error'));
                    }
                  }}
                  disabled={connectedScouts.filter(s => s.channel?.readyState === 'open').length === 0}
                  className="w-full"
                  variant="outline"
                  size="lg"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Push {dataType === 'scouting' ? 'Scouting' : 
                       dataType === 'pit-scouting' ? 'Pit Scouting' :
                       dataType === 'match' ? 'Match' :
                       dataType === 'scout' ? 'Scout Profile' :
                       'Combined'} Data to Scouts
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Data Transfer History */}
          {receivedData.length > 0 && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Transfer History
                  <Badge variant="outline" className="">
                    {receivedData.filter(d => {
                      const dataObj = d.data as { type?: string; entries?: unknown[] };
                      return dataObj.type !== 'declined' && dataObj.type !== 'push-declined';
                    }).length} completed
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Recent data requests and pushes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {receivedData.map((log, idx) => {
                    const dataObj = log.data as { type?: string; dataType?: string; entries?: unknown[] };
                    
                    // Handle declined request
                    if (dataObj.type === 'declined') {
                      return (
                        <div key={idx} className="text-sm border-l-2 border-red-500 pl-3 py-1">
                          <p className="font-medium">{log.scoutName} declined request</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      );
                    }
                    
                    // Handle declined push
                    if (dataObj.type === 'push-declined') {
                      return (
                        <div key={idx} className="text-sm border-l-2 border-yellow-500 pl-3 py-1">
                          <p className="font-medium">{log.scoutName} declined push</p>
                          <p className="text-xs text-muted-foreground">
                            {dataObj.dataType} • {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      );
                    }
                    
                    // Handle successful data transfer - show appropriate info based on data type
                    const transferDataType = (log as { dataType?: string }).dataType;
                    let displayText = '';
                    
                    if (transferDataType === 'scout') {
                      const scoutData = dataObj as { scouts?: unknown[]; predictions?: unknown[]; achievements?: unknown[] };
                      const totalItems = (scoutData.scouts?.length || 0) + 
                                       (scoutData.predictions?.length || 0) + 
                                       (scoutData.achievements?.length || 0);
                      displayText = `${totalItems} profile items`;
                    } else if (transferDataType === 'match') {
                      const matchData = dataObj as { matches?: unknown[] };
                      displayText = `${matchData.matches?.length || 0} matches`;
                    } else if (transferDataType === 'pit-scouting') {
                      const entryCount = dataObj.entries?.length || 0;
                      displayText = `${entryCount} pit entries`;
                    } else if (transferDataType === 'combined') {
                      const entryCount = dataObj.entries?.length || 0;
                      const scoutProfiles = (dataObj as { scoutProfiles?: { scouts?: unknown[]; predictions?: unknown[] } }).scoutProfiles;
                      const profileCount = (scoutProfiles?.scouts?.length || 0) + (scoutProfiles?.predictions?.length || 0);
                      displayText = `${entryCount} entries + ${profileCount} profiles`;
                    } else {
                      // Default to entries (scouting data or unknown)
                      const entryCount = dataObj.entries?.length || 0;
                      displayText = `${entryCount} entries`;
                    }
                    
                    return (
                      <div key={idx} className="text-sm border-l-2 border-green-500 pl-3 py-1">
                        <p className="font-medium">{log.scoutName} • {displayText}</p>
                        <p className="text-xs text-muted-foreground">
                          {transferDataType && `${transferDataType} • `}{new Date(log.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    );
                  })}
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
      const roleDisplay = convertTeamRole(myRole) || myRole;
      
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
                <CardDescription>Connecting as: {roleDisplay}</CardDescription>
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
                  {roleDisplay}
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
            onClick={() => setMode('select')}
            variant="ghost"
            size="sm"
          >
            ← Back
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
                <p className="text-lg font-semibold">{roleDisplay}</p>
                <Badge variant="secondary" className="mt-2">Ready ✓</Badge>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => {
              reset();
              setMode('select');
            }}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            Disconnect
          </Button>
        </div>
      </div>
    );
    }

    return null;
  };

  return (
    <>
      {renderContent()}
      {/* Custom Name Dialog */}
      <Dialog open={showCustomNameDialog} onOpenChange={setShowCustomNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Scout Name</DialogTitle>
            <DialogDescription>
              Enter a custom name for this scout (e.g., "Pit Scout", "Strategy Lead", etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Scout name..."
              value={customNameInput}
              onChange={(e) => setCustomNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomNameSubmit();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomNameDialog(false);
                setCustomNameInput('');
                setSelectedRole('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCustomNameSubmit}>
              Create QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className='p-2' onClick={() => setShowErrorDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Mismatch Dialog */}
      <AlertDialog open={showRoleMismatchDialog} onOpenChange={setShowRoleMismatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Role Mismatch Warning</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {roleMismatchInfo && (
                <>
                  <p className="font-semibold">
                    Expected: {roleMismatchInfo.expected}
                    <br />
                    Connected as: {roleMismatchInfo.actual}
                  </p>
                  <p>
                    The scout connected with the wrong role. They should:
                  </p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>Change their role to "{roleMismatchInfo.expected}" in the sidebar</li>
                    <li>Disconnect and reconnect</li>
                  </ol>
                  <p className="mt-2">
                    Do you want to keep this connection anyway?
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRoleMismatchDisconnect}>
              Disconnect
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowRoleMismatchDialog(false);
              setRoleMismatchInfo(null);
            }}>
              Keep Connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Review Dialog */}
      <BatchConflictDialog
        isOpen={showBatchDialog}
        entries={batchReviewEntries}
        onResolve={handleBatchReviewDecision}
        isProcessing={isProcessing}
      />
      
      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflict={currentConflicts[currentConflictIndex] || null}
        currentIndex={currentConflictIndex}
        totalConflicts={currentConflicts.length}
        onResolve={handleConflictResolution}
        onBatchResolve={handleBatchResolve}
        onUndo={handleUndo}
        canUndo={canUndo}
        isProcessing={isProcessing}
      />
    </>
  );
};

export default PeerTransferPage;
