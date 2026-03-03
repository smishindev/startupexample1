/**
 * Office Hours Socket.IO Hook
 * Handles real-time updates for office hours queue events
 */

import { useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';

interface OfficeHoursSocketProps {
  instructorId?: string | null;
  onQueueUpdated?: (data: any) => void;
  onAdmitted?: (data: any) => void;
  onCompleted?: (data: any) => void;
  onCancelled?: (data: any) => void;
  onScheduleChanged?: (data: any) => void;
  /** Join the office-hours-lobby broadcast room. Default: true.
   *  Set false for nested hook instances where the page-level hook already owns the lobby. */
  joinLobby?: boolean;
  /** Join the instructor-specific office-hours-{id} room. Default: true.
   *  Set false for nested hook instances where the page-level hook already owns this room. */
  joinInstructorRoom?: boolean;
}

/**
 * Custom hook for Office Hours Socket.IO events
 * Manages real-time queue updates and notifications
 */
export const useOfficeHoursSocket = ({
  instructorId,
  onQueueUpdated,
  onAdmitted,
  onCompleted,
  onCancelled,
  onScheduleChanged,
  joinLobby = true,
  joinInstructorRoom = true
}: OfficeHoursSocketProps) => {
  // Use refs for stable callbacks
  const onQueueUpdatedRef = useRef(onQueueUpdated);
  const onAdmittedRef = useRef(onAdmitted);
  const onCompletedRef = useRef(onCompleted);
  const onCancelledRef = useRef(onCancelled);
  const onScheduleChangedRef = useRef(onScheduleChanged);

  // Update refs when callbacks change
  useEffect(() => {
    onQueueUpdatedRef.current = onQueueUpdated;
    onAdmittedRef.current = onAdmitted;
    onCompletedRef.current = onCompleted;
    onCancelledRef.current = onCancelled;
    onScheduleChangedRef.current = onScheduleChanged;
  }, [onQueueUpdated, onAdmitted, onCompleted, onCancelled, onScheduleChanged]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // joinRooms is called immediately if already connected,
    // and again on any future reconnect (socketService.onConnect semantics).
    const joinRooms = () => {
      const s = socketService.getSocket();
      if (!s) return;
      if (joinLobby) {
        s.emit('join-office-hours-lobby');
      }
      if (joinInstructorRoom && instructorId) {
        s.emit('join-office-hours', { instructorId });
      }
    };

    socketService.onConnect(joinRooms);

    /**
     * Handle queue updated event (someone joined/left queue)
     */
    const handleQueueUpdated = (data: {
      action: 'joined' | 'left';
      queueId: string;
      studentId: string;
      position?: number;
      timestamp: string;
    }) => {
      console.log('Office Hours: Queue updated', data);
      
      // Don't show toast here - the action itself shows a toast
      // Just trigger the callback to refresh data
      onQueueUpdatedRef.current?.(data);
    };

    /**
     * Handle student admitted event
     */
    const handleAdmitted = (data: {
      queueId: string;
      instructorId: string;
      admittedAt: string;
      chatRoomId?: string;
      meetingUrl?: string;
    }) => {
      console.log('Office Hours: Student admitted', data);
      
      // Don't show toast - bell notification will handle this
      onAdmittedRef.current?.(data);
      onQueueUpdatedRef.current?.(data);
    };

    /**
     * Handle session completed event
     */
    const handleCompleted = (data: {
      queueId: string;
      instructorId: string;
      completedAt: string;
    }) => {
      console.log('Office Hours: Session completed', data);
      
      // Don't show toast - bell notification will handle this
      onCompletedRef.current?.(data);
      onQueueUpdatedRef.current?.(data);
    };

    /**
     * Handle queue entry cancelled event
     */
    const handleCancelled = (data: {
      queueId: string;
      instructorId: string;
    }) => {
      console.log('Office Hours: Queue entry cancelled', data);
      
      // Don't show toast - bell notification will handle this
      onCancelledRef.current?.(data);
      onQueueUpdatedRef.current?.(data);
    };

    /**
     * Handle schedule changed event (create/update/delete)
     */
    const handleScheduleChanged = (data: {
      action: 'created' | 'updated' | 'deleted';
      instructorId: string;
      scheduleId: string;
      timestamp: string;
    }) => {
      console.log('Office Hours: Schedule changed', data);
      onScheduleChangedRef.current?.(data);
    };

    // Register event listeners
    socket.on('queue-updated', handleQueueUpdated);
    socket.on('office-hours-admitted', handleAdmitted);
    socket.on('office-hours-completed', handleCompleted);
    socket.on('office-hours-cancelled', handleCancelled);
    socket.on('schedule-changed', handleScheduleChanged);

    // Cleanup on unmount
    return () => {
      socketService.offConnect(joinRooms);

      if (joinLobby) {
        socket.emit('leave-office-hours-lobby');
      }
      if (joinInstructorRoom && instructorId) {
        socket.emit('leave-office-hours', { instructorId });
      }

      socket.off('queue-updated', handleQueueUpdated);
      socket.off('office-hours-admitted', handleAdmitted);
      socket.off('office-hours-completed', handleCompleted);
      socket.off('office-hours-cancelled', handleCancelled);
      socket.off('schedule-changed', handleScheduleChanged);
    };
  }, [instructorId]);
};
