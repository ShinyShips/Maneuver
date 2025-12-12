/**
 * Room Code Connection System
 * Replaces QR code scanning with simple room codes
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { useCurrentScout } from '@/hooks/useCurrentScout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Button from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RoomCodeConnectionProps {
  mode: 'lead' | 'scout';
}

export function RoomCodeConnection({ mode }: RoomCodeConnectionProps) {
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    mode: webrtcMode,
    connectionStatus,
    roomCode,
    setRoomCode,
    generateRoomCodeForLead,
    signaling
  } = useWebRTC();

  // Use context's persistent signaling (already handles messages)

  // Get current scout info from sidebar
  const { currentScout } = useCurrentScout();
  const playerStation = localStorage.getItem('playerStation') || 'Unknown';
  const scoutName = currentScout?.name || 'Scout';

  // Lead: Generate room code if not present (context handles persistence)
  useEffect(() => {
    if (mode === 'lead' && !roomCode) {
      // Context will have restored from localStorage if available
      // If still null, generate a new one
      console.log('🔑 Lead: Generating room code...');
      generateRoomCodeForLead();
    }
  }, [mode, roomCode, generateRoomCodeForLead]);

  // Scout: Restore saved room code for auto-reconnect
  const hasAutoRejoined = useRef(false);
  
  // Reset auto-rejoin flag and clear input when WebRTC mode changes (connection was reset)
  useEffect(() => {
    if (webrtcMode === 'select') {
      hasAutoRejoined.current = false;
      setInputCode(''); // Clear input so it can be restored
      setConnecting(false); // Clear connecting state
    }
  }, [webrtcMode]);
  
  useEffect(() => {
    if (mode === 'scout' && !inputCode && !hasAutoRejoined.current) {
      const savedRoomCode = localStorage.getItem('webrtc_scout_room_code');
      if (savedRoomCode) {
        setInputCode(savedRoomCode);
        // Will auto-join in the next effect
      }
    }
  }, [mode, inputCode]);

  // Signaling is now handled by WebRTC context (persistent across navigation)
  // Component just displays UI and triggers signaling actions via context

  // Clear timeout and countdown when connection is established
  useEffect(() => {
    if (connectionStatus.includes('Connected')) {
      console.log('✅ Connection established, clearing timeout');
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setConnecting(false);
      setCountdown(30);
    }
  }, [connectionStatus]);

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success('Room code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearSavedRoom = useCallback(() => {
    // Clear saved room code and input
    localStorage.removeItem('webrtc_scout_room_code');
    setInputCode('');
    hasAutoRejoined.current = false;
    
    // Leave signaling room if connected
    if (signaling) {
      signaling.leave();
    }
    
    // Clear room code in context
    setRoomCode(null);
    
    toast.success('Saved room code cleared');
  }, [signaling, setRoomCode]);

  const handleJoinRoom = useCallback(async () => {
    if (!inputCode.trim() || !signaling) {
      toast.error('Please enter a room code');
      return;
    }

    setConnecting(true);
    setCountdown(30); // Reset countdown
    
    // Clear any existing timeout and countdown
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    try {
      // Save the room code for auto-reconnect and set in context
      localStorage.setItem('webrtc_scout_room_code', inputCode);
      setRoomCode(inputCode); // This will trigger context signaling to join
      
      toast.success(`Joining room ${inputCode}...`);
      
      // Start countdown timer (updates every second)
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Set timeout for waiting for offer from lead (30 seconds for slow networks)
      connectionTimeoutRef.current = setTimeout(async () => {
        console.log('🔑 Lead scout not found in room - timeout fired');
        // If still connecting after 30 seconds, the lead probably isn't in the room
        // Always show the error since 30 seconds passed without connection
        toast.error('Lead scout not found in room. Make sure lead has the page open.');
        setConnecting(false);
        setCountdown(30);
        
        // Clear countdown interval
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        
        // Leave the signaling room to disconnect
        // But keep the room code so scout can easily retry
        if (signaling) {
          console.log('🔑 Leaving signaling room after timeout');
          await signaling.leave();
        }
        
        // Clear the room code in context to disable signaling
        // But keep it in localStorage and input field so scout can retry
        setRoomCode(null);
      }, 30000); // 30 second timeout for slow network compatibility
    } catch (err) {
      console.error('Failed to join room:', err);
      toast.error('Failed to join room');
      setConnecting(false);
      setCountdown(30);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
  }, [inputCode, signaling, setRoomCode]);

  // Scout: Auto-join when room code is restored (UI-level)
  // This provides visual feedback (countdown, connecting state) when on the Peer Transfer page
  // The context-level auto-join handles background reconnection when on other pages
  useEffect(() => {
    if (mode === 'scout' && inputCode && !connecting && signaling && !signaling.connected && !hasAutoRejoined.current) {
      const savedRoomCode = localStorage.getItem('webrtc_scout_room_code');
      // Only auto-join if this is the saved room code (not manually entered)
      if (savedRoomCode === inputCode) {
        console.log('🔄 Component: Auto-joining with UI feedback');
        hasAutoRejoined.current = true;
        // Small delay to ensure component is fully mounted
        setTimeout(() => {
          handleJoinRoom();
        }, 500);
      }
    }
  }, [mode, inputCode, connecting, signaling, handleJoinRoom]);

  if (mode === 'lead') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Room Code</CardTitle>
            {signaling?.connected ? (
              <Badge variant="default" className="gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Room Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Starting Room...
              </Badge>
            )}
          </div>
          <CardDescription>
            Share this code with scouts to connect
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 p-4 bg-primary/10 rounded-lg text-center">
              <div className="text-3xl font-bold tracking-wider text-primary">
                {roomCode}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyCode}
              title="Copy room code"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              generateRoomCodeForLead();
              toast.success('New room code generated');
            }}
            className="w-full text-xs"
          >
            Generate New Code
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Scout mode - hide card when fully connected to WebRTC
  // connectionStatus can be "Connected - Ready to send data" or contain "Connected"
  const isWebRTCConnected = webrtcMode === 'scout' && connectionStatus.includes('Connected');
  
  if (mode === 'scout' && isWebRTCConnected) {
    // Scout is already connected via WebRTC, no need to show room code card
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Join Room</CardTitle>
        <CardDescription>
          Enter the 6-digit room code from your lead scout
        </CardDescription>
        
        {/* Display scout info as badges */}
        <div className="flex gap-2 pt-2">
          <Badge variant="secondary">{scoutName}</Badge>
          <Badge variant="outline">{playerStation}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Room Code</label>
            {inputCode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSavedRoom}
                className="h-auto py-1 px-2 text-xs"
              >
                Clear Saved
              </Button>
            )}
          </div>
          <Input
            placeholder="e.g., 582943"
            value={inputCode}
            onChange={(e) => {
              // Only allow numbers
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setInputCode(value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputCode.length === 6 && !(connecting && signaling?.connected)) {
                handleJoinRoom();
              }
            }}
            disabled={connecting && signaling?.connected}
            className="text-center text-3xl font-bold tracking-wider"
            maxLength={6}
            inputMode="numeric"
          />
        </div>

        <Button
          className="w-full"
          onClick={handleJoinRoom}
          disabled={inputCode.length !== 6 || (connecting && signaling?.connected)}
        >
          {connecting && signaling?.connected ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {signaling.connected ? 'Establishing Connection...' : 'Connecting...'}
            </>
          ) : (
            'Join Room'
          )}
        </Button>

        {connecting && countdown > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Waiting for lead scout... ({countdown}s)
          </p>
        )}

        {signaling?.error && (
          <p className="text-sm text-destructive">{signaling.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
