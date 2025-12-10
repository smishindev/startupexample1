import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Stack,
  Tooltip,
  Tab,
  Tabs,
  Badge,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Warning as WarningIcon,
  TrendingDown as TrendingDownIcon,
  Email as EmailIcon,
  Message as MessageIcon,
  Visibility as ViewIcon,
  AccessTime as TimeIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  NotificationImportant as AlertIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { instructorApi } from '../../services/instructorApi';
import { HeaderV4 as Header } from '../../components/Navigation/HeaderV4';

interface AtRiskStudent {
  UserId: string;
  CourseId: string;
  FirstName: string;
  LastName: string;
  Email: string;
  CourseName: string;
  RiskLevel: 'low' | 'medium' | 'high' | 'critical';
  RiskScore: number;
  RiskFactors: string[];
  RecommendedInterventions: string[];
  LastUpdated: string;
}

interface LowProgressStudent {
  UserId: string;
  CourseId: string;
  FirstName: string;
  LastName: string;
  Email: string;
  CourseName: string;
  OverallProgress: number;
  DaysSinceAccess: number;
  LastAccessedAt: string;
}

interface PendingAssessment {
  UserId: string;
  FirstName: string;
  LastName: string;
  Email: string;
  AssessmentId: string;
  AssessmentTitle: string;
  CourseName: string;
  AttemptsLeft: number;
  AttemptsUsed: number;
}

