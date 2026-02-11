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
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  PlayCircleOutline,
  BookmarkBorder,
  Bookmark,
  Share,
  Schedule,
  People,
  TrendingUp,
  HourglassEmpty,
  Block,
} from '@mui/icons-material';
import { formatCategory, getCategoryGradient as getCategoryGradientUtil, getLevelColor as getLevelColorUtil } from '../../utils/courseHelpers';

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: {
    id?: string; // Added instructor ID to detect ownership
    name: string;
    avatar?: string;
  };
  thumbnail: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
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
  enrollmentStatus?: 'active' | 'completed' | 'pending' | 'approved' | 'suspended' | 'cancelled' | 'rejected' | null;
  isPopular?: boolean;
  isNew?: boolean;
  // Enrollment Controls (Phase 2)
  maxEnrollment?: number | null;
  enrollmentOpenDate?: string | null;
  enrollmentCloseDate?: string | null;
}

interface CourseCardProps {
  course: Course;
  variant?: 'default' | 'enrolled' | 'compact';
  currentUserId?: string; // Added to detect if user is instructor
  isEnrolling?: boolean; // Disable enroll button during enrollment
  onEnroll?: (courseId: string) => void;
  onBookmark?: (courseId: string, isBookmarked: boolean) => void;
  onShare?: (courseId: string) => void;
  onClick?: (courseId: string) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  variant = 'default',
  currentUserId,
  isEnrolling = false,
  onEnroll,
  onBookmark,
  onShare,
  onClick,
}) => {
  const theme = useTheme();

  // Check if current user is the instructor of this course
  const isInstructor = currentUserId && course.instructor.id === currentUserId;

  // Enrollment control checks
  const isFull = course.maxEnrollment != null && course.enrolledStudents >= course.maxEnrollment;
  const now = new Date();
  const isNotYetOpen = course.enrollmentOpenDate ? new Date(course.enrollmentOpenDate) > now : false;
  const isClosed = course.enrollmentCloseDate ? new Date(course.enrollmentCloseDate) < now : false;
  const isEnrollmentBlocked = isFull || isNotYetOpen || isClosed;

  const getEnrollButtonLabel = () => {
    if (isEnrolling) return 'Enrolling...';
    if (isFull) return 'Course Full';
    if (isClosed) return 'Enrollment Closed';
    if (isNotYetOpen) return 'Not Yet Open';
    return 'Enroll Now';
  };


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
    return getLevelColorUtil(course.level, theme);
  };

  const getCategoryGradient = () => {
    return getCategoryGradientUtil(course.category);
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
            backgroundImage: course.thumbnail 
              ? `url(${course.thumbnail})`
              : getCategoryGradient(),
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.05)',
              transition: 'opacity 0.3s ease',
            },
            '&:hover::before': {
              opacity: 0,
            },
          }}
        >
          {!course.thumbnail && (
            <PlayCircleOutline 
              sx={{ 
                fontSize: 32, 
                color: 'white',
                opacity: 0.9,
                filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))',
                transition: 'transform 0.3s ease',
                '.MuiCard-root:hover &': {
                  transform: 'scale(1.1)',
                },
              }} 
            />
          )}
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
      data-testid={`course-card-${course.id}`}
      sx={{
        height: variant === 'enrolled' ? 'auto' : 420,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        },
        '&:hover::after': {
          opacity: 1,
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
              boxShadow: '0 2px 8px rgba(76, 175, 80, 0.4)',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': {
                  boxShadow: '0 2px 8px rgba(76, 175, 80, 0.4)',
                },
                '50%': {
                  boxShadow: '0 4px 16px rgba(76, 175, 80, 0.6)',
                },
              },
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
              boxShadow: '0 2px 8px rgba(255, 152, 0, 0.4)',
            }}
          />
        )}
      </Box>

      {/* Action Buttons */}
      <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
        <IconButton
          size="small"
          onClick={handleBookmarkClick}
          data-testid={`course-card-bookmark-button-${course.id}`}
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
          data-testid={`course-card-share-button-${course.id}`}
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
          backgroundImage: course.thumbnail 
            ? `url(${course.thumbnail})`
            : getCategoryGradient(),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': !course.thumbnail ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.1)',
            transition: 'opacity 0.3s ease',
          } : {},
          '&:hover::before': !course.thumbnail ? {
            opacity: 0,
          } : {},
          '&:hover .play-icon': {
            transform: 'scale(1.2)',
            opacity: 1,
          },
        }}
      >
        {!course.thumbnail && (
          <>
            {/* Animated gradient overlay on hover */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)',
                opacity: 0,
                transition: 'opacity 0.3s ease',
                '.MuiCard-root:hover &': {
                  opacity: 1,
                },
              }}
            />
            <PlayCircleOutline 
              className="play-icon"
              sx={{ 
                fontSize: 60, 
                color: 'white', 
                opacity: 0.85,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.3))',
                zIndex: 1,
              }} 
            />
            {/* Category badge on gradient background */}
            <Chip
              label={formatCategory(course.category)}
              size="small"
              sx={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                fontWeight: 600,
                fontSize: '0.7rem',
                zIndex: 1,
              }}
            />
          </>
        )}
        {course.thumbnail && (
          <>
            {/* Dark overlay on hover for better contrast */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)',
                opacity: 0,
                transition: 'opacity 0.3s ease',
                '.MuiCard-root:hover &': {
                  opacity: 1,
                },
              }}
            />
            {/* Play button appears on hover for thumbnails */}
            <PlayCircleOutline 
              className="play-icon"
              sx={{ 
                fontSize: 60, 
                color: 'white', 
                opacity: 0,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.5))',
                zIndex: 1,
                '.MuiCard-root:hover &': {
                  opacity: 1,
                },
              }} 
            />
          </>
        )}
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
          {course.rating > 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Rating value={course.rating} precision={0.1} size="small" readOnly />
              <Typography variant="body2" sx={{ ml: 0.5 }}>
                {course.rating} ({course.reviewCount})
              </Typography>
            </Box>
          ) : (
            <Chip
              label="New Course"
              size="small"
              sx={{
                backgroundColor: alpha(theme.palette.info.main, 0.1),
                color: theme.palette.info.main,
                fontWeight: 600,
                border: `1.5px solid ${alpha(theme.palette.info.main, 0.3)}`,
                fontSize: '0.7rem',
              }}
            />
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Schedule sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              {course.duration}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <People sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              {course.maxEnrollment
                ? `${course.enrolledStudents}/${course.maxEnrollment} enrolled`
                : course.enrolledStudents > 0 
                  ? `${course.enrolledStudents.toLocaleString()} enrolled`
                  : 'Be the first!'}
            </Typography>
            {course.maxEnrollment && course.enrolledStudents >= course.maxEnrollment && (
              <Chip label="Full" size="small" color="error" sx={{ ml: 0.5, height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
            )}
            {isClosed && (
              <Chip label="Closed" size="small" color="warning" sx={{ ml: 0.5, height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
            )}
            {isNotYetOpen && (
              <Chip label="Not Open" size="small" color="info" sx={{ ml: 0.5, height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
            )}
          </Box>
        </Box>

        {/* Level and Category */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            label={course.level}
            size="small"
            sx={{
              backgroundColor: alpha(getLevelColor(), 0.15),
              color: getLevelColor(),
              fontWeight: 600,
              border: `1.5px solid ${alpha(getLevelColor(), 0.4)}`,
              fontSize: '0.7rem',
            }}
          />
        </Box>

        {/* Progress (for enrolled courses) */}
        {variant === 'enrolled' && course.progress !== undefined && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Your Progress
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                {course.progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={course.progress}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: '#e0e0e0',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 2px 4px rgba(102, 126, 234, 0.4)',
                },
              }}
            />
            {course.lastAccessed && (
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  mt: 1,
                  display: 'block',
                  fontStyle: 'italic',
                }}
              >
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
            mt: 'auto',
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            {course.price === 0 ? (
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: theme.palette.success.main,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                Free
                <Box 
                  component="span" 
                  sx={{ 
                    fontSize: '0.7rem',
                    backgroundColor: theme.palette.success.light,
                    color: theme.palette.success.dark,
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontWeight: 600,
                  }}
                >
                  100% OFF
                </Box>
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
                  ${course.price}
                </Typography>
                {course.originalPrice && course.originalPrice > course.price && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography
                      variant="caption"
                      sx={{ 
                        textDecoration: 'line-through', 
                        color: 'text.secondary',
                        lineHeight: 1,
                      }}
                    >
                      ${course.originalPrice}
                    </Typography>
                    <Chip
                      label={`-${getDiscountPercentage()}%`}
                      size="small"
                      sx={{
                        height: 18,
                        backgroundColor: theme.palette.error.main,
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.65rem',
                        '& .MuiChip-label': {
                          px: 0.75,
                        },
                      }}
                    />
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {isInstructor ? (
            <Button
              variant="outlined"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/instructor/courses/${course.id}/edit`;
              }}
              data-testid={`course-card-manage-button-${course.id}`}
              sx={{
                textTransform: 'none',
                fontWeight: 'bold',
                px: 2.5,
                py: 0.75,
                borderRadius: 2,
                borderColor: theme.palette.info.main,
                color: theme.palette.info.main,
                borderWidth: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: theme.palette.info.main,
                  color: 'white',
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                },
              }}
            >
              Manage
            </Button>
          ) : course.enrollmentStatus === 'pending' ? (
            <Chip
              icon={<HourglassEmpty sx={{ fontSize: '1rem' }} />}
              label="Pending Approval"
              size="small"
              data-testid={`course-card-pending-chip-${course.id}`}
              sx={{
                backgroundColor: '#f59e0b',
                color: 'white',
                fontWeight: 'bold',
                px: 0.5,
                fontSize: '0.8rem',
                '& .MuiChip-icon': { color: 'white' },
              }}
            />
          ) : course.enrollmentStatus === 'approved' ? (
            <Button
              variant="contained"
              size="small"
              onClick={(e) => { e.stopPropagation(); onEnroll?.(course.id); }}
              data-testid={`course-card-complete-purchase-button-${course.id}`}
              sx={{
                textTransform: 'none',
                fontWeight: 'bold',
                px: 2,
                py: 0.75,
                borderRadius: 2,
                background: 'linear-gradient(45deg, #10b981 30%, #059669 90%)',
                boxShadow: '0 3px 5px 2px rgba(16, 185, 129, .3)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 10px 4px rgba(16, 185, 129, .3)',
                },
              }}
            >
              Complete Purchase
            </Button>
          ) : course.enrollmentStatus === 'suspended' ? (
            <Chip
              icon={<Block sx={{ fontSize: '1rem' }} />}
              label="Suspended"
              size="small"
              data-testid={`course-card-suspended-chip-${course.id}`}
              sx={{
                backgroundColor: '#ef4444',
                color: 'white',
                fontWeight: 'bold',
                px: 0.5,
                fontSize: '0.8rem',
                '& .MuiChip-icon': { color: 'white' },
              }}
            />
          ) : course.enrollmentStatus === 'cancelled' ? (
            <Chip
              icon={<Block sx={{ fontSize: '1rem' }} />}
              label="Cancelled"
              size="small"
              data-testid={`course-card-cancelled-chip-${course.id}`}
              sx={{
                backgroundColor: '#6b7280',
                color: 'white',
                fontWeight: 'bold',
                px: 0.5,
                fontSize: '0.8rem',
                '& .MuiChip-icon': { color: 'white' },
              }}
            />
          ) : course.enrollmentStatus === 'rejected' ? (
            <Chip
              icon={<Block sx={{ fontSize: '1rem' }} />}
              label="Rejected"
              size="small"
              data-testid={`course-card-rejected-chip-${course.id}`}
              sx={{
                backgroundColor: '#dc2626',
                color: 'white',
                fontWeight: 'bold',
                px: 0.5,
                fontSize: '0.8rem',
                '& .MuiChip-icon': { color: 'white' },
              }}
            />
          ) : !course.isEnrolled ? (
            <span onClick={(e) => e.stopPropagation()}>
              <Button
                variant="contained"
                size="small"
                onClick={handleEnrollClick}
                disabled={isEnrolling || isEnrollmentBlocked}
                startIcon={isEnrolling ? <CircularProgress size={16} color="inherit" /> : null}
                data-testid={`course-card-enroll-button-${course.id}`}
                sx={{
                  textTransform: 'none',
                  fontWeight: 'bold',
                  px: 3,
                  py: 0.75,
                  borderRadius: 2,
                  background: isEnrollmentBlocked
                    ? undefined
                    : `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                  boxShadow: isEnrollmentBlocked
                    ? 'none'
                    : '0 3px 5px 2px rgba(33, 150, 243, .3)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 10px 4px rgba(33, 150, 243, .3)',
                  },
                }}
              >
                {getEnrollButtonLabel()}
              </Button>
            </span>
          ) : variant === 'enrolled' ? (
            <Button
              variant="outlined"
              size="small"
              onClick={handleCardClick}
              data-testid={`course-card-continue-button-${course.id}`}
              sx={{
                textTransform: 'none',
                fontWeight: 'bold',
                px: 3,
                py: 0.75,
                borderRadius: 2,
                borderWidth: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                },
              }}
            >
              Continue
            </Button>
          ) : (
            <Chip
              label="✓ Enrolled"
              size="small"
              sx={{
                backgroundColor: theme.palette.success.main,
                color: 'white',
                fontWeight: 'bold',
                px: 1,
                fontSize: '0.8rem',
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};