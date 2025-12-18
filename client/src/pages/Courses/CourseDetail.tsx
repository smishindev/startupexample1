import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating,
  IconButton,
  Tooltip,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Snackbar,
} from '@mui/material';
import {
  PlayCircleOutline,
  ExpandMore,
  Schedule,
  People,
  BookmarkBorder,
  Bookmark,
  Share,
  VideoLibrary,
  CheckCircle,
  School as SchoolIcon,
  TrendingUp,
  Language,
  Category,
  ArrowBack,
  PersonAdd,
  CheckCircleOutline,
} from '@mui/icons-material';
import { HeaderV4 as Header } from '../../components/Navigation/HeaderV4';
import { coursesApi, CourseDetail as CourseDetailType, EnrollmentStatus } from '../../services/coursesApi';
import { enrollmentApi } from '../../services/enrollmentApi';
import { BookmarkApi } from '../../services/bookmarkApi';
import { useAuthStore } from '../../stores/authStore';

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [course, setCourse] = useState<CourseDetailType | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [enrollmentDialog, setEnrollmentDialog] = useState(false);
  const [enrollmentResult, setEnrollmentResult] = useState<any>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    if (id) {
      loadCourseDetails();
      if (user) {
        loadEnrollmentStatus();
        loadBookmarkStatus();
      }
    }
  }, [id, user]);

  const loadBookmarkStatus = async () => {
    try {
      if (id && user) {
        const status = await BookmarkApi.checkBookmarkStatus(id);
        setIsBookmarked(status.isBookmarked);
      }
    } catch (err) {
      console.error('Error loading bookmark status:', err);
      // Don't show error to user, just default to not bookmarked
    }
  };

  const loadCourseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const courseData = await coursesApi.getCourse(id!);
      setCourse(courseData);
    } catch (err) {
      console.error('Error loading course:', err);
      setError('Course not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollmentStatus = async () => {
    try {
      if (id && user) {
        const status = await coursesApi.getEnrollmentStatus(id);
        setEnrollmentStatus(status);
      }
    } catch (err) {
      console.error('Error loading enrollment status:', err);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    try {
      setEnrolling(true);
      setError(null);
      
      const result = await enrollmentApi.enrollInCourse(id!);
      
      // Update enrollment status
      setEnrollmentStatus({
        isEnrolled: true,
        status: result.status,
        enrolledAt: result.enrolledAt,
      });
      
      setEnrollmentResult(result);
      setEnrollmentDialog(true);
      
    } catch (err: any) {
      console.error('Error enrolling in course:', err);
      
      // Parse enhanced error message
      try {
        const errorData = JSON.parse(err.message);
        if (errorData.code === 'ALREADY_ENROLLED') {
          setError('You are already enrolled in this course.');
          setEnrollmentStatus({
            isEnrolled: true,
            status: 'active',
            enrolledAt: new Date().toISOString(),
          });
        } else if (errorData.code === 'INSTRUCTOR_SELF_ENROLLMENT') {
          setError('Instructors cannot enroll in their own courses.');
        } else if (errorData.code === 'COURSE_NOT_PUBLISHED') {
          setError('This course is not available for enrollment at this time.');
        } else {
          setError(errorData.message || 'Failed to enroll in course. Please try again.');
        }
      } catch {
        setError(err.message || 'Failed to enroll in course. Please try again.');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleStartLearning = () => {
    if (course && course.Lessons.length > 0) {
      // Navigate to enrolled course view (not preview)
      navigate(`/courses/${id}/lessons/${course.Lessons[0].Id}`);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      setSnackbar({
        open: true,
        message: 'Please log in to bookmark courses',
        severity: 'warning'
      });
      return;
    }

    try {
      const newBookmarkState = !isBookmarked;
      
      if (newBookmarkState) {
        await BookmarkApi.addBookmark(id!);
        console.log('✅ Bookmark added successfully');
        setSnackbar({
          open: true,
          message: 'Course bookmarked successfully',
          severity: 'success'
        });
        console.log('Snackbar state set:', { open: true, message: 'Course bookmarked successfully' });
      } else {
        await BookmarkApi.removeBookmark(id!);
        console.log('✅ Bookmark removed successfully');
        setSnackbar({
          open: true,
          message: 'Bookmark removed successfully',
          severity: 'success'
        });
        console.log('Snackbar state set:', { open: true, message: 'Bookmark removed successfully' });
      }
      
      setIsBookmarked(newBookmarkState);
      
    } catch (error) {
      console.error('Failed to update bookmark:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update bookmark. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleShare = () => {
    if (navigator.share && course) {
      navigator.share({
        title: course.Title,
        text: course.Description,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  const formatCategory = (category: string): string => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <Skeleton variant="rectangular" width="100%" height={300} sx={{ mb: 4 }} />
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Skeleton variant="text" sx={{ fontSize: '2rem', mb: 2 }} />
              <Skeleton variant="text" sx={{ fontSize: '1rem', mb: 4 }} />
              <Skeleton variant="rectangular" width="100%" height={200} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Skeleton variant="rectangular" width="100%" height={400} />
            </Grid>
          </Grid>
        </Container>
      </Box>
    );
  }

  if (error || !course) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <Alert severity="error" sx={{ mb: 4 }}>
            {error || 'Course not found'}
          </Alert>
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/courses')}
          >
            Back to Courses
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link component={RouterLink} to="/courses" underline="hover">
            Courses
          </Link>
          <Link component={RouterLink} to={`/courses?category=${course.Category}`} underline="hover">
            {formatCategory(course.Category)}
          </Link>
          <Typography color="text.primary">{course.Title}</Typography>
        </Breadcrumbs>

        <Grid container spacing={4}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            {/* Course Header */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
                {course.Title}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {course.Description}
              </Typography>

              {/* Course Meta */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating value={course.Rating} precision={0.1} readOnly size="small" />
                  <Typography variant="body2">
                    {course.Rating.toFixed(1)} ({Math.floor(course.EnrollmentCount * 0.3)} reviews)
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <People fontSize="small" />
                  <Typography variant="body2">
                    {course.EnrollmentCount.toLocaleString()} students
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule fontSize="small" />
                  <Typography variant="body2">
                    {formatDuration(course.Duration)}
                  </Typography>
                </Box>

                <Chip
                  label={course.Level.charAt(0).toUpperCase() + course.Level.slice(1)}
                  color={course.Level === 'beginner' ? 'success' : course.Level === 'intermediate' ? 'warning' : 'error'}
                  size="small"
                />
              </Box>

              {/* Tags */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                {course.Tags.map((tag, index) => (
                  <Chip key={index} label={tag} variant="outlined" size="small" />
                ))}
              </Box>

              {/* Instructor */}
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Instructor
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar 
                      src={course.Instructor.Avatar} 
                      sx={{ width: 56, height: 56 }}
                    >
                      {course.Instructor.FirstName[0]}{course.Instructor.LastName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {course.Instructor.FirstName} {course.Instructor.LastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {course.Instructor.Email || 'Email not public'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Course Content Sections */}
            <Box sx={{ mb: 4 }}>
              {/* Learning Outcomes */}
              {course.LearningOutcomes.length > 0 && (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">What You'll Learn</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {course.LearningOutcomes.map((outcome, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <CheckCircle color="success" />
                          </ListItemIcon>
                          <ListItemText primary={outcome} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Prerequisites */}
              {course.Prerequisites.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Prerequisites</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {course.Prerequisites.map((prerequisite, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <SchoolIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText primary={prerequisite} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Course Content */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">
                    Course Content ({course.Lessons.length} lessons)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {course.Lessons.map((lesson, index) => (
                      <ListItem key={lesson.Id}>
                        <ListItemIcon>
                          <PlayCircleOutline />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${index + 1}. ${lesson.Title}`}
                          secondary={
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Typography variant="caption" component="span">
                                {formatDuration(lesson.Duration)}
                              </Typography>
                              {lesson.IsRequired && (
                                <Chip label="Required" size="small" color="primary" component="span" />
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
              {/* Course Thumbnail */}
              {course.Thumbnail && (
                <Box
                  component="img"
                  src={course.Thumbnail}
                  alt={course.Title}
                  sx={{
                    width: '100%',
                    height: 200,
                    objectFit: 'cover',
                    borderRadius: 1,
                    mb: 3,
                  }}
                />
              )}

              {/* Price - Only show if not enrolled and not instructor */}
              {!enrollmentStatus?.isEnrolled && !enrollmentStatus?.isInstructor && (
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  {course.Price === 0 ? (
                    <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                      Free
                    </Typography>
                  ) : (
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                      ${course.Price}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Enrollment Button */}
              <Box sx={{ mb: 3 }}>
                {enrollmentStatus?.isInstructor ? (
                  <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    startIcon={<SchoolIcon />}
                    onClick={() => navigate(`/instructor/courses/${course.Id}/edit`)}
                    sx={{ mb: 2 }}
                  >
                    Manage Course
                  </Button>
                ) : enrollmentStatus?.isEnrolled ? (
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<PlayCircleOutline />}
                    onClick={handleStartLearning}
                    sx={{ mb: 2 }}
                  >
                    Continue Learning
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<PersonAdd />}
                    onClick={handleEnroll}
                    disabled={enrolling}
                    sx={{ mb: 2 }}
                  >
                    {enrolling ? <CircularProgress size={24} /> : 'Enroll Now'}
                  </Button>
                )}

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Bookmark">
                    <IconButton onClick={handleBookmark}>
                      {isBookmarked ? <Bookmark color="primary" /> : <BookmarkBorder />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Share">
                    <IconButton onClick={handleShare}>
                      <Share />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Course Stats */}
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <VideoLibrary />
                  </ListItemIcon>
                  <ListItemText
                    primary="Lessons"
                    secondary={`${course.Lessons.length} lessons`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Schedule />
                  </ListItemIcon>
                  <ListItemText
                    primary="Duration"
                    secondary={formatDuration(course.Duration)}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <TrendingUp />
                  </ListItemIcon>
                  <ListItemText
                    primary="Level"
                    secondary={course.Level.charAt(0).toUpperCase() + course.Level.slice(1)}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <Category />
                  </ListItemIcon>
                  <ListItemText
                    primary="Category"
                    secondary={formatCategory(course.Category)}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <Language />
                  </ListItemIcon>
                  <ListItemText
                    primary="Language"
                    secondary="English"
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Enrollment Success Dialog */}
      <Dialog
        open={enrollmentDialog}
        onClose={() => setEnrollmentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircleOutline color="success" />
            Enrollment Successful!
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {enrollmentResult?.message || `You have successfully enrolled in "${course.Title}".`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can now access all course materials and start learning immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button 
            onClick={() => setEnrollmentDialog(false)}
            sx={{ mr: 'auto' }}
          >
            Continue Browsing
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setEnrollmentDialog(false);
              navigate('/my-learning');
            }}
          >
            View My Learning
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayCircleOutline />}
            onClick={() => {
              setEnrollmentDialog(false);
              handleStartLearning();
            }}
            sx={{
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(90deg, #5568d3 0%, #65408b 100%)',
              }
            }}
          >
            Start Learning
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for user feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 9999 }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%', minWidth: '300px' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CourseDetail;