import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  PlayCircleOutline,
  Schedule,
  CheckCircle,
  VideoLibrary,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { HeaderV4 as Header } from '../../components/Navigation/HeaderV4';
import axios from 'axios';
import { instructorApi } from '../../services/instructorApi';
import { useAuthStore } from '../../stores/authStore';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with auth
const createAuthAxios = () => {
  const instance = axios.create({
    baseURL: API_URL,
  });
  
  instance.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  
  return instance;
};

interface VideoAnalyticsSummary {
  videoLessonId: string;
  lessonTitle: string;
  totalViews: number;
  uniqueViewers: number;
  averageWatchTime: number;
  completionRate: number;
  averageCompletionTime: number;
  totalWatchTime: number;
}

interface CourseVideoAnalytics {
  courseId: string;
  courseTitle: string;
  totalVideos: number;
  totalViews: number;
  averageCompletionRate: number;
  videos: VideoAnalyticsSummary[];
}

interface VideoEventAnalytics {
  eventType: string;
  count: number;
  percentage: number;
}

export const VideoAnalyticsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courseId || '');
  const [analytics, setAnalytics] = useState<CourseVideoAnalytics | null>(null);
  const [eventAnalytics, setEventAnalytics] = useState<VideoEventAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch instructor courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesData = await instructorApi.getCourses();
        setCourses(coursesData);
        
        // Set first course as selected if none selected
        if (!selectedCourseId && coursesData.length > 0) {
          setSelectedCourseId(coursesData[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      }
    };

    fetchCourses();
  }, [selectedCourseId]);

  // Fetch video analytics for selected course
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!selectedCourseId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const authAxios = createAuthAxios();

        // Fetch course video analytics
        const analyticsResponse = await authAxios.get(
          `/api/video-analytics/course/${selectedCourseId}`
        );

        setAnalytics(analyticsResponse.data);

        // Fetch event analytics
        const eventsResponse = await authAxios.get(
          `/api/video-analytics/course/${selectedCourseId}/events`
        );

        setEventAnalytics(eventsResponse.data || []);
      } catch (error: any) {
        console.error('Failed to fetch analytics:', error);
        setError(error.response?.data?.error || 'Failed to load video analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedCourseId]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  if (loading && !analytics) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            📊 Video Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track video engagement, completion rates, and viewer behavior
          </Typography>
        </Box>

        {/* Course Selector */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Select Course</InputLabel>
            <Select
              data-testid="video-analytics-course-select"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              label="Select Course"
            >
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {courses.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <VideoLibrary sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No courses with video lessons yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create a course and add video lessons to start tracking video analytics and viewer engagement!
            </Typography>
            <Button 
              data-testid="video-analytics-go-to-dashboard"
              variant="contained" 
              onClick={() => window.location.href = '/instructor/dashboard'}
            >
              Go to Dashboard
            </Button>
          </Paper>
        ) : (
          <>
            {!selectedCourseId && (
              <Alert severity="info" sx={{ mb: 3 }}>
                Please select a course to view video analytics
              </Alert>
            )}

            {analytics && (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <VideoLibrary sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="body2" color="text.secondary">
                        Total Videos
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {analytics.totalVideos}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PlayCircleOutline sx={{ mr: 1, color: 'info.main' }} />
                      <Typography variant="body2" color="text.secondary">
                        Total Views
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {analytics.totalViews}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="body2" color="text.secondary">
                        Avg Completion
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      {Math.round(analytics.averageCompletionRate)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Schedule sx={{ mr: 1, color: 'warning.main' }} />
                      <Typography variant="body2" color="text.secondary">
                        Avg Watch Time
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                      {formatDuration(analytics.videos.reduce((sum, v) => sum + v.averageWatchTime, 0) / analytics.videos.length || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Video Performance Table */}
            <Paper sx={{ mb: 3 }}>
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Video Performance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Detailed metrics for each video lesson
                </Typography>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Video Lesson</TableCell>
                      <TableCell align="center">Views</TableCell>
                      <TableCell align="center">Unique Viewers</TableCell>
                      <TableCell align="center">Avg Watch Time</TableCell>
                      <TableCell align="center">Completion Rate</TableCell>
                      <TableCell align="center">Total Watch Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.videos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                            No video data available yet
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      analytics.videos.map((video) => (
                        <TableRow key={video.videoLessonId} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {video.lessonTitle}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={video.totalViews} size="small" color="primary" />
                          </TableCell>
                          <TableCell align="center">
                            {video.uniqueViewers}
                          </TableCell>
                          <TableCell align="center">
                            {formatDuration(video.averageWatchTime)}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={video.completionRate}
                                sx={{ width: 80, height: 8, borderRadius: 4 }}
                                color={
                                  video.completionRate >= 70 ? 'success' :
                                  video.completionRate >= 40 ? 'warning' : 'error'
                                }
                              />
                              <Typography variant="body2">
                                {Math.round(video.completionRate)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            {formatDuration(video.totalWatchTime)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Event Analytics */}
            {eventAnalytics.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                  Viewer Interactions
                </Typography>
                <Grid container spacing={2}>
                  {eventAnalytics.map((event) => (
                    <Grid item xs={12} sm={6} md={4} key={event.eventType}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {event.eventType.replace('_', ' ').toUpperCase()}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                              {event.count}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ({Math.round(event.percentage)}%)
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {/* Insights */}
            <Paper sx={{ p: 3, bgcolor: 'info.light' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                💡 Insights & Recommendations
              </Typography>
              <Grid container spacing={2}>
                {analytics.averageCompletionRate < 50 && (
                  <Grid item xs={12}>
                    <Alert severity="warning">
                      Low completion rate detected. Consider breaking longer videos into shorter segments or adding more engaging content.
                    </Alert>
                  </Grid>
                )}
                {analytics.totalViews === 0 && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      No views yet. Promote your course to students and encourage them to start watching videos.
                    </Alert>
                  </Grid>
                )}
                {analytics.averageCompletionRate >= 70 && (
                  <Grid item xs={12}>
                    <Alert severity="success">
                      Great engagement! Your videos have a high completion rate. Keep up the good work!
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </>
        )}
        </>
        )}
      </Container>
    </Box>
  );
};
