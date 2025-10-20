import React from 'react';
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

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

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

  const recentCourses = [
    {
      title: 'Advanced React Development',
      progress: 75,
      instructor: 'Dr. Sarah Johnson',
      nextLesson: 'React Performance Optimization',
    },
    {
      title: 'Data Structures & Algorithms',
      progress: 45,
      instructor: 'Prof. Michael Chen',
      nextLesson: 'Binary Search Trees',
    },
    {
      title: 'Machine Learning Fundamentals',
      progress: 30,
      instructor: 'Dr. Emily Rodriguez',
      nextLesson: 'Linear Regression',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
            
            <Box display="flex" flexDirection="column" gap={2}>
              {recentCourses.map((course, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {course.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          by {course.instructor}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          Next: {course.nextLesson}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<PlayCircleOutline />}
                        size="small"
                      >
                        Continue
                      </Button>
                    </Box>
                    <Box>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2" color="text.secondary">
                          Progress
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {course.progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={course.progress}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
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