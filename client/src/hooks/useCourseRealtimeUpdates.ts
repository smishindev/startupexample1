/**
 * useCourseRealtimeUpdates Hook
 * 
 * Listens for real-time course data changes via Socket.IO.
 * Used by CourseDetailPage to refresh when instructor updates course metadata or lessons.
 * 
 * Events listened:
 * - course:updated (metadata, lessons changed)
 * - course:enrollment-changed (enrollment count changed)
 * 
 * Design: Debounced re-fetch (300ms) to avoid hammering the API on rapid changes.
 * Uses onConnect/offConnect to survive socket reconnections and late connections.
 */

import { useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socketService';

interface CourseUpdatedData {
  courseId: string;
  fields: string[];
  timestamp: string;
}

interface EnrollmentChangedData {
  courseId: string;
  timestamp: string;
}

export const useCourseRealtimeUpdates = (
  courseId: string | undefined,
  onUpdate: () => void
) => {
  const onUpdateRef = useRef(onUpdate);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track current listener references for cleanup
  const listenersRef = useRef<{
    handleCourseUpdated: ((data: CourseUpdatedData) => void) | null;
    handleEnrollmentChanged: ((data: EnrollmentChangedData) => void) | null;
  }>({ handleCourseUpdated: null, handleEnrollmentChanged: null });

  // Keep the callback ref current without re-registering listeners
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Debounced trigger — batches rapid events into one re-fetch
  const triggerUpdate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onUpdateRef.current();
    }, 300);
  }, []);

  useEffect(() => {
    if (!courseId) return;

    // Remove any existing listeners before registering new ones
    const removeListeners = () => {
      const socket = socketService.getSocket();
      if (socket && listenersRef.current.handleCourseUpdated) {
        socket.off('course:updated', listenersRef.current.handleCourseUpdated);
        socket.off('course:enrollment-changed', listenersRef.current.handleEnrollmentChanged!);
      }
      listenersRef.current = { handleCourseUpdated: null, handleEnrollmentChanged: null };
    };

    // Setup listeners on the current socket
    const setupListeners = () => {
      const socket = socketService.getSocket();
      if (!socket || !courseId) return;

      // Remove stale listeners first
      removeListeners();

      const handleCourseUpdated = (data: CourseUpdatedData) => {
        if (data.courseId === courseId) {
          console.log('[useCourseRealtimeUpdates] Course updated:', data.fields);
          triggerUpdate();
        }
      };

      const handleEnrollmentChanged = (data: EnrollmentChangedData) => {
        if (data.courseId === courseId) {
          console.log('[useCourseRealtimeUpdates] Enrollment changed');
          triggerUpdate();
        }
      };

      // Store references for cleanup
      listenersRef.current = { handleCourseUpdated, handleEnrollmentChanged };

      // Register listeners
      socket.on('course:updated', handleCourseUpdated);
      socket.on('course:enrollment-changed', handleEnrollmentChanged);
    };

    // Register for (re)connection events so listeners survive reconnects
    socketService.onConnect(setupListeners);

    // Cleanup on unmount or courseId change
    return () => {
      socketService.offConnect(setupListeners);
      removeListeners();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [courseId, triggerUpdate]);
};
