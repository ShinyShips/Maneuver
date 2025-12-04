/**
 * WebRTC Notifications Component
 * Handles toast notifications for WebRTC connection status changes
 * This component should be mounted at the app level to provide notifications on any page
 */

import { useEffect, useRef } from 'react';
import { useWebRTC } from '@/contexts/WebRTCContext';
import { toast } from 'sonner';

export function WebRTCNotifications() {
  const { mode, connectionStatus } = useWebRTC();
  const lastConnectionStatusRef = useRef(connectionStatus);

  useEffect(() => {
    // Detect when connection is lost (was connected, now not)
    const wasConnected = lastConnectionStatusRef.current.includes('Connected');
    const isNowConnected = connectionStatus.includes('Connected');
    const isNowDisconnected = !isNowConnected;
    
    // Only show toasts for scouts (leads manage their own connections)
    if (mode === 'scout') {
      if (wasConnected && isNowDisconnected) {
        console.log('🔌 Notification: Connection lost');
        toast.error('Connection to lead lost');
      } else if (!wasConnected && isNowConnected) {
        console.log('✅ Notification: Connection established');
        toast.success('Connected to lead scout');
      }
    }
    
    lastConnectionStatusRef.current = connectionStatus;
  }, [connectionStatus, mode]);

  // This component doesn't render anything
  return null;
}
