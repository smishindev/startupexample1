/**
 * useCatalogRealtimeUpdates Hook
 * 
 * Listens for real-time course catalog changes via Socket.IO.
 * Used by CoursesPage to refresh when courses are published, updated, or removed.
 * 
 * Events listened:
 * - course:catalog-changed (course published, removed, visibility changed, metadata updated)
 * - course:enrollment-changed (enrollment count changed — affects "Full" badge, student count)
 * 
 * Design: Debounced re-fetch (500ms) to avoid excessive API calls.
 * Uses onConnect/offConnect to survive socket reconnections and late connections.
 * The catalog room (courses-catalog) is auto-joined on socket connection (server-side).
 */

import { useEffect, useRef, useCallback } from 'react';
import { socketService } from '../services/socketService';

interface CatalogChangedData {
  action: string;
  courseId: string;
  timestamp: string;
}

interface EnrollmentChangedData {
  courseId: string;
  timestamp: string;
}

export const useCatalogRealtimeUpdates = (onUpdate: () => void) => {
  const onUpdateRef = useRef(onUpdate);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track current listener references for cleanup
  const listenersRef = useRef<{
    handleCatalogChanged: ((data: CatalogChangedData) => void) | null;
    handleEnrollmentChanged: ((data: EnrollmentChangedData) => void) | null;
  }>({ handleCatalogChanged: null, handleEnrollmentChanged: null });

  // Keep the callback ref current without re-registering listeners
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Debounced trigger — batches rapid catalog events into one re-fetch
  const triggerUpdate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onUpdateRef.current();
    }, 500);
  }, []);

  useEffect(() => {
    // Remove any existing listeners before registering new ones
    const removeListeners = () => {
      const socket = socketService.getSocket();
      if (socket && listenersRef.current.handleCatalogChanged) {
        socket.off('course:catalog-changed', listenersRef.current.handleCatalogChanged);
        socket.off('course:enrollment-changed', listenersRef.current.handleEnrollmentChanged!);
      }
      listenersRef.current = { handleCatalogChanged: null, handleEnrollmentChanged: null };
    };

    // Setup listeners on the current socket
    const setupListeners = () => {
      const socket = socketService.getSocket();
      if (!socket) return;

      // Remove stale listeners first
      removeListeners();

      const handleCatalogChanged = (data: CatalogChangedData) => {
        console.log('[useCatalogRealtimeUpdates] Catalog changed:', data.action, data.courseId);
        triggerUpdate();
      };

      const handleEnrollmentChanged = (data: EnrollmentChangedData) => {
        console.log('[useCatalogRealtimeUpdates] Enrollment changed:', data.courseId);
        triggerUpdate();
      };

      // Store references for cleanup
      listenersRef.current = { handleCatalogChanged, handleEnrollmentChanged };

      // Register listeners
      socket.on('course:catalog-changed', handleCatalogChanged);
      socket.on('course:enrollment-changed', handleEnrollmentChanged);
    };

    // Register for (re)connection events so listeners survive reconnects
    socketService.onConnect(setupListeners);

    // Cleanup on unmount
    return () => {
      socketService.offConnect(setupListeners);
      removeListeners();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [triggerUpdate]);
};
