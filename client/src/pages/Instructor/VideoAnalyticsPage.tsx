/**
 * Video Analytics Page - ContentJson-based Multi-Content Analytics
 * Tracks video engagement, completion rates, and watch time across all video content
 * Uses ContentItemId from VideoProgress table and Lessons.ContentJson for metadata
 */

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
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  IconButton
} from '@mui/material';
import {
  VideoLibrary as VideoIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  PlayCircle as PlayIcon,
  CheckCircle as CompleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { CourseSelector } from '../../components/Common/CourseSelector';

// Use environment variable or fallback to localhost
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

interface Course {
  id: string;
  title: string;
}

interface VideoContentItem {
  contentItemId: string;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  videoIndex: number;
  duration: number;
  url: string;
}

interface VideoAnalytics {
  contentItemId: string;
  lessonTitle: string;
  courseTitle: string;
  videoIndex: number;
  duration: number;
  totalViews: number;
  completions: number;
  completionRate: number;
  avgWatchTime: number;
  avgCompletionPercentage: number;
  engagementScore: number;
}

interface OverallStats {
  totalVideos: number;
  totalViews: number;
  totalCompletions: number;
  avgCompletionRate: number;
  avgWatchTime: number;
  totalWatchTimeHours: number;
}

const createAuthAxios = () => {
  const token = useAuthStore.getState().token;

  const instance = axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  });

  // Handle token expiration (consistent with analyticsApi/instructorApi/assessmentAnalyticsApi)
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export const VideoAnalyticsPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [analytics, setAnalytics] = useState<VideoAnalytics[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch instructor's courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setCoursesLoading(true);
        const authAxios = createAuthAxios();
        const response = await authAxios.get('/api/instructor/courses', { params: { page: 1, limit: 10000 } });
        setCourses(response.data.courses || []);
        
        if (response.data.courses?.length > 0 && !selectedCourseId) {
          setSelectedCourseId(response.data.courses[0].id);
          setLoading(true); // Pre-set loading to avoid flash before analytics useEffect fires
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error);
        setError('Failed to load courses');
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const fetchAnalytics = async () => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      setError(null);
        setAnalytics([]);
        setOverallStats(null);
        const authAxios = createAuthAxios();

        // Fetch lessons and course details in parallel
        const [lessonsResponse, courseResponse] = await Promise.all([
          authAxios.get(`/api/lessons/${selectedCourseId}`),
          authAxios.get(`/api/courses/${selectedCourseId}`)
        ]);
        const lessons = lessonsResponse.data.lessons || [];
        const courseTitle = courseResponse.data.course?.title || 'Unknown Course';

        // Extract video content items from lessons
        const videoItems: VideoContentItem[] = [];
        lessons.forEach((lesson: any) => {
          try {
            const content = lesson.contentJson ? JSON.parse(lesson.contentJson) : [];
            let videoCount = 0;
            content.forEach((item: any) => {
              if (item.type === 'video' && item.id) {
                videoItems.push({
                  contentItemId: item.id,
                  lessonId: lesson.id,
                  lessonTitle: lesson.title,
                  courseId: selectedCourseId,
                  courseTitle,
                  videoIndex: videoCount,
                  duration: item.data?.duration || 0,
                  url: item.data?.url || ''
                });
                videoCount++;
              }
            });
          } catch (e) {
            console.error(`Failed to parse lesson ${lesson.id} content:`, e);
          }
        });

        if (videoItems.length === 0) {
          setAnalytics([]);
          setOverallStats({
            totalVideos: 0,
            totalViews: 0,
            totalCompletions: 0,
            avgCompletionRate: 0,
            avgWatchTime: 0,
            totalWatchTimeHours: 0
          });
          return;
        }

        // Fetch aggregated video progress for all students in this course
        const progressResponse = await authAxios.get(`/api/video-analytics/course/${selectedCourseId}`);
        const progressData = progressResponse.data.progress || [];

        // Map progress by contentItemId
        const progressMap = new Map();
        progressData.forEach((p: any) => {
          if (!progressMap.has(p.contentItemId)) {
            progressMap.set(p.contentItemId, []);
          }
          progressMap.get(p.contentItemId).push(p);
        });

        // Calculate analytics for each video
        const videoAnalytics: VideoAnalytics[] = videoItems.map(video => {
          const progress = progressMap.get(video.contentItemId) || [];
          const totalViews = progress.length;
          const completions = progress.filter((p: any) => p.isCompleted).length;
          const completionRate = totalViews > 0 ? (completions / totalViews) * 100 : 0;
          
          const totalWatchTime = progress.reduce((sum: number, p: any) => sum + (p.watchedDuration || 0), 0);
          const avgWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;
          
          const totalCompletionPercentage = progress.reduce((sum: number, p: any) => 
            sum + (p.completionPercentage || 0), 0);
          const avgCompletionPercentage = totalViews > 0 ? totalCompletionPercentage / totalViews : 0;

          // Engagement score: weighted combination of views, completion rate, and avg watch percentage
          // Normalize views to 0-100 scale (10+ views = full score) so it mixes properly with percentages
          const viewScore = Math.min(totalViews * 10, 100);
          const engagementScore = totalViews > 0 
            ? (viewScore * 0.3) + (completionRate * 0.4) + (avgCompletionPercentage * 0.3)
            : 0;

          return {
            contentItemId: video.contentItemId,
            lessonTitle: video.lessonTitle,
            courseTitle: video.courseTitle,
            videoIndex: video.videoIndex,
            duration: video.duration,
            totalViews,
            completions,
            completionRate,
            avgWatchTime,
            avgCompletionPercentage,
            engagementScore
          };
        });

        // Calculate overall stats
        const totalVideos = videoAnalytics.length;
        const totalViews = videoAnalytics.reduce((sum, v) => sum + v.totalViews, 0);
        const totalCompletions = videoAnalytics.reduce((sum, v) => sum + v.completions, 0);
        const avgCompletionRate = totalVideos > 0 
          ? videoAnalytics.reduce((sum, v) => sum + v.completionRate, 0) / totalVideos 
          : 0;
        const totalWatchTimeSeconds = videoAnalytics.reduce((sum, v) => 
          sum + (v.avgWatchTime * v.totalViews), 0);
        const avgWatchTime = totalViews > 0 ? totalWatchTimeSeconds / totalViews : 0;
        const totalWatchTimeHours = totalWatchTimeSeconds / 3600;

        setAnalytics(videoAnalytics);
        setOverallStats({
          totalVideos,
          totalViews,
          totalCompletions,
          avgCompletionRate,
          avgWatchTime,
          totalWatchTimeHours
        });

    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      setError(error.response?.data?.error || 'Failed to load video analytics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch video analytics when course changes
  useEffect(() => {
    fetchAnalytics();
  }, [selectedCourseId]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHours = (hours: number): string => {
    return hours.toFixed(1);
  };

  const getEngagementColor = (score: number): string => {
    if (score >= 70) return '#4caf50';
    if (score >= 40) return '#ff9800';
    return '#f44336';
  };

  return (
    <>
    <Header />
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VideoIcon fontSize="large" color="primary" />
            Video Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track video engagement and completion rates across your courses
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={fetchAnalytics} color="primary" size="large" disabled={loading} data-testid="video-analytics-refresh-button">
            <RefreshIcon />
          </IconButton>
          <CourseSelector
            courses={courses}
            value={selectedCourseId}
            onChange={(id: string) => setSelectedCourseId(id)}
            label="Select Course"
            disabled={loading}
            required
            sx={{ minWidth: 300 }}
            testId="video-analytics-course-select"
            inputTestId="video-analytics-course-select-input"
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}{courses.length > 0 ? '. Try selecting a different course.' : '.'}
        </Alert>
      )}

      {loading || coursesLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : overallStats ? (
        <>
          {/* Overall Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <VideoIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Total Videos
                    </Typography>
                  </Box>
                  <Typography variant="h4">{overallStats.totalVideos}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PeopleIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Total Views
                    </Typography>
                  </Box>
                  <Typography variant="h4">{overallStats.totalViews}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CompleteIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Completions
                    </Typography>
                  </Box>
                  <Typography variant="h4">{overallStats.totalCompletions}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {overallStats.avgCompletionRate.toFixed(1)}% avg rate
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ScheduleIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Watch Time
                    </Typography>
                  </Box>
                  <Typography variant="h4">{formatHours(overallStats.totalWatchTimeHours)}h</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {formatDuration(overallStats.avgWatchTime)} avg
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Video Analytics Table */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Video Performance Details
            </Typography>
            
            {analytics.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No video content found in this course. Add videos to lessons to see analytics.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Lesson</TableCell>
                      <TableCell>Video</TableCell>
                      <TableCell align="center">Duration</TableCell>
                      <TableCell align="center">Views</TableCell>
                      <TableCell align="center">Completions</TableCell>
                      <TableCell align="center">Completion Rate</TableCell>
                      <TableCell align="center">Avg Watch Time</TableCell>
                      <TableCell align="center">Engagement</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...analytics]
                      .sort((a, b) => b.engagementScore - a.engagementScore)
                      .map((video) => (
                        <TableRow key={video.contentItemId} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {video.lessonTitle}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={`Video ${video.videoIndex + 1}`} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {formatDuration(video.duration)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={video.totalViews} 
                              size="small"
                              icon={<PlayIcon />}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={video.completions} 
                              size="small"
                              color="success"
                              icon={<CompleteIcon />}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ flexGrow: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={Math.min(video.completionRate, 100)} 
                                  sx={{ 
                                    height: 8, 
                                    borderRadius: 1,
                                    backgroundColor: '#e0e0e0',
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: video.completionRate >= 70 ? '#4caf50' : 
                                                       video.completionRate >= 40 ? '#ff9800' : '#f44336'
                                    }
                                  }}
                                />
                              </Box>
                              <Typography variant="body2" fontWeight="medium" sx={{ minWidth: 45 }}>
                                {video.completionRate.toFixed(0)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {formatDuration(video.avgWatchTime)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {video.avgCompletionPercentage.toFixed(0)}% watched
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={video.engagementScore.toFixed(0)}
                              size="small"
                              sx={{ 
                                backgroundColor: getEngagementColor(video.engagementScore),
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Insights */}
          {analytics.length > 0 && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="primary" />
                Key Insights
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {(() => {
                  const topVideo = analytics.reduce((max, v) => 
                    v.engagementScore > max.engagementScore ? v : max, analytics[0]);
                  const lowVideo = analytics.reduce((min, v) => 
                    v.engagementScore < min.engagementScore ? v : min, analytics[0]);
                  
                  const hasDifferentVideos = topVideo.contentItemId !== lowVideo.contentItemId;
                  return (
                    <>
                      <Grid item xs={12} md={hasDifferentVideos ? 6 : 12}>
                        <Alert severity="success">
                          <Typography variant="body2" fontWeight="medium">
                            Top Performing Video
                          </Typography>
                          <Typography variant="body2">
                            "{topVideo.lessonTitle}" - Video {topVideo.videoIndex + 1} has the highest engagement 
                            with {topVideo.totalViews} views and {topVideo.completionRate.toFixed(0)}% completion rate.
                          </Typography>
                        </Alert>
                      </Grid>
                      {hasDifferentVideos && (
                        <Grid item xs={12} md={6}>
                          <Alert severity="warning">
                            <Typography variant="body2" fontWeight="medium">
                              Needs Attention
                            </Typography>
                            <Typography variant="body2">
                              "{lowVideo.lessonTitle}" - Video {lowVideo.videoIndex + 1} has lower engagement 
                              ({lowVideo.engagementScore.toFixed(0)}). Consider reviewing content or placement.
                            </Typography>
                          </Alert>
                        </Grid>
                      )}
                    </>
                  );
                })()}
              </Grid>
            </Paper>
          )}
        </>
      ) : !error && courses.length === 0 && !coursesLoading ? (
        <Alert severity="info">
          No courses found. Create a course with video content to see analytics.
        </Alert>
      ) : !selectedCourseId ? (
        <Alert severity="info">
          Select a course to view video analytics
        </Alert>
      ) : null}
    </Container>
    </>
  );
};
