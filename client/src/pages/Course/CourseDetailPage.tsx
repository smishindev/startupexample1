import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

// Helper function to format category for display (e.g. 'data_science' → 'Data Science')
const formatCategory = (category: string): string => {
  return category.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

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
  Cancel,
  HourglassEmpty,
} from '@mui/icons-material';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { enrollmentApi } from '../../services/enrollmentApi';
import { formatCurrency, roundToDecimals } from '../../utils/formatUtils';
import { coursesApi } from '../../services/coursesApi';
import type { PrerequisiteCheck } from '../../services/coursesApi';
import { useAuthStore } from '../../stores/authStore';
import { BookmarkApi } from '../../services/bookmarkApi';
import { useShare } from '../../hooks/useShare';
import { useCourseRealtimeUpdates } from '../../hooks/useCourseRealtimeUpdates';
import { ShareService } from '../../services/shareService';
import { ratingApi, type RatingSummary as RatingSummaryType, type CourseRating } from '../../services/ratingApi';
import { RatingSummaryCard, RatingSubmitForm, ReviewsList } from '../../components/Rating';
import { toast } from 'sonner';
import { PageContainer, BOTTOM_NAV_PADDING } from '../../components/Responsive';

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
  prerequisites?: string[];
  isEnrolled: boolean;
  isBookmarked: boolean;
  progress: number;
  currentLesson?: string;
  // Enrollment Controls (Phase 2) - matching backend response field names
  MaxEnrollment?: number | null;
  EnrollmentCount?: number;
  EnrollmentOpenDate?: string | null;
  EnrollmentCloseDate?: string | null;
  RequiresApproval?: boolean;
  // Advanced Visibility (Phase 4)
  status?: string;
}

