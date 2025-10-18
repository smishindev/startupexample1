import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  Divider,
  Paper,
  IconButton
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  Assessment as AssessmentIcon,
  School as CourseIcon,
  People as StudentsIcon,
  TrendingUp as ProgressIcon,
  TrendingUp as TrendingUpIcon,
  Speed as PerformanceIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/Navigation/Header';
import { instructorApi, type InstructorStats } from '../../services/instructorApi';

interface AnalyticsCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  stats?: {
    primary: string | number;
    secondary: string;
  };
  isNew?: boolean;
}

export const AnalyticsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<InstructorStats | null>(null);

  useEffect(() => {
    loadInstructorStats();
  }, []);

  const loadInstructorStats = async () => {
    try {
      const statsData = await instructorApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load instructor stats:', error);
    }
  };

  const analyticsCards: AnalyticsCard[] = [
    {
      title: 'Course Analytics',
      description: 'Detailed insights into individual course performance, student progress, and engagement metrics.',
      icon: <CourseIcon sx={{ fontSize: 40 }} />,
      path: '/instructor/analytics',
      color: '#2196f3',
      stats: {
        primary: stats?.totalCourses || 0,
        secondary: 'Active Courses'
      }
    },
    {
      title: 'Assessment Analytics',
      description: 'Comprehensive cross-assessment analytics with performance trends, difficulty analysis, and student insights.',
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      path: '/instructor/assessment-analytics',
      color: '#4caf50',
      stats: {
        primary: '📊',
        secondary: 'Enhanced Analytics'
      },
      isNew: true
    },
    {
      title: 'Student Management',
      description: 'Student enrollment analytics, progress tracking, and performance management tools.',
      icon: <StudentsIcon sx={{ fontSize: 40 }} />,
      path: '/instructor/students',
      color: '#ff9800',
      stats: {
        primary: stats?.totalStudents || 0,
        secondary: 'Total Students'
      }
    },
    {
      title: 'Progress Dashboard',
      description: 'Overall teaching progress, completion rates, and learning outcome analytics.',
      icon: <ProgressIcon sx={{ fontSize: 40 }} />,
      path: '/progress',
      color: '#9c27b0',
      stats: {
        primary: `${stats?.completionRate || 0}%`,
        secondary: 'Avg Completion'
      }
    }
  ];

  return (
    <Box>
      <Header />
      <Box sx={{ p: 3 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Analytics Hub
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Comprehensive insights and analytics for your teaching platform
            </Typography>
          </Box>
          <IconButton onClick={loadInstructorStats} color="primary" size="large">
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Quick Stats Overview */}
        <Paper sx={{ p: 3, mb: 4, background: 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center', color: 'white' }}>
                <PerformanceIcon sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stats?.totalCourses || 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Active Courses
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center', color: 'white' }}>
                <StudentsIcon sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stats?.totalStudents || 0}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Students
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center', color: 'white' }}>
                <TrendingUpIcon sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stats?.avgRating?.toFixed(1) || '0.0'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Average Rating
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center', color: 'white' }}>
                <AnalyticsIcon sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stats?.completionRate || 0}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Completion Rate
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Analytics Cards Grid */}
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
          Analytics & Insights
        </Typography>
        
        <Grid container spacing={3}>
          {analyticsCards.map((card, index) => (
            <Grid item xs={12} md={6} lg={6} key={index}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  },
                  position: 'relative',
                  overflow: 'visible'
                }}
              >
                {card.isNew && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: 16,
                      background: 'linear-gradient(45deg, #ff6b6b, #feca57)',
                      color: 'white',
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      zIndex: 1,
                      boxShadow: 2
                    }}
                  >
                    ✨ NEW
                  </Box>
                )}
                
                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: card.color, 
                        width: 56, 
                        height: 56, 
                        mr: 2,
                        boxShadow: `0 4px 12px ${card.color}40`
                      }}
                    >
                      {card.icon}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {card.title}
                      </Typography>
                      {card.stats && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: card.color }}>
                            {card.stats.primary}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {card.stats.secondary}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {card.description}
                  </Typography>
                </CardContent>
                
                <Divider />
                
                <CardActions sx={{ p: 2, justifyContent: 'space-between' }}>
                  <Button
                    variant="contained"
                    onClick={() => navigate(card.path)}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      bgcolor: card.color,
                      '&:hover': {
                        bgcolor: card.color,
                        opacity: 0.9
                      }
                    }}
                  >
                    View Analytics
                  </Button>
                  {card.isNew && (
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold' }}>
                      Enhanced Features
                    </Typography>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};