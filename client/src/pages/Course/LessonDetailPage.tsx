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

interface LessonContent {
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

interface LessonData {
  id: string;
  title: string;
  description: string;
  duration: string;
  content: LessonContent[];
  completed: boolean;
  progress: number;
  courseId: string;
  courseTitle: string;
  instructorName: string;
  nextLessonId?: string;
  previousLessonId?: string;
  comments: Comment[];
  resources: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    description: string;
  }>;
}

export const LessonDetailPage: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock lesson data - in real app, this would come from API
  useEffect(() => {
    const fetchLesson = async () => {
      // Simulate API call
      setTimeout(() => {
        setLesson({
          id: lessonId || '1',
          title: 'Introduction to React Hooks',
          description: 'Learn the fundamentals of React Hooks and how they revolutionize state management in functional components.',
          duration: '15:30',
          courseId: courseId || '1',
          courseTitle: 'Advanced React Development',
          instructorName: 'Sarah Johnson',
          completed: false,
          progress: 35,
          nextLessonId: '2',
          previousLessonId: undefined,
          content: [
            {
              id: '1',
              type: 'video',
              title: 'What are React Hooks?',
              content: 'Introduction video explaining the concept of hooks',
              duration: '5:20',
              videoUrl: '/uploads/videos/89cd9e8d-a553-448f-8904-cb095b298ac1_Recording_2025-09-29_205021.mp4',
            },
            {
              id: '2',
              type: 'text',
              title: 'useState Hook',
              content: `
                # The useState Hook

                The \`useState\` hook is one of the most fundamental hooks in React. It allows you to add state to functional components.

                ## Basic Syntax
                \`\`\`jsx
                const [state, setState] = useState(initialValue);
                \`\`\`

                ## Example
                \`\`\`jsx
                import React, { useState } from 'react';

                function Counter() {
                  const [count, setCount] = useState(0);

                  return (
                    <div>
                      <p>You clicked {count} times</p>
                      <button onClick={() => setCount(count + 1)}>
                        Click me
                      </button>
                    </div>
                  );
                }
                \`\`\`

                The hook returns an array with two elements:
                1. The current state value
                2. A function to update the state
              `,
            },
            {
              id: '3',
              type: 'quiz',
              title: 'Quick Quiz: useState',
              content: 'Test your understanding of the useState hook',
            },
          ],
          comments: [
            {
              id: '1',
              user: { name: 'John Doe', avatar: '' },
              content: 'Great explanation! The examples really helped me understand the concept.',
              timestamp: '2 hours ago',
              likes: 5,
              replies: [
                {
                  id: '1-1',
                  user: { name: 'Sarah Johnson', avatar: '' },
                  content: 'Glad it helped! Feel free to ask if you have more questions.',
                  timestamp: '1 hour ago',
                  likes: 2,
                },
              ],
            },
            {
              id: '2',
              user: { name: 'Jane Smith', avatar: '' },
              content: 'Could you explain the difference between useState and useReducer?',
              timestamp: '1 hour ago',
              likes: 3,
            },
          ],
          resources: [
            {
              id: '1',
              name: 'React Hooks Cheat Sheet',
              type: 'PDF',
              url: '/resources/hooks-cheat-sheet.pdf',
              description: 'Quick reference for all React hooks',
            },
            {
              id: '2',
              name: 'Code Examples',
              type: 'ZIP',
              url: '/resources/lesson-1-examples.zip',
              description: 'All code examples from this lesson',
            },
          ],
        });
        setLoading(false);
      }, 1000);
    };

    fetchLesson();
  }, [courseId, lessonId]);

  const handleMarkComplete = () => {
    if (lesson) {
      setLesson({ ...lesson, completed: true, progress: 100 });
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
        comments: [comment, ...lesson.comments],
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

  if (!lesson) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <Typography variant="h6" color="error" sx={{ textAlign: 'center' }}>
            Lesson not found
          </Typography>
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
            {lesson.content.map((content) => (
              <Paper key={content.id} sx={{ mb: 3 }}>
                {content.type === 'video' && (
                  <VideoProgressTracker
                    lessonId={lesson.id}
                    onProgress={(progress) => {
                      console.log('Video progress:', progress);
                    }}
                    onComplete={() => {
                      console.log('Lesson completed!');
                      // Optionally navigate to next lesson or show completion dialog
                    }}
                  >
                    {(trackingProps) => (
                      <VideoPlayer 
                        src={content.videoUrl || '/api/videos/placeholder.mp4'}
                        title={content.title || lesson.title}
                        onProgress={trackingProps.onVideoProgress}
                        onComplete={trackingProps.onVideoComplete}
                        onTimeUpdate={trackingProps.onTimeUpdate}
                      />
                    )}
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
                Discussion ({lesson.comments.length})
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
                {lesson.comments.map((comment) => (
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
            </Paper>

            {/* Lesson Navigation */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Course Lessons
              </Typography>
              <List>
                <ListItemButton selected>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Introduction to React Hooks" 
                    secondary="15:30 • Current"
                  />
                </ListItemButton>
                <ListItemButton>
                  <ListItemIcon>
                    <RadioButtonUnchecked />
                  </ListItemIcon>
                  <ListItemText 
                    primary="useEffect Hook" 
                    secondary="12:45"
                  />
                </ListItemButton>
                <ListItemButton>
                  <ListItemIcon>
                    <RadioButtonUnchecked />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Custom Hooks" 
                    secondary="18:20"
                  />
                </ListItemButton>
              </List>
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};