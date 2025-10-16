import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Analytics as AnalyticsIcon,
  School as SchoolIcon,
  Quiz as QuizIcon
} from '@mui/icons-material';
import { Header } from '../../components/Navigation/Header';
import { lessonApi, Lesson } from '../../services/lessonApi';
import { assessmentApi, Assessment } from '../../services/assessmentApi';
import { coursesApi } from '../../services/coursesApi';

interface LessonWithAssessments extends Lesson {
  assessments: Assessment[];
}

export const CourseAssessmentManagementPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<LessonWithAssessments[]>([]);
  const [courseName, setCourseName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load course details
      const courseDetail = await coursesApi.getCourse(courseId!);
      setCourseName(courseDetail.Title);

      // Load lessons for the course
      const lessonsData = await lessonApi.getLessons(courseId!);

      // Load assessments for each lesson
      const lessonsWithAssessments: LessonWithAssessments[] = await Promise.all(
        lessonsData.map(async (lesson) => {
          try {
            const assessments = await assessmentApi.getAssessmentsByLesson(lesson.id);
            return {
              ...lesson,
              assessments: assessments || []
            };
          } catch (error) {
            console.warn(`Failed to load assessments for lesson ${lesson.id}:`, error);
            return {
              ...lesson,
              assessments: []
            };
          }
        })
      );

      setLessons(lessonsWithAssessments);
    } catch (error: any) {
      console.error('Error loading course assessment data:', error);
      setError('Failed to load course assessment data');
    } finally {
      setLoading(false);
    }
  };

  const getTotalAssessments = () => {
    return lessons.reduce((total, lesson) => total + lesson.assessments.length, 0);
  };

  const getAssessmentTypeLabel = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'Quiz';
      case 'test':
        return 'Test';
      case 'assignment':
        return 'Assignment';
      case 'project':
        return 'Project';
      case 'practical':
        return 'Practical';
      default:
        return 'Assessment';
    }
  };

  const handleCreateAssessment = (lessonId: string) => {
    navigate(`/instructor/lessons/${lessonId}/assessments/create`);
  };

  const handleEditAssessment = (assessmentId: string) => {
    navigate(`/instructor/assessments/${assessmentId}/edit`);
  };

  const handleViewAssessment = (assessmentId: string) => {
    navigate(`/instructor/assessments/${assessmentId}/view`);
  };

  const handleManageLessonAssessments = (lessonId: string) => {
    navigate(`/instructor/lessons/${lessonId}/assessments`);
  };

  if (!courseId) {
    return (
      <Box>
        <Header />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">
            Course ID not found. Please navigate from a valid course.
          </Alert>
        </Container>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box>
        <Header />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography>Loading course assessments...</Typography>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Header />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button onClick={loadCourseData} variant="contained">
            Retry
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            component="button"
            variant="body1"
            onClick={() => navigate('/instructor/dashboard')}
            sx={{ textDecoration: 'none', cursor: 'pointer' }}
          >
            Instructor Dashboard
          </Link>
          <Link
            component="button"
            variant="body1"
            onClick={() => navigate(`/instructor/courses/${courseId}/edit`)}
            sx={{ textDecoration: 'none', cursor: 'pointer' }}
          >
            {courseName}
          </Link>
          <Typography color="text.primary">Assessments</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
          <Box>
            <Typography variant="h3" gutterBottom>
              Course Assessments
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {courseName}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage assessments across all lessons in this course
            </Typography>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <AssignmentIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {getTotalAssessments()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Assessments
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <SchoolIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {lessons.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lessons with Assessments Available
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <QuizIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div">
                  {lessons.filter(l => l.assessments.length > 0).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Lessons with Assessments
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Lessons and Assessments */}
        {lessons.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Lessons Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create lessons first, then add assessments to evaluate student learning
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate(`/instructor/courses/${courseId}/lessons`)}
              >
                Manage Lessons
              </Button>
            </CardContent>
          </Card>
        ) : (
          lessons.map((lesson) => (
            <Accordion key={lesson.id} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mr: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {lesson.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {lesson.description}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${lesson.assessments.length} assessments`}
                    color={lesson.assessments.length > 0 ? 'primary' : 'default'}
                    size="small"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {lesson.assessments.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <QuizIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      No assessments created for this lesson yet
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleCreateAssessment(lesson.id)}
                      >
                        Create Assessment
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AssignmentIcon />}
                        onClick={() => handleManageLessonAssessments(lesson.id)}
                      >
                        Manage Assessments
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <>
                    <List>
                      {lesson.assessments.map((assessment, index) => (
                        <React.Fragment key={assessment.id}>
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                                    {assessment.title}
                                  </Typography>
                                  <Chip
                                    label={getAssessmentTypeLabel(assessment.type)}
                                    size="small"
                                    variant="outlined"
                                  />
                                  <Chip
                                    label="Draft"
                                    size="small"
                                    color="warning"
                                  />
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    Assessment for lesson: {lesson.title}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {assessment.questions?.length || 0} questions • 
                                    {assessment.timeLimit ? ` ${assessment.timeLimit} minutes` : ' No time limit'} • 
                                    Max attempts: {assessment.maxAttempts || 'Unlimited'}
                                  </Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="Edit Assessment">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditAssessment(assessment.id)}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="View Analytics">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewAssessment(assessment.id)}
                                  >
                                    <AnalyticsIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Preview Assessment">
                                  <IconButton
                                    size="small"
                                    onClick={() => navigate(`/assessments/${assessment.id}?preview=true`)}
                                  >
                                    <ViewIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < lesson.assessments.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleCreateAssessment(lesson.id)}
                      >
                        Add Assessment
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AssignmentIcon />}
                        onClick={() => handleManageLessonAssessments(lesson.id)}
                      >
                        Manage All
                      </Button>
                    </Box>
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Container>
    </Box>
  );
};