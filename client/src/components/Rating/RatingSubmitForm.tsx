import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Rating,
  Paper,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Edit, Delete, Star } from '@mui/icons-material';
import { ratingApi, CourseRating } from '../../services/ratingApi';
import { toast } from 'sonner';

interface RatingSubmitFormProps {
  courseId: string;
  existingRating: CourseRating | null;
  onRatingSubmitted: () => void;
  onRatingDeleted: () => void;
  editTrigger?: number;
}

export const RatingSubmitForm: React.FC<RatingSubmitFormProps> = ({
  courseId,
  existingRating,
  onRatingSubmitted,
  onRatingDeleted,
  editTrigger,
}) => {
  const [rating, setRating] = useState<number | null>(existingRating?.Rating || null);
  const [reviewText, setReviewText] = useState(existingRating?.ReviewText || '');
  const [isEditing, setIsEditing] = useState(!existingRating);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Switch to edit mode when triggered externally (e.g., "Edit Review" from reviews list)
  useEffect(() => {
    if (editTrigger && editTrigger > 0 && existingRating) {
      // Sync form state from latest prop values before switching to edit mode
      setRating(existingRating.Rating);
      setReviewText(existingRating.ReviewText || '');
      setIsEditing(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTrigger]);

  const handleSubmit = async () => {
    if (!rating) {
      toast.error('Please select a star rating');
      return;
    }

    try {
      setSubmitting(true);
      await ratingApi.submitRating(courseId, {
        rating,
        reviewText: reviewText.trim() || undefined,
      });
      toast.success(existingRating ? 'Rating updated!' : 'Rating submitted!');
      setIsEditing(false);
      onRatingSubmitted();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to submit rating';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await ratingApi.deleteRating(courseId);
      toast.success('Rating deleted');
      setRating(null);
      setReviewText('');
      setIsEditing(true);
      onRatingDeleted();
    } catch (error: any) {
      toast.error('Failed to delete rating');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    if (existingRating) {
      setRating(existingRating.Rating);
      setReviewText(existingRating.ReviewText || '');
      setIsEditing(false);
    }
  };

  // Display mode (showing existing rating)
  if (existingRating && !isEditing) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: 2,
          bgcolor: 'primary.50',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Your Rating
          </Typography>
          <Box>
            <IconButton size="small" onClick={() => setIsEditing(true)} title="Edit rating">
              <Edit fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={handleDelete} disabled={deleting} title="Delete rating" color="error">
              {deleting ? <CircularProgress size={18} /> : <Delete fontSize="small" />}
            </IconButton>
          </Box>
        </Box>
        <Rating value={existingRating.Rating} readOnly size="large" sx={{ mb: 1 }} />
        {existingRating.ReviewText && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {existingRating.ReviewText}
          </Typography>
        )}
      </Paper>
    );
  }

  // Edit/Submit mode
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        mb: 3,
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
        {existingRating ? 'Edit Your Rating' : 'Rate This Course'}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Your rating:
        </Typography>
        <Rating
          value={rating}
          onChange={(_, newValue) => setRating(newValue)}
          size="large"
          sx={{
            '& .MuiRating-iconFilled': { color: '#ffd700' },
          }}
        />
        {rating && (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {rating}/5
          </Typography>
        )}
      </Box>

      <TextField
        fullWidth
        multiline
        rows={3}
        placeholder="Share your experience with this course (optional)"
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        inputProps={{ maxLength: 2000 }}
        helperText={`${reviewText.length}/2000`}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!rating || submitting}
          startIcon={submitting ? <CircularProgress size={18} /> : <Star />}
          sx={{
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(90deg, #5568d3 0%, #65408b 100%)',
            },
          }}
        >
          {submitting ? 'Submitting...' : existingRating ? 'Update Rating' : 'Submit Rating'}
        </Button>
        {existingRating && (
          <Button variant="outlined" onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </Box>
    </Paper>
  );
};
