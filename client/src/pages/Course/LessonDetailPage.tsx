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
  Download,
  Quiz,
  BookmarkBorder,
  Bookmark,
  Share,
  ThumbUp,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/Navigation/Header';
import { VideoPlayer } from '../../components/Video/VideoPlayer';
import { VideoProgressTracker } from '../../components/Video/VideoProgressTracker';
import { lessonApi, Lesson } from '../../services/lessonApi';
import { progressApi } from '../../services/progressApi';

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
  const [progress, setProgress] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch lesson details, all lessons for navigation, and progress
        const [lessonData, lessonsData, progressData] = await Promise.all([
          lessonApi.getLesson(lessonId),
          lessonApi.getLessons(courseId),
          progressApi.getCourseProgress(courseId).catch(() => null) // Progress might not exist yet
        ]);

        // Find adjacent lessons for navigation
        const { previousLessonId, nextLessonId } = findAdjacentLessons(lessonData, lessonsData);

        // Find progress for this specific lesson
        const lessonProgress = progressData?.lessonProgress?.find(
          (lp: any) => lp.LessonId === lessonId
        );

        // Extract saved position from notes
        const savedPosition = extractSavedPosition(lessonProgress?.Notes);

        // Create extended lesson object
        const extendedLesson: ExtendedLesson = {
          ...lessonData,
          courseTitle: lessonData.courseTitle || 'Course Title',
          instructorName: lessonData.instructorName || 'Instructor',
          completed: !!lessonProgress?.CompletedAt,
          progress: lessonProgress?.ProgressPercentage || 0,
          nextLessonId,
          previousLessonId,
          comments: [], // TODO: Implement comments API
          extendedContent: transformLessonContent(lessonData.content || []),
          resources: [], // TODO: Implement resources API
          savedPosition // Add saved position for video resumption
        };

        setLesson(extendedLesson);
        setAllLessons(lessonsData);
        setProgress(progressData);

        // Debug: Log progress data (can be removed in production)
        if (progressData) {
          console.log('Course progress data loaded:', progressData);
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
      try {
        // Mark lesson as complete via API
        await progressApi.markLessonComplete(lesson.id, {
          timeSpent: 0, // Time spent for manual completion
          notes: 'Manually marked as complete'
        });
        
        // Update local state
        setLesson({ ...lesson, completed: true, progress: 100 });
        
        console.log('Lesson marked as complete successfully');
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

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
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
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
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
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
        {/* Breadcrumb and Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate(`/courses/${courseId}`)}>
            <ArrowBack />
          </IconButton>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            {lesson.courseTitle} / {lesson.title}
          </Typography>
        </Box>

        {/* Lesson Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {lesson.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {lesson.description}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Instructor: {lesson.instructorName} • Duration: {lesson.duration}
                {progress && (
                  <> • Course Progress: {Math.round(progress.courseProgress?.OverallProgress || 0)}%</>
                )}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={handleBookmark}>
                {isBookmarked ? <Bookmark color="primary" /> : <BookmarkBorder />}
              </IconButton>
              <IconButton>
                <Share />
              </IconButton>
            </Box>
          </Box>

          {/* Progress */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Progress</Typography>
              <Typography variant="body2">{lesson.progress}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={lesson.progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                },
              }}
            />
          </Box>

          {/* Status and Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {lesson.completed ? (
                <Chip
                  icon={<CheckCircle />}
                  label="Completed"
                  color="success"
                  variant="filled"
                />
              ) : (
                <Chip
                  icon={<RadioButtonUnchecked />}
                  label="In Progress"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {lesson.previousLessonId && (
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.previousLessonId}`)}
                >
                  Previous
                </Button>
              )}
              {!lesson.completed && (
                <Button variant="contained" onClick={handleMarkComplete}>
                  Mark Complete
                </Button>
              )}
              {lesson.nextLessonId && (
                <Button
                  variant="contained"
                  onClick={() => navigate(`/courses/${courseId}/lessons/${lesson.nextLessonId}`)}
                >
                  Next Lesson
                </Button>
              )}
            </Box>
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Main Content */}
          <Box sx={{ flex: 2 }}>
            {/* Lesson Content */}
            {lesson.extendedContent?.map((content) => (
              <Paper key={content.id} sx={{ mb: 3 }}>
                {content.type === 'video' && (
                  <VideoProgressTracker
                    lessonId={lesson.id}
                    onProgress={(progress) => {
                      console.log('Video progress:', progress);
                    }}
                    onComplete={() => {
                      console.log('Lesson completed!');
                      // Update lesson state to show completion
                      setLesson(prev => prev ? { ...prev, completed: true, progress: 100 } : null);
                      
                      // Optionally navigate to next lesson after a delay
                      if (lesson.nextLessonId) {
                        setTimeout(() => {
                          const shouldAutoNavigate = confirm('Lesson completed! Would you like to go to the next lesson?');
                          if (shouldAutoNavigate) {
                            navigate(`/courses/${courseId}/lessons/${lesson.nextLessonId}`);
                          }
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
          <Box sx={{ flex: 1 }}>
            {/* Resources */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Resources
              </Typography>
              <List>
                {lesson.resources?.map((resource) => (
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
            </Paper>

            {/* Lesson Navigation */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Course Lessons
              </Typography>
              <List>
                {allLessons.map((courseLesson) => (
                  <ListItemButton 
                    key={courseLesson.id}
                    selected={courseLesson.id === lesson.id}
                    onClick={() => navigate(`/courses/${courseId}/lessons/${courseLesson.id}`)}
                  >
                    <ListItemIcon>
                      {courseLesson.id === lesson.id ? (
                        <CheckCircle color="success" />
                      ) : (
                        <RadioButtonUnchecked />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary={courseLesson.title} 
                      secondary={courseLesson.id === lesson.id ? "Current" : `${courseLesson.duration || 'N/A'}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};