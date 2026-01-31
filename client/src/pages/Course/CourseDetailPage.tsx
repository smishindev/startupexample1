import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  Chip,
  LinearProgress,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating,
  Breadcrumbs,
  Link,
  CircularProgress,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  PlayCircleOutline,
  ExpandMore,
  CheckCircle,
  Schedule,
  People,
  Star,
  Quiz,
  Assignment,
  VideoLibrary,
  MenuBook,
  Lock,
  Edit,
  Bookmark,
  BookmarkBorder,
  Share,
  CheckCircleOutline,
  ArrowBack,
  ShoppingCart,
} from '@mui/icons-material';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { enrollmentApi } from '../../services/enrollmentApi';
import { formatCurrency, roundToDecimals } from '../../utils/formatUtils';
import { coursesApi } from '../../services/coursesApi';
import { useAuthStore } from '../../stores/authStore';
import { BookmarkApi } from '../../services/bookmarkApi';
import { useShare } from '../../hooks/useShare';
import { ShareService } from '../../services/shareService';

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'quiz' | 'assignment' | 'reading';
  duration: string;
  isCompleted: boolean;
  isLocked: boolean;
  videoUrl?: string;
  description: string;
  resources?: Array<{
    id: string;
    title: string;
    type: 'pdf' | 'doc' | 'link';
    url: string;
  }>;
}

interface CourseSection {
  id: string;
  title: string;
  lessons: Lesson[];
  isCompleted: boolean;
}

