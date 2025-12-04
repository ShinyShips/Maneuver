/**
 * WebRTC Connection Status Indicator
 * Shows current connection status in the app header
 */

import { Wifi, WifiOff, Users } from 'lucide-react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { Badge } from '@/components/ui/badge';

export function WebRTCStatus() {
  const { mode, connectedScouts, connectionStatus } = useWebRTC();

  if (mode === 'select') {
    return null; // Don't show anything if not in a mode
  }

  if (mode === 'lead') {
    const connected = connectedScouts.filter(s => s.status === 'connected').length;
    const total = connectedScouts.length;

    if (total === 0) {
      return null; // Don't show if no scouts connected
    }

    return (
      <Badge variant={connected > 0 ? 'default' : 'secondary'} className="gap-1">
        <Users className="h-3 w-3" />
        {connected}/{total} scouts
      </Badge>
    );
  }

  if (mode === 'scout') {
    const isConnected = connectionStatus.includes('connected');
    
    return (
      <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
        {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {isConnected ? 'Connected' : 'Connecting...'}
      </Badge>
    );
  }

  return null;
}
