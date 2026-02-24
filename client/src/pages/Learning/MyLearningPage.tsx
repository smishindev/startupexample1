import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  LinearProgress,
  Chip,
  Button,
  Card,
  CardContent,
  CardMedia,
  Avatar,
  Alert,
  CircularProgress,
  alpha,
  Pagination,
  Rating,
  useTheme,
} from '@mui/material';
import {
  PlayArrow,
  Schedule,
  TrendingUp,
  School,
  CheckCircle,
  AccessTime,
  Psychology,
  StarOutline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { enrollmentApi, Enrollment } from '../../services/enrollmentApi';
import { useAuthStore } from '../../stores/authStore';
import { formatCategory, getCategoryGradient, getLevelColor } from '../../utils/courseHelpers';
import { formatDuration } from '@shared/utils';
import { useCatalogRealtimeUpdates } from '../../hooks/useCatalogRealtimeUpdates';
import { PageContainer, PageTitle, useResponsive } from '../../components/Responsive';

const MyLearningPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const { user } = useAuthStore();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [, setCurrentTime] = useState(Date.now()); // For auto-updating relative timestamps
  const limit = 20;

  const isInstructor = user?.role === 'instructor';

  useEffect(() => {
    loadEnrollments();
  }, [page]);

  // Real-time: refresh when course data changes (e.g., ratings updated by students)
  useCatalogRealtimeUpdates(useCallback(() => {
    loadEnrollments();
  }, [page]));

  // Auto-update relative timestamps every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadEnrollments = async () => {
    try {
      const response = await enrollmentApi.getMyEnrollments(page, limit);
      const data = response.enrollments || [];
      
      // Set pagination data
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.totalEnrollments);
      
      // Deduplicate courses by keeping the most recent enrollment for each course
      const courseMap = new Map<string, Enrollment>();
      data.forEach((enrollment) => {
        const courseId = enrollment.courseId;
        
        // Only keep the most recent enrollment for each course
        if (!courseMap.has(courseId) || 
            new Date(enrollment.LastAccessedAt || 0) > new Date(courseMap.get(courseId)?.LastAccessedAt || 0)) {
          courseMap.set(courseId, enrollment);
        }
      });
      
      // Convert Map back to array
      const uniqueEnrollments = Array.from(courseMap.values());
      setEnrollments(uniqueEnrollments);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Failed to load enrollments:', err);
      // Only set error if it's an actual API failure, not just empty results
      if (err && typeof err === 'object' && 'response' in err) {
        setError(isInstructor ? 'Failed to load your courses' : 'Failed to load your enrolled courses');
      } else {
        // Network or other errors
        setError('Failed to connect to server. Please check your connection and try again.');
      }
      setEnrollments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const createTestData = async () => {
    try {
      setLoading(true);
      
      // Get fresh auth state
      const { token, refreshToken, logout } = useAuthStore.getState();
      
      if (!token) {
        setError('Please log in again');
        return;
      }

      // Try to create test data
      let response = await fetch('http://localhost:3001/api/progress/create-test-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // If token expired, try to refresh and retry
      if (response.status === 401) {
        console.log('Token expired, trying to refresh...');
        const refreshed = await refreshToken();
        
        if (refreshed) {
          const newToken = useAuthStore.getState().token;
          response = await fetch('http://localhost:3001/api/progress/create-test-data', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            }
          });
        } else {
          // Refresh failed, user needs to log in again
          logout();
          setError('Session expired. Please log in again.');
          return;
        }
      }
      
      if (response.ok) {
        await response.json();
        // Reload enrollments after creating test data
        await loadEnrollments();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(`Failed to create test data: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create test data:', error);
      setError('Failed to create test data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'active':
        return 'primary';
      case 'pending':
        return 'warning';
      case 'approved':
        return 'info';
      case 'suspended':
        return 'error';
      case 'cancelled':
        return 'error';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'info';
    if (progress >= 25) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box>
        <Header />
        <PageContainer sx={{ pt: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </PageContainer>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <PageContainer sx={{ pt: { xs: 2, md: 4 } }}>
        <PageTitle gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
          {isInstructor ? <Psychology color="primary" /> : <School color="primary" />}
          {isInstructor ? 'My Teaching' : 'My Learning'}
        </PageTitle>

        {error && enrollments.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {enrollments.length === 0 ? (
          <Paper sx={{ p: { xs: 3, sm: 4, md: 6 }, textAlign: 'center' }}>
            {isInstructor ? <Psychology sx={{ fontSize: { xs: 48, md: 64 }, color: 'text.secondary', mb: 2 }} /> : <School sx={{ fontSize: { xs: 48, md: 64 }, color: 'text.secondary', mb: 2 }} />}
            <Typography variant="h5" gutterBottom color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.125rem' } }}>
              {isInstructor ? 'No courses created yet' : 'No enrolled courses yet'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {isInstructor 
                ? 'Start creating courses to share your knowledge with students.'
                : 'Start your learning journey by enrolling in courses that interest you.'
              }
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate(isInstructor ? '/instructor/courses/create' : '/courses')}              data-testid="my-learning-browse-button"            >
              {isInstructor ? 'Create Course' : 'Browse Courses'}
            </Button>
            {isInstructor && (
              <Button
                variant="outlined"
                size="large"
                onClick={createTestData}
                sx={{ ml: 2 }}
                data-testid="my-learning-create-test-data-button"
              >
                Create Test Data
              </Button>
            )}
          </Paper>
        ) : (
          <>
            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <School />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{totalCount}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {isInstructor ? 'Courses Created' : 'Total Courses'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <CheckCircle />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {isInstructor 
                            ? totalCount // All instructor courses are published (filtered by backend)
                            : enrollments.filter(e => e.Status === 'completed').length
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {isInstructor ? 'Published' : 'Completed'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'info.main' }}>
                        <TrendingUp />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {enrollments.length > 0 ? Math.round(enrollments.reduce((acc, e) => acc + (e.OverallProgress || 0), 0) / enrollments.length) : 0}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Avg Progress
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'warning.main' }}>
                        <AccessTime />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">
                          {Math.round(enrollments.reduce((acc, e) => acc + (e.TimeSpent || 0), 0) / 60)}h
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Time Spent
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Enrolled Courses */}
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              My Courses
            </Typography>
            
            <Grid container spacing={3}>
              {enrollments.map((enrollment) => (
                <Grid item xs={12} md={6} lg={4} key={enrollment.enrollmentId}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: theme.custom.shadows.dialog,
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
                  >
                    <CardMedia
                      component="div"
                      sx={{
                        height: 160,
                        background: enrollment.Thumbnail 
                          ? `url(${enrollment.Thumbnail})` 
                          : getCategoryGradient(enrollment.Category),
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: enrollment.Thumbnail 
                            ? 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)'
                            : 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)',
                          opacity: enrollment.Thumbnail ? 1 : 0,
                          transition: 'opacity 0.3s ease',
                        },
                        '.MuiCard-root:hover &::before': {
                          opacity: 1,
                        },
                      }}
                    >
                      {!enrollment.Thumbnail && (
                        <School 
                          sx={{ 
                            fontSize: 56, 
                            color: 'white',
                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                            transition: 'all 0.3s ease',
                            '.MuiCard-root:hover &': {
                              transform: 'scale(1.2)',
                            },
                          }} 
                        />
                      )}
                    </CardMedia>
                    
                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
                      <Typography gutterBottom variant="h6" component="h3" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 1 }}>
                        {enrollment.Title}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                        by {enrollment.instructorFirstName} {enrollment.instructorLastName}
                      </Typography>

                      {(enrollment.Rating > 0 || enrollment.RatingCount > 0) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                          <Rating value={enrollment.Rating || 0} precision={0.1} readOnly size="small" sx={{ color: theme.custom.colors.gold }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.85rem' }}>
                            {Number(enrollment.Rating || 0).toFixed(1)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({enrollment.RatingCount || 0})
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
                        {enrollment.Level && (
                          <Chip 
                            label={enrollment.Level} 
                            size="small" 
                            sx={{ 
                              backgroundColor: alpha(getLevelColor(enrollment.Level as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert', theme), 0.15),
                              color: getLevelColor(enrollment.Level as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert', theme),
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 24,
                              border: `1.5px solid ${alpha(getLevelColor(enrollment.Level as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert', theme), 0.4)}`,
                            }}
                          />
                        )}
                        {enrollment.Category && (
                          <Chip 
                            label={formatCategory(enrollment.Category)} 
                            size="small" 
                            variant="outlined"
                            sx={{ 
                              fontWeight: 500,
                              fontSize: '0.7rem',
                              borderColor: 'divider',
                              height: 24,
                            }}
                          />
                        )}
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Your Progress</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {enrollment.OverallProgress || 0}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={enrollment.OverallProgress || 0}
                          color={getProgressColor(enrollment.OverallProgress || 0) as any}
                          sx={{ 
                            height: 10, 
                            borderRadius: 5,
                            backgroundColor: 'rgba(0,0,0,0.08)',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 5,
                              boxShadow: theme.custom.shadows.focusPrimary,
                            },
                          }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip
                          label={enrollment.Status}
                          size="small"
                          color={getStatusColor(enrollment.Status) as any}
                          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                        />
                        <Chip
                          icon={<Schedule />}
                          label={enrollment.Duration ? formatDuration(Number(enrollment.Duration)) : 'N/A'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 500, fontSize: '0.7rem' }}
                        />
                      </Box>

                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                        Last accessed {enrollment.LastAccessedAt ? 
                          formatDistanceToNow(new Date(enrollment.LastAccessedAt), { addSuffix: true }) : 
                          'Never'
                        }
                      </Typography>

                      {enrollment.Status === 'pending' ? (
                        <Chip
                          label="Pending Approval"
                          size="small"
                          color="warning"
                          sx={{ fontWeight: 600, width: '100%' }}
                          data-testid={`my-learning-pending-chip-${enrollment.courseId}`}
                        />
                      ) : enrollment.Status === 'approved' && Number(enrollment.Price) > 0 ? (
                        <Button
                          variant="contained"
                          fullWidth
                          data-testid={`my-learning-complete-purchase-${enrollment.courseId}-button`}
                          onClick={() => navigate(`/checkout/${enrollment.courseId}`)}
                          sx={{
                            py: 0.75,
                            borderRadius: 2,
                            background: theme.custom.gradients.success,
                            boxShadow: `0 3px 5px 2px ${alpha(theme.palette.success.main, 0.3)}`,
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: `0 6px 10px 4px ${alpha(theme.palette.success.main, 0.3)}`,
                            },
                          }}
                        >
                          Complete Purchase
                        </Button>
                      ) : enrollment.Status === 'approved' ? (
                        <Chip
                          label="Approved"
                          size="small"
                          color="success"
                          sx={{ fontWeight: 600, width: '100%' }}
                          data-testid={`my-learning-approved-chip-${enrollment.courseId}`}
                        />
                      ) : enrollment.Status === 'rejected' ? (
                        <Chip
                          label="Enrollment Rejected"
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ fontWeight: 600, width: '100%' }}
                          data-testid={`my-learning-rejected-chip-${enrollment.courseId}`}
                        />
                      ) : enrollment.Status === 'suspended' ? (
                        <Chip
                          label="Enrollment Suspended"
                          size="small"
                          color="error"
                          sx={{ fontWeight: 600, width: '100%' }}
                          data-testid={`my-learning-suspended-chip-${enrollment.courseId}`}
                        />
                      ) : enrollment.Status === 'cancelled' ? (
                        <Chip
                          label="Enrollment Cancelled"
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ fontWeight: 600, width: '100%' }}
                          data-testid={`my-learning-cancelled-chip-${enrollment.courseId}`}
                        />
                      ) : enrollment.Status === 'teaching' ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Button
                            variant="contained"
                            startIcon={<Psychology />}
                            fullWidth
                            onClick={() => navigate(`/instructor/courses/${enrollment.courseId}/edit`)}
                            sx={{
                              py: 0.75,
                              borderRadius: 2,
                              background: theme.custom.gradients.primary,
                              boxShadow: theme.custom.shadows.image,
                              fontWeight: 600,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                              boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.5)}`,
                              },
                            }}
                            data-testid={`my-learning-edit-course-${enrollment.courseId}-button`}
                          >
                            Edit Course
                          </Button>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              onClick={() => navigate(`/instructor/courses/${enrollment.courseId}/edit?tab=1`)}
                              sx={{
                                borderRadius: 2,
                                borderWidth: 2,
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderWidth: 2,
                                  transform: 'translateY(-2px)',
                                },
                              }}
                              data-testid={`my-learning-lessons-${enrollment.courseId}-button`}
                            >
                              Lessons
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              onClick={() => navigate(`/instructor/courses/${enrollment.courseId}/assessments`)}
                              sx={{
                                borderRadius: 2,
                                borderWidth: 2,
                                fontWeight: 600,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderWidth: 2,
                                  transform: 'translateY(-2px)',
                                },
                              }}
                              data-testid={`my-learning-assessments-${enrollment.courseId}-button`}
                            >
                              Assessments
                            </Button>
                          </Box>
                          <Button
                            variant="text"
                            size="small"
                            fullWidth
                            onClick={() => navigate(`/courses/${enrollment.courseId}`)}
                            sx={{
                              borderRadius: 2,
                              fontWeight: 600,
                            }}
                            data-testid={`my-learning-preview-${enrollment.courseId}-button`}
                          >
                            Preview Course
                          </Button>
                        </Box>
                      ) : (
                        <Box>
                        <Button
                          variant="contained"
                          startIcon={<PlayArrow />}
                          fullWidth
                          data-testid={`my-learning-continue-${enrollment.courseId}-button`}
                          onClick={async () => {
                            if (enrollment.OverallProgress === 0) {
                              // For new courses, try to go to first lesson directly
                              // TODO: We would need to fetch course structure to get first lesson ID
                              // For now, go to course page which will show "Continue Learning" button
                              navigate(`/courses/${enrollment.courseId}`);
                            } else {
                              // For courses in progress, go to course page (could be enhanced to go to last accessed lesson)
                              navigate(`/courses/${enrollment.courseId}`);
                            }
                          }}
                          sx={{
                            py: 0.75,
                            borderRadius: 2,
                            background: theme.custom.gradients.primary,
                            boxShadow: theme.custom.shadows.image,
                            fontWeight: 600,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.5)}`,
                            },
                          }}
                        >
                          {enrollment.OverallProgress === 0 ? 'Start Course' : 'Continue'}
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          startIcon={<StarOutline />}
                          fullWidth
                          onClick={() => navigate(`/courses/${enrollment.courseId}#reviews`)}
                          sx={{
                            mt: 0.5,
                            borderRadius: 2,
                            fontWeight: 600,
                            color: 'text.secondary',
                            '&:hover': { color: 'warning.main' },
                          }}
                          data-testid={`my-learning-rate-${enrollment.courseId}-button`}
                        >
                          Rate Course
                        </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={(_e, value) => setPage(value)}
                  color="primary"
                  size={isMobile ? 'small' : 'large'}
                  siblingCount={isMobile ? 0 : 1}
                />
              </Box>
            )}
          </>
        )}
      </PageContainer>
    </Box>
  );
};

export default MyLearningPage;