import React, { useState } from 'react';
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import { ThumbUp, Reply, MoreVert, Edit, Delete } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { Comment } from '../../types/comment';
import { CommentInput } from './CommentInput';
import { useAuthStore } from '../../stores/authStore';

interface CommentItemProps {
  comment: Comment;
  onReply: (content: string, parentCommentId: string) => Promise<Comment>;
  onEdit: (commentId: string, content: string) => Promise<Comment>;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => Promise<any>;
  moderatorUserId?: string;
  depth?: number;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  onLike,
  moderatorUserId,
  depth = 0,
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showEditInput, setShowEditInput] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const isOwner = currentUser?.id === comment.userId;
  const isModerator = currentUser?.id === moderatorUserId || currentUser?.role === 'admin';
  const canEdit = isOwner && comment.canEdit && !comment.isDeleted;
  const canDelete = (isOwner || isModerator) && !comment.isDeleted;

  const handleLike = async () => {
    try {
      await onLike(comment.id);
    } catch (err: any) {
      console.error('Like error:', err);
    }
  };

  const handleReply = async (content: string) => {
    try {
      setSubmitting(true);
      await onReply(content, comment.id);
      setShowReplyInput(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (content: string) => {
    try {
      setSubmitting(true);
      await onEdit(comment.id, content);
      setShowEditInput(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await onDelete(comment.id);
      setAnchorEl(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (comment.isDeleted) {
    return (
      <Box sx={{ py: 2, opacity: 0.5 }} data-testid={`comment-deleted-${comment.id}`}>
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          [This comment has been deleted]
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2 }} data-testid={`comment-item-${comment.id}`}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Avatar 
          src={comment.user.avatar || undefined} 
          sx={{ width: 40, height: 40 }}
          data-testid={`comment-avatar-${comment.id}`}
        >
          {comment.user.firstName[0]}{comment.user.lastName[0]}
        </Avatar>

        <Box sx={{ flex: 1 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {comment.user.firstName} {comment.user.lastName}
            </Typography>
            {comment.user.role === 'instructor' && (
              <Chip label="Instructor" size="small" color="primary" />
            )}
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </Typography>
            {comment.isEdited && (
              <Typography variant="caption" color="text.secondary" fontStyle="italic">
                (edited)
              </Typography>
            )}
            
            {/* More menu */}
            {(canEdit || canDelete) && (
              <>
                <IconButton
                  size="small"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{ ml: 'auto' }}
                  data-testid={`comment-menu-${comment.id}`}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={() => setAnchorEl(null)}
                >
                  {canEdit && (
                    <MenuItem 
                      onClick={() => { 
                        setShowEditInput(true); 
                        setAnchorEl(null); 
                      }}
                      data-testid={`comment-edit-menu-${comment.id}`}
                    >
                      <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
                    </MenuItem>
                  )}
                  {canDelete && (
                    <MenuItem 
                      onClick={handleDelete}
                      data-testid={`comment-delete-menu-${comment.id}`}
                    >
                      <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
          </Box>

          {/* Content */}
          {showEditInput ? (
            <CommentInput
              onSubmit={handleEdit}
              onCancel={() => setShowEditInput(false)}
              submitting={submitting}
              initialValue={comment.content}
              placeholder="Edit your comment..."
              autoFocus
            />
          ) : (
            <Typography 
              variant="body2" 
              sx={{ mb: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              data-testid={`comment-content-${comment.id}`}
            >
              {comment.content}
            </Typography>
          )}

          {/* Actions */}
          {!showEditInput && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={handleLike}
                color={comment.isLikedByCurrentUser ? 'primary' : 'default'}
                data-testid={`comment-like-${comment.id}`}
              >
                <ThumbUp fontSize="small" />
              </IconButton>
              <Typography variant="caption" data-testid={`comment-likes-count-${comment.id}`}>
                {comment.likesCount}
              </Typography>
              
              {depth === 0 && (
                <Button
                  size="small"
                  startIcon={<Reply fontSize="small" />}
                  onClick={() => setShowReplyInput(!showReplyInput)}
                  data-testid={`comment-reply-${comment.id}`}
                >
                  Reply {comment.repliesCount > 0 && `(${comment.repliesCount})`}
                </Button>
              )}
            </Box>
          )}

          {/* Reply Input */}
          {showReplyInput && (
            <Box sx={{ mt: 2 }}>
              <CommentInput
                onSubmit={handleReply}
                onCancel={() => setShowReplyInput(false)}
                submitting={submitting}
                placeholder="Write a reply..."
                autoFocus
              />
            </Box>
          )}

          {/* Replies (1 level deep) */}
          {comment.replies && comment.replies.length > 0 && (
            <Box 
              sx={{ 
                mt: 2, 
                ml: 4, 
                borderLeft: '2px solid', 
                borderColor: 'divider', 
                pl: 2 
              }}
              data-testid={`comment-replies-${comment.id}`}
            >
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onLike={onLike}
                  moderatorUserId={moderatorUserId}
                  depth={1}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default CommentItem;
