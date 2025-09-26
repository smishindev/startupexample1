import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Avatar,
  Button,
  Rating,
  useTheme,
} from '@mui/material';
import {
  PlayCircleOutline,
  BookmarkBorder,
  Bookmark,
  Share,
  Schedule,
  People,
  TrendingUp,
} from '@mui/icons-material';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: {
    name: string;
    avatar?: string;
  };
  thumbnail: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: number;
  reviewCount: number;
  enrolledStudents: number;
  price: number;
  originalPrice?: number;
  category: string;
  tags: string[];
  isBookmarked?: boolean;
  progress?: number; // For enrolled courses
  lastAccessed?: string;
  isEnrolled?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
}

interface CourseCardProps {
  course: Course;
  variant?: 'default' | 'enrolled' | 'compact';
  onEnroll?: (courseId: string) => void;
  onBookmark?: (courseId: string, isBookmarked: boolean) => void;
  onShare?: (courseId: string) => void;
  onClick?: (courseId: string) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  variant = 'default',
  onEnroll,
  onBookmark,
  onShare,
  onClick,
}) => {
  const theme = useTheme();

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark?.(course.id, !course.isBookmarked);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(course.id);
  };

  const handleEnrollClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEnroll?.(course.id);
  };

  const handleCardClick = () => {
    onClick?.(course.id);
  };

  const getLevelColor = () => {
    switch (course.level) {
      case 'Beginner': return theme.palette.success.main;
      case 'Intermediate': return theme.palette.warning.main;
      case 'Advanced': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  const getDiscountPercentage = () => {
    if (!course.originalPrice || course.originalPrice <= course.price) return 0;
    return Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100);
  };

  if (variant === 'compact') {
    return (
      <Card
        sx={{
          display: 'flex',
          mb: 2,
          cursor: 'pointer',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateX(4px)',
            boxShadow: theme.shadows[4],
          },
        }}
        onClick={handleCardClick}
      >
        <Box
          sx={{
            width: 120,
            height: 80,
            backgroundImage: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PlayCircleOutline sx={{ fontSize: 32, color: 'white' }} />
        </Box>
        <CardContent sx={{ flex: 1, py: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {course.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {course.instructor.name}
          </Typography>
          {course.progress !== undefined && (
            <LinearProgress
              variant="determinate"
              value={course.progress}
              sx={{ height: 4, borderRadius: 2 }}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: variant === 'enrolled' ? 'auto' : 420,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
      }}
      onClick={handleCardClick}
    >
      {/* Badges */}
      <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
        {course.isNew && (
          <Chip
            label="New"
            size="small"
            sx={{
              backgroundColor: theme.palette.success.main,
              color: 'white',
              fontWeight: 'bold',
              mr: 1,
            }}
          />
        )}
        {course.isPopular && (
          <Chip
            label="Popular"
            size="small"
            icon={<TrendingUp sx={{ fontSize: '16px !important' }} />}
            sx={{
              backgroundColor: theme.palette.warning.main,
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        )}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
        <IconButton
          size="small"
          onClick={handleBookmarkClick}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            mr: 1,
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
          }}
        >
          {course.isBookmarked ? (
            <Bookmark sx={{ color: theme.palette.warning.main }} />
          ) : (
            <BookmarkBorder />
          )}
        </IconButton>
        <IconButton
          size="small"
          onClick={handleShareClick}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
          }}
        >
          <Share />
        </IconButton>
      </Box>

      {/* Course Image/Thumbnail */}
      <Box
        sx={{
          height: 200,
          background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <PlayCircleOutline 
          sx={{ 
            fontSize: 60, 
            color: 'white', 
            opacity: 0.8,
            transition: 'all 0.3s ease',
            '&:hover': { opacity: 1, transform: 'scale(1.1)' },
          }} 
        />
      </Box>

      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Course Title */}
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 'bold', 
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {course.title}
        </Typography>

        {/* Instructor */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            src={course.instructor.avatar}
            sx={{ width: 32, height: 32, mr: 1 }}
          >
            {course.instructor.name.charAt(0)}
          </Avatar>
          <Typography variant="body2" color="text.secondary">
            {course.instructor.name}
          </Typography>
        </Box>

        {/* Course Stats */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Rating value={course.rating} precision={0.1} size="small" readOnly />
            <Typography variant="body2" sx={{ ml: 0.5 }}>
              {course.rating} ({course.reviewCount})
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Schedule sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              {course.duration}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <People sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              {course.enrolledStudents.toLocaleString()}
            </Typography>
          </Box>
        </Box>

        {/* Level and Category */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            label={course.level}
            size="small"
            sx={{
              backgroundColor: `${getLevelColor()}15`,
              color: getLevelColor(),
              fontWeight: 'medium',
            }}
          />
          <Chip
            label={course.category}
            size="small"
            variant="outlined"
          />
        </Box>

        {/* Progress (for enrolled courses) */}
        {variant === 'enrolled' && course.progress !== undefined && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Progress</Typography>
              <Typography variant="body2">{course.progress}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={course.progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                },
              }}
            />
            {course.lastAccessed && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Last accessed: {course.lastAccessed}
              </Typography>
            )}
          </Box>
        )}

        {/* Price and Action Button */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mt: 'auto' 
          }}
        >
          <Box>
            {course.price === 0 ? (
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                Free
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  ${course.price}
                </Typography>
                {course.originalPrice && course.originalPrice > course.price && (
                  <>
                    <Typography
                      variant="body2"
                      sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
                    >
                      ${course.originalPrice}
                    </Typography>
                    <Chip
                      label={`${getDiscountPercentage()}% OFF`}
                      size="small"
                      sx={{
                        backgroundColor: theme.palette.error.main,
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  </>
                )}
              </Box>
            )}
          </Box>

          {!course.isEnrolled ? (
            <Button
              variant="contained"
              size="small"
              onClick={handleEnrollClick}
              sx={{
                textTransform: 'none',
                fontWeight: 'bold',
                px: 3,
              }}
            >
              Enroll
            </Button>
          ) : variant === 'enrolled' ? (
            <Button
              variant="outlined"
              size="small"
              onClick={handleCardClick}
              sx={{
                textTransform: 'none',
                fontWeight: 'bold',
                px: 3,
              }}
            >
              Continue
            </Button>
          ) : (
            <Chip
              label="Enrolled"
              size="small"
              sx={{
                backgroundColor: theme.palette.success.main,
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};