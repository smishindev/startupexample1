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
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  Schedule,
  PlayCircleOutline,
  BookmarkBorder,
  Star,
  MoreVert,
} from '@mui/icons-material';
import { HeaderV4 as Header } from '../Navigation/HeaderV4';
import { useAuthStore } from '../../stores/authStore';
import { enrollmentApi } from '../../services/enrollmentApi';
import { dashboardApi } from '../../services/dashboardApi';
import { formatCategory, getCategoryGradient, getLevelColor } from '../../utils/courseHelpers';
import EmailVerificationBanner from '../Auth/EmailVerificationBanner';

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
  category?: string;
  level?: string;
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
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    completedCourses: 0,
    hoursLearned: 0,
    currentStreak: 0,
  });

  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard stats
        const statsData = await dashboardApi.getStats();
        setStats(statsData);
        setAchievements(statsData.achievements || []);
        
        // Fetch enrolled courses
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
            thumbnail: enrollment.Thumbnail || '',
            lastAccessed: formatLastAccessed(enrollment.LastAccessedAt),
            duration: enrollment.Duration || 'N/A',
            rating: 4.5, // Default rating - could be enhanced with real ratings
            category: enrollment.Category,
            level: enrollment.Level,
          };
          
          // Only keep the most recent enrollment for each course
          if (!courseMap.has(courseId) || 
              new Date(enrollment.LastAccessedAt || 0) > new Date(courseMap.get(courseId)?.lastAccessed || 0)) {
            courseMap.set(courseId, courseData);
          }
        });

        // Convert Map to array - show all courses, not just 3
        const courses = Array.from(courseMap.values());
        setRecentCourses(courses);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setRecentCourses([]);
        setStats({
          totalCourses: 0,
          completedCourses: 0,
          hoursLearned: 0,
          currentStreak: 0,
        });
        setAchievements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Use real enrolled courses data
  const displayCourses = recentCourses;

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
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
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
      <Box
        sx={{
          height: 160,
          backgroundImage: course.thumbnail 
            ? `url(${course.thumbnail})`
            : getCategoryGradient(course.category),
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
            background: course.thumbnail 
              ? 'rgba(0, 0, 0, 0.3)'
              : 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)',
            opacity: course.thumbnail ? 1 : 0,
            transition: 'opacity 0.3s ease',
          },
          '.MuiCard-root:hover &::before': {
            opacity: 1,
          },
        }}
      >
        <PlayCircleOutline 
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
        <IconButton
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: 'white',
            bgcolor: 'rgba(0,0,0,0.2)',
            backdropFilter: 'blur(8px)',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.4)',
              transform: 'scale(1.1)',
            },
          }}
        >
          <BookmarkBorder />
        </IconButton>
        {course.category && (
          <Chip
            label={formatCategory(course.category)}
            size="small"
            sx={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              bgcolor: 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          />
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.3 }}>
          {course.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
          {course.instructor}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
          {course.level && (
            <Chip 
              label={course.level} 
              size="small" 
              sx={{ 
                backgroundColor: alpha(getLevelColor(course.level as 'Beginner' | 'Intermediate' | 'Advanced', theme), 0.15),
                color: getLevelColor(course.level as 'Beginner' | 'Intermediate' | 'Advanced', theme),
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 24,
                border: `1.5px solid ${alpha(getLevelColor(course.level as 'Beginner' | 'Intermediate' | 'Advanced', theme), 0.4)}`,
              }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Star sx={{ fontSize: 18, color: '#ffc107', mr: 0.5 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {course.rating}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Schedule sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {course.duration}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Your Progress</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{course.progress}%</Typography>
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

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 1 }}>
          <Chip
            label={course.lastAccessed}
            size="small"
            sx={{ 
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: 'action.hover',
              borderColor: 'divider',
            }}
          />
          <IconButton 
            size="small"
            sx={{
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'rotate(90deg)',
                bgcolor: 'action.hover',
              },
            }}
          >
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
      <EmailVerificationBanner />
      
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
          {achievements.length > 0 ? (
            <Grid container spacing={3}>
              {achievements.map((achievement) => (
                <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                  <AchievementBadge achievement={achievement} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                No achievements yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start learning to unlock achievements! 🎯
              </Typography>
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};