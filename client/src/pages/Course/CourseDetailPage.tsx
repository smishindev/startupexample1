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
  const [isEnrolling, setIsEnrolling] = useState(false);
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
            studentCount: 0,
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
    if (!courseId || !course) return;
    
    setIsEnrolling(true);
    
    try {
      if (course.isEnrolled) {
        // Unenroll
        await enrollmentApi.unenrollFromCourse(courseId);
        setCourse({ ...course, isEnrolled: false });
        setEnrollmentStatus({ ...enrollmentStatus, isEnrolled: false });
        console.log('Successfully unenrolled from course:', courseId);
      } else {
        // Enroll
        const response = await enrollmentApi.enrollInCourse(courseId);
        console.log('Enrollment response:', response);
        
        // Update both course state and enrollment status
        setCourse({ ...course, isEnrolled: true, progress: 0 });
        setEnrollmentStatus({ ...enrollmentStatus, isEnrolled: true });
        
        console.log('Successfully enrolled in course:', courseId);
        
        // Optionally navigate to the learning page after successful enrollment
        setTimeout(() => {
          navigate(`/learning/${courseId}`);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Failed to update enrollment:', error);
      
      // Parse error message if it's a JSON string
      let errorMessage = 'Failed to update enrollment. Please try again.';
      try {
        if (typeof error.message === 'string' && error.message.startsWith('{')) {
          const errorData = JSON.parse(error.message);
          errorMessage = errorData.message || errorMessage;
          
          // If already enrolled error, update the UI state
          if (errorData.code === 'ALREADY_ENROLLED') {
            setCourse({ ...course, isEnrolled: true });
            setEnrollmentStatus({ ...enrollmentStatus, isEnrolled: true });
            errorMessage = 'You are already enrolled in this course!';
          }
        }
      } catch (parseError) {
        // Use default error message
      }
      
      alert(errorMessage);
    } finally {
      setIsEnrolling(false);
    }
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
          <CircularProgress />
        </Container>
      </Box>
    );
  }

  if (!course) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flex: 1 }}>
          <Typography>Course not found</Typography>
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

                {/* Price */}
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
                    onClick={() => navigate(`/learning/${courseId}`)}
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
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleEnroll}
                    disabled={isEnrolling}
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
                    {isEnrolling ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Enroll Now'}
                  </Button>
                )}

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
    </Box>
  );
};