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
  onCancelled
}: OfficeHoursSocketProps) => {
  // Use refs for stable callbacks
  const onQueueUpdatedRef = useRef(onQueueUpdated);
  const onAdmittedRef = useRef(onAdmitted);
  const onCompletedRef = useRef(onCompleted);
  const onCancelledRef = useRef(onCancelled);

  // Update refs when callbacks change
  useEffect(() => {
    onQueueUpdatedRef.current = onQueueUpdated;
    onAdmittedRef.current = onAdmitted;
    onCompletedRef.current = onCompleted;
    onCancelledRef.current = onCancelled;
  }, [onQueueUpdated, onAdmitted, onCompleted, onCancelled]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Join instructor's office hours room
    if (instructorId && socketService.isConnected()) {
      socket.emit('join-office-hours', { instructorId });
    }

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

    // Register event listeners
    socket.on('queue-updated', handleQueueUpdated);
    socket.on('office-hours-admitted', handleAdmitted);
    socket.on('office-hours-completed', handleCompleted);
    socket.on('office-hours-cancelled', handleCancelled);

    // Cleanup on unmount
    return () => {
      if (instructorId) {
        socket.emit('leave-office-hours', { instructorId });
      }
      
      socket.off('queue-updated', handleQueueUpdated);
      socket.off('office-hours-admitted', handleAdmitted);
      socket.off('office-hours-completed', handleCompleted);
      socket.off('office-hours-cancelled', handleCancelled);
    };
  }, [instructorId]);
};
