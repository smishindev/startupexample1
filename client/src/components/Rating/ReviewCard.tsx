import React from 'react';
import {
  Box,
  Typography,
  Rating,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { MoreVert, Edit } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import type { CourseRating } from '../../services/ratingApi';

interface ReviewCardProps {
  review: CourseRating;
  currentUserId?: string;
  onEdit?: () => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, currentUserId, onEdit }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const isOwner = currentUserId === review.UserId;

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(review.CreatedAt), { addSuffix: true });
    } catch {
      return '';
    }
  })();

  return (
    <Box
      sx={{
        py: 2.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, fontSize: 16 }}>
            {(review.FirstName?.[0] || '').toUpperCase()}
            {(review.LastName?.[0] || '').toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {review.FirstName} {review.LastName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              <Rating value={review.Rating} readOnly size="small" sx={{ color: '#ffd700' }} />
              <Typography variant="caption" color="text.secondary">
                {timeAgo}
              </Typography>
              {review.IsEdited && (
                <Chip label="edited" size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
              )}
            </Box>
          </Box>
        </Box>

        {isOwner && onEdit && (
          <>
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVert fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => { setAnchorEl(null); onEdit(); }}>
                <Edit fontSize="small" sx={{ mr: 1 }} /> Edit Review
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>

      {review.ReviewText && (
        <Typography variant="body2" sx={{ mt: 1.5, pl: 7, color: 'text.secondary', lineHeight: 1.7 }}>
          {review.ReviewText}
        </Typography>
      )}
    </Box>
  );
};
