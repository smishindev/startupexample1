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
  TextField,
  Avatar,
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
  ThumbUp,
  Check,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/Navigation/Header';
import { VideoPlayer } from '../../components/Video/VideoPlayer';
import { VideoTranscript, TranscriptSegment } from '../../components/Video/VideoTranscript';
import { VideoErrorBoundary } from '../../components/Video/VideoErrorBoundary';
import { VideoProgressTracker } from '../../components/Video/VideoProgressTracker';
import { lessonApi, Lesson } from '../../services/lessonApi';
import { progressApi } from '../../services/progressApi';
import { assessmentApi, AssessmentWithProgress } from '../../services/assessmentApi';
import { getVideoLessonByLessonId, parseVTTTranscript, VideoLesson } from '../../services/videoLessonApi';
import { getVideoProgress, markVideoComplete } from '../../services/videoProgressApi';
import { coursesApi } from '../../services/coursesApi';
import { BookmarkApi } from '../../services/bookmarkApi';

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

interface Comment {
  id: string;
  user: {
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  replies?: Comment[];
}

interface ExtendedLesson extends Lesson {
  courseTitle?: string;
  instructorName?: string;
  completed?: boolean;
  progress?: number;
  nextLessonId?: string;
  previousLessonId?: string;
  comments?: Comment[];
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
  const [videoLesson, setVideoLesson] = useState<VideoLesson | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoProgress, setVideoProgress] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstructorPreview, setIsInstructorPreview] = useState(false);

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
          comments: [], // TODO: Implement comments API
          extendedContent: transformLessonContent(lessonData.content || []),
          resources: [], // TODO: Implement resources API
          savedPosition // Add saved position for video resumption
        };

        setLesson(extendedLesson);
        setAllLessons(lessonsData);
        setAssessments(assessmentsData);
        setProgress(progressData);

        // Check if course is bookmarked
        try {
          const bookmarkStatus = await BookmarkApi.checkBookmarkStatus(courseId);
          setIsBookmarked(bookmarkStatus.isBookmarked);
        } catch (error) {
          console.error('Failed to check bookmark status:', error);
          // Don't fail the whole page if bookmark check fails
        }

        // Fetch video lesson data if this is a video lesson
        try {
          const videoLessonData = await getVideoLessonByLessonId(lessonId);
          if (videoLessonData) {
            setVideoLesson(videoLessonData);
            
            // Fetch video progress (skip for instructor preview)
            if (!isPreview) {
              const videoProgressData = await getVideoProgress(videoLessonData.id);
              setVideoProgress(videoProgressData);
            }
            
            // Load transcript if available
            if (videoLessonData.transcriptUrl) {
              const transcriptSegments = await parseVTTTranscript(videoLessonData.transcriptUrl);
              setTranscript(transcriptSegments);
            }
          } else {
            // Fallback: Check if lesson content has video data but no VideoLessons record exists
            // This can happen for lessons created before the VideoLessons auto-creation was added
            const videoContent = lessonData.content?.find((c: any) => c.type === 'video');
            if (videoContent && videoContent.data?.url) {
              console.log('[LESSON] Using video URL from lesson content (no VideoLessons record)');
              // Create a virtual video lesson object for display purposes
              const fallbackVideoLesson: VideoLesson = {
                id: '', // No ID since no record exists
                lessonId: lessonId,
                videoUrl: videoContent.data.url,
                duration: videoContent.data.duration || 0,
                transcriptUrl: videoContent.data.transcriptUrl,
                thumbnailUrl: videoContent.data.thumbnail,
                createdAt: lessonData.createdAt || new Date().toISOString(),
                updatedAt: lessonData.updatedAt || new Date().toISOString()
              };
              setVideoLesson(fallbackVideoLesson);
            }
          }
        } catch (error) {
          console.error('Failed to load video lesson data:', error);
          // Fallback: Check if lesson content has video data
          const videoContent = lessonData.content?.find((c: any) => c.type === 'video');
          if (videoContent && videoContent.data?.url) {
            console.log('[LESSON] Using video URL from lesson content (API error fallback)');
            const fallbackVideoLesson: VideoLesson = {
              id: '',
              lessonId: lessonId,
              videoUrl: videoContent.data.url,
              duration: videoContent.data.duration || 0,
              transcriptUrl: videoContent.data.transcriptUrl,
              thumbnailUrl: videoContent.data.thumbnail,
              createdAt: lessonData.createdAt || new Date().toISOString(),
              updatedAt: lessonData.updatedAt || new Date().toISOString()
            };
            setVideoLesson(fallbackVideoLesson);
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

  const handleAddComment = () => {
    if (newComment.trim() && lesson) {
      const comment: Comment = {
        id: Date.now().toString(),
        user: { name: 'Current User', avatar: '' },
        content: newComment,
        timestamp: 'Just now',
        likes: 0,
      };
      setLesson({
        ...lesson,
        comments: [comment, ...(lesson.comments || [])],
      });
      setNewComment('');
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
          py: 1
        }}>
          <IconButton 
            onClick={() => navigate(`/courses/${courseId}`)}
            sx={{ 
              mr: 1,
              '&:hover': { bgcolor: 'action.hover' }
            }}
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
            {/* Video Player - Full Width, Cinema Style */}
            {videoLesson && (
              <Paper 
                elevation={0}
                sx={{ 
                  mb: 3, 
                  overflow: 'hidden',
                  borderRadius: 2,
                  bgcolor: '#000',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <VideoErrorBoundary onRetry={() => window.location.reload()}>
                  <VideoPlayer
                    src={videoLesson.videoUrl}
                    title={lesson.title}
                    videoLessonId={videoLesson.id}
                    poster={videoLesson.thumbnailUrl}
                    initialTime={videoProgress?.currentPosition || 0}
                    enableProgressTracking={true}
                    onProgress={(currentTime, duration, percentWatched) => {
                      console.log('Video progress:', { currentTime, duration, percentWatched });
                    }}
                    onComplete={async () => {
                      console.log('Video completed!');
                      
                      if (isInstructorPreview) {
                        console.log('Instructor preview mode - skipping completion');
                        return;
                      }
                      
                      try {
                        await markVideoComplete(videoLesson.id);
                        setLesson(prev => prev ? { ...prev, completed: true, progress: 100 } : null);
                      
                        if (lesson.nextLessonId) {
                          setTimeout(() => {
                            navigate(`/courses/${courseId}/lessons/${lesson.nextLessonId}`);
                          }, 2000);
                        }
                      } catch (error) {
                        console.error('Failed to mark video complete:', error);
                      }
                    }}
                    onTimeUpdate={(currentTime) => {
                      setCurrentVideoTime(currentTime);
                    }}
                  />
                </VideoErrorBoundary>
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
                    {videoLesson && (
                      <>
                        <Typography variant="body2" color="text.secondary">•</Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Video:</strong> {Math.floor(videoLesson.duration / 60)}:{(videoLesson.duration % 60).toString().padStart(2, '0')}
                          {videoProgress && !isInstructorPreview && (
                            <> ({Math.round(videoProgress.watchedPercentage)}% watched)</>
                          )}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                  <IconButton 
                    onClick={handleBookmark}
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

            {/* Fallback to legacy video content blocks */}
            {!videoLesson && lesson.extendedContent?.map((content) => (
              <Paper key={content.id} sx={{ mb: 3 }}>
                {content.type === 'video' && (
                  <VideoProgressTracker
                    lessonId={lesson.id}
                    onProgress={(progress) => {
                      console.log('Video progress:', progress);
                    }}
                    onComplete={() => {
                      console.log('Lesson completed!');
                      
                      // Skip completion logic for instructors in preview mode
                      if (isInstructorPreview) {
                        console.log('Instructor preview mode - skipping completion');
                        return;
                      }
                      
                      // Update lesson state to show completion
                      setLesson(prev => prev ? { ...prev, completed: true, progress: 100 } : null);
                      
                      // Auto-navigate to next lesson after 2 seconds if available
                      if (lesson.nextLessonId) {
                        setTimeout(() => {
                          navigate(`/courses/${courseId}/lessons/${lesson.nextLessonId}`);
                        }, 2000);
                      }
                    }}
                  >
                    {(trackingProps) => {
                      // Use saved position if available, otherwise start from beginning
                      const initialTime = lesson.savedPosition || 0;
                      
                      return (
                        <VideoPlayer 
                          src={content.videoUrl || '/api/videos/placeholder.mp4'}
                          title={content.title || lesson.title}
                          onProgress={trackingProps.onVideoProgress}
                          onComplete={trackingProps.onVideoComplete}
                          onTimeUpdate={trackingProps.onTimeUpdate}
                          initialTime={initialTime}
                        />
                      );
                    }}
                  </VideoProgressTracker>
                )}

                {content.type === 'text' && (
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {content.title}
                    </Typography>
                    <Box
                      sx={{
                        '& h1': { fontSize: '1.5rem', fontWeight: 'bold', mb: 2 },
                        '& h2': { fontSize: '1.3rem', fontWeight: 'bold', mb: 1.5 },
                        '& h3': { fontSize: '1.1rem', fontWeight: 'bold', mb: 1 },
                        '& p': { mb: 2 },
                        '& code': {
                          backgroundColor: '#f5f5f5',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                        },
                        '& pre': {
                          backgroundColor: '#f5f5f5',
                          padding: '16px',
                          borderRadius: '8px',
                          overflow: 'auto',
                          mb: 2,
                        },
                      }}
                      dangerouslySetInnerHTML={{ __html: content.content.replace(/\n/g, '<br/>') }}
                    />
                  </CardContent>
                )}

                {content.type === 'quiz' && (
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Quiz sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">{content.title}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {content.content}
                    </Typography>
                    <Button variant="contained" startIcon={<Quiz />}>
                      Take Quiz
                    </Button>
                  </CardContent>
                )}
              </Paper>
            ))}

            {/* Text Content for lessons without legacy video blocks */}
            {!videoLesson && !lesson.extendedContent?.some(c => c.type === 'video') && lesson.content && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Lesson Content
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {lesson.description}
                </Typography>
              </Paper>
            )}

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
                    <strong>Tip:</strong> Complete assessments to unlock the next lesson and track your progress!
                  </Typography>
                </Paper>
              </Paper>
            )}

            {/* Comments Section */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Discussion ({lesson.comments?.length || 0})
              </Typography>

              {/* Add Comment */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Ask a question or share your thoughts..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <Button variant="contained" onClick={handleAddComment} disabled={!newComment.trim()}>
                  Post Comment
                </Button>
              </Box>

              {/* Comments List */}
              <List>
                {lesson.comments?.map((comment) => (
                  <Box key={comment.id}>
                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                      <Avatar sx={{ mr: 2 }}>{comment.user.name.charAt(0)}</Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {comment.user.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {comment.timestamp}
                          </Typography>
                        </Box>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {comment.content}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton size="small">
                            <ThumbUp fontSize="small" />
                          </IconButton>
                          <Typography variant="body2">{comment.likes}</Typography>
                          <Button size="small">Reply</Button>
                        </Box>

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <Box sx={{ ml: 4, mt: 2 }}>
                            {comment.replies.map((reply) => (
                              <Box key={reply.id} sx={{ display: 'flex', mb: 2 }}>
                                <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                                  {reply.user.name.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                                      {reply.user.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1, fontSize: '0.75rem' }}>
                                      {reply.timestamp}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2">{reply.content}</Typography>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </ListItem>
                  </Box>
                ))}
              </List>
            </Paper>
          </Box>

          {/* Sidebar */}
          <Box sx={{ 
            flex: 1,
            display: { xs: 'block', md: 'block' },
            minWidth: { xs: '100%', md: 300, lg: 350 },
            maxWidth: { xs: '100%', md: 400 }
          }}>
            {/* Video Transcript */}
            {videoLesson && transcript.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <VideoTranscript
                  segments={transcript}
                  currentTime={currentVideoTime}
                  onSeek={(time) => {
                    // Find the video element and seek to the specified time
                    const video = document.querySelector('video') as HTMLVideoElement;
                    if (video) {
                      video.currentTime = time;
                      // Update the current time state
                      setCurrentVideoTime(time);
                    }
                  }}
                  height={500}
                />
              </Box>
            )}

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
    </Box>
  );
};