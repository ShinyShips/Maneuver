/**
 * Peer-to-Peer Data Transfer Page with WebRTC QR Signaling
 * Lead Scout Mode: Generate QR per scout, scan answers, request data
 * Scout Mode: Scan lead's QR, display answer, respond to requests
 */

import { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/button';
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
import { useWebRTC } from '@/contexts/WebRTCContext';
import { useWebRTCQRTransfer } from '@/hooks/useWebRTCQRTransfer';
import { type ScoutingDataWithId, type ConflictInfo } from '@/lib/scoutingDataUtils';
import { useConflictResolution } from '@/hooks/useConflictResolution';
import ConflictResolutionDialog from '@/components/DataTransferComponents/ConflictResolutionDialog';
import { BatchConflictDialog } from '@/components/DataTransferComponents/BatchConflictDialog';
import { createDefaultFilters, type DataFilters } from '@/lib/dataFiltering';
import { loadScoutingData } from '@/lib/scoutingDataUtils';
import { toast } from 'sonner';
import type { TransferDataType } from '@/contexts/WebRTCContext';
import { 
  ModeSelectionScreen, 
  LeadScoutMode,
  ScoutMode,
  RoomCodeConnection
} from '@/components/PeerTransferComponents';
import { useQRCodeConnection } from '@/hooks/useQRCodeConnection';
import { usePeerTransferPush } from '@/hooks/usePeerTransferPush';
import { usePeerTransferImport } from '@/hooks/usePeerTransferImport';
import { debugLog } from '@/lib/peerTransferUtils';

const PeerTransferPage = () => {
  // Use WebRTC context mode directly (persists across navigation)
  const { mode: webrtcMode, setMode: setWebrtcMode, signaling } = useWebRTC();
  const mode = webrtcMode;
  const setMode = setWebrtcMode;
  const [importedDataCount, setImportedDataCount] = useState(0); // Track how many items we've imported
  const [requestingScouts, setRequestingScouts] = useState<Set<string>>(new Set()); // Track which scouts we're requesting from
  const [historyCollapsed, setHistoryCollapsed] = useState(false); // Collapse transfer history
  
  // Filtering state
  const [filters, setFilters] = useState<DataFilters>(createDefaultFilters());
  const [allScoutingData, setAllScoutingData] = useState<Awaited<ReturnType<typeof loadScoutingData>> | null>(null);
  
  // Data type selection
  const [dataType, setDataType] = useState<TransferDataType>('scouting');
  
  // Error dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
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
    addToReceivedData,
    connectionStatus,
    scoutAnswer,
    scoutOfferReceived,
    shouldAttemptReconnect,
    setShouldAttemptReconnect,
    lastScoutName,
    lastOffer,
    startAsLead,
    createOfferForScout,
    processScoutAnswer,
    startAsScout,
    requestDataFromScout,
    requestDataFromAll,
    pushDataToAll,
    pushDataToScout,
    disconnectScout,
    reset,
  } = useWebRTCQRTransfer();

  // QR Code connection logic
  const qrConnection = useQRCodeConnection({
    createOfferForScout,
    processScoutAnswer,
    startAsScout: async (name: string, offer: string) => {
      await startAsScout(name, offer);
    },
    connectedScouts
  });

  // Data push logic
  const { pushData } = usePeerTransferPush({
    addToReceivedData,
    pushDataToAll
  });

  // Auto-import logic for received data
  usePeerTransferImport({
    receivedData,
    importedDataCount,
    setImportedDataCount,
    connectedScouts,
    setRequestingScouts,
    setBatchReviewEntries,
    setPendingConflicts,
    setShowBatchDialog,
    setCurrentConflicts,
    setCurrentConflictIndex,
    setConflictResolutions,
    setShowConflictDialog,
    setErrorMessage,
    setShowErrorDialog,
  });

  // Clear requesting state when new data arrives (separate from import logic)
  // This ensures the UI updates immediately even if import is delayed
  useEffect(() => {
    if (receivedData.length > importedDataCount) {
      const latest = receivedData[receivedData.length - 1];
      const scoutId = connectedScouts.find(s => s.name === latest.scoutName)?.id;
      
      if (scoutId && requestingScouts.has(scoutId)) {
        debugLog(`🔄 Clearing requesting state for ${latest.scoutName}`);
        setRequestingScouts(prev => {
          const next = new Set(prev);
          next.delete(scoutId);
          return next;
        });
      }
    }
  }, [receivedData, importedDataCount, connectedScouts, requestingScouts]);

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

  // Wrap QR connection handlers to handle errors with dialog
  const handleGenerateQR = qrConnection.handleGenerateQR;
  
  const handleCustomNameSubmit = async () => {
    const result = await qrConnection.handleCustomNameSubmit();
    if (result?.error) {
      setErrorMessage(result.error);
      setShowErrorDialog(true);
    }
  };

  const handleAnswerScan = async (result: string) => {
    const response = await qrConnection.handleAnswerScan(result);
    if (response?.error) {
      setErrorMessage(response.error);
      setShowErrorDialog(true);
    }
  };
  
  const handleOfferScan = async (result: string) => {
    const response = await qrConnection.handleOfferScan(result, myRole);
    if (response?.error) {
      setErrorMessage(response.error);
      setShowErrorDialog(true);
    }
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

  // Handle disconnect notification from lead (scout mode)
  useEffect(() => {
    const handleDisconnect = () => {
      toast.error('Lead has disconnected you');
      // Reset scout mode to initial state
      reset();
      setMode('select');
    };

    window.addEventListener('webrtc-disconnected-by-lead', handleDisconnect);
    return () => {
      window.removeEventListener('webrtc-disconnected-by-lead', handleDisconnect);
    };
  }, [reset]);

  // Clean up WebRTC state when returning to mode selection
  // Only reset once when transitioning TO select mode (not on every render while in select mode)
  const previousMode = useRef<string>(mode);
  useEffect(() => {
    if (mode === 'select' && previousMode.current !== 'select') {
      // Reset WebRTC connection state when going back to mode selection
      reset();
    }
    previousMode.current = mode;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]); // Intentionally not including reset to avoid infinite loop

  // Handle auto-reconnect
  // With room codes, scout can auto-rejoin the saved room
  useEffect(() => {
    if (shouldAttemptReconnect && mode === 'scout') {
      const savedRoomCode = localStorage.getItem('webrtc_scout_room_code');
      
      if (savedRoomCode) {
        console.log('🔄 Connection lost. Will auto-rejoin room:', savedRoomCode);
        
        toast.info(`Connection lost. Rejoining room ${savedRoomCode}...`, {
          duration: 3000,
        });
        
        // Trigger the scout to send a new join message
        // The signaling is still connected, so we just need to rejoin
        if (signaling?.connected) {
          console.log('🔄 Sending new join message after connection loss');
          signaling.join();
        }
      } else {
        console.log('🔄 Connection lost. No saved room code.');
        
        toast.info('Connection lost. Please rejoin the room code to reconnect.', {
          duration: 5000,
        });
        
        // Reset to select mode so user can rejoin
        setMode('select');
        reset();
      }
      
      // Reset the reconnect flag
      setShouldAttemptReconnect(false);
    }
  }, [shouldAttemptReconnect, mode, setShouldAttemptReconnect, reset, setMode, signaling]);

  // Render main content based on mode
  const renderContent = () => {
    // Mode Selection Screen
    if (mode === 'select') {
      return (
        <ModeSelectionScreen
          onSelectLead={() => {
            setMode('lead');
          }}
          onSelectScout={() => setMode('scout')}
        />
      );
    }

    // Lead Scout Mode
    if (mode === 'lead') {
      return (
        <LeadScoutMode
          connectedScouts={connectedScouts}
          receivedData={receivedData}
          dataType={dataType}
          setDataType={setDataType}
          filters={filters}
          allScoutingData={allScoutingData}
          historyCollapsed={historyCollapsed}
          setHistoryCollapsed={setHistoryCollapsed}
          requestingScouts={requestingScouts}
          setRequestingScouts={setRequestingScouts}
          setImportedDataCount={setImportedDataCount}
          onBack={() => setMode('select')}
          onRequestDataFromScout={requestDataFromScout}
          onRequestDataFromAll={requestDataFromAll}
          onPushData={pushData}
          onPushDataToScout={pushDataToScout}
          onDisconnectScout={(scoutId) => {
            disconnectScout(scoutId);
            toast.info(`Disconnected ${connectedScouts.find(s => s.id === scoutId)?.name}`);
          }}
          onAddToHistory={addToReceivedData}
          onClearHistory={clearReceivedData}
          onFiltersChange={handleFiltersChange}
          onApplyFilters={handleApplyFilters}
        />
      );
    }

    // Scout Mode
    if (mode === 'scout') {
      return (
        <ScoutMode
          myRole={myRole}
          onBack={() => setMode('select')}
          onCancel={() => {
            reset();
            setMode('select');
          }}
        />
      );
    }

    return null;
  };

  return (
    <>
      {renderContent()}
      {/* Custom Name Dialog */}
      <Dialog open={qrConnection.showCustomNameDialog} onOpenChange={qrConnection.setShowCustomNameDialog}>
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
              value={qrConnection.customNameInput}
              onChange={(e) => qrConnection.setCustomNameInput(e.target.value)}
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
                qrConnection.setShowCustomNameDialog(false);
                qrConnection.setCustomNameInput('');
                qrConnection.setSelectedRole('');
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
      <AlertDialog open={qrConnection.showRoleMismatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Role Mismatch Warning</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {qrConnection.roleMismatchInfo && (
                <>
                  <p className="font-semibold">
                    Expected: {qrConnection.roleMismatchInfo.expected}
                    <br />
                    Connected as: {qrConnection.roleMismatchInfo.actual}
                  </p>
                  <p>
                    The scout connected with the wrong role. They should:
                  </p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>Change their role to "{qrConnection.roleMismatchInfo.expected}" in the sidebar</li>
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
            <AlertDialogCancel onClick={qrConnection.handleRoleMismatchDisconnect}>
              Disconnect
            </AlertDialogCancel>
            <AlertDialogAction onClick={qrConnection.keepRoleMismatchConnection}>
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
