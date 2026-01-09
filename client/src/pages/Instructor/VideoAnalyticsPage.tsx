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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  VideoLibrary as VideoIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  PlayCircle as PlayIcon,
  CheckCircle as CompleteIcon
} from '@mui/icons-material';
import axios from 'axios';

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
  const token = localStorage.getItem('auth-storage');
  let authToken = '';
  
  if (token) {
    try {
      const parsed = JSON.parse(token);
      authToken = parsed?.state?.token || '';
    } catch (e) {
      console.error('Failed to parse auth token:', e);
    }
  }

  return axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  });
};

export const VideoAnalyticsPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [analytics, setAnalytics] = useState<VideoAnalytics[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch instructor's courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const authAxios = createAuthAxios();
        const response = await authAxios.get('/api/instructor/courses');
        setCourses(response.data.courses || []);
        
        if (response.data.courses?.length > 0 && !selectedCourseId) {
          setSelectedCourseId(response.data.courses[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error);
        setError('Failed to load courses');
      }
    };

    fetchCourses();
  }, []);

  // Fetch video analytics when course changes
  useEffect(() => {
    if (!selectedCourseId) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const authAxios = createAuthAxios();

        // Fetch all lessons for the course
        const lessonsResponse = await authAxios.get(`/api/lessons/${selectedCourseId}`);
        const lessons = lessonsResponse.data.lessons || [];

        // Fetch course details
        const courseResponse = await authAxios.get(`/api/courses/${selectedCourseId}`);
        const courseTitle = courseResponse.data.course?.title || 'Unknown Course';

        // Extract video content items from lessons
        const videoItems: VideoContentItem[] = [];
        lessons.forEach((lesson: any) => {
          try {
            const content = lesson.contentJson ? JSON.parse(lesson.contentJson) : [];
            content.forEach((item: any, index: number) => {
              if (item.type === 'video' && item.id) {
                videoItems.push({
                  contentItemId: item.id,
                  lessonId: lesson.id,
                  lessonTitle: lesson.title,
                  courseId: selectedCourseId,
                  courseTitle,
                  videoIndex: index,
                  duration: item.data?.duration || 0,
                  url: item.data?.url || ''
                });
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
          setLoading(false);
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
          const engagementScore = totalViews > 0 
            ? (totalViews * 0.3) + (completionRate * 0.4) + (avgCompletionPercentage * 0.3)
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

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
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
        
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel>Select Course</InputLabel>
          <Select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            label="Select Course"
            data-testid="video-analytics-course-select"
          >
            {courses.map((course) => (
              <MenuItem key={course.id} value={course.id}>
                {course.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
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
                    {analytics
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
                  
                  return (
                    <>
                      <Grid item xs={12} md={6}>
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
                    </>
                  );
                })()}
              </Grid>
            </Paper>
          )}
        </>
      ) : (
        <Alert severity="info">
          Select a course to view video analytics
        </Alert>
      )}
    </Container>
  );
};
