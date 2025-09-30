import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
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
  CircularProgress
} from '@mui/material';
import {
  PlayArrow,
  Schedule,
  TrendingUp,
  School,
  CheckCircle,
  AccessTime
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Header } from '../../components/Navigation/Header';
import { enrollmentApi, Enrollment } from '../../services/enrollmentApi';

const MyLearningPage: React.FC = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEnrollments();
  }, []);

  const loadEnrollments = async () => {
    try {
      const data = await enrollmentApi.getMyEnrollments();
      setEnrollments(data);
    } catch (error) {
      console.error('Failed to load enrollments:', error);
      setError('Failed to load your enrolled courses');
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
      case 'dropped':
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
        <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <School color="primary" />
          My Learning
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {enrollments.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <School sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="text.secondary">
              No enrolled courses yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Start your learning journey by enrolling in courses that interest you.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/courses')}
            >
              Browse Courses
            </Button>
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
                        <Typography variant="h6">{enrollments.length}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Courses
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
                          {enrollments.filter(e => e.Status === 'completed').length}
                        </Typography>
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
                        <Typography variant="h6">
                          {Math.round(enrollments.reduce((acc, e) => acc + (e.OverallProgress || 0), 0) / enrollments.length) || 0}%
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
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardMedia
                      component="div"
                      sx={{
                        height: 140,
                        bgcolor: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <School sx={{ fontSize: 48, color: 'primary.contrastText' }} />
                    </CardMedia>
                    
                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography gutterBottom variant="h6" component="h3" noWrap>
                        {enrollment.Title}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                        by {enrollment.instructorFirstName} {enrollment.instructorLastName}
                      </Typography>

                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2">Progress</Typography>
                          <Typography variant="body2">{enrollment.OverallProgress || 0}%</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={enrollment.OverallProgress || 0}
                          color={getProgressColor(enrollment.OverallProgress || 0) as any}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip
                          label={enrollment.Status}
                          size="small"
                          color={getStatusColor(enrollment.Status) as any}
                        />
                        <Chip
                          label={enrollment.Level}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<Schedule />}
                          label={enrollment.Duration}
                          size="small"
                          variant="outlined"
                        />
                      </Box>

                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                        Last accessed {enrollment.LastAccessedAt ? 
                          formatDistanceToNow(new Date(enrollment.LastAccessedAt), { addSuffix: true }) : 
                          'Never'
                        }
                      </Typography>

                      <Button
                        variant="contained"
                        startIcon={<PlayArrow />}
                        fullWidth
                        onClick={() => navigate(`/courses/${enrollment.courseId}`)}
                      >
                        {enrollment.OverallProgress === 0 ? 'Start Course' : 'Continue'}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
};

export default MyLearningPage;