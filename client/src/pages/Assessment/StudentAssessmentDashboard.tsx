import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Quiz as QuizIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { HeaderV4 as Header } from '../../components/Navigation/HeaderV4';
import { assessmentApi } from '../../services/assessmentApi';

interface AssessmentProgress {
  assessmentId: string;
  assessmentTitle: string;
  assessmentType: string;
  passingScore: number;
  maxAttempts: number;
  timeLimit?: number;
  isAdaptive: boolean;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  courseThumbnail?: string;
  progress: {
    bestScore: number;
    totalAttempts: number;
    completedAttempts: number;
    attemptsLeft: number;
    passed: boolean;
    status: 'not_started' | 'in_progress' | 'completed' | 'passed';
    lastCompletedAt?: string;
    canTakeAssessment: boolean;
  };
}

interface CourseGroup {
  courseId: string;
  courseTitle: string;
  courseThumbnail?: string;
  assessments: AssessmentProgress[];
}

interface DashboardData {
  totalAssessments: number;
  completedAssessments: number;
  passedAssessments: number;
  courseGroups: CourseGroup[];
}

export const StudentAssessmentDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssessmentProgress();
  }, []);

  const fetchAssessmentProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const progressData = await assessmentApi.getMyAssessmentProgress();
      setData(progressData);
    } catch (error: any) {
      console.error('Failed to fetch assessment progress:', error);
      setError('Failed to load assessment progress');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon color="success" />;
      case 'completed':
        return <AssignmentIcon color="primary" />;
      case 'in_progress':
        return <ScheduleIcon color="warning" />;
      default:
        return <QuizIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'completed':
        return 'primary';
      case 'in_progress':
        return 'warning';
      default:
        return 'default';
    }
  };

  const calculateOverallProgress = () => {
    if (!data || data.totalAssessments === 0) return 0;
    return Math.round((data.completedAssessments / data.totalAssessments) * 100);
  };

  const calculatePassRate = () => {
    if (!data || data.completedAssessments === 0) return 0;
    return Math.round((data.passedAssessments / data.completedAssessments) * 100);
  };

  const handleTakeAssessment = (assessment: AssessmentProgress) => {
    const returnUrl = `/my-assessments`;
    navigate(`/assessments/${assessment.assessmentId}?returnUrl=${encodeURIComponent(returnUrl)}&courseId=${assessment.courseId}&lessonId=${assessment.lessonId}`);
  };

  const handleViewLesson = (assessment: AssessmentProgress) => {
    navigate(`/courses/${assessment.courseId}/lessons/${assessment.lessonId}`);
  };

  if (loading) {
    return (
      <Box>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography>Loading your assessment progress...</Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || 'Failed to load assessment data'}
          </Alert>
          <Button data-testid="student-assessment-retry-button" variant="contained" onClick={fetchAssessmentProgress}>
            Try Again
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center' }}>
            <SchoolIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
            My Assessment Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Track your progress across all assessments and courses
          </Typography>
        </Box>

        {/* Overview Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {data.totalAssessments}
                    </Typography>
                    <Typography color="text.secondary">
                      Total Assessments
                    </Typography>
                  </Box>
                  <QuizIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {data.completedAssessments}
                    </Typography>
                    <Typography color="text.secondary">
                      Completed
                    </Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                      {calculateOverallProgress()}%
                    </Typography>
                    <Typography color="text.secondary">
                      Overall Progress
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={calculateOverallProgress()} 
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                      {calculatePassRate()}%
                    </Typography>
                    <Typography color="text.secondary">
                      Pass Rate
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Assessments by Course */}
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
          Assessments by Course
        </Typography>

        {data.courseGroups.length === 0 ? (
          <Alert severity="info">
            <Typography>
              You haven't enrolled in any courses with assessments yet. 
              <Button data-testid="student-assessment-browse-courses" sx={{ ml: 1 }} onClick={() => navigate('/courses')}>
                Browse Courses
              </Button>
            </Typography>
          </Alert>
        ) : (
          data.courseGroups.map((courseGroup) => (
            <Accordion key={courseGroup.courseId} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  {courseGroup.courseThumbnail && (
                    <Avatar
                      src={courseGroup.courseThumbnail}
                      sx={{ mr: 2, width: 40, height: 40 }}
                    />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {courseGroup.courseTitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {courseGroup.assessments.length} assessments • {
                        courseGroup.assessments.filter(a => a.progress.status === 'passed' || a.progress.status === 'completed').length
                      } completed
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {courseGroup.assessments.map((assessment, index) => (
                    <React.Fragment key={assessment.assessmentId}>
                      <ListItem>
                        <ListItemAvatar>
                          {getStatusIcon(assessment.progress.status)}
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="h6">{assessment.assessmentTitle}</Typography>
                              {assessment.isAdaptive && (
                                <Chip label="🧠 Adaptive" size="small" color="secondary" variant="outlined" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {assessment.lessonTitle} • {assessment.assessmentType}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                <Chip 
                                  label={assessment.progress.status.replace('_', ' ')}
                                  size="small"
                                  color={getStatusColor(assessment.progress.status) as any}
                                  variant={assessment.progress.status === 'passed' ? 'filled' : 'outlined'}
                                />
                                {assessment.progress.bestScore > 0 && (
                                  <Chip 
                                    label={`Best: ${assessment.progress.bestScore}%`} 
                                    size="small" 
                                    color={assessment.progress.passed ? 'success' : 'default'}
                                    variant="outlined"
                                  />
                                )}
                                <Chip 
                                  label={`${assessment.progress.totalAttempts}/${assessment.maxAttempts} attempts`} 
                                  size="small" 
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          }
                        />
                        <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                          {assessment.progress.canTakeAssessment ? (
                            <Button
                              data-testid={`student-assessment-take-${assessment.assessmentId}`}
                              variant="contained"
                              size="small"
                              onClick={() => handleTakeAssessment(assessment)}
                            >
                              {assessment.progress.status === 'passed' ? 'Retake' :
                               assessment.progress.status === 'completed' ? 'Retry' :
                               assessment.progress.status === 'in_progress' ? 'Continue' :
                               'Start'}
                            </Button>
                          ) : (
                            <Button variant="outlined" size="small" disabled data-testid={`student-assessment-max-attempts-${assessment.assessmentId}`}>
                              Max Attempts
                            </Button>
                          )}
                          <Button
                            data-testid={`student-assessment-view-lesson-${assessment.assessmentId}`}
                            variant="outlined"
                            size="small"
                            onClick={() => handleViewLesson(assessment)}
                          >
                            View Lesson
                          </Button>
                        </Box>
                      </ListItem>
                      {index < courseGroup.assessments.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Container>
    </Box>
  );
};