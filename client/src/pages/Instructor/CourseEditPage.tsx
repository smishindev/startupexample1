import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
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
  Info as InfoIcon,
  PlaylistAdd as PlaylistAddIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { instructorApi, InstructorCourse } from '../../services/instructorApi';
import { CurriculumBuilder } from './CurriculumBuilder';
import { CourseDetailsEditor } from './CourseDetailsEditor';
import { CourseSettingsEditor } from '../../components/Instructor/CourseSettingsEditor';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer, useResponsive } from '../../components/Responsive';

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
      {value === index && <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>{children}</Box>}
    </div>
  );
};

export const CourseEditPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isMobile } = useResponsive();
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

  // Handle tab parameter from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      const tabIndex = parseInt(tab, 10);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 3) {
        setTabValue(tabIndex);
      }
    }
  }, [searchParams]);

  const loadCourse = async () => {
    if (!courseId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 [CourseEditPage] Loading course with ID:', courseId);
      
      const coursesResponse = await instructorApi.getCourses(undefined, 1, 10000); // Load all courses
      const courses = coursesResponse.courses;
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
    // Update URL with tab parameter
    setSearchParams({ tab: newValue.toString() });
  };

  const handleBackToDashboard = () => {
    navigate('/instructor');
  };

  const handleCourseUpdate = (updatedCourse: InstructorCourse) => {
    setCourse(updatedCourse);
  };

  if (loading) {
    return (
      <>
        <Header />
        <PageContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress />
          </Box>
        </PageContainer>
      </>
    );
  }

  if (error || !course) {
    return (
      <>
        <Header />
        <PageContainer>
          <Alert severity="error">
            {error || 'Course not found'}
          </Alert>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Header />
      <PageContainer>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link 
            component="button" 
            variant="body1" 
            onClick={handleBackToDashboard}
            sx={{ textDecoration: 'none', cursor: 'pointer' }}
            data-testid="course-edit-breadcrumb-dashboard-link"
          >
            Instructor Dashboard
          </Link>
          <Typography color="text.primary">Edit Course</Typography>
        </Breadcrumbs>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
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
            data-testid="course-edit-back-button"
          >
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant={isMobile ? 'scrollable' : 'fullWidth'} scrollButtons="auto" data-testid="course-edit-tabs">
            <Tab
              icon={<InfoIcon />}
              iconPosition="start"
              label="Course Details"
              id="course-tab-0"
              data-testid="course-edit-tab-details"
            />
            <Tab
              icon={<PlaylistAddIcon />}
              iconPosition="start"
              label="Lesson Details"
              id="course-tab-1"
              data-testid="course-edit-tab-curriculum"
            />
            <Tab
              icon={<AssignmentIcon />}
              iconPosition="start"
              label="Assessments"
              id="course-tab-2"
              data-testid="course-edit-tab-assessments"
            />
            <Tab
              icon={<SettingsIcon />}
              iconPosition="start"
              label="Settings"
              id="course-tab-3"
              data-testid="course-edit-tab-settings"
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <CourseDetailsEditor 
            course={course} 
            onUpdate={handleCourseUpdate}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <CurriculumBuilder 
            courseId={courseId!} 
            onLessonCountChange={setLessonCount}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Course-Level Assessments
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
              Manage assessments across all lessons in this course. Create quizzes, assignments, and tests to evaluate student learning.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AssignmentIcon />}
              onClick={() => navigate(`/instructor/courses/${courseId}/assessments`)}
              data-testid="course-edit-manage-assessments-button"
            >
              Manage Course Assessments
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <CourseSettingsEditor 
            course={course} 
            onUpdate={loadCourse} 
          />
        </TabPanel>
      </Paper>
    </PageContainer>
    </>
  );
};