import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Paper,
  Chip,
  LinearProgress,
  Divider,
  Fab,
  Dialog,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Assignment as AssignmentIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Publish as PublishIcon,
  Drafts as DraftIcon,
  NotificationImportant as InterventionIcon,
  VideoLibrary as VideoLibraryIcon,
  PlayCircleOutline
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/Navigation/Header';
import { instructorApi, InstructorStats, InstructorCourse } from '../../services/instructorApi';
import { useAuthStore } from '../../stores/authStore';
import AuthDebug from '../../components/AuthDebug';
import { formatCategory, getCategoryGradient } from '../../utils/courseHelpers';

export const InstructorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [stats, setStats] = useState<InstructorStats>({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    totalStudents: 0,
    totalEnrollments: 0,
    avgRating: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    completionRate: 0
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    loadInstructorData();
  }, [isAuthenticated, navigate]);

  const loadInstructorData = async () => {
    try {
      // Load actual data from API
      const [statsData, coursesData] = await Promise.all([
        instructorApi.getStats(),
        instructorApi.getCourses()
      ]);
      
      console.log('Instructor stats from API:', statsData);
      console.log('Instructor courses from API:', coursesData);
      console.log('First course structure:', coursesData[0]);
      
      setStats(statsData);
      setCourses(coursesData);
    } catch (error: any) {
      console.error('Failed to load instructor data:', error);
      
      // Handle authentication errors
      if (error?.response?.status === 401) {
        alert('Authentication failed. Please log in again.');
        navigate('/login');
        return;
      }
      
      // Set empty data on error
      setStats({
        totalCourses: 0,
        publishedCourses: 0,
        draftCourses: 0,
        totalStudents: 0,
        totalEnrollments: 0,
        totalRevenue: 0,
        avgRating: 0,
        completionRate: 0,
        monthlyGrowth: 0
      });
      setCourses([]);
    }
  };

  const handleCourseMenuOpen = (event: React.MouseEvent<HTMLElement>, courseId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedCourse(courseId);
  };

  const handleCourseMenuClose = () => {
    setAnchorEl(null);
    setSelectedCourse(null);
  };

  const handleCreateCourse = (type: 'blank' | 'template') => {
    setCreateDialogOpen(false);
    navigate(`/instructor/courses/create?type=${type}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <PublishIcon fontSize="small" />;
      case 'draft':
        return <DraftIcon fontSize="small" />;
      default:
        return <SettingsIcon fontSize="small" />;
    }
  };

  return (
    <>
      <Header />
      <Box sx={{ p: 3 }}>
        {/* Debug Component - Remove in production */}
        <AuthDebug />
        
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Instructor Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage your courses and track your teaching performance
          </Typography>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', pb: '16px !important' }}>
              <SchoolIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" component="div">
                {stats.totalCourses}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Total Courses
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', pb: '16px !important' }}>
              <PeopleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" component="div">
                {stats.totalStudents.toLocaleString()}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Total Students
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', pb: '16px !important' }}>
              <TrendingUpIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" component="div">
                ${stats.totalRevenue.toLocaleString()}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Total Revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', pb: '16px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <Typography variant="h4" component="div">
                  {stats.avgRating}
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ ml: 0.5 }}>
                  ★
                </Typography>
              </Box>
              <Typography color="text.secondary" variant="body2">
                Avg Rating
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', pb: '16px !important' }}>
              <Typography variant="h4" component="div">
                {stats.completionRate}%
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Completion Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', pb: '16px !important' }}>
              <Typography variant="h4" component="div" color="success.main">
                +{stats.monthlyGrowth}%
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Monthly Growth
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create New Course
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<AnalyticsIcon />}
            onClick={() => navigate('/instructor/analytics-hub')}
            color="primary"
          >
            Analytics Hub
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<VideoLibraryIcon />}
            onClick={() => navigate('/instructor/video-analytics')}
            color="secondary"
          >
            Video Analytics
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<InterventionIcon />}
            onClick={() => navigate('/instructor/interventions')}
            color="error"
          >
            Intervention Dashboard
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<SettingsIcon />}
            onClick={() => navigate('/instructor/settings')}
          >
            Settings
          </Button>
        </Box>
      </Paper>

      {/* Courses Grid */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          My Courses ({courses.length})
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {courses.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No courses created yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first course to start teaching and sharing your knowledge!
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                size="large"
              >
                Create Your First Course
              </Button>
            </Paper>
          </Grid>
        ) : (
          (() => {
            console.log('Rendering courses, current courses state:', courses);
            console.log('First course in render:', courses[0]);
            return courses;
          })().map((course) => (
            <Grid item xs={12} sm={6} md={4} key={course.id}>
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
                    height: 200,
                    backgroundImage: course.thumbnail ? `url(${course.thumbnail})` : getCategoryGradient(course.category),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    '&::before': course.thumbnail ? {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 100%)',
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                    } : {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)',
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                    },
                    '.MuiCard-root:hover &::before': {
                      opacity: 1,
                    },
                  }}
                >
                  {!course.thumbnail && (
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
                  )}
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <Chip
                      icon={getStatusIcon(course.status)}
                      label={course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                      color={getStatusColor(course.status) as any}
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(8px)',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                    <IconButton
                      size="small"
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(8px)',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,1)',
                          transform: 'scale(1.1)',
                        },
                      }}
                      onClick={(e) => handleCourseMenuOpen(e, course.id)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  {course.category && !course.thumbnail && (
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
              
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" component="h3" gutterBottom noWrap>
                  {course.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                  {course.description}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${course.students} students`}
                    size="small" 
                    sx={{ 
                      fontWeight: 500,
                      fontSize: '0.7rem',
                      height: 24,
                    }}
                  />
                  <Chip 
                    label={`${course.lessons} lessons`}
                    size="small" 
                    variant="outlined"
                    sx={{ 
                      fontWeight: 500,
                      fontSize: '0.7rem',
                      borderColor: 'divider',
                      height: 24,
                    }}
                  />
                </Box>

                {course.status === 'draft' && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {course.progress}%
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={course.progress} />
                  </Box>
                )}
                
                {course.status === 'published' && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Rating:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#ffc107' }}>
                        {course.rating} ★
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Revenue:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                        ${course.revenue}
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => navigate(`/instructor/courses/${course.id}/edit`)}
                      fullWidth
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => navigate(`/courses/${course.id}`)}
                      variant="outlined"
                      fullWidth
                    >
                      Preview
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<SchoolIcon />}
                      onClick={() => navigate(`/instructor/courses/${course.id}/lessons`)}
                      variant="outlined"
                      fullWidth
                    >
                      Lessons
                    </Button>
                    <Button
                      size="small"
                      startIcon={<AssignmentIcon />}
                      onClick={() => {
                        // Navigate to course-level assessments management
                        navigate(`/instructor/courses/${course.id}/assessments`);
                      }}
                      variant="outlined"
                      fullWidth
                    >
                      Assessments
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          ))
        )}
      </Grid>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Course Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCourseMenuClose}
      >
        <MenuItem onClick={() => {
          navigate(`/instructor/courses/${selectedCourse}/edit`);
          handleCourseMenuClose();
        }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Course</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/courses/${selectedCourse}`);
          handleCourseMenuClose();
        }}>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Preview Course</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/instructor/courses/${selectedCourse}/analytics`);
          handleCourseMenuClose();
        }}>
          <ListItemIcon><AnalyticsIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Analytics</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/instructor/courses/${selectedCourse}/students`);
          handleCourseMenuClose();
        }}>
          <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Manage Students</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Course Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Course</DialogTitle>
        <List sx={{ px: 3, pb: 3 }}>
          <ListItem
            button
            onClick={() => handleCreateCourse('blank')}
            sx={{ mb: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}
          >
            <ListItemIcon>
              <AssignmentIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Start from Scratch"
              secondary="Create a completely new course with custom content"
            />
          </ListItem>
          <ListItem
            button
            onClick={() => handleCreateCourse('template')}
            sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
          >
            <ListItemIcon>
              <SchoolIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Use Template"
              secondary="Start with a pre-designed course template"
            />
          </ListItem>
        </List>
      </Dialog>
    </Box>
    </>
  );
};