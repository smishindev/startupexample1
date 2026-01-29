import { useState, useEffect, useCallback, useRef } from 'react';
import { commentApi } from '../services/commentApi';
import { socketService } from '../services/socketService';
import { Comment } from '../types/comment';

export interface UseCommentsOptions {
  entityType: string;
  entityId: string;
  initialPage?: number;
  initialLimit?: number;
}

export function useComments({ entityType, entityId, initialPage = 1, initialLimit = 20 }: UseCommentsOptions) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: initialLimit,
    totalPages: 0,
    hasMore: false
  });
  const recentlyDeletedRef = useRef<string | null>(null);
  const handlersRef = useRef<{
    handleCommentCreated?: (comment: Comment) => void;
    handleCommentUpdated?: (comment: Comment) => void;
    handleCommentDeleted?: (commentId: string) => void;
    handleCommentLiked?: (data: { commentId: string; likesCount: number }) => void;
  }>({});

  /**
   * Fetch comments from API (always fetches page 1)
   */
  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await commentApi.getComments(entityType, entityId, {
        page: 1,
        limit: initialLimit
      });
      
      setComments(response.comments);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error('Failed to fetch comments:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, initialLimit]);

  /**
   * Create a new comment or reply
   */
  const createComment = async (content: string, parentCommentId?: string): Promise<Comment> => {
    try {
      const newComment = await commentApi.createComment({
        entityType,
        entityId,
        content,
        parentCommentId,
      });
      
      // Optimistic update (will be confirmed by Socket.IO)
      if (parentCommentId) {
        // Add to replies (avoid duplicates)
        setComments(prev => prev.map(c => {
          if (c.id === parentCommentId) {
            // Check if reply already exists before adding
            if (c.replies?.some(r => r.id === newComment.id)) return c;
            return { ...c, replies: [...(c.replies || []), newComment], repliesCount: c.repliesCount + 1 };
          }
          return c;
        }));
      } else {
        // Add to top-level (avoid duplicates) - use single atomic state update
        setComments(prev => {
          const exists = prev.some(c => c.id === newComment.id);
          if (exists) {
            console.log('📝 [useComments] OPTIMISTIC: Comment already exists, not adding');
            return prev;
          }
          
          console.log('📝 [useComments] OPTIMISTIC: Adding new comment');
          
          return [newComment, ...prev];
        });
      }
      
      return newComment;
    } catch (err: any) {
      console.error('Failed to create comment:', err);
      throw new Error(err.response?.data?.error || err.message || 'Failed to post comment');
    }
  };

  /**
   * Update a comment
   */
  const updateComment = async (commentId: string, content: string): Promise<Comment> => {
    try {
      const updated = await commentApi.updateComment(commentId, content);
      
      // Update in state
      setComments(prev => prev.map(c => {
        if (c.id === commentId) return updated;
        if (c.replies) {
          return { ...c, replies: c.replies.map(r => r.id === commentId ? updated : r) };
        }
        return c;
      }));
      
      return updated;
    } catch (err: any) {
      console.error('Failed to update comment:', err);
      throw new Error(err.response?.data?.error || err.message || 'Failed to update comment');
    }
  };

  /**
   * Delete a comment
   */
  const deleteComment = async (commentId: string): Promise<void> => {
    try {
      // Mark as recently deleted to skip Socket.IO duplicate
      recentlyDeletedRef.current = commentId;
      setTimeout(() => { recentlyDeletedRef.current = null; }, 1000); // Clear after 1 second
      
      await commentApi.deleteComment(commentId);
      
      // Mark as deleted in state and decrement count if top-level
      setComments(prev => {
        console.log(`🗑️ [useComments] DELETE: commentId=${commentId}`);
        
        
        return prev.map(c => {
          if (c.id === commentId) return { ...c, isDeleted: true, content: '[deleted]' };
          if (c.replies) {
            return { 
              ...c, 
              replies: c.replies.map(r => 
                r.id === commentId ? { ...r, isDeleted: true, content: '[deleted]' } : r
              ) 
            };
          }
          return c;
        });
      });
    } catch (err: any) {
      console.error('Failed to delete comment:', err);
      throw new Error(err.response?.data?.error || err.message || 'Failed to delete comment');
    }
  };

  /**
   * Toggle like on a comment
   */
  const toggleLike = async (commentId: string): Promise<{ isLiked: boolean; likesCount: number }> => {
    try {
      const result = await commentApi.toggleLike(commentId);
      
      // Update in state
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, isLikedByCurrentUser: result.isLiked, likesCount: result.likesCount };
        }
        if (c.replies) {
          return { 
            ...c, 
            replies: c.replies.map(r => 
              r.id === commentId ? { ...r, isLikedByCurrentUser: result.isLiked, likesCount: result.likesCount } : r
            ) 
          };
        }
        return c;
      }));
      
      return result;
    } catch (err: any) {
      console.error('Failed to toggle like:', err);
      throw new Error(err.response?.data?.error || err.message || 'Failed to toggle like');
    }
  };

  /**
   * Socket.IO real-time updates
   */
  useEffect(() => {
    if (!socketService.isConnected()) {
      console.log('📝 [useComments] Socket not connected, skipping subscription');
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) return;

    const roomKey = `comments:${entityType}:${entityId}`;
    console.log(`📝 [useComments] Subscribing to ${roomKey}`);
    
    // Remove old handlers if they exist (handles React StrictMode remount)
    if (handlersRef.current.handleCommentCreated) {
      socket.off('comment:created', handlersRef.current.handleCommentCreated);
      socket.off('comment:updated', handlersRef.current.handleCommentUpdated!);
      socket.off('comment:deleted', handlersRef.current.handleCommentDeleted!);
      socket.off('comment:liked', handlersRef.current.handleCommentLiked!);
    }
    
    // Subscribe to comment events for this entity
    socket.emit('comment:subscribe', { entityType, entityId });

    // Listen for new comments - wrap in useCallback-style logic
    const handleCommentCreated = (comment: Comment) => {
      console.log('📝 [useComments] New comment received:', comment);
      
      // Only add if for this entity
      if (comment.entityType !== entityType || comment.entityId !== entityId) return;
      
      if (comment.parentCommentId) {
        // Add to replies (avoid duplicates)
        setComments(prev => prev.map(c => {
          if (c.id === comment.parentCommentId) {
            const existingReply = c.replies?.some(r => r.id === comment.id);
            if (existingReply) {
              console.log('📝 [useComments] Reply already exists, skipping');
              return c;
            }
            return { 
              ...c, 
              replies: [...(c.replies || []), comment], 
              repliesCount: c.repliesCount + 1 
            };
          }
          return c;
        }));
      } else {
        // Add to top-level (avoid duplicates) - use single atomic state update
        setComments(prev => {
          const exists = prev.some(c => c.id === comment.id);
          if (exists) {
            console.log('📝 [useComments] SOCKET.IO: Comment already exists, not adding');
            return prev;
          }
          
          console.log('📝 [useComments] SOCKET.IO: Adding new comment');
          
          return [comment, ...prev];
        });
      }
    };

    // Listen for updated comments
    const handleCommentUpdated = (comment: Comment) => {
      console.log('✏️ [useComments] Comment updated:', comment);
      
      if (comment.entityType !== entityType || comment.entityId !== entityId) return;
      
      setComments(prev => prev.map(c => {
        if (c.id === comment.id) return comment;
        if (c.replies) {
          return { ...c, replies: c.replies.map(r => r.id === comment.id ? comment : r) };
        }
        return c;
      }));
    };

    // Listen for deleted comments
    const handleCommentDeleted = (commentId: string) => {
      console.log('🗑️ [useComments] Comment deleted:', commentId);
      
      // Skip if we just deleted this comment (optimistic update already handled it)
      if (recentlyDeletedRef.current === commentId) {
        console.log('🗑️ [useComments] Skipping Socket.IO delete for recently deleted comment');
        return;
      }
      
      setComments(prev => {
        
        return prev.map(c => {
          if (c.id === commentId) return { ...c, isDeleted: true, content: '[deleted]' };
          if (c.replies) {
            // Check if this is a reply being deleted, and decrement parent's repliesCount
            const replyIndex = c.replies.findIndex(r => r.id === commentId);
            if (replyIndex !== -1 && !c.replies[replyIndex].isDeleted) {
              return { 
                ...c, 
                replies: c.replies.map(r => 
                  r.id === commentId ? { ...r, isDeleted: true, content: '[deleted]' } : r
                ),
                repliesCount: Math.max(0, c.repliesCount - 1)
              };
            }
            return { 
              ...c, 
              replies: c.replies.map(r => 
                r.id === commentId ? { ...r, isDeleted: true, content: '[deleted]' } : r
              ) 
            };
          }
          return c;
        });
      });
    };

    // Listen for likes
    const handleCommentLiked = ({ commentId, likesCount }: { commentId: string; likesCount: number }) => {
      console.log('👍 [useComments] Comment liked:', commentId, likesCount);
      
      setComments(prev => prev.map(c => {
        if (c.id === commentId) return { ...c, likesCount };
        if (c.replies) {
          return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, likesCount } : r) };
        }
        return c;
      }));
    };

    // Store handlers in ref so cleanup can access them
    handlersRef.current = {
      handleCommentCreated,
      handleCommentUpdated,
      handleCommentDeleted,
      handleCommentLiked,
    };

    // Add listeners (Socket.IO allows multiple listeners per event)
    socket.on('comment:created', handleCommentCreated);
    socket.on('comment:updated', handleCommentUpdated);
    socket.on('comment:deleted', handleCommentDeleted);
    socket.on('comment:liked', handleCommentLiked);

    // Cleanup - remove these specific handlers
    return () => {
      const roomKey = `comments:${entityType}:${entityId}`;
      console.log(`📝 [useComments] Unsubscribing from ${roomKey}`);
      socket.emit('comment:unsubscribe', { entityType, entityId });
      socket.off('comment:created', handleCommentCreated);
      socket.off('comment:updated', handleCommentUpdated);
      socket.off('comment:deleted', handleCommentDeleted);
      socket.off('comment:liked', handleCommentLiked);
    };
  }, [entityType, entityId]);

  /**
   * Load more comments (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || loadingMore) return;
    
    try {
      setLoadingMore(true);
      setError(null);
      
      const nextPage = pagination.page + 1;
      const response = await commentApi.getComments(entityType, entityId, {
        page: nextPage,
        limit: pagination.limit
      });
      
      // Append new comments to existing ones
      setComments(prev => [...prev, ...response.comments]);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error('Failed to load more comments:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load more comments');
    } finally {
      setLoadingMore(false);
    }
  }, [entityType, entityId, pagination.hasMore, pagination.page, pagination.limit, loadingMore]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    loadingMore,
    error,
    hasMore: pagination.hasMore,
    pagination,
    createComment,
    updateComment,
    deleteComment,
    toggleLike,
    loadMore,
    refetch: fetchComments,
  };
}

export default useComments;
