/**
 * useLiveSessionSocket Hook
 * Real-time updates for live sessions using Socket.IO
 * Phase 2 - Collaborative Features
 */

import { useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';

interface SessionStartedData {
  sessionId: string;
  instructorId: string;
  startedAt: string;
}

interface SessionEndedData {
  sessionId: string;
  courseId?: string;
  title?: string;
  endedAt: string;
}

interface SessionCreatedData {
  sessionId: string;
  courseId: string;
  title: string;
  scheduledAt: string;
  instructorId: string;
}

interface SessionCancelledData {
  sessionId: string;
  courseId: string;
  title: string;
}

interface SessionDeletedData {
  sessionId: string;
  courseId: string;
  title: string;
}

interface SessionUpdatedData {
  sessionId: string;
  courseId: string;
  updates: {
    title?: string;
    description?: string;
    scheduledAt?: string;
    duration?: number;
    capacity?: number;
    streamUrl?: string;
    materials?: string;
  };
}

interface AttendeeJoinedData {
  sessionId: string;
  userId: string;
  userName: string;
  joinedAt: string;
}

interface AttendeeLeftData {
  sessionId: string;
  userId: string;
  userName: string;
  leftAt: string;
}

interface LiveSessionSocketCallbacks {
  onSessionStarted?: (data: SessionStartedData) => void;
  onSessionEnded?: (data: SessionEndedData) => void;
  onSessionCreated?: (data: SessionCreatedData) => void;
  onSessionCancelled?: (data: SessionCancelledData) => void;
  onSessionDeleted?: (data: SessionDeletedData) => void;
  onSessionUpdated?: (data: SessionUpdatedData) => void;
  onAttendeeJoined?: (data: AttendeeJoinedData) => void;
  onAttendeeLeft?: (data: AttendeeLeftData) => void;
}

/**
 * Hook to listen to live session real-time events
 */
export const useLiveSessionSocket = (callbacks: LiveSessionSocketCallbacks) => {
  // Use refs to store latest callbacks without triggering re-registration
  const callbacksRef = useRef(callbacks);
  
  // Update ref when callbacks change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Wrapper functions that use the ref
    const handleSessionStarted = (data: SessionStartedData) => {
      callbacksRef.current.onSessionStarted?.(data);
    };

    const handleSessionEnded = (data: SessionEndedData) => {
      callbacksRef.current.onSessionEnded?.(data);
    };

    const handleSessionCreated = (data: SessionCreatedData) => {
      callbacksRef.current.onSessionCreated?.(data);
    };

    const handleSessionCancelled = (data: SessionCancelledData) => {
      callbacksRef.current.onSessionCancelled?.(data);
    };

    const handleSessionDeleted = (data: SessionDeletedData) => {
      callbacksRef.current.onSessionDeleted?.(data);
    };

    const handleSessionUpdated = (data: SessionUpdatedData) => {
      callbacksRef.current.onSessionUpdated?.(data);
    };

    const handleAttendeeJoined = (data: AttendeeJoinedData) => {
      callbacksRef.current.onAttendeeJoined?.(data);
    };

    const handleAttendeeLeft = (data: AttendeeLeftData) => {
      callbacksRef.current.onAttendeeLeft?.(data);
    };

    // Register listeners (only once)
    socket.on('session-started', handleSessionStarted);
    socket.on('session-ended', handleSessionEnded);
    socket.on('session-created', handleSessionCreated);
    socket.on('session-cancelled', handleSessionCancelled);
    socket.on('session-deleted', handleSessionDeleted);
    socket.on('session-updated', handleSessionUpdated);
    socket.on('attendee-joined', handleAttendeeJoined);
    socket.on('attendee-left', handleAttendeeLeft);

    // Cleanup on unmount
    return () => {
      socket.off('session-started', handleSessionStarted);
      socket.off('session-ended', handleSessionEnded);
      socket.off('session-created', handleSessionCreated);
      socket.off('session-cancelled', handleSessionCancelled);
      socket.off('session-deleted', handleSessionDeleted);
      socket.off('session-updated', handleSessionUpdated);
      socket.off('attendee-joined', handleAttendeeJoined);
      socket.off('attendee-left', handleAttendeeLeft);
    };
  }, []); // Empty deps - only register once when component mounts
};

/**
 * Join a live session room (for real-time updates)
 */
export const joinLiveSession = (sessionId: string) => {
  const socket = socketService.getSocket();
  if (socket && socketService.isConnected()) {
    socket.emit('join-live-session', { sessionId });
  }
};

/**
 * Leave a live session room
 */
export const leaveLiveSession = (sessionId: string) => {
  const socket = socketService.getSocket();
  if (socket && socketService.isConnected()) {
    socket.emit('leave-live-session', { sessionId });
  }
};
