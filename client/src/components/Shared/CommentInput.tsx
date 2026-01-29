import React, { useState } from 'react';
import { Box, TextField, Button, CircularProgress } from '@mui/material';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
  initialValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  onCancel,
  submitting = false,
  initialValue = '',
  placeholder = 'Write a comment...',
  autoFocus = false,
}) => {
  const [content, setContent] = useState(initialValue);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    try {
      await onSubmit(content.trim());
      setContent(''); // Clear on success
    } catch (error) {
      // Error handling is done in parent
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box data-testid="comment-input-wrapper">
      <TextField
        fullWidth
        multiline
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={submitting}
        autoFocus={autoFocus}
        sx={{ mb: 1 }}
        inputProps={{
          'data-testid': 'comment-input',
          maxLength: 5000
        }}
      />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          data-testid="comment-submit-button"
        >
          {submitting ? <CircularProgress size={20} /> : 'Post'}
        </Button>
        {onCancel && (
          <Button 
            variant="outlined" 
            onClick={onCancel} 
            disabled={submitting}
            data-testid="comment-cancel-button"
          >
            Cancel
          </Button>
        )}
        <Box component="span" sx={{ ml: 'auto', fontSize: '0.75rem', color: 'text.secondary' }}>
          {content.length}/5000
        </Box>
      </Box>
    </Box>
  );
};

export default CommentInput;
