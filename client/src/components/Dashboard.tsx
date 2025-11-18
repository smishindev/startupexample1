import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  School,
  TrendingUp,
  Assignment,
  People,
  PlayCircleOutline,
  BookmarkBorder,
  EmojiEvents,
  Psychology,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { enrollmentApi } from '../services/enrollmentApi';

interface EnrolledCourse {
  CourseID: string;
  Title: string;
  Description?: string;
  Instructor?: string;
  Progress?: number;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  if (!user) return null;

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        setLoading(true);
        const enrollments = await enrollmentApi.getMyEnrollments();
        
        // Map enrollments to the format needed for display
        const courses: EnrolledCourse[] = enrollments.map((enrollment) => ({
          CourseID: enrollment.courseId,
          Title: enrollment.Title,
          Description: enrollment.Description,
          Instructor: `${enrollment.instructorFirstName} ${enrollment.instructorLastName}`,
          Progress: enrollment.OverallProgress || 0,
        }));

        setEnrolledCourses(courses);
      } catch (error) {
        console.error('Failed to fetch enrolled courses:', error);
        // Fallback to empty array if API fails
        setEnrolledCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleSmartProgress = () => {
    navigate('/smart-progress');
  };

  const stats = [
    {
      title: 'Courses Enrolled',
      value: '5',
      icon: <School />,
      color: 'primary.main',
      description: '+2 this month',
    },
    {
      title: 'Learning Hours',
      value: '127',
      icon: <TrendingUp />,
      color: 'success.main',
      description: 'This month',
    },
    {
      title: 'Assignments',
      value: '12',
      icon: <Assignment />,
      color: 'warning.main',
      description: '3 pending',
    },
    {
      title: 'Study Groups',
      value: '3',
      icon: <People />,
      color: 'info.main',
      description: 'Active groups',
    },
  ];

  // Use real enrolled courses data, limiting to 3 recent ones
  const recentCourses = enrolledCourses.slice(0, 3).map(course => ({
    title: course.Title,
    progress: course.Progress || 0,
    instructor: course.Instructor || 'Unknown Instructor',
    nextLesson: 'Continue Learning', // Could be enhanced with real lesson data later
  }));

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Welcome Section */}
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'primary.main',
                fontSize: '1.5rem',
              }}
            >
              {user.firstName[0]}{user.lastName[0]}
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1">
                Welcome back, {user.firstName}!
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  label={user.role} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
                {user.learningStyle && (
                  <Chip 
                    label={`${user.learningStyle} learner`} 
                    size="small" 
                    variant="outlined" 
                  />
                )}
              </Box>
            </Box>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              startIcon={<Psychology />}
              onClick={handleSmartProgress}
              sx={{ mr: 1 }}
            >
              Smart Progress
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Continue your learning journey with personalized recommendations and track your progress.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      bgcolor: `${stat.color}15`,
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box flex={1}>
                    <Typography variant="h4" component="div" gutterBottom>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stat.description}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Courses */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6" component="h2">
                Continue Learning
              </Typography>
              <Button
                variant="text"
                size="small"
                endIcon={<School />}
              >
                View All Courses
              </Button>
            </Box>
            
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : recentCourses.length > 0 ? (
              <Box display="flex" flexDirection="column" gap={2}>
                {recentCourses.map((course, index) => (
                  <Card 
                    key={index} 
                    sx={{ 
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(102,126,234,0.05) 0%, transparent 50%)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        pointerEvents: 'none',
                      },
                      '&:hover::after': {
                        opacity: 1,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box flex={1}>
                          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                            {course.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                            by {course.instructor}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'primary.main',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <PlayCircleOutline sx={{ fontSize: 16 }} />
                            Next: {course.nextLesson}
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          startIcon={<PlayCircleOutline />}
                          size="small"
                          onClick={() => navigate(`/course/${enrolledCourses[index]?.CourseID}`)}
                          sx={{
                            py: 0.75,
                            px: 2,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 16px rgba(102, 126, 234, 0.5)',
                            },
                          }}
                        >
                          Continue
                        </Button>
                      </Box>
                      <Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Your Progress
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {Math.round(course.progress)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={course.progress}
                          sx={{ 
                            height: 10, 
                            borderRadius: 5,
                            backgroundColor: 'rgba(0,0,0,0.08)',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 5,
                              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                              boxShadow: '0 2px 4px rgba(102, 126, 234, 0.4)',
                            },
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Box textAlign="center" py={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No courses enrolled yet
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<School />}
                  onClick={() => navigate('/courses')}
                  sx={{ mt: 1 }}
                >
                  Browse Courses
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Quick Actions & Achievements */}
        <Grid item xs={12} lg={4}>
          <Box display="flex" flexDirection="column" gap={3}>
            {/* Quick Actions */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" component="h2" gutterBottom>
                Quick Actions
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<BookmarkBorder />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Browse Courses
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Assignment />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Assignments Due
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<People />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Join Study Group
                </Button>
              </Box>
            </Paper>

            {/* Recent Achievements */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" component="h2" gutterBottom>
                Recent Achievements
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <EmojiEvents sx={{ color: 'warning.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      Course Completion
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      JavaScript Fundamentals
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <EmojiEvents sx={{ color: 'info.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      7-Day Streak
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Keep up the great work!
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <EmojiEvents sx={{ color: 'success.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      Perfect Quiz Score
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      React Hooks Quiz
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};