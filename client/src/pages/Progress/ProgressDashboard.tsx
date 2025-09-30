import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  LinearProgress,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  School,
  Timer,
  EmojiEvents,
  LocalFireDepartment,
  PlayCircleOutline,
  CheckCircle,
  Star,
  Timeline
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Header } from '../../components/Navigation/Header';
import { 
  progressApi, 
  UserProgressData, 
  AchievementsData
} from '../../services/progressApi';

const ProgressDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [progressData, setProgressData] = useState<UserProgressData | null>(null);
  const [achievementsData, setAchievementsData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [progress, achievements] = await Promise.all([
        progressApi.getMyProgress(),
        progressApi.getAchievements()
      ]);
      setProgressData(progress);
      setAchievementsData(achievements);
    } catch (error) {
      console.error('Failed to load progress data:', error);
      setError('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeSpent = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
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
        <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  if (!progressData || !achievementsData) {
    return (
      <Box>
        <Header />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">Failed to load progress data</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Timeline color="primary" />
          Learning Progress
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Overview Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <School />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{progressData.overview.totalCourses}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enrolled Courses
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
                    <Typography variant="h6">{progressData.overview.completedCourses}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
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
                    <Typography variant="h6">{Math.round(progressData.overview.avgProgress)}%</Typography>
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
                    <Timer />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{formatTimeSpent(progressData.overview.totalTimeSpent)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Time Spent
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Recent Activity */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PlayCircleOutline />
                Recent Activity
              </Typography>
              
              {progressData.recentActivity.length === 0 ? (
                <Typography color="text.secondary">No recent activity</Typography>
              ) : (
                <List>
                  {progressData.recentActivity.map((activity, index) => (
                    <React.Fragment key={activity.CourseId}>
                      <ListItem 
                        sx={{ px: 0, cursor: 'pointer' }}
                        onClick={() => navigate(`/courses/${activity.CourseId}`)}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.light' }}>
                            <School />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={activity.courseTitle}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                by {activity.instructorFirstName} {activity.instructorLastName}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={activity.OverallProgress}
                                    color={getProgressColor(activity.OverallProgress) as any}
                                    sx={{ width: 60, height: 4 }}
                                  />
                                  <Typography variant="caption">
                                    {activity.OverallProgress}%
                                  </Typography>
                                </Box>
                                <Chip
                                  icon={<Timer />}
                                  label={formatTimeSpent(activity.TimeSpent)}
                                  size="small"
                                  variant="outlined"
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {activity.LastAccessedAt && formatDistanceToNow(new Date(activity.LastAccessedAt), { addSuffix: true })}
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < progressData.recentActivity.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          {/* Achievements & Streak */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={3}>
              {/* Learning Streak */}
              <Grid item xs={12}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                      <LocalFireDepartment sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {achievementsData.currentStreak}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Day Learning Streak
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/my-learning')}
                    >
                      Keep it up!
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* Achievement Stats */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiEvents />
                    Quick Stats
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Courses Started</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {achievementsData.stats.coursesStarted}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Courses Completed</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {achievementsData.stats.coursesCompleted}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Lessons Completed</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {achievementsData.stats.lessonsCompleted}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Total Time</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {formatTimeSpent(achievementsData.stats.totalTimeSpent)}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Achievement Badges */}
        {achievementsData.badges.length > 0 && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Star />
              Achievement Badges
            </Typography>
            <Grid container spacing={2}>
              {achievementsData.badges.map((badge, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" sx={{ mb: 1 }}>
                        {badge.icon}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {badge.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {badge.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default ProgressDashboard;