interface CourseDetails {
  id: string;
  title: string;
  description: string;
  instructor: {
    id: string;
    name: string;
    avatar: string;
    bio: string;
    rating: number;
    studentCount: number;
  };
  thumbnail: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  rating: number;
  reviewCount: number;
  enrolledStudents: number;
  price: number;
  originalPrice?: number;
  category: string;
  tags: string[];
  lastUpdated: string;
  language: string;
  certificate: boolean;
  sections: CourseSection[];
  requirements: string[];
  whatYouWillLearn: string[];
  isEnrolled: boolean;
  isBookmarked: boolean;
  progress: number;
  currentLesson?: string;
}

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Use CourseDetails type (original interface) but populate with real API data
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [enrollmentDialog, setEnrollmentDialog] = useState(false);
  const [enrollmentResult, setEnrollmentResult] = useState<any>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  const { openShareDialog, ShareDialogComponent } = useShare({
    contentType: 'course',
    contentId: course?.id || '',
    generateShareData: () => course ? ShareService.generateCourseShareData({
      id: course.id,
      title: course.title,
      description: course.description,
      instructor: { name: course.instructor.name },
      thumbnail: course.thumbnail,
      category: course.category,
      level: course.level,
      duration: course.duration,
      price: course.price,
    } as any) : { url: '', title: '', text: '' },
    preview: course ? (
      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {course.thumbnail && (
            <Box
              component="img"
              src={course.thumbnail}
              alt={course.title}
              sx={{
                width: 80,
                height: 60,
                borderRadius: 1,
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {course.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              by {course.instructor.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {course.level} • {course.duration} • ${course.price === 0 ? 'Free' : course.price}
            </Typography>
          </Box>
        </Box>
      </Box>
    ) : undefined,
    metadata: course ? {
      title: course.title,
      category: course.category,
      level: course.level,
      price: course.price,
    } : undefined,
  });

  // Fetch real course data from API
  // Refresh enrollment status when returning from payment
  useEffect(() => {
    const refreshEnrollment = async () => {
      if (!courseId || !user) return;
      
      try {
        const enrollmentStatusData = await enrollmentApi.getEnrollmentStatus(courseId);
        if (enrollmentStatusData?.enrolled) {
          // Force refresh the page data
          setEnrollmentStatus({ 
            isEnrolled: true, 
            isInstructor: false,
            status: enrollmentStatusData.status, 
            enrolledAt: enrollmentStatusData.enrolledAt 
          });
          setCourse(prev => prev ? { ...prev, isEnrolled: true } : null);
        }
      } catch (error) {
        console.error('Error refreshing enrollment:', error);
      }
    };
    
    refreshEnrollment();
  }, [courseId, user]); // Run when courseId or user changes

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      
      try {
        setLoading(true);
        // Use real API call to get actual course data
        const [courseData, enrollmentStatusData] = await Promise.all([
          coursesApi.getCourse(courseId),
          user ? coursesApi.getEnrollmentStatus(courseId) : Promise.resolve(null)
        ]);
        console.log('Real course data:', courseData);
        console.log('Enrollment status:', enrollmentStatusData);
        
        // Get real progress if enrolled
        let realProgress = 0;
        if (enrollmentStatusData?.isEnrolled && !enrollmentStatusData?.isInstructor) {
          try {
            const { progressApi } = await import('../../services/progressApi');
            const progressData = await progressApi.getCourseProgress(courseId);
            realProgress = Math.round(progressData.courseProgress?.OverallProgress || 0);
          } catch (err) {
            console.log('Progress not available:', err);
          }
        }
        
        // Check if course is bookmarked
        if (user) {
          try {
            const bookmarkStatus = await BookmarkApi.checkBookmarkStatus(courseId);
            setIsBookmarked(bookmarkStatus.isBookmarked);
          } catch (err) {
            console.log('Bookmark status not available:', err);
          }
        }
        
        setEnrollmentStatus(enrollmentStatusData);
        
        // Use real course data from API
        const realCourse: CourseDetails = {
          id: courseData.Id,
          title: courseData.Title,
          description: courseData.Description,
          instructor: {
            id: courseData.Instructor.Id,
            name: `${courseData.Instructor.FirstName} ${courseData.Instructor.LastName}`,
            avatar: courseData.Instructor.Avatar || '',
            bio: '',
            rating: 0,
            studentCount: (courseData as any).InstructorStudentCount || 0,
          },
          thumbnail: courseData.Thumbnail || '',
          duration: `${Math.floor(courseData.Duration / 60)}h ${courseData.Duration % 60}m`,
          level: courseData.Level as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert',
          rating: courseData.Rating || 0.0,
          reviewCount: Math.floor(courseData.EnrollmentCount * 0.3) || 0,
          enrolledStudents: courseData.EnrollmentCount || 0,
          price: courseData.Price || 0,
          originalPrice: courseData.Price ? roundToDecimals(courseData.Price * 1.3) : 0,
          category: courseData.Category || 'General',
          tags: courseData.Tags || [],
          lastUpdated: courseData.UpdatedAt ? courseData.UpdatedAt.split('T')[0] : new Date().toISOString().split('T')[0],
          language: 'English',
          certificate: false,
          isEnrolled: enrollmentStatusData?.isEnrolled && !enrollmentStatusData?.isInstructor || false,
          isBookmarked: false,
          progress: realProgress,
          currentLesson: undefined,
          requirements: courseData.Prerequisites || [],
          whatYouWillLearn: courseData.LearningOutcomes || [],
          sections: courseData.Lessons && courseData.Lessons.length > 0 ? [{
            id: 'section-1',
            title: 'Course Content',
            isCompleted: false,
            lessons: courseData.Lessons.map((lesson: any) => ({
              id: lesson.Id,
              title: lesson.Title,
              type: 'video' as const,
              duration: lesson.Duration ? `${lesson.Duration} min` : '0 min',
              isCompleted: false,
              isLocked: false,
              description: lesson.Description || '',
              videoUrl: undefined,
            })),
          }] : [],
        };
        setCourse(realCourse);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching course:', error);
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, user]);

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!courseId || !course) return;
    
    setIsEnrolling(true);
    setError(null);
    
    try {
      const result = await enrollmentApi.enrollInCourse(courseId);
      
      // Update both course state and enrollment status
      setCourse({ ...course, isEnrolled: true, progress: 0 });
      setEnrollmentStatus({ isEnrolled: true, status: result.status, enrolledAt: result.enrolledAt });
      
      setEnrollmentResult(result);
      setEnrollmentDialog(true);
      
      console.log('Successfully enrolled in course:', courseId);
    } catch (error: any) {
      console.error('Failed to enroll:', error);
      
      // Parse enhanced error message
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.code === 'ALREADY_ENROLLED') {
          setError('You are already enrolled in this course.');
          setCourse({ ...course, isEnrolled: true });
          setEnrollmentStatus({ ...enrollmentStatus, isEnrolled: true });
        } else if (errorData.code === 'INSTRUCTOR_SELF_ENROLLMENT') {
          setError('Instructors cannot enroll in their own courses.');
        } else if (errorData.code === 'COURSE_NOT_PUBLISHED') {
          setError('This course is not available for enrollment at this time.');
        } else {
          setError(errorData.message || 'Failed to enroll in course. Please try again.');
        }
      } catch {
        setError(error.message || 'Failed to enroll in course. Please try again.');
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  const handlePurchase = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!courseId) return;
    
    // Navigate to checkout page
    navigate(`/checkout/${courseId}`);
  };

  const handleStartLearning = () => {
    setEnrollmentDialog(false);
    
    // Navigate to first lesson
    const firstLesson = course?.sections?.[0]?.lessons?.[0];
    if (firstLesson) {
      navigate(`/courses/${courseId}/lessons/${firstLesson.id}`);
    } else {
      // Fallback to my-learning if no lessons found
      navigate('/my-learning');
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

    if (!courseId) return;
    
    try {
      const newBookmarkState = !isBookmarked;
      
      if (newBookmarkState) {
        await BookmarkApi.addBookmark(courseId);
        setSnackbar({
          open: true,
          message: 'Course bookmarked successfully',
          severity: 'success'
        });
      } else {
        await BookmarkApi.removeBookmark(courseId);
        setSnackbar({
          open: true,
          message: 'Bookmark removed successfully',
          severity: 'success'
        });
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
    openShareDialog();
  };

  const handleLessonSelect = (lesson: Lesson) => {
    if (lesson.isLocked && !course?.isEnrolled && !enrollmentStatus?.isInstructor) return;
    
    // Navigate to lesson page for enrolled students or instructors
    if (course?.isEnrolled || enrollmentStatus?.isInstructor) {
      navigate(`/courses/${courseId}/lessons/${lesson.id}`);
    }
  };

  const getLessonIcon = (lesson: Lesson) => {
    if (lesson.isLocked) return <Lock color="disabled" />;
    if (lesson.isCompleted) return <CheckCircle color="success" />;
    
    switch (lesson.type) {
      case 'video': return <VideoLibrary />;
      case 'quiz': return <Quiz />;
      case 'assignment': return <Assignment />;
      case 'reading': return <MenuBook />;
      default: return <PlayCircleOutline />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <Skeleton variant="rectangular" width="100%" height={300} sx={{ mb: 4, borderRadius: 2 }} />
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Skeleton variant="text" sx={{ fontSize: '2rem', mb: 2 }} />
              <Skeleton variant="text" sx={{ fontSize: '1rem', mb: 1 }} />
              <Skeleton variant="text" sx={{ fontSize: '1rem', mb: 4, width: '80%' }} />
              <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Skeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: 2 }} />
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
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />
      
      {/* Hero Section with Course Title & Key Info */}
      <Box sx={{ 
        bgcolor: '#1a1d29',
        color: 'white',
        py: { xs: 4, md: 6 },
        mb: 4
      }}>
        <Container maxWidth="xl">
          <Breadcrumbs 
            sx={{ 
              mb: 3,
              '& .MuiBreadcrumbs-separator': { color: 'rgba(255,255,255,0.7)' }
            }}
          >
            <Link 
              underline="hover" 
              color="inherit" 
              onClick={() => navigate('/courses')}
              sx={{ cursor: 'pointer', color: 'rgba(255,255,255,0.9)', '&:hover': { color: 'white' } }}
            >
              Courses
            </Link>
            <Link 
              underline="hover" 
              color="inherit" 
              onClick={() => navigate('/courses')}
              sx={{ cursor: 'pointer', color: 'rgba(255,255,255,0.9)', '&:hover': { color: 'white' } }}
            >
              {course.category}
            </Link>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>{course.title}</Typography>
          </Breadcrumbs>

          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.2 }}>
                {course.title}
              </Typography>
              
              <Typography variant="h6" sx={{ mb: 3, color: 'rgba(255,255,255,0.9)', fontWeight: 400, lineHeight: 1.6 }}>
                {course.description}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating value={course.rating} precision={0.1} size="small" readOnly sx={{ color: '#ffd700' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {course.rating}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    ({course.reviewCount} reviews)
                  </Typography>
                </Box>
                
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <People fontSize="small" />
                  {course.enrolledStudents.toLocaleString()} students
                </Typography>

                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Schedule fontSize="small" />
                  {course.duration}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                <Chip 
                  label={course.level} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.3)'
                  }} 
                />
                <Chip 
                  label={course.category} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.3)'
                  }} 
                />
                {course.certificate && (
                  <Chip 
                    label="Certificate Included" 
                    size="small" 
                    icon={<Star sx={{ color: '#ffd700 !important' }} />}
                    sx={{ 
                      bgcolor: 'rgba(255,215,0,0.2)', 
                      color: 'white',
                      fontWeight: 600,
                      border: '1px solid rgba(255,215,0,0.4)'
                    }} 
                  />
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  src={course.instructor.avatar} 
                  sx={{ width: 48, height: 48 }}
                >
                  {course.instructor.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Created by
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {course.instructor.name}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={5}>
              <Paper 
                elevation={8}
                sx={{ 
                  overflow: 'hidden',
                  borderRadius: 3,
                  border: '2px solid rgba(255,255,255,0.1)'
                }}
              >
                <Box
                  sx={{
                    height: 280,
                    background: course.thumbnail 
                      ? `url(${course.thumbnail})` 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {!course.thumbnail && (
                    <PlayCircleOutline sx={{ fontSize: 80, color: 'white', opacity: 0.9 }} />
                  )}
                  {enrollmentStatus?.isInstructor && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'rgba(255,152,0,0.95)',
                        color: 'white',
                        px: 2,
                        py: 0.75,
                        borderRadius: 2,
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}
                    >
                      Your Course
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mb: 6 }}>
        <Grid container spacing={4}>
          {/* Main Content */}
          <Grid item xs={12} lg={8}>
            {/* What You'll Learn */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 4, 
                mb: 4,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                What you'll learn
              </Typography>
              {course.whatYouWillLearn.length > 0 ? (
                <Grid container spacing={2}>
                  {course.whatYouWillLearn.map((item, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20, mt: 0.25, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                          {item}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Learning outcomes will be added soon by the instructor.
                </Typography>
              )}
            </Paper>

            {/* Course Content */}
            <Paper 
              elevation={0}
              sx={{ 
                mb: 4,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                overflow: 'hidden'
              }}
            >
              <Box sx={{ 
                p: 3, 
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper'
              }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  Course Content
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {course.sections.reduce((acc, section) => acc + section.lessons.length, 0)} lessons • 
                  {course.sections.length} sections • {course.duration} total length
                </Typography>
              </Box>
              
              {course.sections.map((section, sectionIndex) => (
                <Accordion 
                  key={section.id} 
                  defaultExpanded={sectionIndex === 0}
                  elevation={0}
                  sx={{
                    '&:before': { display: 'none' },
                    '&:not(:last-child)': {
                      borderBottom: '1px solid',
                      borderColor: 'divider'
                    }
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMore />}
                    sx={{
                      px: 3,
                      py: 2,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {section.title}
                        </Typography>
                        {section.isCompleted && (
                          <CheckCircle color="success" sx={{ fontSize: 20 }} />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {section.lessons.length} lessons
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <List sx={{ py: 0 }}>
                      {section.lessons.map((lesson, index) => (
                        <ListItemButton
                          key={lesson.id}
                          onClick={() => handleLessonSelect(lesson)}
                          disabled={lesson.isLocked && !course.isEnrolled}
                          data-testid={`course-detail-section-lesson-${lesson.id}-button`}
                          sx={{
                            px: 3,
                            py: 2,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            '&:hover': { bgcolor: 'action.hover' },
                            '&.Mui-selected': {
                              bgcolor: 'action.selected',
                              borderLeft: '3px solid',
                              borderLeftColor: 'primary.main'
                            }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {getLessonIcon(lesson)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {index + 1}. {lesson.title}
                                </Typography>
                                {lesson.isLocked && !course.isEnrolled && (
                                  <Lock sx={{ fontSize: 16, color: 'text.disabled' }} />
                                )}
                                {lesson.isCompleted && (
                                  <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {lesson.description}
                              </Typography>
                            }
                          />
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                            {lesson.duration}
                          </Typography>
                        </ListItemButton>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Paper>

            {/* Requirements */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 4, 
                mb: 4,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                Requirements
              </Typography>
              {course.requirements.length > 0 ? (
                <List sx={{ py: 0 }}>
                  {course.requirements.map((req, index) => (
                    <ListItem key={index} sx={{ px: 0, py: 1 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Box sx={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          bgcolor: 'text.secondary' 
                        }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                            {req}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No specific requirements. This course is open to all learners.
                </Typography>
              )}
            </Paper>

            {/* Instructor */}
            <Paper 
              elevation={0}
              sx={{ 
                p: 4,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                Your Instructor
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                <Avatar 
                  src={course.instructor.avatar} 
                  sx={{ width: 80, height: 80 }}
                >
                  {course.instructor.name.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {course.instructor.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {course.instructor.bio}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Star sx={{ fontSize: 20, color: 'warning.main' }} />
                      <Typography variant="body2">
                        <strong>{course.instructor.rating}</strong> rating
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <People sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        <strong>{course.instructor.studentCount.toLocaleString()}</strong> students
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} lg={4}>
            <Box sx={{ position: 'sticky', top: 20 }}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3,
                  border: '2px solid',
                  borderColor: 'divider',
                  borderRadius: 3
                }}
              >
                {/* Progress (if enrolled) */}
                {course.isEnrolled && (
                  <Box sx={{ mb: 3, p: 2.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>Your Progress</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {course.progress}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={course.progress} 
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'background.paper',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        }
                      }}
                    />
                  </Box>
                )}

                {/* Price - Only show if not enrolled and not instructor */}
                {!course.isEnrolled && !enrollmentStatus?.isInstructor && (
                  <Box sx={{ mb: 3 }}>
                    {course.price > 0 ? (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1 }}>
                          <Typography variant="h3" sx={{ fontWeight: 800 }}>
                            {formatCurrency(course.price)}
                          </Typography>
                          {course.originalPrice && (
                            <Typography variant="h6" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                              {formatCurrency(course.originalPrice)}
                            </Typography>
                          )}
                        </Box>
                        {course.originalPrice && (
                          <Chip 
                            label={`${Math.round((1 - course.price / course.originalPrice) * 100)}% OFF`}
                            size="small"
                            sx={{ 
                              bgcolor: 'error.light',
                              color: 'error.contrastText',
                              fontWeight: 700
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <Typography variant="h3" sx={{ fontWeight: 800, color: 'success.main' }}>
                        FREE
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Action Buttons */}
                {enrollmentStatus?.isInstructor ? (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => navigate(`/instructor/courses/${courseId}/edit`)}
                    startIcon={<Edit />}
                    sx={{ 
                      mb: 2, 
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      borderRadius: 2,
                      textTransform: 'none',
                      bgcolor: 'warning.main',
                      '&:hover': {
                        bgcolor: 'warning.dark'
                      }
                    }}
                  >
                    Manage Course
                  </Button>
                ) : course.isEnrolled ? (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => {
                      // Find first lesson in course
                      const firstLesson = course.sections?.[0]?.lessons?.[0];
                      if (firstLesson) {
                        navigate(`/courses/${courseId}/lessons/${firstLesson.id}`);
                      } else {
                        // Fallback if no lessons found
                        navigate(`/my-learning`);
                      }
                    }}
                    data-testid="course-continue-learning-button"
                    sx={{ 
                      mb: 2,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      borderRadius: 2,
                      textTransform: 'none',
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(90deg, #5568d3 0%, #65408b 100%)',
                      }
                    }}
                  >
                    Continue Learning
                  </Button>
                ) : course.price > 0 ? (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handlePurchase}
                    startIcon={<ShoppingCart />}
                    data-testid="course-purchase-button"
                    sx={{ 
                      mb: 2,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      borderRadius: 2,
                      textTransform: 'none',
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(90deg, #5568d3 0%, #65408b 100%)',
                      }
                    }}
                  >
                    Purchase Course - {formatCurrency(course.price)}
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleEnroll}
                    disabled={isEnrolling}
                    data-testid="course-enroll-button"
                    sx={{ 
                      mb: 2,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      borderRadius: 2,
                      textTransform: 'none',
                      background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                      '&:hover': {
                        background: 'linear-gradient(90deg, #059669 0%, #047857 100%)',
                      },
                      '&.Mui-disabled': {
                        background: 'rgba(0,0,0,0.12)'
                      }
                    }}
                  >
                    {isEnrolling ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Enroll For Free'}
                  </Button>
                )}

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                  <Tooltip title="Bookmark" arrow>
                    <IconButton 
                      onClick={handleBookmark} 
                      data-testid="course-detail-bookmark-button"
                      sx={{ 
                        flex: 1, 
                        border: '1px solid', 
                        borderColor: 'divider',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      {isBookmarked ? <Bookmark color="primary" /> : <BookmarkBorder />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Share" arrow>
                    <IconButton
                      onClick={handleShare}
                      data-testid="course-detail-share-button"
                      sx={{ 
                        flex: 1, 
                        border: '1px solid', 
                        borderColor: 'divider',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      <Share />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Course Features */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                  This course includes
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1.5 }}>
                    <Schedule sx={{ color: 'primary.main', fontSize: 22 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {course.duration} on-demand content
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1.5 }}>
                    <PlayCircleOutline sx={{ color: 'primary.main', fontSize: 22 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {course.sections.reduce((acc, section) => acc + section.lessons.length, 0)} lessons
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1.5 }}>
                    <People sx={{ color: 'primary.main', fontSize: 22 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {course.enrolledStudents.toLocaleString()} students enrolled
                    </Typography>
                  </Box>

                  {course.certificate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 1.5 }}>
                      <Star sx={{ color: 'warning.main', fontSize: 22 }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Certificate of completion
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CheckCircle sx={{ color: 'success.main', fontSize: 22 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Full lifetime access
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
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
            {enrollmentResult?.message || `You have successfully enrolled in "${course?.title}".`}
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
            onClick={handleStartLearning}
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

      {/* Share Dialog */}
      <ShareDialogComponent />

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