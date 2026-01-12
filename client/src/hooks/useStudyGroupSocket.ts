/**
 * Study Group Socket Hook
 * Phase 2 Week 2 Day 2 - Study Groups UI
 */

import { useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';

interface MemberJoinedData {
  groupId: string;
  userId: string;
  userName: string;
}

interface MemberLeftData {
  groupId: string;
  userId: string;
  userName: string;
}

interface GroupCreatedData {
  groupId: string;
  groupName: string;
  courseId?: string;
}

interface GroupDeletedData {
  groupId: string;
}

interface MemberPromotedData {
  groupId: string;
  userId: string;
  userName: string;
}

interface UseStudyGroupSocketCallbacks {
  onMemberJoined?: (data: MemberJoinedData) => void;
  onMemberLeft?: (data: MemberLeftData) => void;
  onGroupCreated?: (data: GroupCreatedData) => void;
  onGroupDeleted?: (data: GroupDeletedData) => void;
  onMemberPromoted?: (data: MemberPromotedData) => void;
}

/**
 * Hook for handling Study Group Socket.IO events
 */
export const useStudyGroupSocket = (callbacks: UseStudyGroupSocketCallbacks) => {
  // Use refs to store latest callbacks without triggering re-registration
  const callbacksRef = useRef(callbacks);
  
  // Update ref when callbacks change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) {
      console.log('Socket not yet initialized for Study Groups');
      return;
    }

    console.log('Setting up Study Group Socket listeners');

    // Wrapper functions that use the ref
    const handleMemberJoined = (data: MemberJoinedData) => {
      console.log('📥 Received: study-group-member-joined', data);
      callbacksRef.current.onMemberJoined?.(data);
    };

    const handleMemberLeft = (data: MemberLeftData) => {
      console.log('📥 Received: study-group-member-left', data);
      callbacksRef.current.onMemberLeft?.(data);
    };

    const handleGroupCreated = (data: GroupCreatedData) => {
      console.log('📥 Received: group-created', data);
      callbacksRef.current.onGroupCreated?.(data);
    };

    const handleGroupDeleted = (data: GroupDeletedData) => {
      console.log('📥 Received: group-deleted', data);
      callbacksRef.current.onGroupDeleted?.(data);
    };

    const handleMemberPromoted = (data: MemberPromotedData) => {
      console.log('📥 Received: member-promoted', data);
      callbacksRef.current.onMemberPromoted?.(data);
    };

    // Register listeners (only once)
    socket.on('study-group-member-joined', handleMemberJoined);
    socket.on('study-group-member-left', handleMemberLeft);
    socket.on('group-created', handleGroupCreated);
    socket.on('group-deleted', handleGroupDeleted);
    socket.on('member-promoted', handleMemberPromoted);

    console.log('Registered all Study Group Socket listeners');

    // Cleanup
    return () => {
      console.log('Cleaning up Study Group Socket listeners');
      socket.off('study-group-member-joined', handleMemberJoined);
      socket.off('study-group-member-left', handleMemberLeft);
      socket.off('group-created', handleGroupCreated);
      socket.off('group-deleted', handleGroupDeleted);
      socket.off('member-promoted', handleMemberPromoted);
    };
  }, []); // Empty deps - only register once when component mounts

  /**
   * Join a study group room
   */
  const joinStudyGroup = (groupId: string) => {
    const socket = socketService.getSocket();
    if (socket && socketService.isConnected()) {
      socket.emit('join-study-group', { groupId });
    }
  };

  /**
   * Leave a study group room
   */
  const leaveStudyGroup = (groupId: string) => {
    const socket = socketService.getSocket();
    if (socket && socketService.isConnected()) {
      socket.emit('leave-study-group', { groupId });
    }
  };

  return {
    joinStudyGroup,
    leaveStudyGroup
  };
};
