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
  Drafts as DraftIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/Navigation/Header';
import { instructorApi, InstructorStats, InstructorCourse } from '../../services/instructorApi';
import { useAuthStore } from '../../stores/authStore';
import AuthDebug from '../../components/AuthDebug';

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
      
      // Fallback to mock data if API fails for other reasons
      const mockStats: InstructorStats = {
        totalCourses: 8,
        publishedCourses: 5,
        draftCourses: 3,
        totalStudents: 1247,
        totalEnrollments: 1247,
        totalRevenue: 15420,
        avgRating: 4.6,
        completionRate: 78,
        monthlyGrowth: 12.5
      };

      const mockCourses: InstructorCourse[] = [
        {
          id: '1',
          title: 'Advanced React Development',
          description: 'Learn modern React patterns, hooks, and state management',
          thumbnail: '/api/placeholder/300/200',
          status: 'published',
          students: 324,
          lessons: 24,
          rating: 4.8,
          revenue: 5480,
          progress: 100,
          createdAt: '2024-01-15',
          lastUpdated: '2024-02-20',
          price: 89.99
        },
        {
          id: '2',
          title: 'TypeScript Masterclass',
          description: 'Complete guide to TypeScript for professional development',
          thumbnail: '/api/placeholder/300/200',
          status: 'published',
          students: 256,
          lessons: 18,
          rating: 4.7,
          revenue: 4320,
          progress: 100,
          createdAt: '2024-02-01',
          lastUpdated: '2024-03-15',
          price: 79.99
        },
        {
          id: '3',
          title: 'Node.js Backend Development',
          description: 'Build scalable backend applications with Node.js',
          thumbnail: '/api/placeholder/300/200',
          status: 'draft',
          students: 0,
          lessons: 12,
          rating: 0,
          revenue: 0,
          progress: 65,
          createdAt: '2024-03-01',
          lastUpdated: '2024-03-25',
          price: 99.99
        }
      ];

      setStats(mockStats);
      setCourses(mockCourses);
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
            onClick={() => navigate('/instructor/analytics')}
          >
            View Analytics
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<PeopleIcon />}
            onClick={() => navigate('/instructor/students')}
          >
            Manage Students
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
        {courses.map((course) => (
          <Grid item xs={12} sm={6} md={4} key={course.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  height: 200,
                  backgroundImage: `url(${course.thumbnail})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative'
                }}
              >
                <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                  <Chip
                    icon={getStatusIcon(course.status)}
                    label={course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                    color={getStatusColor(course.status) as any}
                    size="small"
                  />
                </Box>
                <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                  <IconButton
                    size="small"
                    sx={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
                    onClick={(e) => handleCourseMenuOpen(e, course.id)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" component="h3" gutterBottom noWrap>
                  {course.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                  {course.description}
                </Typography>
                
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
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {course.students} students
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {course.lessons} lessons
                    </Typography>
                  </Box>
                  {course.status === 'published' && (
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" color="text.secondary">
                        {course.rating} ★
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ${course.revenue}
                      </Typography>
                    </Box>
                  )}
                </Box>
                
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
                        // Navigate directly to assessments management for the testvideo lesson
                        navigate(`/instructor/lessons/2513624D-983D-4B58-9BC7-47324D13E6F6/assessments`);
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
        ))}
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