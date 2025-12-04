/**
 * usePresence Hook
 * Manages user presence with Socket.IO real-time updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { PresenceStatus, PresenceEventData } from '../types/presence';
import { presenceApi } from '../services/presenceApi';
import { socketService } from '../services/socketService';

interface UsePresenceOptions {
  autoHeartbeat?: boolean;
  heartbeatInterval?: number; // milliseconds
  onUserOnline?: (data: PresenceEventData) => void;
  onUserOffline?: (data: PresenceEventData) => void;
  onUserStatusChange?: (data: PresenceEventData) => void;
}

export const usePresence = (options: UsePresenceOptions = {}) => {
  const {
    autoHeartbeat = true,
    heartbeatInterval = 60000, // 60 seconds
    onUserOnline,
    onUserOffline,
    onUserStatusChange,
  } = options;

  const [currentStatus, setCurrentStatus] = useState<PresenceStatus>('online');
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use refs for callbacks to prevent re-registering listeners
  const onUserOnlineRef = useRef(onUserOnline);
  const onUserOfflineRef = useRef(onUserOffline);
  const onUserStatusChangeRef = useRef(onUserStatusChange);

  useEffect(() => {
    onUserOnlineRef.current = onUserOnline;
    onUserOfflineRef.current = onUserOffline;
    onUserStatusChangeRef.current = onUserStatusChange;
  }, [onUserOnline, onUserOffline, onUserStatusChange]);

  // Update presence status
  const updateStatus = useCallback(async (status: PresenceStatus, activity?: string) => {
    try {
      await presenceApi.updateStatus(status, activity);
      setCurrentStatus(status);

      // Also emit via socket for real-time updates
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('update-presence', { status, activity });
      }
    } catch (error) {
      console.error('Error updating presence status:', error);
      throw error;
    }
  }, []);

  // Update activity
  const updateActivity = useCallback(async (activity: string) => {
    try {
      await presenceApi.updateActivity(activity);

      // Emit via socket
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('update-activity', { activity });
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  }, []);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    try {
      // Send via REST API
      await presenceApi.sendHeartbeat();

      // Also send via socket
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('presence-heartbeat');
      }
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }, []);

  // Setup heartbeat interval
  useEffect(() => {
    if (autoHeartbeat) {
      heartbeatTimerRef.current = setInterval(sendHeartbeat, heartbeatInterval);

      return () => {
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
        }
      };
    }
  }, [autoHeartbeat, heartbeatInterval, sendHeartbeat]);

  // Fetch initial status on mount
  useEffect(() => {
    const fetchInitialStatus = async () => {
      try {
        const presence = await presenceApi.getMyPresence();
        if (presence) {
          setCurrentStatus(presence.Status);
        }
      } catch (error) {
        console.error('Error fetching initial presence status:', error);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    fetchInitialStatus();
  }, []);

  // Setup Socket.IO listeners
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handlePresenceChanged = (data: PresenceEventData) => {
      console.log('Presence changed:', data);
      
      // Call appropriate callback based on status change
      if (data.status === 'online' && onUserOnlineRef.current) {
        onUserOnlineRef.current(data);
      } else if (data.status === 'offline' && onUserOfflineRef.current) {
        onUserOfflineRef.current(data);
      }
      
      // Always call the status change callback
      if (onUserStatusChangeRef.current) {
        onUserStatusChangeRef.current(data);
      }
    };

    const handlePresenceUpdated = (data: { status: PresenceStatus; activity?: string }) => {
      console.log('Own presence updated:', data);
      setCurrentStatus(data.status);
    };

    // Register listeners
    socket.on('presence-changed', handlePresenceChanged);
    socket.on('presence-updated', handlePresenceUpdated);

    // Cleanup
    return () => {
      socket.off('presence-changed', handlePresenceChanged);
      socket.off('presence-updated', handlePresenceUpdated);
    };
  }, []);

  return {
    currentStatus,
    isLoadingStatus,
    updateStatus,
    updateActivity,
    sendHeartbeat,
  };
};
