import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  IconButton,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  Schedule,
  PlayCircleOutline,
  BookmarkBorder,
  Star,
  MoreVert,
} from '@mui/icons-material';
import { Header } from '../Navigation/Header';
import { useAuthStore } from '../../stores/authStore';
import { enrollmentApi } from '../../services/enrollmentApi';

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

interface DashboardStats {
  totalCourses: number;
  completedCourses: number;
  hoursLearned: number;
  currentStreak: number;
}

interface RecentCourse {
  id: string;
  title: string;
  instructor: string;
  progress: number;
  thumbnail: string;
  lastAccessed: string;
  duration: string;
  rating: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  type: 'bronze' | 'silver' | 'gold';
}

export const DashboardLayout: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuthStore();

  // Real data from API
  const [stats] = useState<DashboardStats>({
    totalCourses: 12,
    completedCourses: 3,
    hoursLearned: 47.5,
    currentStreak: 7,
  });

  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        setLoading(true);
        const enrollments = await enrollmentApi.getMyEnrollments();
        
        // Create a Map to deduplicate courses by courseId and keep the most recent enrollment
        const courseMap = new Map<string, RecentCourse>();
        
        enrollments.forEach((enrollment) => {
          const courseId = enrollment.courseId;
          const courseData: RecentCourse = {
            id: courseId,
            title: enrollment.Title,
            instructor: `${enrollment.instructorFirstName} ${enrollment.instructorLastName}`,
            progress: enrollment.OverallProgress || 0,
            thumbnail: '/api/placeholder/300/200',
            lastAccessed: formatLastAccessed(enrollment.LastAccessedAt),
            duration: enrollment.Duration || 'N/A',
            rating: 4.5, // Default rating - could be enhanced with real ratings
          };
          
          // Only keep the most recent enrollment for each course
          if (!courseMap.has(courseId) || 
              new Date(enrollment.LastAccessedAt || 0) > new Date(courseMap.get(courseId)?.lastAccessed || 0)) {
            courseMap.set(courseId, courseData);
          }
        });

        // Convert Map to array and take first 3 courses
        const courses = Array.from(courseMap.values()).slice(0, 3);
        setRecentCourses(courses);
      } catch (error) {
        console.error('Failed to fetch enrolled courses:', error);
        setRecentCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, []);

  // Use real enrolled courses data
  const displayCourses = recentCourses;

  const [achievements] = useState<Achievement[]>([
    {
      id: '1',
      title: 'First Steps',
      description: 'Completed your first course',
      icon: '🎯',
      unlockedAt: '2 weeks ago',
      type: 'bronze',
    },
    {
      id: '2',
      title: 'Streak Master',
      description: '7-day learning streak',
      icon: '🔥',
      unlockedAt: 'Today',
      type: 'silver',
    },
    {
      id: '3',
      title: 'Knowledge Seeker',
      description: 'Completed 3 courses',
      icon: '📚',
      unlockedAt: '1 week ago',
      type: 'gold',
    },
  ]);

  const StatCard: React.FC<{ title: string; value: string | number; subtitle: string; icon: React.ReactNode }> = ({
    title,
    value,
    subtitle,
    icon,
  }) => (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100px',
          height: '100px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          transform: 'translate(30px, -30px)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {icon}
        <Typography variant="h6" sx={{ ml: 1, fontWeight: 'medium' }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        {subtitle}
      </Typography>
    </Paper>
  );

  const CourseCard: React.FC<{ course: RecentCourse }> = ({ course }) => (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
      }}
    >
      <Box
        sx={{
          height: 140,
          backgroundImage: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <PlayCircleOutline sx={{ fontSize: 48, color: 'white', opacity: 0.8 }} />
        <IconButton
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
          }}
        >
          <BookmarkBorder />
        </IconButton>
      </Box>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
          {course.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {course.instructor}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Star sx={{ fontSize: 16, color: '#ffc107', mr: 0.5 }} />
          <Typography variant="body2" sx={{ mr: 2 }}>
            {course.rating}
          </Typography>
          <Schedule sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
          <Typography variant="body2" color="text.secondary">
            {course.duration}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Progress</Typography>
            <Typography variant="body2">{course.progress}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={course.progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
              },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
          <Chip
            label={course.lastAccessed}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
          <IconButton size="small">
            <MoreVert />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );

  const AchievementBadge: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
    const getColor = () => {
      switch (achievement.type) {
        case 'gold': return '#ffc107';
        case 'silver': return '#9e9e9e';
        case 'bronze': return '#8d6e63';
        default: return '#9e9e9e';
      }
    };

    return (
      <Paper
        sx={{
          p: 2,
          textAlign: 'center',
          background: `linear-gradient(135deg, ${getColor()}20, ${getColor()}10)`,
          border: `2px solid ${getColor()}40`,
          borderRadius: 2,
        }}
      >
        <Typography variant="h4" sx={{ mb: 1 }}>
          {achievement.icon}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          {achievement.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
          {achievement.description}
        </Typography>
      </Paper>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Welcome back, {user?.firstName}! 👋
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Continue your learning journey with personalized recommendations
          </Typography>
        </Box>

        {/* Stats Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Courses"
              value={stats.totalCourses}
              subtitle="Enrolled courses"
              icon={<BookmarkBorder />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Completed"
              value={stats.completedCourses}
              subtitle="Courses finished"
              icon={<Star />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Hours Learned"
              value={`${stats.hoursLearned}h`}
              subtitle="Total study time"
              icon={<Schedule />}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Current Streak"
              value={`${stats.currentStreak} days`}
              subtitle="Keep it up!"
              icon={<TrendingUp />}
            />
          </Grid>
        </Grid>

        {/* Recent Courses */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
            Continue Learning
          </Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : displayCourses.length > 0 ? (
            <Grid container spacing={3}>
              {displayCourses.map((course) => (
                <Grid item xs={12} sm={6} md={4} key={course.id}>
                  <CourseCard course={course} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                No courses enrolled yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Browse our course catalog to get started!
              </Typography>
            </Box>
          )}
        </Box>

        {/* Achievements Section */}
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
      </Container>
    </Box>
  );
};