import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Paper,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  PlaylistAdd as PlaylistAddIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { instructorApi, InstructorCourse } from '../../services/instructorApi';
import { CurriculumBuilder } from './CurriculumBuilder';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`course-tabpanel-${index}`}
      aria-labelledby={`course-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export const CourseEditPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [course, setCourse] = useState<InstructorCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessonCount, setLessonCount] = useState(0);

  useEffect(() => {
    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  const loadCourse = async () => {
    if (!courseId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 [CourseEditPage] Loading course with ID:', courseId);
      
      const courses = await instructorApi.getCourses();
      console.log('📚 [CourseEditPage] All courses:', courses.map(c => ({ id: c.id, title: c.title })));
      
      // Debug logging
      console.log('🔎 [CourseEditPage] Looking for courseId:', courseId);
      console.log('🔎 [CourseEditPage] Available course IDs:', courses.map(c => c.id));
      
      // Case-insensitive comparison for GUID
      const foundCourse = courses.find(c => c.id.toLowerCase() === courseId.toLowerCase());
      console.log('✅ [CourseEditPage] Found course:', foundCourse ? foundCourse.title : 'NOT FOUND');
      
      if (!foundCourse) {
        console.error('❌ [CourseEditPage] Course not found, redirecting to dashboard');
        setError('Course not found');
        return;
      }
      
      setCourse(foundCourse);
    } catch (err: any) {
      console.error('Error loading course:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to load course');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBackToDashboard = () => {
    navigate('/instructor');
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !course) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          {error || 'Course not found'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link 
            component="button" 
            variant="body1" 
            onClick={handleBackToDashboard}
            sx={{ textDecoration: 'none', cursor: 'pointer' }}
          >
            Instructor Dashboard
          </Link>
          <Typography color="text.primary">Edit Course</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {course.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {course.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {course.status}
              </Typography>
            </Box>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToDashboard}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab
              icon={<PlaylistAddIcon />}
              iconPosition="start"
              label="Curriculum"
              id="course-tab-0"
            />
            <Tab
              icon={<SettingsIcon />}
              iconPosition="start"
              label="Course Settings"
              id="course-tab-1"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <CurriculumBuilder 
            courseId={courseId!} 
            onLessonCountChange={setLessonCount}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Alert severity="info">
            Course settings editor coming soon! This will include:
            <ul>
              <li>Edit course title, description, and thumbnail</li>
              <li>Update pricing and category</li>
              <li>Manage course prerequisites</li>
              <li>Configure advanced settings</li>
            </ul>
          </Alert>
        </TabPanel>
      </Paper>
    </Container>
  );
};