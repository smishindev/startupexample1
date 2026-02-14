import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Alert,
  Skeleton,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  TrendingUp,
  Schedule,
  BookmarkBorder,
  Star,
  Refresh,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { useAuthStore } from '../../stores/authStore';
import { enrollmentApi } from '../../services/enrollmentApi';
import { dashboardApi, type DashboardStats } from '../../services/dashboardApi';
import EmailVerificationBanner from '../../components/Auth/EmailVerificationBanner';
import { StatCard } from '../../components/Dashboard/StatCard';
import { CourseCard, type RecentCourse } from '../../components/Dashboard/CourseCard';
import { AchievementBadge, type Achievement } from '../../components/Dashboard/AchievementBadge';

// Helper function to format last accessed date
const formatLastAccessed = (dateString: string | null): string => {
  if (!dateString) return 'Recently';

  const now = new Date();
  const lastAccessed = new Date(dateString);
  const diffInMs = now.getTime() - lastAccessed.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  if (diffInMinutes < 5) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;

  return lastAccessed.toLocaleDateString();
};

const STAT_GRADIENTS = {
  courses:    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  completed:  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  hours:      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  streak:     'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
};

export const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    completedCourses: 0,
    hoursLearned: 0,
    currentStreak: 0,
    achievements: [],
  });
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats and enrollments in parallel
      const [statsData, enrollmentsResponse] = await Promise.all([
        dashboardApi.getStats(),
        enrollmentApi.getMyEnrollments(1, 6),
      ]);

      setStats(statsData);
      setAchievements(statsData.achievements || []);

      // Deduplicate courses by courseId — keep most recent by raw date
      const courseMap = new Map<string, { course: RecentCourse; rawDate: number }>();

      enrollmentsResponse.enrollments.forEach((enrollment) => {
        const courseId = enrollment.courseId;
        const rawDate = new Date(enrollment.LastAccessedAt || 0).getTime();
        const courseData: RecentCourse = {
          id: courseId,
          title: enrollment.Title,
          instructor: `${enrollment.instructorFirstName} ${enrollment.instructorLastName}`,
          progress: enrollment.OverallProgress || 0,
          thumbnail: enrollment.Thumbnail || '',
          lastAccessed: formatLastAccessed(enrollment.LastAccessedAt),
          duration: enrollment.Duration || 'N/A',
          category: enrollment.Category,
          level: enrollment.Level,
        };

        const existing = courseMap.get(courseId);
        if (!existing || rawDate > existing.rawDate) {
          courseMap.set(courseId, { course: courseData, rawDate });
        }
      });

      const courses = Array.from(courseMap.values())
        .sort((a, b) => b.rawDate - a.rawDate)
        .map(({ course }) => course)
        .slice(0, 6);

      setRecentCourses(courses);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Skeleton placeholders while loading
  const renderSkeletonCards = () => (
    <Grid container spacing={3}>
      {[1, 2, 3].map((i) => (
        <Grid item xs={12} sm={6} md={4} key={i}>
          <Card sx={{ height: 380 }}>
            <Skeleton variant="rectangular" height={160} />
            <CardContent>
              <Skeleton variant="text" width="80%" height={28} />
              <Skeleton variant="text" width="50%" height={20} sx={{ mt: 1 }} />
              <Skeleton variant="rectangular" height={10} sx={{ mt: 3, borderRadius: 5 }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <EmailVerificationBanner />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1, pb: isMobile ? 10 : 0 }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Welcome back, {user?.firstName}! 👋
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Here's an overview of your learning progress
          </Typography>
        </Box>

        {/* Error State */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<Refresh />}
                onClick={fetchDashboardData}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Stats Overview — distinct gradient per card */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Courses"
              value={stats.totalCourses}
              subtitle="Enrolled courses"
              icon={<BookmarkBorder />}
              gradient={STAT_GRADIENTS.courses}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Completed"
              value={stats.completedCourses}
              subtitle="Courses finished"
              icon={<Star />}
              gradient={STAT_GRADIENTS.completed}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Hours Learned"
              value={`${stats.hoursLearned}h`}
              subtitle="Total study time"
              icon={<Schedule />}
              gradient={STAT_GRADIENTS.hours}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Current Streak"
              value={`${stats.currentStreak} days`}
              subtitle="Keep it up!"
              icon={<TrendingUp />}
              gradient={STAT_GRADIENTS.streak}
            />
          </Grid>
        </Grid>

        {/* Continue Learning */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              Continue Learning
            </Typography>
            {recentCourses.length > 0 && (
              <Button
                endIcon={<ArrowForward />}
                onClick={() => navigate('/my-learning')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                View All
              </Button>
            )}
          </Box>

          {loading ? (
            renderSkeletonCards()
          ) : recentCourses.length > 0 ? (
            <Grid container spacing={3}>
              {recentCourses.map((course) => (
                <Grid item xs={12} sm={6} md={4} key={course.id}>
                  <CourseCard course={course} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box
              textAlign="center"
              py={6}
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No courses enrolled yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Browse our course catalog to start your learning journey!
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/courses')}
                sx={{ textTransform: 'none' }}
              >
                Browse Courses
              </Button>
            </Box>
          )}
        </Box>

        {/* Achievements Section — hidden when empty to reduce clutter */}
        {achievements.length > 0 && (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
              Your Achievements
            </Typography>
            <Grid container spacing={3}>
              {achievements.map((achievement) => (
                <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                  <AchievementBadge achievement={achievement} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default DashboardPage;