export const InterventionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [lowProgressStudents, setLowProgressStudents] = useState<LowProgressStudent[]>([]);
  const [pendingAssessments, setPendingAssessments] = useState<PendingAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data using instructorApi
      const [atRisk, lowProgress, pending] = await Promise.all([
        instructorApi.getAtRiskStudents(),
        instructorApi.getLowProgressStudents(),
        instructorApi.getPendingAssessments()
      ]);

      setAtRiskStudents(atRisk);
      setLowProgressStudents(lowProgress);
      setPendingAssessments(pending);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleViewStudent = (userId: string, courseId: string) => {
    navigate(`/instructor/student-analytics?studentId=${userId}&courseId=${courseId}`);
  };

  const handleSendMessage = (studentEmail: string) => {
    // TODO: Implement messaging functionality
    window.location.href = `mailto:${studentEmail}`;
  };

  if (loading) {
    return (
      <>
        <Header />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <Header />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            🚨 Intervention Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor at-risk students and take proactive interventions to improve learning outcomes
          </Typography>
        </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: '#ff9800', width: 56, height: 56 }}>
                  <WarningIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {atRiskStudents.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    At-Risk Students
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#e3f2fd', border: '2px solid #2196f3' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: '#2196f3', width: 56, height: 56 }}>
                  <TrendingDownIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {lowProgressStudents.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Low Progress
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: '#f3e5f5', border: '2px solid #9c27b0' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: '#9c27b0', width: 56, height: 56 }}>
                  <AssignmentIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {pendingAssessments.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Assessments
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab
            label={
              <Badge badgeContent={atRiskStudents.length} color="error">
                <Box sx={{ px: 2 }}>At-Risk Students</Box>
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={lowProgressStudents.length} color="info">
                <Box sx={{ px: 2 }}>Low Progress</Box>
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={pendingAssessments.length} color="warning">
                <Box sx={{ px: 2 }}>Pending Assessments</Box>
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {atRiskStudents.length === 0 ? (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              Great news! No students are currently at risk. Keep up the good work! 🎉
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {atRiskStudents.map((student) => (
                <Grid item xs={12} md={6} lg={4} key={`${student.UserId}-${student.CourseId}`}>
                  <Card sx={{ height: '100%', position: 'relative' }}>
                    <Chip
                      label={student.RiskLevel.toUpperCase()}
                      color={getRiskColor(student.RiskLevel) as any}
                      size="small"
                      sx={{ position: 'absolute', top: 16, right: 16 }}
                    />
                    <CardContent>
                      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {student.FirstName[0]}{student.LastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {student.FirstName} {student.LastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {student.Email}
                          </Typography>
                        </Box>
                      </Stack>

                      <Divider sx={{ my: 2 }} />

                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SchoolIcon fontSize="small" color="action" />
                          <Typography variant="body2" noWrap>
                            {student.CourseName}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AlertIcon fontSize="small" color="error" />
                          <Typography variant="body2">
                            Risk Score: {Math.round(student.RiskScore)}%
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                            Risk Factors:
                          </Typography>
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                            {student.RiskFactors.slice(0, 3).map((factor, idx) => (
                              <Chip key={idx} label={factor} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </Box>

                        {student.RecommendedInterventions.length > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                              Recommended Actions:
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              • {student.RecommendedInterventions[0]}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleViewStudent(student.UserId, student.CourseId)}
                      >
                        View Analytics
                      </Button>
                      <Tooltip title="Send Email">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleSendMessage(student.Email)}
                        >
                          <EmailIcon />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {lowProgressStudents.length === 0 ? (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              All students are making good progress! 📚
            </Alert>
          ) : (
            <Paper>
              <List>
                {lowProgressStudents.map((student, index) => (
                  <React.Fragment key={`${student.UserId}-${student.CourseId}`}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'warning.main' }}>
                          {student.FirstName[0]}{student.LastName[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {student.FirstName} {student.LastName}
                          </Typography>
                        }
                        secondary={
                          <React.Fragment>
                            <Typography variant="body2" color="text.secondary" component="span" display="block">
                              📧 {student.Email}
                            </Typography>
                            <Typography variant="body2" component="span" display="block">
                              📚 {student.CourseName}
                            </Typography>
                            <Box component="span" sx={{ mt: 0.5, display: 'flex', gap: 2 }}>
                              <Chip
                                label={`${student.OverallProgress}% Complete`}
                                size="small"
                                color="warning"
                              />
                              <Chip
                                label={`${student.DaysSinceAccess} days inactive`}
                                size="small"
                                icon={<TimeIcon />}
                              />
                            </Box>
                          </React.Fragment>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                      <ListItemSecondaryAction>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View Analytics">
                            <IconButton
                              edge="end"
                              onClick={() => handleViewStudent(student.UserId, student.CourseId)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Send Message">
                            <IconButton
                              edge="end"
                              onClick={() => handleSendMessage(student.Email)}
                            >
                              <MessageIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {pendingAssessments.length === 0 ? (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              No pending assessments with critical attempt counts! ✅
            </Alert>
          ) : (
            <Paper>
              <List>
                {pendingAssessments.map((assessment, index) => (
                  <React.Fragment key={`${assessment.UserId}-${assessment.AssessmentId}`}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          {assessment.FirstName[0]}{assessment.LastName[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {assessment.FirstName} {assessment.LastName}
                          </Typography>
                        }
                        secondary={
                          <React.Fragment>
                            <Typography variant="body2" color="text.secondary" component="span" display="block">
                              📧 {assessment.Email}
                            </Typography>
                            <Typography variant="body2" component="span" display="block">
                              📝 {assessment.AssessmentTitle}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" component="span" display="block">
                              📚 {assessment.CourseName}
                            </Typography>
                            <Box component="span" sx={{ mt: 0.5, display: 'flex', gap: 1 }}>
                              <Chip
                                label={`${assessment.AttemptsLeft} attempt${assessment.AttemptsLeft !== 1 ? 's' : ''} left`}
                                size="small"
                                color={assessment.AttemptsLeft === 1 ? 'error' : 'warning'}
                              />
                              <Chip
                                label={`${assessment.AttemptsUsed} used`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </React.Fragment>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Send Reminder">
                          <IconButton
                            edge="end"
                            onClick={() => handleSendMessage(assessment.Email)}
                          >
                            <EmailIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      )}
      </Container>
    </>
  );
};
