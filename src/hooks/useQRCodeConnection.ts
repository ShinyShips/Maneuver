import { useState, useCallback } from 'react';
import { convertTeamRole } from '@/lib/utils';

interface ConnectedScout {
  id: string;
  name: string;
}

interface UseQRCodeConnectionOptions {
  createOfferForScout: (name: string) => Promise<{ scoutId: string; offer: string }>;
  processScoutAnswer: (scoutId: string, answer: string) => Promise<void>;
  startAsScout: (name: string, offer: string) => Promise<void>;
  connectedScouts: ConnectedScout[];
}

interface RoleMismatchInfo {
  expected: string;
  actual: string;
  scoutId: string;
}

export function useQRCodeConnection({
  createOfferForScout,
  processScoutAnswer,
  startAsScout,
  connectedScouts
}: UseQRCodeConnectionOptions) {
  const [selectedRole, setSelectedRole] = useState('');
  const [currentOffer, setCurrentOffer] = useState<{ scoutId: string; offer: string; scoutRole: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showCustomNameDialog, setShowCustomNameDialog] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('');
  const [showRoleMismatchDialog, setShowRoleMismatchDialog] = useState(false);
  const [roleMismatchInfo, setRoleMismatchInfo] = useState<RoleMismatchInfo | null>(null);

  // Lead: Generate QR for selected role
  const handleGenerateQR = useCallback(async () => {
    if (!selectedRole) return;
    
    if (selectedRole === 'other') {
      setShowCustomNameDialog(true);
      return;
    }
    
    const roleDisplay = convertTeamRole(selectedRole) || selectedRole;
    const { scoutId, offer } = await createOfferForScout(roleDisplay);
    setCurrentOffer({ scoutId, offer, scoutRole: roleDisplay });
    setSelectedRole('');
  }, [selectedRole, createOfferForScout]);

  // Handle custom name submission
  const handleCustomNameSubmit = useCallback(async () => {
    if (!customNameInput || customNameInput.trim() === '') {
      return { error: 'Please enter a valid name' };
    }
    
    const roleDisplay = customNameInput.trim();
    setShowCustomNameDialog(false);
    setCustomNameInput('');
    setSelectedRole('');
    
    const { scoutId, offer } = await createOfferForScout(roleDisplay);
    setCurrentOffer({ scoutId, offer, scoutRole: roleDisplay });
    return { success: true };
  }, [customNameInput, createOfferForScout]);

  // Lead: Scan scout's answer QR
  const handleAnswerScan = useCallback(async (result: string) => {
    try {
      if (!currentOffer) return { error: 'No offer available' };
      
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
      return { success: true };
    } catch (err) {
      console.error('Failed to process answer QR:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setShowScanner(true);
      return { error: `Invalid QR code: ${errorMsg}\n\nTry scanning again with better lighting.` };
    }
  }, [currentOffer, processScoutAnswer, connectedScouts]);

  // Scout: Scan lead's offer QR
  const handleOfferScan = useCallback(async (result: string, myRole: string) => {
    try {
      console.log('Scanned offer QR length:', result.length);
      console.log('Offer QR preview:', result.substring(0, 100) + '...');
      
      setShowScanner(false);
      const roleDisplay = convertTeamRole(myRole) || myRole;
      
      await startAsScout(roleDisplay, result);
      return { success: true };
    } catch (err) {
      console.error('Failed to process QR code:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setShowScanner(true);
      return { error: `Invalid QR code: ${errorMsg}\n\nTry scanning again with better lighting.` };
    }
  }, [startAsScout]);

  // Handle role mismatch disconnect
  const handleRoleMismatchDisconnect = useCallback(() => {
    if (roleMismatchInfo) {
      const connectedScout = connectedScouts.find(s => s.id === roleMismatchInfo.scoutId);
      if (connectedScout && 'connection' in connectedScout) {
        const scoutWithConnection = connectedScout as ConnectedScout & { 
          connection: { close: () => void }; 
          dataChannel?: { close: () => void } 
        };
        scoutWithConnection.connection.close();
        scoutWithConnection.dataChannel?.close();
      }
    }
    setShowRoleMismatchDialog(false);
    setRoleMismatchInfo(null);
  }, [roleMismatchInfo, connectedScouts]);

  const keepRoleMismatchConnection = useCallback(() => {
    setShowRoleMismatchDialog(false);
    setRoleMismatchInfo(null);
  }, []);

  return {
    // State
    selectedRole,
    currentOffer,
    showScanner,
    showCustomNameDialog,
    customNameInput,
    showRoleMismatchDialog,
    roleMismatchInfo,
    
    // Setters
    setSelectedRole,
    setShowScanner,
    setCustomNameInput,
    setShowCustomNameDialog,
    
    // Handlers
    handleGenerateQR,
    handleCustomNameSubmit,
    handleAnswerScan,
    handleOfferScan,
    handleRoleMismatchDisconnect,
    keepRoleMismatchConnection
  };
}
