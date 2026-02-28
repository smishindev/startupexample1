import React, { useState, useEffect } from 'react';
import {
  Box,
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
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { instructorApi } from '../../services/instructorApi';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer } from '../../components/Responsive';
import { useResponsive } from '../../components/Responsive/useResponsive';

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
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState(0);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [lowProgressStudents, setLowProgressStudents] = useState<LowProgressStudent[]>([]);
  const [pendingAssessments, setPendingAssessments] = useState<PendingAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      
      // Fetch all data using instructorApi - individually caught to isolate failures
      const [atRisk, lowProgress, pending] = await Promise.all([
        instructorApi.getAtRiskStudents().catch((err) => { console.error('At-risk fetch failed:', err); return []; }),
        instructorApi.getLowProgressStudents().catch((err) => { console.error('Low-progress fetch failed:', err); return []; }),
        instructorApi.getPendingAssessments().catch((err) => { console.error('Pending assessments fetch failed:', err); return []; })
      ]);

      setAtRiskStudents(atRisk);
      setLowProgressStudents(lowProgress);
      setPendingAssessments(pending);

      // If any returned empty due to errors, warn the user
      if (atRisk.length === 0 && lowProgress.length === 0 && pending.length === 0) {
        // Could be genuinely empty or all failed - data is already set
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setFetchError('Failed to load intervention data. The information shown may be incomplete.');
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

  return (
    <>
      <Header />
      <PageContainer>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
              🚨 Intervention Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Monitor at-risk students and take proactive interventions to improve learning outcomes
            </Typography>
          </Box>
          <IconButton onClick={fetchDashboardData} color="primary" size="large" disabled={loading} data-testid="intervention-dashboard-refresh-button">
            <RefreshIcon />
          </IconButton>
        </Box>

      {fetchError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {fetchError}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      ) : (
      <>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} md={4}>
          <Card sx={{ bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: '#ff9800', width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
                  <WarningIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', fontSize: { xs: '1.75rem', sm: '3rem' } }}>
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

        <Grid item xs={6} md={4}>
          <Card sx={{ bgcolor: '#e3f2fd', border: '2px solid #2196f3' }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: '#2196f3', width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
                  <TrendingDownIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', fontSize: { xs: '1.75rem', sm: '3rem' } }}>
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
                <Avatar sx={{ bgcolor: '#9c27b0', width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
                  <AssignmentIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', fontSize: { xs: '1.75rem', sm: '3rem' } }}>
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
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons="auto"
          data-testid="intervention-dashboard-tabs"
        >
          <Tab
            label={
              <Badge badgeContent={atRiskStudents.length} color="error">
                <Box sx={{ px: 2 }}>At-Risk Students</Box>
              </Badge>
            }
            data-testid="intervention-dashboard-tab-at-risk"
          />
          <Tab
            label={
              <Badge badgeContent={lowProgressStudents.length} color="info">
                <Box sx={{ px: 2 }}>Low Progress</Box>
              </Badge>
            }
            data-testid="intervention-dashboard-tab-low-progress"
          />
          <Tab
            label={
              <Badge badgeContent={pendingAssessments.length} color="warning">
                <Box sx={{ px: 2 }}>Pending Assessments</Box>
              </Badge>
            }
            data-testid="intervention-dashboard-tab-pending"
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
                          {student.FirstName?.[0]?.toUpperCase() || ''}{student.LastName?.[0]?.toUpperCase() || ''}
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {student.FirstName} {student.LastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {student.Email || 'Email hidden'}
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
                          <Stack direction="row" sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
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
                        data-testid="intervention-dashboard-view-analytics-button"
                      >
                        View Analytics
                      </Button>
                      <Tooltip title={student.Email ? "Send Email" : "Email hidden"}>
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => student.Email && handleSendMessage(student.Email)}
                            disabled={!student.Email}
                            data-testid="intervention-dashboard-send-email-button"
                          >
                            <EmailIcon />
                          </IconButton>
                        </span>
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
                    <ListItem sx={{ pr: { xs: 15, sm: 6 } }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'warning.main' }}>
                          {student.FirstName?.[0]?.toUpperCase() || ''}{student.LastName?.[0]?.toUpperCase() || ''}
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
                              📧 {student.Email || 'Email hidden'}
                            </Typography>
                            <Typography variant="body2" component="span" display="block">
                              📚 {student.CourseName}
                            </Typography>
                            <Box component="span" sx={{ mt: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                              data-testid={`intervention-dashboard-view-student-${student.UserId}-button`}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={student.Email ? "Send Message" : "Email hidden"}>
                            <span>
                              <IconButton
                                edge="end"
                                onClick={() => student.Email && handleSendMessage(student.Email)}
                                disabled={!student.Email}
                                data-testid={`intervention-dashboard-send-message-${student.UserId}-button`}
                              >
                                <MessageIcon />
                              </IconButton>
                            </span>
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
                          {assessment.FirstName?.[0]?.toUpperCase() || ''}{assessment.LastName?.[0]?.toUpperCase() || ''}
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
                              📧 {assessment.Email || 'Email hidden'}
                            </Typography>
                            <Typography variant="body2" component="span" display="block">
                              📝 {assessment.AssessmentTitle}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" component="span" display="block">
                              📚 {assessment.CourseName}
                            </Typography>
                            <Box component="span" sx={{ mt: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                        <Tooltip title={assessment.Email ? "Send Reminder" : "Email hidden"}>
                          <span>
                            <IconButton
                              edge="end"
                              onClick={() => assessment.Email && handleSendMessage(assessment.Email)}
                              disabled={!assessment.Email}
                              data-testid={`intervention-dashboard-send-reminder-${assessment.UserId}-button`}
                            >
                              <EmailIcon />
                            </IconButton>
                          </span>
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
      </>
      )}
      </PageContainer>
    </>
  );
};
