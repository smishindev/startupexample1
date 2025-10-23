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
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CardContent,
  Rating,
  IconButton,
  Tooltip,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  PlayCircleOutline,
  ExpandMore,
  CheckCircle,
  Schedule,
  People,
  Star,
  BookmarkBorder,
  Bookmark,
  Share,
  Download,
  Quiz,
  Assignment,
  VideoLibrary,
  MenuBook,
  Lock,
  PlayArrow,
  VolumeUp,
  Fullscreen,
  Settings,
} from '@mui/icons-material';
import { Header } from '../../components/Navigation/Header';
import { enrollmentApi } from '../../services/enrollmentApi';
import { formatCurrency, roundToDecimals } from '../../utils/formatUtils';
import { coursesApi } from '../../services/coursesApi';
import { useAuthStore } from '../../stores/authStore';

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
  level: 'Beginner' | 'Intermediate' | 'Advanced';
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
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<any>(null);

  // Fetch real course data from API
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
        
        setEnrollmentStatus(enrollmentStatusData);
        
        // Use real course data from API
        setTimeout(() => {
          const realCourse: CourseDetails = {
            id: courseData.Id,
            title: courseData.Title,
            description: courseData.Description,
            instructor: {
              id: courseData.Instructor.Id,
              name: `${courseData.Instructor.FirstName} ${courseData.Instructor.LastName}`,
              avatar: courseData.Instructor.Avatar || '',
              bio: 'Real instructor bio will be loaded here.',
              rating: 4.9,
              studentCount: 15000,
            },
            thumbnail: courseData.Thumbnail || '',
            duration: `${Math.floor(courseData.Duration / 60)}h ${courseData.Duration % 60}m`,
            level: courseData.Level as 'Beginner' | 'Intermediate' | 'Advanced',
            rating: courseData.Rating || 0.0,
            reviewCount: Math.floor(courseData.EnrollmentCount * 0.3) || 0,
            enrolledStudents: courseData.EnrollmentCount || 0,
            price: courseData.Price || 0,
            originalPrice: courseData.Price ? roundToDecimals(courseData.Price * 1.3) : 0,
            category: courseData.Category || 'General',
            tags: courseData.Tags || [],
            lastUpdated: courseData.UpdatedAt ? courseData.UpdatedAt.split('T')[0] : new Date().toISOString().split('T')[0],
            language: 'English', // TODO: Get from course data when available
            certificate: true,
            isEnrolled: enrollmentStatusData?.isEnrolled && !enrollmentStatusData?.isInstructor || false,
            isBookmarked: false,
            progress: realProgress, // Real progress from API
          currentLesson: 'lesson-1-2',
          requirements: [
            'Basic knowledge of JavaScript ES6+',
            'Understanding of HTML and CSS',
            'Previous experience with React basics',
            'Node.js installed on your computer',
          ],
          whatYouWillLearn: [
            'Advanced React hooks and custom hook patterns',
            'State management with Context API and Redux Toolkit',
            'Performance optimization techniques',
            'Testing React components with Jest and React Testing Library',
            'Building and deploying production-ready applications',
            'Modern development workflow and best practices',
          ],
          sections: courseData.Lessons && courseData.Lessons.length > 0 ? [
            {
              id: 'section-1',
              title: courseData.Title + ' Lessons',
              isCompleted: false,
              lessons: courseData.Lessons.map((lesson: any, index: number) => ({
                id: lesson.Id,
                title: lesson.Title,
                type: 'video' as const,
                duration: lesson.Duration ? `${lesson.Duration} min` : '5:30',
                isCompleted: false,
                isLocked: false,
                description: lesson.Description,
                videoUrl: `https://example.com/video${index + 1}`,
              })),
            },
          ] : [
            {
              id: 'section-1',
              title: 'Getting Started with Advanced React',
              isCompleted: true,
              lessons: [
                {
                  id: 'lesson-1-1',
                  title: 'Course Introduction',
                  type: 'video',
                  duration: '5:30',
                  isCompleted: true,
                  isLocked: false,
                  description: 'Overview of what we\'ll cover in this course',
                  videoUrl: 'https://example.com/video1',
                },
                {
                  id: 'lesson-1-2',
                  title: 'Setting Up Development Environment',
                  type: 'video',
                  duration: '12:45',
                  isCompleted: false,
                  isLocked: false,
                  description: 'Setting up tools and development environment',
                  videoUrl: 'https://example.com/video2',
                },
                {
                  id: 'lesson-1-3',
                  title: 'Knowledge Check',
                  type: 'quiz',
                  duration: '10 min',
                  isCompleted: false,
                  isLocked: false,
                  description: 'Test your understanding of the setup process',
                },
              ],
            },
            {
              id: 'section-2',
              title: 'Advanced Hooks Patterns',
              isCompleted: false,
              lessons: [
                {
                  id: 'lesson-2-1',
                  title: 'Custom Hooks Deep Dive',
                  type: 'video',
                  duration: '18:20',
                  isCompleted: false,
                  isLocked: false,
                  description: 'Creating powerful custom hooks',
                  videoUrl: 'https://example.com/video3',
                },
                {
                  id: 'lesson-2-2',
                  title: 'useReducer vs useState',
                  type: 'video',
                  duration: '15:10',
                  isCompleted: false,
                  isLocked: true,
                  description: 'When and how to use useReducer',
                },
                {
                  id: 'lesson-2-3',
                  title: 'Hooks Assignment',
                  type: 'assignment',
                  duration: '2 hours',
                  isCompleted: false,
                  isLocked: true,
                  description: 'Build a custom hook for data fetching',
                },
              ],
            },
          ],
        };
        setCourse(realCourse);
        setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching course:', error);
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, user]);

  const handleEnroll = async () => {
    if (!courseId || !course) return;
    
    try {
      if (course.isEnrolled) {
        // Unenroll
        await enrollmentApi.unenrollFromCourse(courseId);
        setCourse({ ...course, isEnrolled: false });
        console.log('Successfully unenrolled from course:', courseId);
      } else {
        // Enroll
        await enrollmentApi.enrollInCourse(courseId);
        setCourse({ ...course, isEnrolled: true, progress: 0 });
        console.log('Successfully enrolled in course:', courseId);
      }
    } catch (error) {
      console.error('Failed to update enrollment:', error);
      // You could add a snackbar/toast notification here
    }
  };

  const handleBookmark = () => {
    if (course) {
      setCourse({ ...course, isBookmarked: !course.isBookmarked });
    }
  };

  const handleShare = () => {
    console.log('Sharing course:', courseId);
    // Handle sharing logic
  };

  const handleLessonSelect = (lesson: Lesson) => {
    if (lesson.isLocked) return;
    
    setSelectedLesson(lesson);
    if (lesson.type === 'video') {
      setShowVideoPlayer(true);
    }
    
    // Update current lesson in course progress
    if (course) {
      setCourse({ ...course, currentLesson: lesson.id });
    }
  };

  const handleLessonComplete = (lessonId: string) => {
    if (!course) return;

    const updatedSections = course.sections.map(section => ({
      ...section,
      lessons: section.lessons.map(lesson =>
        lesson.id === lessonId ? { ...lesson, isCompleted: true } : lesson
      ),
    }));

    // Calculate progress
    const totalLessons = updatedSections.reduce((acc, section) => acc + section.lessons.length, 0);
    const completedLessons = updatedSections.reduce(
      (acc, section) => acc + section.lessons.filter(lesson => lesson.isCompleted).length,
      0
    );
    const progress = Math.round((completedLessons / totalLessons) * 100);

    setCourse({
      ...course,
      sections: updatedSections,
      progress,
    });
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

  const VideoPlayer: React.FC<{ lesson: Lesson }> = ({ lesson }) => (
    <Paper sx={{ mb: 3, overflow: 'hidden' }}>
      <Box
        sx={{
          height: 400,
          background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <PlayCircleOutline sx={{ fontSize: 80, color: 'white', opacity: 0.8 }} />
        
        {/* Video Controls */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            p: 2,
          }}
        >
          <LinearProgress 
            variant="determinate" 
            value={30} 
            sx={{ mb: 1, height: 4 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" sx={{ color: 'white' }}>
              <PlayArrow />
            </IconButton>
            <Typography variant="body2" sx={{ color: 'white', mr: 2 }}>
              2:30 / {lesson.duration}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton size="small" sx={{ color: 'white' }}>
              <VolumeUp />
            </IconButton>
            <IconButton size="small" sx={{ color: 'white' }}>
              <Settings />
            </IconButton>
            <IconButton size="small" sx={{ color: 'white' }}>
              <Fullscreen />
            </IconButton>
          </Box>
        </Box>
      </Box>
      
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
              {lesson.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {lesson.description}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => handleLessonComplete(lesson.id)}
          >
            Mark Complete
          </Button>
        </Box>
        
        {lesson.resources && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Lesson Resources:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {lesson.resources.map((resource) => (
                <Chip
                  key={resource.id}
                  label={resource.title}
                  icon={<Download />}
                  variant="outlined"
                  size="small"
                  clickable
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Paper>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <Typography>Loading course...</Typography>
        </Container>
      </Box>
    );
  }

  if (!course) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <Typography>Course not found</Typography>
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
          <Link underline="hover" color="inherit" onClick={() => navigate('/courses')}>
            Courses
          </Link>
          <Link underline="hover" color="inherit" onClick={() => navigate('/courses')}>
            {course.category}
          </Link>
          <Typography color="text.primary">{course.title}</Typography>
        </Breadcrumbs>

        <Grid container spacing={4}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            {/* Video Player or Course Overview */}
            {showVideoPlayer && selectedLesson ? (
              <VideoPlayer lesson={selectedLesson} />
            ) : (
              <Paper sx={{ mb: 3, overflow: 'hidden' }}>
                <Box
                  sx={{
                    height: 300,
                    background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <PlayCircleOutline sx={{ fontSize: 80, color: 'white', opacity: 0.8 }} />
                  {!course.isEnrolled && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2">Preview Mode</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            )}

            {/* Course Content/Sections */}
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
                Course Content
              </Typography>
              
              {course.sections.map((section) => (
                <Accordion key={section.id} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mr: 2 }}>
                        {section.title}
                      </Typography>
                      <Chip
                        label={`${section.lessons.length} lessons`}
                        size="small"
                        variant="outlined"
                      />
                      {section.isCompleted && (
                        <CheckCircle color="success" sx={{ ml: 1 }} />
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <List>
                      {section.lessons.map((lesson, index) => (
                        <ListItemButton
                          key={lesson.id}
                          onClick={() => handleLessonSelect(lesson)}
                          disabled={lesson.isLocked && !course.isEnrolled}
                          selected={selectedLesson?.id === lesson.id}
                        >
                          <ListItemIcon>
                            {getLessonIcon(lesson)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body1">
                                  {index + 1}. {lesson.title}
                                </Typography>
                                {lesson.isLocked && !course.isEnrolled && (
                                  <Lock color="disabled" sx={{ fontSize: 16 }} />
                                )}
                              </Box>
                            }
                            secondary={lesson.description}
                          />
                          <Box sx={{ textAlign: 'right', ml: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              {lesson.duration}
                            </Typography>
                          </Box>
                        </ListItemButton>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Course Info Card */}
            <Paper sx={{ p: 3, mb: 3, position: 'sticky', top: 20 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {course.title}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Rating value={course.rating} precision={0.1} size="small" readOnly />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    {course.rating} ({course.reviewCount} reviews)
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  <Chip label={course.level} size="small" color="primary" />
                  <Chip label={course.category} size="small" variant="outlined" />
                  <Chip label={course.language} size="small" variant="outlined" />
                </Box>
              </Box>

              {/* Progress (if enrolled) */}
              {course.isEnrolled && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Your Progress</Typography>
                    <Typography variant="body2">{course.progress}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={course.progress} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              )}

              {/* Price and Actions */}
              {!course.isEnrolled ? (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mr: 2 }}>
                      {formatCurrency(course.price)}
                    </Typography>
                    {course.originalPrice && (
                      <Typography
                        variant="body1"
                        sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
                      >
                        {formatCurrency(course.originalPrice)}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleEnroll}
                    sx={{ mb: 2 }}
                  >
                    Enroll Now
                  </Button>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={() => {
                    if (course?.sections[0]?.lessons[0]) {
                      navigate(`/courses/${course.id}/lessons/${course.sections[0].lessons[0].id}`);
                    }
                  }}
                  sx={{ mb: 3 }}
                >
                  Continue Learning
                </Button>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Tooltip title={course.isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}>
                  <IconButton onClick={handleBookmark}>
                    {course.isBookmarked ? <Bookmark color="warning" /> : <BookmarkBorder />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Share Course">
                  <IconButton onClick={handleShare}>
                    <Share />
                  </IconButton>
                </Tooltip>
                {course.isEnrolled && !enrollmentStatus?.isInstructor && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleEnroll}
                    sx={{ ml: 'auto' }}
                  >
                    Unenroll
                  </Button>
                )}
                {enrollmentStatus?.isInstructor && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="primary"
                    onClick={() => navigate(`/instructor/courses/${courseId}/edit`)}
                    sx={{ ml: 'auto' }}
                  >
                    Manage Course
                  </Button>
                )}
              </Box>

              {/* Course Stats */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Schedule sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">{course.duration} total</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <People sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">{course.enrolledStudents.toLocaleString()} students</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Star sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">Certificate included</Typography>
                </Box>
              </Box>

              {/* Instructor Info */}
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Your Instructor
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar 
                    src={course.instructor.avatar} 
                    sx={{ width: 48, height: 48, mr: 2 }}
                  >
                    {course.instructor.name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {course.instructor.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Rating value={course.instructor.rating} precision={0.1} size="small" readOnly />
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {course.instructor.rating}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {course.instructor.bio}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};