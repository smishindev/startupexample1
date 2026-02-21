import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Button,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useComments } from '../../hooks/useComments';
import { CommentInput } from './CommentInput';
import { CommentItem } from './CommentItem';

interface CommentsSectionProps {
  entityType: 'lesson' | 'course' | 'assignment' | 'study_group' | 'announcement';
  entityId: string;
  allowComments?: boolean;
  moderatorUserId?: string;
  title?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  entityType,
  entityId,
  allowComments = true,
  moderatorUserId,
  title = 'Discussion',
}) => {
  const {
    comments,
    loading,
    loadingMore,
    error,
    hasMore,
    createComment,
    updateComment,
    deleteComment,
    toggleLike,
    loadMore,
    refetch,
  } = useComments({ entityType, entityId });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (content: string) => {
    try {
      setSubmitting(true);
      await createComment(content);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!allowComments) {
    return (
      <Paper sx={{ p: 3 }} data-testid="comments-disabled">
        <Typography variant="body2" color="text.secondary">
          Comments are disabled for this {entityType}.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }} data-testid={`comments-section-${entityType}`}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h6">
          {title}
        </Typography>
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={refetch}
          disabled={loading}
          data-testid="comments-refresh-button"
        >
          Refresh
        </Button>
      </Box>

      {/* Add Comment Input */}
      <CommentInput
        onSubmit={handleSubmit}
        submitting={submitting}
        placeholder="Ask a question or share your thoughts..."
      />

      <Divider sx={{ my: { xs: 2, sm: 3 } }} />

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress data-testid="comments-loading" />
        </Box>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="comments-error">
          {error}
        </Alert>
      )}

      {/* Comments List */}
      {!loading && !error && (
        <Box data-testid="comments-list">
          {comments.length === 0 ? (
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ textAlign: 'center', py: 4 }}
              data-testid="comments-empty"
            >
              No comments yet. Be the first to comment!
            </Typography>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={createComment}
                onEdit={updateComment}
                onDelete={deleteComment}
                onLike={toggleLike}
                moderatorUserId={moderatorUserId}
              />
            ))
          )}
          
          {/* Load More Button */}
          {hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                variant="outlined"
                onClick={loadMore}
                disabled={loadingMore}
                data-testid="comments-load-more"
              >
                {loadingMore ? 'Loading...' : 'Load More Comments'}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};
