import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  IconButton,
  Button,
  LinearProgress,
  Chip,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Drawer,
  Divider,
  Switch,
  FormControlLabel,
  Card,
  Grid,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  RadioButtonUnchecked,
  PlayCircleOutline,
  Download,
  Quiz,
  BookmarkBorder,
  Bookmark,
  Share,
  Check,
  Menu as MenuIcon,
  PlayArrow,
  Article,
  Assignment,
  EmojiEvents,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { HeaderV4 as Header } from '../../components/Navigation/HeaderV4';
import { lessonApi, Lesson } from '../../services/lessonApi';
import { progressApi } from '../../services/progressApi';
import { assessmentApi, AssessmentWithProgress } from '../../services/assessmentApi';
import { getLessonContentProgress, markContentComplete, ContentProgressItem } from '../../services/contentProgressApi';
import { ContentItem } from '../../components/Lesson/ContentItem';
import { coursesApi } from '../../services/coursesApi';
import { BookmarkApi } from '../../services/bookmarkApi';
import { CommentsSection } from '../../components/Shared/CommentsSection';

interface ExtendedLessonContent {
  id: string;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  title: string;
  content: string;
  duration?: string;
  videoUrl?: string;
  resources?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
}

interface ExtendedLesson extends Lesson {
  courseTitle?: string;
  instructorName?: string;
  completed?: boolean;
  progress?: number;
  nextLessonId?: string;
  previousLessonId?: string;
  extendedContent?: ExtendedLessonContent[];
  resources?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    description: string;
  }>;
  savedPosition?: number; // Saved video position in seconds
}

// Helper function to get next/previous lesson IDs
const findAdjacentLessons = (currentLesson: Lesson, allLessons: Lesson[]) => {
  const sortedLessons = [...allLessons].sort((a, b) => a.orderIndex - b.orderIndex);
  const currentIndex = sortedLessons.findIndex(l => l.id === currentLesson.id);
  
  return {
    previousLessonId: currentIndex > 0 ? sortedLessons[currentIndex - 1].id : undefined,
    nextLessonId: currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1].id : undefined
  };
};

// Helper function to convert API content to display format
const transformLessonContent = (apiContent: any[]): ExtendedLessonContent[] => {
  return apiContent.map((content, index) => ({
    id: content.id || index.toString(),
    type: content.type,
    title: content.data?.title || `Content ${index + 1}`,
    content: content.data?.content || content.data?.html || '',
    videoUrl: content.data?.url,
    duration: content.data?.duration
  }));
};

