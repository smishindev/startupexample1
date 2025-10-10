import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { assessmentApi, Assessment } from '../../services/assessmentApi';

interface AssessmentAnalyticsProps {
  assessmentId: string;
}

interface AnalyticsData {
  totalSubmissions: number;
  passRate: number;
  averageScore: number;
  averageTimeSpent: number;
  difficultyDistribution: Record<number, number>;
  recentSubmissions: any[];
  topPerformers: any[];
  strugglingStudents: any[];
}

const AssessmentAnalytics: React.FC<AssessmentAnalyticsProps> = ({ assessmentId }) => {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [assessmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load assessment details
      const assessmentData = await assessmentApi.getAssessment(assessmentId);
      setAssessment(assessmentData);

      // Load analytics (this would come from a dedicated analytics endpoint)
      // For now, we'll simulate some data
      const mockAnalytics: AnalyticsData = {
        totalSubmissions: 45,
        passRate: 73.3,
        averageScore: 76.8,
        averageTimeSpent: 22.5,
        difficultyDistribution: {
          1: 2, 2: 8, 3: 12, 4: 15, 5: 18, 6: 14, 7: 10, 8: 6, 9: 3, 10: 1
        },
        recentSubmissions: [
          { id: '1', studentName: 'Alice Johnson', score: 92, timeSpent: 18, passed: true, submittedAt: '2024-01-15T10:30:00Z' },
          { id: '2', studentName: 'Bob Smith', score: 67, timeSpent: 28, passed: false, submittedAt: '2024-01-15T09:45:00Z' },
          { id: '3', studentName: 'Carol Williams', score: 84, timeSpent: 21, passed: true, submittedAt: '2024-01-15T08:15:00Z' },
          { id: '4', studentName: 'David Brown', score: 78, timeSpent: 25, passed: true, submittedAt: '2024-01-14T16:20:00Z' },
          { id: '5', studentName: 'Eva Davis', score: 58, timeSpent: 32, passed: false, submittedAt: '2024-01-14T14:10:00Z' }
        ],
        topPerformers: [
          { name: 'Alice Johnson', score: 92, attempts: 1 },
          { name: 'Michael Chen', score: 89, attempts: 1 },
          { name: 'Sarah Wilson', score: 87, attempts: 2 }
        ],
        strugglingStudents: [
          { name: 'Eva Davis', score: 58, attempts: 3 },
          { name: 'Bob Smith', score: 67, attempts: 2 },
          { name: 'John Martinez', score: 62, attempts: 3 }
        ]
      };

      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load assessment analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = Math.round(minutes % 60);
    return `${hours}h ${remainingMins}m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !assessment || !analytics) {
    return (
      <Alert severity="error">
        {error || 'Failed to load analytics data'}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Assessment Analytics
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {assessment.title}
        </Typography>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {analytics.totalSubmissions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Submissions
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {analytics.passRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pass Rate
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {analytics.averageScore.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Score
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {formatTime(analytics.averageTimeSpent)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Time Spent
                  </Typography>
                </Box>
                <TimerIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Submissions */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Submissions
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell align="center">Time</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Submitted</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.recentSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                              {submission.studentName.split(' ').map((n: string) => n[0]).join('')}
                            </Avatar>
                            {submission.studentName}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${submission.score}%`}
                            color={getScoreColor(submission.score) as any}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {formatTime(submission.timeSpent)}
                        </TableCell>
                        <TableCell align="center">
                          {submission.passed ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <CancelIcon color="error" />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Summary */}
        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            {/* Top Performers */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Performers
                  </Typography>
                  {analytics.topPerformers.map((performer, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          #{index + 1}
                        </Typography>
                        <Typography variant="body2">
                          {performer.name}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${performer.score}%`}
                        color="success"
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Students Needing Help */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Students Needing Help
                  </Typography>
                  {analytics.strugglingStudents.map((student, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1
                      }}
                    >
                      <Typography variant="body2">
                        {student.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={`${student.score}%`}
                          color="error"
                          variant="outlined"
                          size="small"
                        />
                        <Chip
                          label={`${student.attempts} attempts`}
                          color="warning"
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {/* Assessment Info */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Assessment Details
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Questions:
                      </Typography>
                      <Typography variant="body2">
                        {assessment.questions?.length || 0}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Passing Score:
                      </Typography>
                      <Typography variant="body2">
                        {assessment.passingScore}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Time Limit:
                      </Typography>
                      <Typography variant="body2">
                        {assessment.timeLimit ? `${assessment.timeLimit} min` : 'No limit'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Max Attempts:
                      </Typography>
                      <Typography variant="body2">
                        {assessment.maxAttempts}
                      </Typography>
                    </Box>
                    {assessment.isAdaptive && (
                      <Chip
                        label="Adaptive Assessment"
                        color="secondary"
                        variant="outlined"
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AssessmentAnalytics;