export const CourseDetailPage: React.FC = () => {
  const { courseId, previewToken } = useParams<{ courseId: string; previewToken?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  // Preview mode when a preview token is present in the URL
  const isPreviewMode = !!previewToken;
  
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
  const [prerequisiteCheck, setPrerequisiteCheck] = useState<PrerequisiteCheck | null>(null);
  const [loadingPrerequisites, setLoadingPrerequisites] = useState(false);

  // Real-time refetch trigger: incremented by socket events to re-run fetchCourse
  const [realtimeRefetchCounter, setRealtimeRefetchCounter] = useState(0);

  // Ratings state
  const [ratingSummary, setRatingSummary] = useState<RatingSummaryType | null>(null);
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);
  const [userRating, setUserRating] = useState<CourseRating | null>(null);
  const [userRatingLoaded, setUserRatingLoaded] = useState(false);
  const [editTrigger, setEditTrigger] = useState(0);

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
          const status = enrollmentStatusData.status;
          const isActivelyEnrolled = status === 'active' || status === 'completed';
          
          // Update enrollment status for all states (pending, approved, active, etc.)
          setEnrollmentStatus({ 
            isEnrolled: isActivelyEnrolled, 
            isInstructor: false,
            status: status, 
            enrolledAt: enrollmentStatusData.enrolledAt 
          });
          
          if (isActivelyEnrolled) {
            setCourse(prev => prev ? { ...prev, isEnrolled: true } : null);
          }
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
      
      // Show loading spinner on initial load or when navigating to a different course
      const isInitialLoad = !course || course.id !== courseId;
      try {
        if (isInitialLoad) {
          setLoading(true);
        }
        // Use preview API if preview token is present, otherwise normal API
        const [courseData, enrollmentStatusData] = await Promise.all([
          isPreviewMode && previewToken
            ? coursesApi.getCoursePreview(courseId, previewToken)
            : coursesApi.getCourse(courseId),
          user && !isPreviewMode ? coursesApi.getEnrollmentStatus(courseId) : Promise.resolve(null)
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

        // Check prerequisites if user is logged in (for all users to see completion status)
        if (user && courseData.Prerequisites && courseData.Prerequisites.length > 0) {
          try {
            setLoadingPrerequisites(true);
            const prereqCheck = await coursesApi.checkPrerequisites(courseId);
            setPrerequisiteCheck(prereqCheck);
          } catch (err) {
            console.log('Failed to check prerequisites:', err);
          } finally {
            setLoadingPrerequisites(false);
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
          reviewCount: courseData.RatingCount || 0,
          enrolledStudents: courseData.EnrollmentCount || 0,
          price: courseData.Price || 0,
          originalPrice: courseData.Price ? roundToDecimals(courseData.Price * 1.3) : 0,
          category: formatCategory(courseData.Category || 'General'),
          tags: courseData.Tags || [],
          lastUpdated: courseData.UpdatedAt ? courseData.UpdatedAt.split('T')[0] : new Date().toISOString().split('T')[0],
          language: 'English',
          certificate: courseData.CertificateEnabled !== undefined ? Boolean(courseData.CertificateEnabled) : true,
          isEnrolled: (enrollmentStatusData?.isEnrolled) || false,
          isBookmarked: false,
          progress: realProgress,
          currentLesson: undefined,
          requirements: [],
          whatYouWillLearn: courseData.LearningOutcomes || [],
          prerequisites: courseData.Prerequisites || [],
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
          // Enrollment Controls (Phase 2)
          MaxEnrollment: courseData.MaxEnrollment ?? null,
          EnrollmentCount: courseData.EnrollmentCount ?? 0,
          EnrollmentOpenDate: courseData.EnrollmentOpenDate ?? null,
          EnrollmentCloseDate: courseData.EnrollmentCloseDate ?? null,
          RequiresApproval: Boolean(courseData.RequiresApproval),
          // Advanced Visibility (Phase 4)
          status: courseData.Status,
        };
        setCourse(realCourse);
        if (isInitialLoad) {
          setLoading(false);
        }
      } catch (error: any) {
        console.error('Error fetching course:', error);
        if (isInitialLoad) {
          if (isPreviewMode) {
            setError('Invalid or expired preview link. The course owner may have regenerated the link.');
          } else {
            setError(error.response?.status === 404 ? 'Course not found' : 'Failed to load course');
          }
          setLoading(false);
        }
        // On real-time refetch failure, silently keep the existing course data
      }
    };

    fetchCourse();
  }, [courseId, previewToken, user, realtimeRefetchCounter]);

  // Real-time course updates: refresh when instructor changes course data or lessons
  useCourseRealtimeUpdates(courseId, useCallback(() => {
    setRealtimeRefetchCounter(prev => prev + 1);
  }, []));

  // Fetch rating summary (also re-fetches on real-time course updates for other viewers)
  useEffect(() => {
    if (!courseId) return;
    ratingApi.getRatingSummary(courseId)
      .then(setRatingSummary)
      .catch(err => console.log('Failed to load rating summary:', err));
    
    // Also fetch user's own rating if logged in
    if (user) {
      ratingApi.getMyRating(courseId)
        .then(data => { setUserRating(data || null); setUserRatingLoaded(true); })
        .catch(() => { setUserRating(null); setUserRatingLoaded(true); });
    } else {
      setUserRatingLoaded(true);
    }
  }, [courseId, reviewsRefreshKey, realtimeRefetchCounter, user]);

  // Handle #reviews hash navigation (e.g., from "Rate Course" button on MyLearningPage)
  useEffect(() => {
    if (window.location.hash === '#reviews' && !loading) {
      // Wait for DOM to render the reviews section
      setTimeout(() => {
        const reviewsSection = document.getElementById('rating-submit-form') || document.querySelector('[data-section="reviews"]');
        if (reviewsSection) {
          reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [loading]);

  const handleRatingSubmitted = () => {
    setReviewsRefreshKey(prev => prev + 1);
  };

  const handleEnroll = async () => {
    if (isPreviewMode) {
      toast.info('Enrollment is not available in preview mode');
      return;
    }
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (!courseId || !course) return;
    
    setIsEnrolling(true);
    setError(null);
    
    try {
      const result = await enrollmentApi.enrollInCourse(courseId);
      
      // Check if enrollment is pending approval (Phase 2)
      if (result.status === 'pending' || result.code === 'ENROLLMENT_PENDING_APPROVAL') {
        toast.success('Enrollment request submitted! Awaiting instructor approval.');
        // Don't mark as enrolled - just update UI state
        setEnrollmentStatus({ isEnrolled: false, status: 'pending', enrolledAt: result.enrolledAt });
        return;
      }
      
      // Check if already approved but needs payment (paid course with approval)
      if (result.status === 'approved' || result.code === 'ENROLLMENT_APPROVED_PENDING_PAYMENT') {
        toast.success('Your enrollment is approved! Redirecting to checkout...');
        setEnrollmentStatus({ isEnrolled: false, status: 'approved' });
        navigate(`/checkout/${courseId}`);
        return;
      }
      
      // Active enrollment success
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
        } else if (errorData.code === 'PAYMENT_REQUIRED') {
          // Paid course without approval - redirect to checkout
          navigate(`/checkout/${courseId}`);
          return;
        } else if (errorData.code === 'ENROLLMENT_ALREADY_PENDING') {
          setError(null);
          toast.info('Your enrollment request is already pending approval.');
          setEnrollmentStatus({ isEnrolled: false, status: 'pending' });
        } else if (errorData.code === 'INSTRUCTOR_SELF_ENROLLMENT') {
          setError('Instructors cannot enroll in their own courses.');
        } else if (errorData.code === 'COURSE_NOT_PUBLISHED') {
          setError('This course is not available for enrollment at this time.');
        } else if (errorData.code === 'PREREQUISITES_NOT_MET') {
          setError(
            `You must complete these prerequisite courses first: ${errorData.missingPrerequisites?.map((p: any) => p.title).join(', ')}`
          );
        } else if (errorData.code === 'ENROLLMENT_FULL') {
          setError(`This course has reached its maximum capacity of ${errorData.maxEnrollment} students.`);
        } else if (errorData.code === 'ENROLLMENT_NOT_OPEN') {
          const openDate = new Date(errorData.enrollmentOpenDate).toLocaleDateString();
          setError(`Enrollment opens on ${openDate}.`);
        } else if (errorData.code === 'ENROLLMENT_CLOSED') {
          const closeDate = new Date(errorData.enrollmentCloseDate).toLocaleDateString();
          setError(`Enrollment period ended on ${closeDate}.`);
        } else if (errorData.code === 'ENROLLMENT_SUSPENDED') {
          setError('Your enrollment has been suspended. Please contact the instructor for more information.');
        } else if (errorData.code === 'ENROLLMENT_PENDING_APPROVAL') {
          setError(null);
          toast.success('Enrollment request submitted! Awaiting instructor approval.');
          setEnrollmentStatus({ isEnrolled: false, status: 'pending' });
          // Note: Enrollment is pending, so we don't mark as enrolled yet
        } else {
          setError(errorData.message || errorData.error || 'Failed to enroll in course. Please try again.');
        }
      } catch {
        setError(error.message || 'Failed to enroll in course. Please try again.');
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  // Helper function to check if enrollment is disabled (Phase 2)
  const isEnrollmentDisabled = () => {
    if (!course) return true;
    
    // Check capacity
    if (course.MaxEnrollment && (course.EnrollmentCount ?? 0) >= course.MaxEnrollment) {
      return true;
    }
    
    // Check enrollment dates
    const now = new Date();
    if (course.EnrollmentOpenDate && new Date(course.EnrollmentOpenDate) > now) {
      return true;
    }
    if (course.EnrollmentCloseDate && new Date(course.EnrollmentCloseDate) < now) {
      return true;
    }
    
    return false;
  };

  const handlePurchase = () => {
    if (isPreviewMode) {
      toast.info('Purchasing is not available in preview mode');
      return;
    }
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
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
    if (isPreviewMode) {
      toast.info('Bookmarking is not available in preview mode');
      return;
    }
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
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
    if (isPreviewMode) {
      toast.info('Sharing is not available in preview mode');
      return;
    }
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
        {user && <Header />}
        <PageContainer sx={{ flex: 1 }}>
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
        </PageContainer>
      </Box>
    );
  }

  if (error || !course) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {user && <Header />}
        <PageContainer sx={{ flex: 1 }}>
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
        </PageContainer>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      {user && <Header />}

      {/* Preview Banner */}
      {isPreviewMode && (
        <Alert
          severity="warning"
          variant="filled"
          sx={{
            borderRadius: 0,
            justifyContent: 'center',
            '& .MuiAlert-message': { textAlign: 'center', width: '100%' }
          }}
        >
          <Typography variant="body1" fontWeight={600}>
            You are viewing a preview of this course.{course?.status && course.status !== 'published' ? ' This course is not yet published.' : ''}
          </Typography>
        </Alert>
      )}

      {/* Instructor draft/unpublished indicator */}
      {!isPreviewMode && course?.status && course.status !== 'published' && (
        <Alert
          severity="info"
          sx={{
            borderRadius: 0,
            justifyContent: 'center',
            '& .MuiAlert-message': { textAlign: 'center', width: '100%' }
          }}
        >
          <Typography variant="body1" fontWeight={600}>
            This course is currently <strong>{course.status}</strong>. Only you (the instructor) can see it. Publish it to make it available to students.
          </Typography>
        </Alert>
      )}
      
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
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.2, fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' } }}>
                {course.title}
              </Typography>
              
              <Typography variant="h6" sx={{ mb: 3, color: 'rgba(255,255,255,0.9)', fontWeight: 400, lineHeight: 1.6, fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' } }}>
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

      <Container maxWidth="xl" sx={{ mb: 6, pb: { xs: BOTTOM_NAV_PADDING, md: 0 } }}>
        <Grid container spacing={4}>
          {/* Main Content */}
          <Grid item xs={12} lg={8}>
            {/* What You'll Learn */}
            <Paper 
              elevation={0}
              sx={{ 
                p: { xs: 2.5, sm: 3, md: 4 }, 
                mb: 4,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
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

            {/* Prerequisites */}
            {course.prerequisites && course.prerequisites.length > 0 && (
              <Paper 
                elevation={0}
                sx={{ 
                  p: { xs: 2.5, sm: 3, md: 4 }, 
                  mb: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                  Prerequisites
                </Typography>
                {!user ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This course has {course.prerequisites.length} prerequisite course{course.prerequisites.length > 1 ? 's' : ''} that must be completed before enrollment.
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <Link href="/login" sx={{ fontWeight: 600 }}>Log in</Link> to see your progress and enrollment eligibility.
                    </Typography>
                  </Alert>
                ) : loadingPrerequisites ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : prerequisiteCheck && prerequisiteCheck.prerequisites ? (
                  <Box>
                    {!prerequisiteCheck.canEnroll && !course.isEnrolled && (
                      <Alert severity="warning" sx={{ mb: 3 }}>
                        You must complete the following prerequisite courses before enrolling in this course.
                      </Alert>
                    )}
                    {prerequisiteCheck.canEnroll && !course.isEnrolled && (
                      <Alert severity="success" sx={{ mb: 3 }}>
                        Great! You've completed all prerequisites and can enroll in this course.
                      </Alert>
                    )}
                    <List sx={{ py: 0 }}>
                      {prerequisiteCheck.prerequisites.map((prereq) => (
                        <ListItem 
                          key={prereq.id}
                          sx={{ 
                            px: 0, 
                            py: 2,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 'none' }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {prereq.isCompleted || prereq.progress === 100 ? (
                              <CheckCircle sx={{ color: 'success.main', fontSize: 28 }} />
                            ) : prereq.progress > 0 ? (
                              <HourglassEmpty sx={{ color: 'warning.main', fontSize: 28 }} />
                            ) : (
                              <Cancel sx={{ color: 'error.main', fontSize: 28 }} />
                            )}
                          </ListItemIcon>
                          <Box sx={{ flex: 1 }}>
                            <Link
                              href={`/courses/${prereq.id}`}
                              underline="hover"
                              sx={{ 
                                fontWeight: 600, 
                                color: 'text.primary',
                                '&:hover': { color: 'primary.main' }
                              }}
                            >
                              {prereq.title}
                            </Link>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              {prereq.isCompleted || prereq.progress === 100 ? (
                                <Chip 
                                  label="Completed" 
                                  size="small" 
                                  color="success" 
                                  sx={{ fontWeight: 600 }}
                                />
                              ) : prereq.progress > 0 ? (
                                <>
                                  <Chip 
                                    label={`${prereq.progress}% Complete`} 
                                    size="small" 
                                    color="warning" 
                                    sx={{ fontWeight: 600 }}
                                  />
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={prereq.progress} 
                                    sx={{ flex: 1, maxWidth: 200, height: 6, borderRadius: 3 }}
                                  />
                                </>
                              ) : (
                                <Chip 
                                  label="Not Started" 
                                  size="small" 
                                  color="error" 
                                  sx={{ fontWeight: 600 }}
                                />
                              )}
                            </Box>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Alert severity="info">
                    This course requires completing {course.prerequisites.length} prerequisite course{course.prerequisites.length > 1 ? 's' : ''} before enrollment.
                  </Alert>
                )}
              </Paper>
            )}

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
                p: { xs: 2, sm: 3 }, 
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper'
              }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
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
                      px: { xs: 2, sm: 3 },
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
                            px: { xs: 2, sm: 3 },
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
                p: { xs: 2.5, sm: 3, md: 4 }, 
                mb: 4,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
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
                p: { xs: 2.5, sm: 3, md: 4 },
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                Your Instructor
              </Typography>
              <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' } }}>
                <Avatar 
                  src={course.instructor.avatar} 
                  sx={{ width: { xs: 64, sm: 80 }, height: { xs: 64, sm: 80 } }}
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

            {/* Reviews & Ratings */}
            <Paper 
              data-section="reviews"
              elevation={0}
              sx={{ 
                p: { xs: 2.5, sm: 3, md: 4 },
                mt: 4,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                Student Reviews
              </Typography>
              
              {ratingSummary && <RatingSummaryCard summary={ratingSummary} />}
              
              {/* Rating form (only for enrolled non-instructor users) */}
              {course.isEnrolled && user && courseId && userRatingLoaded && (
                <Box id="rating-submit-form">
                  <RatingSubmitForm 
                    key={userRating?.Id || 'new'}
                    courseId={courseId}
                    existingRating={userRating}
                    onRatingSubmitted={handleRatingSubmitted}
                    onRatingDeleted={handleRatingSubmitted}
                    editTrigger={editTrigger}
                  />
                </Box>
              )}
              
              {courseId && (
                <ReviewsList 
                  courseId={courseId} 
                  refreshKey={reviewsRefreshKey + realtimeRefetchCounter}
                  onEditClick={() => {
                    // Scroll to rating form and trigger edit mode
                    setEditTrigger(prev => prev + 1);
                    const formEl = document.getElementById('rating-submit-form');
                    if (formEl) {
                      formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                />
              )}
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} lg={4}>
            <Box sx={{ position: { lg: 'sticky' }, top: { lg: 80 } }}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: { xs: 2.5, sm: 3 },
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

                {/* Enrollment Status Information (Phase 2) */}
                {course && !course.isEnrolled && !enrollmentStatus?.isInstructor && (
                  <Box sx={{ mb: 2 }}>
                    {/* Capacity Display */}
                    {course.MaxEnrollment && (
                      <Alert 
                        severity={(course.EnrollmentCount ?? 0) >= course.MaxEnrollment * 0.9 ? 'warning' : 'info'}
                        sx={{ mb: 1 }}
                      >
                        <Typography variant="body2">
                          <strong>{course.EnrollmentCount ?? 0}</strong> / <strong>{course.MaxEnrollment}</strong> seats filled
                          {(course.EnrollmentCount ?? 0) >= course.MaxEnrollment && ' - Course is full'}
                        </Typography>
                      </Alert>
                    )}
                    
                    {/* Enrollment Dates */}
                    {(course.EnrollmentOpenDate || course.EnrollmentCloseDate) && (
                      <Alert severity="info" sx={{ mb: 1 }}>
                        {course.EnrollmentOpenDate && new Date(course.EnrollmentOpenDate) > new Date() && (
                          <Typography variant="body2">
                            📅 Enrollment opens: {new Date(course.EnrollmentOpenDate).toLocaleDateString()}
                          </Typography>
                        )}
                        {course.EnrollmentCloseDate && (
                          <Typography variant="body2">
                            📅 Enrollment closes: {new Date(course.EnrollmentCloseDate).toLocaleDateString()}
                          </Typography>
                        )}
                      </Alert>
                    )}
                    
                    {/* Approval Required - Status-specific messages */}
                    {enrollmentStatus?.status === 'suspended' ? (
                      <Alert severity="error" sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          Your enrollment has been suspended. Please contact the instructor for more information.
                        </Typography>
                      </Alert>
                    ) : enrollmentStatus?.status === 'pending' ? (
                      <Alert severity="info" sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          ⏳ Your enrollment request is pending instructor approval
                        </Typography>
                      </Alert>
                    ) : enrollmentStatus?.status === 'approved' && course.price > 0 ? (
                      <Alert severity="success" sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          ✅ Your enrollment has been approved! Complete your purchase to access the course.
                        </Typography>
                      </Alert>
                    ) : course.RequiresApproval && !course.isEnrolled ? (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          ⏳ This course requires instructor approval before you can access it
                        </Typography>
                      </Alert>
                    ) : null}
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
                ) : enrollmentStatus?.status === 'suspended' ? (
                  // Enrollment is suspended
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled
                    data-testid="course-suspended-button"
                    sx={{ 
                      mb: 2,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      borderRadius: 2,
                      textTransform: 'none',
                      background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                      '&.Mui-disabled': {
                        background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                        color: 'rgba(255,255,255,0.8)'
                      }
                    }}
                  >
                    Enrollment Suspended
                  </Button>
                ) : enrollmentStatus?.status === 'pending' ? (
                  // Enrollment is pending instructor approval
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled
                    startIcon={<HourglassEmpty />}
                    data-testid="course-pending-approval-button"
                    sx={{ 
                      mb: 2,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      borderRadius: 2,
                      textTransform: 'none',
                      background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                      '&.Mui-disabled': {
                        background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                        color: 'rgba(255,255,255,0.8)'
                      }
                    }}
                  >
                    ⏳ Awaiting Instructor Approval
                  </Button>
                ) : enrollmentStatus?.status === 'approved' && course.price > 0 ? (
                  // Approved but needs to pay — show checkout button
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handlePurchase}
                    startIcon={<ShoppingCart />}
                    data-testid="course-complete-purchase-button"
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
                      }
                    }}
                  >
                    ✅ Approved — Complete Purchase - {formatCurrency(course.price)}
                  </Button>
                ) : course.price > 0 && course.RequiresApproval ? (
                  // Paid course with approval required: request approval first, pay later
                  <Tooltip
                    title={
                      isEnrollmentDisabled()
                        ? 'Enrollment is not available at this time'
                        : 'Instructor must approve your enrollment before you can purchase'
                    }
                    arrow
                  >
                    <span>
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleEnroll}
                        disabled={isEnrolling || isEnrollmentDisabled()}
                        startIcon={isEnrolling ? <CircularProgress size={20} color="inherit" /> : <HourglassEmpty />}
                        data-testid="course-request-enrollment-button"
                        sx={{ 
                          mb: 2,
                          py: 2,
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          borderRadius: 2,
                          textTransform: 'none',
                          background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                          '&:hover': {
                            background: 'linear-gradient(90deg, #d97706 0%, #b45309 100%)',
                          },
                          '&.Mui-disabled': {
                            background: 'rgba(0,0,0,0.12)'
                          }
                        }}
                      >
                        {isEnrolling ? 'Requesting...' : `Request Enrollment - ${formatCurrency(course.price)}`}
                      </Button>
                    </span>
                  </Tooltip>
                ) : course.price > 0 ? (
                  <Tooltip
                    title={
                      isEnrollmentDisabled()
                        ? 'Enrollment is not available at this time'
                        : ''
                    }
                    arrow
                  >
                    <span>
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handlePurchase}
                        disabled={isEnrollmentDisabled()}
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
                          },
                          '&.Mui-disabled': {
                            background: 'rgba(0,0,0,0.12)'
                          }
                        }}
                      >
                        Purchase Course - {formatCurrency(course.price)}
                      </Button>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip 
                    title={
                      prerequisiteCheck && !prerequisiteCheck.canEnroll
                        ? 'Complete all prerequisite courses before enrolling'
                        : isEnrollmentDisabled()
                        ? 'Enrollment is not available at this time'
                        : ''
                    }
                    arrow
                  >
                    <span>
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={handleEnroll}
                        disabled={isEnrolling || (prerequisiteCheck ? !prerequisiteCheck.canEnroll : false) || isEnrollmentDisabled()}
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
                    </span>
                  </Tooltip>
                )}

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                  <Tooltip title={user ? "Bookmark" : "Sign in to bookmark"} arrow>
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
        <DialogActions sx={{ px: 3, pb: 3, gap: 1, flexDirection: { xs: 'column', sm: 'row' }, '& > :not(:first-of-type)': { ml: { xs: 0, sm: 1 } } }}>
          <Button 
            onClick={() => setEnrollmentDialog(false)}
            sx={{ mr: { sm: 'auto' } }}
            fullWidth={false}
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