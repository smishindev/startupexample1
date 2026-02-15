import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Pagination,
} from '@mui/material';
import { ratingApi, type CourseRating, type PaginatedRatings } from '../../services/ratingApi';
import { ReviewCard } from './ReviewCard';
import { useAuthStore } from '../../stores/authStore';

interface ReviewsListProps {
  courseId: string;
  refreshKey?: number;
  onEditClick?: () => void;
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

export const ReviewsList: React.FC<ReviewsListProps> = ({ courseId, refreshKey, onEditClick }) => {
  const [ratings, setRatings] = useState<CourseRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<SortOption>('newest');
  const limit = 10;

  const { user } = useAuthStore();

  const fetchRatings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data: PaginatedRatings = await ratingApi.getCourseRatings(courseId, { page, limit, sort });
      setRatings(data.ratings);
      setTotalPages(data.pagination.pages);
      setTotal(data.pagination.total);
    } catch (err: any) {
      setError('Failed to load reviews');
      console.error('Error fetching ratings:', err);
    } finally {
      setLoading(false);
    }
  }, [courseId, page, sort]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings, refreshKey]);

  // Reset page when sort changes
  useEffect(() => {
    setPage(1);
  }, [sort]);

  if (loading && ratings.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  if (total === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No reviews yet. Be the first to review this course!
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with count and sort */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Reviews ({total})
        </Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            sx={{ fontSize: 14 }}
          >
            <MenuItem value="newest">Most Recent</MenuItem>
            <MenuItem value="oldest">Oldest First</MenuItem>
            <MenuItem value="highest">Highest Rated</MenuItem>
            <MenuItem value="lowest">Lowest Rated</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Reviews */}
      <Box sx={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {ratings.map((review) => (
          <ReviewCard
            key={review.Id}
            review={review}
            currentUserId={user?.id}
            onEdit={onEditClick}
          />
        ))}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};
