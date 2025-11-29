/**
 * useLiveSessionSocket Hook
 * Real-time updates for live sessions using Socket.IO
 * Phase 2 - Collaborative Features
 */

import { useEffect } from 'react';
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
  onAttendeeJoined?: (data: AttendeeJoinedData) => void;
  onAttendeeLeft?: (data: AttendeeLeftData) => void;
}

/**
 * Hook to listen to live session real-time events
 */
export const useLiveSessionSocket = (callbacks: LiveSessionSocketCallbacks) => {
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Session started event
    if (callbacks.onSessionStarted) {
      socket.on('session-started', callbacks.onSessionStarted);
    }

    // Session ended event
    if (callbacks.onSessionEnded) {
      socket.on('session-ended', callbacks.onSessionEnded);
    }

    // Session created event
    if (callbacks.onSessionCreated) {
      socket.on('session-created', callbacks.onSessionCreated);
    }

    // Session cancelled event
    if (callbacks.onSessionCancelled) {
      socket.on('session-cancelled', callbacks.onSessionCancelled);
    }

    // Attendee joined event
    if (callbacks.onAttendeeJoined) {
      socket.on('attendee-joined', callbacks.onAttendeeJoined);
    }

    // Attendee left event
    if (callbacks.onAttendeeLeft) {
      socket.on('attendee-left', callbacks.onAttendeeLeft);
    }

    // Cleanup on unmount
    return () => {
      if (callbacks.onSessionStarted) {
        socket.off('session-started', callbacks.onSessionStarted);
      }
      if (callbacks.onSessionEnded) {
        socket.off('session-ended', callbacks.onSessionEnded);
      }
      if (callbacks.onSessionCreated) {
        socket.off('session-created', callbacks.onSessionCreated);
      }
      if (callbacks.onSessionCancelled) {
        socket.off('session-cancelled', callbacks.onSessionCancelled);
      }
      if (callbacks.onAttendeeJoined) {
        socket.off('attendee-joined', callbacks.onAttendeeJoined);
      }
      if (callbacks.onAttendeeLeft) {
        socket.off('attendee-left', callbacks.onAttendeeLeft);
      }
    };
  }, [callbacks]);
};

/**
 * Join a live session room (for real-time updates)
 */
export const joinLiveSession = (sessionId: string) => {
  const socket = socketService.getSocket();
  if (socket) {
    socket.emit('join-live-session', { sessionId });
  }
};

/**
 * Leave a live session room
 */
export const leaveLiveSession = (sessionId: string) => {
  const socket = socketService.getSocket();
  if (socket) {
    socket.emit('leave-live-session', { sessionId });
  }
};