// Helper function to extract saved position from notes
const extractSavedPosition = (notes?: string): number => {
  if (!notes) return 0;
  const match = notes.match(/position:(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export const LessonDetailPage: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState<ExtendedLesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [assessments, setAssessments] = useState<AssessmentWithProgress[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [contentProgress, setContentProgress] = useState<{[key: string]: ContentProgressItem}>({});
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructorPreview, setIsInstructorPreview] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(() => {
    const saved = localStorage.getItem('autoPlayNext');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  const [courseInfo, setCourseInfo] = useState<any>(null);

  // Fetch lesson data from real API
  useEffect(() => {
    const fetchLessonData = async () => {
      if (!courseId || !lessonId) {
        setError('Course ID or Lesson ID is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Clear content progress when navigating to a new lesson
        setContentProgress({});

        // Check if user is the course instructor (preview mode)
        const enrollmentStatus = await coursesApi.getEnrollmentStatus(courseId);
        const isPreview = enrollmentStatus?.isInstructor || false;
        setIsInstructorPreview(isPreview);

        // Fetch lesson details, all lessons for navigation, progress, and assessments
        const [lessonData, lessonsData, progressData, assessmentsData] = await Promise.all([
          lessonApi.getLesson(lessonId),
          lessonApi.getLessons(courseId),
          isPreview ? Promise.resolve(null) : progressApi.getCourseProgress(courseId).catch(() => null), // Skip progress for instructors
          assessmentApi.getAssessmentsByLesson(lessonId).catch(() => []) // Assessments might not exist
        ]);

        // Find adjacent lessons for navigation
        const { previousLessonId, nextLessonId } = findAdjacentLessons(lessonData, lessonsData);

        // Find progress for this specific lesson
        const lessonProgress = progressData?.lessonProgress?.find(
          (lp: any) => lp.LessonId === lessonId
        );

        // Extract saved position from notes
        const savedPosition = extractSavedPosition(lessonProgress?.Notes);

        // Calculate proper lesson progress: if completed, it should be 100%
        const isLessonCompleted = !!lessonProgress?.CompletedAt;
        const lessonProgressPercentage = isLessonCompleted 
          ? 100 
          : (lessonProgress?.ProgressPercentage || 0);

        // Create extended lesson object
        const extendedLesson: ExtendedLesson = {
          ...lessonData,
          courseTitle: lessonData.courseTitle || 'Course Title',
          instructorName: lessonData.instructorName || 'Instructor',
          completed: isLessonCompleted,
          progress: lessonProgressPercentage,
          nextLessonId,
          previousLessonId,
          extendedContent: transformLessonContent(lessonData.content || []),
          resources: [], // TODO: Implement resources API
          savedPosition // Add saved position for video resumption
        };

        setLesson(extendedLesson);
        setAllLessons(lessonsData);
        setAssessments(assessmentsData);
        setProgress(progressData);

        // Fetch course info for sidebar
        try {
          const courseData = await coursesApi.getCourse(courseId);
          setCourseInfo(courseData);
        } catch (error) {
          console.error('Failed to fetch course info:', error);
        }

        // Check if course is bookmarked
        try {
          const bookmarkStatus = await BookmarkApi.checkBookmarkStatus(courseId);
          setIsBookmarked(bookmarkStatus.isBookmarked);
        } catch (error) {
          console.error('Failed to check bookmark status:', error);
          // Don't fail the whole page if bookmark check fails
        }

        // Load content progress for ALL content items (videos, texts, quizzes)
        if (!isPreview) {
          try {
            const progressData = await getLessonContentProgress(lessonId);
            const progressMap: {[key: string]: ContentProgressItem} = {};
            progressData.forEach(p => {
              progressMap[p.contentItemId] = p;
            });
            
            // If lesson is already completed, mark ALL content items as completed
            // This handles cases where lesson was manually completed or content progress wasn't tracked
            if (isLessonCompleted && lessonData.content) {
              lessonData.content.forEach(item => {
                if (item.id && !progressMap[item.id]) {
                  // Create a default completed progress for missing items
                  progressMap[item.id] = {
                    contentItemId: item.id,
                    contentType: item.type as any,
                    isCompleted: true,
                    completedAt: lessonProgress?.CompletedAt || new Date().toISOString(),
                    progressData: undefined
                  };
                } else if (item.id && progressMap[item.id]) {
                  // Ensure existing items are marked complete if lesson is complete
                  progressMap[item.id].isCompleted = true;
                }
              });
            }
            
            setContentProgress(progressMap);
            console.log('[LESSON] Loaded content progress:', progressMap);
          } catch (error) {
            console.error('Failed to load content progress:', error);
          }
        }

        // Debug: Log progress data (can be removed in production)
        if (progressData) {
          console.log('Course progress data loaded:', progressData);
          console.log('Current lesson progress:', lessonProgress);
          console.log('Calculated lesson progress percentage:', lessonProgressPercentage);
          console.log('Is lesson completed:', isLessonCompleted);
        }

      } catch (error: any) {
        console.error('Failed to fetch lesson data:', error);
        setError(error?.response?.data?.error || error?.message || 'Failed to load lesson');
      } finally {
        setLoading(false);
      }
    };

    fetchLessonData();
  }, [courseId, lessonId]);

  const handleContentComplete = async (contentItemId: string) => {
    if (isInstructorPreview) {
      console.log('[LESSON] Instructor preview - skipping content completion');
      return;
    }

    try {
      await markContentComplete(contentItemId);
      
      // Extract content type from ID (format: {lessonId}-{type}-{uniqueId})
      // Since lessonId is a UUID with hyphens, find the type by looking for known types
      const contentType = contentItemId.includes('-video-') ? 'video' 
        : contentItemId.includes('-text-') ? 'text'
        : contentItemId.includes('-quiz-') ? 'quiz'
        : 'unknown';
      
      // Update local state
      setContentProgress(prev => ({
        ...prev,
        [contentItemId]: {
          ...prev[contentItemId],
          contentItemId,
          contentType: contentType as any,
          isCompleted: true,
          completedAt: new Date().toISOString()
        }
      }));
      
      console.log('[LESSON] Content item completed:', contentItemId);
      
      // Check if ALL content complete (only check items that have IDs)
      if (lesson) {
        const validContent = lesson.content.filter(item => item.id);
        const allComplete = validContent.every(
          item => contentProgress[item.id]?.isCompleted || item.id === contentItemId
        );
        
        if (allComplete && !lesson.completed) {
          console.log('[LESSON] All content completed - marking lesson complete');
          
          // Check if there are assessments available before auto-advancing
          if (assessments.length > 0 && lesson.nextLessonId && autoPlayNext) {
            const shouldTakeAssessments = window.confirm(
              `Great job! You've completed all content. This lesson has ${assessments.length} assessment(s) available. Would you like to take them now to test your understanding before moving to the next lesson?`
            );
            
            if (shouldTakeAssessments) {
              // Navigate to the first assessment instead of auto-advancing
              navigate(`/assessments/${assessments[0].id}`);
              return;
            }
          }
          
          await progressApi.markLessonComplete(lesson.id, {
            notes: `All content completed at ${new Date().toISOString()}`
          });
          
          // Reload lesson progress
          if (courseId) {
            const updatedProgress = await progressApi.getCourseProgress(courseId);
            setProgress(updatedProgress);
          }
          setLesson(prev => prev ? { ...prev, completed: true, progress: 100 } : null);
          
          // Auto-play next lesson if enabled
          if (lesson.nextLessonId && autoPlayNext) {
            setTimeout(() => {
              navigate(`/courses/${courseId}/lessons/${lesson.nextLessonId}`);
            }, 2000);
          }
        }
      }
    } catch (error) {
      console.error('[LESSON] Failed to mark content complete:', error);
    }
  };

  const handleMarkComplete = async () => {
    if (lesson) {
      // Check if there are assessments available
      if (assessments.length > 0) {
        const shouldTakeAssessments = window.confirm(
          `This lesson has ${assessments.length} assessment(s) available. Would you like to take them now to test your understanding before marking the lesson complete?`
        );
        
        if (shouldTakeAssessments) {
          // Navigate to the first assessment
          navigate(`/assessments/${assessments[0].id}`);
          return;
        }
      }

      try {
        // Mark lesson as complete via API
        await progressApi.markLessonComplete(lesson.id, {
          timeSpent: 0, // Time spent for manual completion
          notes: 'Manually marked as complete'
        });
        
        // Refresh progress data to get updated course and lesson progress
        const updatedProgressData = await progressApi.getCourseProgress(courseId!);
        setProgress(updatedProgressData);
        
        // Update local state
        setLesson({ ...lesson, completed: true, progress: 100 });
        
        console.log('Lesson marked as complete successfully');
        
        // Auto-navigate to next lesson after 2 seconds if available
        if (lesson.nextLessonId) {
          setTimeout(() => {
            navigate(`/courses/${courseId}/lessons/${lesson.nextLessonId}`);
          }, 2000);
        }
        
      } catch (error) {
        console.error('Failed to mark lesson as complete:', error);
        // You could show an error message to the user here
      }
    }
  };

  const handleBookmark = async () => {
    if (!courseId) return;
    
    try {
      if (isBookmarked) {
        // Remove bookmark
        await BookmarkApi.removeBookmark(courseId);
        setIsBookmarked(false);
      } else {
        // Add bookmark
        await BookmarkApi.addBookmark(courseId);
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error('Failed to update bookmark:', error);
      // Optionally show error notification to user
    }
  };

  const handleToggleAutoPlay = () => {
    const newValue = !autoPlayNext;
    setAutoPlayNext(newValue);
    localStorage.setItem('autoPlayNext', JSON.stringify(newValue));
  };

  const handleShare = () => {
    const lessonUrl = window.location.href;
    
    // Try to use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: lesson?.title || 'Check out this lesson',
        text: lesson?.description || 'I found this interesting lesson',
        url: lessonUrl,
      }).catch((error) => {
        console.log('Error sharing:', error);
      });
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(lessonUrl).then(() => {
        alert('Link copied to clipboard!');
      }).catch((error) => {
        console.error('Failed to copy link:', error);
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <LinearProgress />
          <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
            Loading lesson...
          </Typography>
        </Container>
      </Box>
    );
  }

  if (!lesson || error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <Typography variant="h6" color="error" sx={{ textAlign: 'center' }}>
            {error || 'Lesson not found'}
          </Typography>
          <Button 
            variant="contained" 
            sx={{ mt: 2, display: 'block', mx: 'auto' }}
            onClick={() => navigate(`/courses/${courseId}`)}
            data-testid="lesson-detail-back-to-course-button"
          >
            Back to Course
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <Container maxWidth="xl" sx={{ mt: 2, mb: 4, flex: 1 }}>
        {/* Breadcrumb Navigation */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2,
          py: 1,
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={() => navigate(`/courses/${courseId}`)}
              sx={{ 
                mr: 1,
                '&:hover': { bgcolor: 'action.hover' }
              }}
              data-testid="lesson-detail-back-button"
            >
              <ArrowBack />
            </IconButton>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <span style={{ fontWeight: 500 }}>{lesson.courseTitle}</span>
              <span>/</span>
              <span>{lesson.title}</span>
            </Typography>
          </Box>
          {/* Table of Contents Button - Always visible */}
          {allLessons.length > 0 && (
            <IconButton 
              onClick={() => setShowTableOfContents(!showTableOfContents)} 
              size="large"
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' }
              }}
              data-testid="lesson-detail-toc-toggle-button"
            >
              <MenuIcon />
            </IconButton>
          )}
        </Box>

        {/* Progress Summary Card */}
        {!isInstructorPreview && allLessons.length > 0 && progress && (
          <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      width: 60, 
                      height: 60, 
                      borderRadius: '50%', 
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.2rem'
                    }}>
                      {allLessons.length > 0 ? Math.round((progress.lessonProgress?.filter((lp: any) => lp.CompletedAt).length || 0) / allLessons.length * 100) : 0}%
                    </Box>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {progress.lessonProgress?.filter((lp: any) => lp.CompletedAt).length || 0} of {allLessons.length} lessons completed
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={allLessons.length > 0 ? (progress.lessonProgress?.filter((lp: any) => lp.CompletedAt).length || 0) / allLessons.length * 100 : 0} 
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 2, flexWrap: 'wrap' }}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={autoPlayNext} 
                          onChange={handleToggleAutoPlay}
                          color="primary"
                        />
                      }
                      label="Auto-play next lesson"
                    />
                  </Box>
                </Grid>
              </Grid>
              {courseInfo?.certificate && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmojiEvents sx={{ color: 'success.dark' }} />
                  <Typography variant="body2" color="success.dark">
                    Complete all lessons to earn your certificate!
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3 
        }}>
          {/* Main Content Area */}
          <Box sx={{ 
            flex: 1,
            minWidth: 0
          }}>
            {/* Lesson Content Items - Sequential Display */}
            {lesson.content && lesson.content.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mb: 3 }}>
                {lesson.content.filter(item => item.id).map((contentItem, index) => (
                  <ContentItem
                    key={contentItem.id}
                    content={contentItem}
                    index={index}
                    total={lesson.content.filter(item => item.id).length}
                    lessonId={lesson.id}
                    courseId={courseId!}
                    isInstructorPreview={isInstructorPreview}
                    onComplete={() => handleContentComplete(contentItem.id)}
                    isCompleted={contentProgress[contentItem.id]?.isCompleted || false}
                    progressData={contentProgress[contentItem.id]?.progressData}
                  />
                ))}
              </Box>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No content available for this lesson yet.
                </Typography>
              </Paper>
            )}

            {/* Next Lesson Preview */}
            {lesson.completed && lesson.nextLessonId && allLessons.length > 0 && (
              <Paper 
                elevation={0}
                sx={{ 
                  mb: 3,
                  p: 3,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText'
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle /> Lesson Complete!
                </Typography>
                <Typography variant="body2" paragraph>
                  Great job! Ready for the next lesson?
                </Typography>
                {(() => {
                  const nextLesson = allLessons.find((l: Lesson) => l.id === lesson.nextLessonId);
                  return nextLesson ? (
                    <Box sx={{ 
                      bgcolor: 'background.paper', 
                      p: 2, 
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      mb: 2
                    }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Up Next:
                      </Typography>
                      <Typography variant="h6" color="text.primary">
                        {nextLesson.title}
                      </Typography>
                      {nextLesson.duration && (
                        <Typography variant="body2" color="text.secondary">
                          Duration: {nextLesson.duration} minutes
                        </Typography>
                      )}
                    </Box>
                  ) : null;
                })()}
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.nextLessonId}`)}
                  startIcon={<PlayCircleOutline />}
                  sx={{ mt: 1 }}
                  data-testid="lesson-detail-continue-next-button"
                >
                  Continue to Next Lesson
                </Button>
              </Paper>
            )}

            {/* Lesson Header & Description */}
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                mb: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.75rem', md: '2rem' } }}>
                      {lesson.title}
                    </Typography>
                    {isInstructorPreview && (
                      <Chip 
                        label="Preview Mode" 
                        color="warning" 
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                    {!isInstructorPreview && lesson.completed && (
                      <Chip
                        icon={<CheckCircle />}
                        label="Completed"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>
                  
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                    {lesson.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <strong>Instructor:</strong> {lesson.instructorName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">•</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <strong>Duration:</strong> {lesson.duration}
                    </Typography>
                    {lesson.content && lesson.content.length > 0 && (
                      <>
                        <Typography variant="body2" color="text.secondary">•</Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Content:</strong> {lesson.content.length} item{lesson.content.length !== 1 ? 's' : ''}
                          {!isInstructorPreview && (
                            <>
                              {' '}({Object.values(contentProgress).filter(p => p.isCompleted).length}/{lesson.content.length} completed)
                            </>
                          )}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                  <IconButton 
                    onClick={handleBookmark}
                    data-testid="lesson-bookmark-button"
                    sx={{ 
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                  >
                    {isBookmarked ? <Bookmark color="primary" /> : <BookmarkBorder />}
                  </IconButton>
                  <IconButton 
                    onClick={handleShare}
                    data-testid="lesson-share-button"
                    sx={{ 
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                  >
                    <Share />
                  </IconButton>
                </Box>
              </Box>

              {/* Progress Bar - Hidden for instructor preview */}
              {!isInstructorPreview && (
                <Box sx={{ mt: 3, p: 2.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Lesson Progress</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {lesson.progress}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={lesson.progress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'background.paper',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                      },
                    }}
                  />
                </Box>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, gap: 2, flexWrap: 'wrap' }}>
                {!isInstructorPreview && !lesson.completed && (
                  <Button 
                    variant="contained" 
                    onClick={handleMarkComplete}
                    size="large"
                    startIcon={<CheckCircle />}
                    data-testid="lesson-mark-complete-button"
                    sx={{ 
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1rem'
                    }}
                  >
                    Mark as Complete
                  </Button>
                )}
                
                <Box sx={{ display: 'flex', gap: 1.5, ml: 'auto' }}>
                  {lesson.previousLessonId && (
                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.previousLessonId}`)}
                      sx={{ 
                        px: 3,
                        py: 1,
                        borderRadius: 2,
                        fontWeight: 600,
                        textTransform: 'none'
                      }}
                    >
                      ← Previous
                    </Button>
                  )}
                  {lesson.nextLessonId && (
                    <Button
                      variant="contained"
                      onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.nextLessonId}`)}
                      sx={{ 
                        px: 3,
                        py: 1,
                        borderRadius: 2,
                        fontWeight: 600,
                        textTransform: 'none'
                      }}
                    >
                      Next →
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>

            {/* Assessments Section */}
            {assessments.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Quiz sx={{ mr: 1, color: 'primary.main' }} />
                  Lesson Assessments ({assessments.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Complete these assessments to test your understanding of the lesson material.
                </Typography>
                {assessments.map((assessment) => (
                  <Paper 
                    key={assessment.id} 
                    sx={{ 
                      mb: 2, 
                      p: 3, 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 2,
                      '&:hover': {
                        boxShadow: 2,
                        borderColor: 'primary.main'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Quiz sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {assessment.title}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          <Chip 
                            label={assessment.type} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                          {assessment.isAdaptive && (
                            <Chip 
                              label="🧠 Adaptive" 
                              size="small" 
                              color="secondary" 
                              variant="outlined" 
                            />
                          )}
                          <Chip 
                            label={`Pass: ${assessment.passingScore}%`} 
                            size="small" 
                            variant="outlined" 
                          />
                          <Chip 
                            label={`${assessment.maxAttempts} attempts max`} 
                            size="small" 
                            variant="outlined" 
                          />
                          {assessment.timeLimit && (
                            <Chip 
                              label={`⏱️ ${assessment.timeLimit} min`} 
                              size="small" 
                              variant="outlined" 
                              color="warning"
                            />
                          )}
                        </Box>
                        
                        {/* Assessment Status */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Status: 
                          </Typography>
                          {assessment.userProgress ? (
                            <>
                              <Chip 
                                label={
                                  assessment.userProgress.status === 'passed' ? 'Passed ✅' :
                                  assessment.userProgress.status === 'completed' ? 'Completed' :
                                  assessment.userProgress.status === 'in_progress' ? 'In Progress' :
                                  'Not Started'
                                }
                                size="small" 
                                variant={assessment.userProgress.status === 'passed' ? 'filled' : 'outlined'}
                                color={
                                  assessment.userProgress.status === 'passed' ? 'success' :
                                  assessment.userProgress.status === 'completed' ? 'primary' :
                                  assessment.userProgress.status === 'in_progress' ? 'warning' :
                                  'default'
                                }
                              />
                              {assessment.userProgress.bestScore > 0 && (
                                <Chip 
                                  label={`Best: ${assessment.userProgress.bestScore}%`} 
                                  size="small" 
                                  variant="outlined"
                                  color={assessment.userProgress.passed ? 'success' : 'default'}
                                />
                              )}
                              {assessment.userProgress.attemptsUsed > 0 && (
                                <Chip 
                                  label={`${assessment.userProgress.attemptsUsed}/${assessment.maxAttempts} attempts`} 
                                  size="small" 
                                  variant="outlined"
                                  color={assessment.userProgress.attemptsLeft === 0 ? 'error' : 'info'}
                                />
                              )}
                            </>
                          ) : (
                            <Chip 
                              label="Not Started" 
                              size="small" 
                              variant="outlined"
                              color="default"
                            />
                          )}
                        </Box>
                      </Box>
                      
                      <Box sx={{ ml: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {assessment.userProgress?.canTakeAssessment !== false ? (
                          <Button 
                            variant="contained" 
                            size="large"
                            onClick={() => {
                              const returnUrl = `/courses/${courseId}/lessons/${lessonId}`;
                              navigate(`/assessments/${assessment.id}?returnUrl=${encodeURIComponent(returnUrl)}&courseId=${courseId}&lessonId=${lessonId}`);
                            }}
                            sx={{ 
                              minWidth: '140px',
                              background: assessment.userProgress?.status === 'passed' 
                                ? 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)'
                                : assessment.userProgress?.status === 'completed'
                                ? 'linear-gradient(45deg, #ff9800 30%, #ffb74d 90%)'
                                : 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                              '&:hover': {
                                background: assessment.userProgress?.status === 'passed'
                                  ? 'linear-gradient(45deg, #388e3c 30%, #4caf50 90%)'
                                  : assessment.userProgress?.status === 'completed'
                                  ? 'linear-gradient(45deg, #f57c00 30%, #ff9800 90%)'
                                  : 'linear-gradient(45deg, #5a67d8 30%, #6b46c1 90%)',
                              }
                            }}
                          >
                            {assessment.userProgress?.status === 'passed' ? 'Retake Assessment' :
                             assessment.userProgress?.status === 'completed' ? 'Retry Assessment' :
                             assessment.userProgress?.status === 'in_progress' ? 'Continue Assessment' :
                             'Start Assessment'}
                          </Button>
                        ) : (
                          <Button 
                            variant="outlined" 
                            size="large"
                            disabled
                            sx={{ 
                              minWidth: '140px'
                            }}
                          >
                            Max Attempts Reached
                          </Button>
                        )}
                        
                        <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {assessment.isAdaptive && (
                            <Typography variant="caption" color="text.secondary">
                              🧠 AI-powered difficulty
                            </Typography>
                          )}
                          {assessment.userProgress && assessment.userProgress.attemptsLeft < assessment.maxAttempts && (
                            <Typography variant="caption" color={assessment.userProgress.attemptsLeft > 0 ? 'warning.main' : 'error.main'}>
                              {assessment.userProgress.attemptsLeft > 0 
                                ? `${assessment.userProgress.attemptsLeft} attempts left`
                                : 'No attempts remaining'
                              }
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                ))}
                
                {/* Assessment completion hint */}
                <Paper sx={{ p: 2, mt: 2, bgcolor: 'info.light', border: '1px solid #1976d2' }}>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <Check sx={{ mr: 1, color: 'info.main' }} />
                    <strong>Tip:</strong> Complete assessments to test your understanding and reinforce your learning!
                  </Typography>
                </Paper>
              </Paper>
            )}

            {/* Comments Section */}
            <CommentsSection
              entityType="lesson"
              entityId={lessonId!}
              allowComments={true}
              moderatorUserId={courseInfo?.instructorId}
              title="Discussion"
            />
          </Box>

          {/* Sidebar */}
          <Box sx={{ 
            flex: 1,
            display: { xs: 'block', md: 'block' },
            minWidth: { xs: '100%', md: 300, lg: 350 },
            maxWidth: { xs: '100%', md: 400 }
          }}>
            {/* Video Transcript - Now handled within VideoContentItem */}

            {/* Resources */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Resources
              </Typography>
              {lesson.resources && lesson.resources.length > 0 ? (
                <List>
                  {lesson.resources.map((resource) => (
                    <ListItem key={resource.id} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Download />
                      </ListItemIcon>
                      <ListItemText
                        primary={resource.name}
                        secondary={`${resource.type} • ${resource.description}`}
                      />
                      <Button size="small" variant="outlined">
                        Download
                      </Button>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No downloadable resources available for this lesson.
                </Typography>
              )}
            </Paper>

            {/* Lesson Navigation */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Course Lessons
              </Typography>
              <List>
                {allLessons.map((courseLesson) => {
                  // Check if this lesson is completed (only show for students, not instructors)
                  const lessonProgressData = !isInstructorPreview && progress?.lessonProgress?.find(
                    (lp: any) => lp.LessonId === courseLesson.id
                  );
                  const isCompleted = !!lessonProgressData?.CompletedAt;
                  const isCurrent = courseLesson.id === lesson.id;
                  
                  return (
                    <ListItemButton 
                      key={courseLesson.id}
                      selected={isCurrent}
                      onClick={() => navigate(`/courses/${courseId}/lessons/${courseLesson.id}`)}
                      data-testid={`lesson-detail-progress-lesson-${courseLesson.id}-button`}
                    >
                      <ListItemIcon>
                        {isCompleted ? (
                          <CheckCircle color="success" />
                        ) : isCurrent ? (
                          <PlayCircleOutline color="primary" />
                        ) : (
                          <RadioButtonUnchecked />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={courseLesson.title} 
                        secondary={
                          isCurrent 
                            ? "Current" 
                            : isCompleted 
                            ? "Completed" 
                            : `${courseLesson.duration || 'N/A'} min`
                        }
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Table of Contents Drawer */}
      <Drawer
        anchor="right"
        open={showTableOfContents}
        onClose={() => setShowTableOfContents(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '85%', sm: 400 },
            maxWidth: '100%',
            p: 3
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Table of Contents</Typography>
          <IconButton onClick={() => setShowTableOfContents(false)} data-testid="lesson-detail-toc-close-button">
            <ArrowBack />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        {allLessons.length > 0 ? (
          <List>
            {allLessons.map((courseLesson: Lesson, index: number) => {
              const lessonProgressData = !isInstructorPreview && progress?.lessonProgress?.find(
                (lp: any) => lp.LessonId === courseLesson.id
              );
              const isCompleted = !!lessonProgressData?.CompletedAt;
              const isCurrent = courseLesson.id === lesson?.id;
              
              const getLessonIcon = () => {
                const hasVideo = courseLesson.content?.some((c: any) => c.type === 'video');
                const hasQuiz = courseLesson.content?.some((c: any) => c.type === 'quiz');
                const hasAssignment = courseLesson.content?.some((c: any) => c.type === 'assignment');
                
                if (hasVideo) return <PlayArrow />;
                if (hasQuiz) return <Quiz />;
                if (hasAssignment) return <Assignment />;
                return <Article />;
              };
              
              return (
                <ListItemButton 
                  key={courseLesson.id}
                  selected={isCurrent}
                  onClick={() => {
                    navigate(`/courses/${courseId}/lessons/${courseLesson.id}`);
                    setShowTableOfContents(false);
                  }}
                  data-testid={`lesson-detail-toc-lesson-${courseLesson.id}-button`}
                  sx={{ 
                    borderRadius: 1, 
                    mb: 1,
                    bgcolor: isCurrent ? 'action.selected' : 'transparent'
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {isCompleted ? (
                      <CheckCircle color="success" />
                    ) : (
                      getLessonIcon()
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="body2" fontWeight={isCurrent ? 'bold' : 'normal'} component="span">
                          {index + 1}. {courseLesson.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {isCurrent && (
                            <Chip label="Current" size="small" color="primary" sx={{ height: 20 }} />
                          )}
                          {isCompleted && !isCurrent && (
                            <Chip label="Completed" size="small" color="success" sx={{ height: 20 }} />
                          )}
                        </Box>
                      </Box>
                    }
                    secondary={
                      courseLesson.duration && (
                        <Typography variant="caption" component="span">
                          {courseLesson.duration} min
                        </Typography>
                      )
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No lessons available
          </Typography>
        )}
      </Drawer>
    </Box>
  );
};