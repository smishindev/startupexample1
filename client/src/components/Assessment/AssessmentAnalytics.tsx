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
  scoreDistribution: Record<string, number>;
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
      
      // Load real assessment analytics data
      const analyticsData = await assessmentApi.getAssessmentAnalytics(assessmentId);
      setAssessment(analyticsData.assessment);
      
      // Transform backend data to frontend format
      const transformedAnalytics: AnalyticsData = {
        totalSubmissions: analyticsData.analytics.totalSubmissions,
        passRate: analyticsData.analytics.passRate,
        averageScore: analyticsData.analytics.averageScore,
        averageTimeSpent: analyticsData.analytics.averageTimeSpent,
        scoreDistribution: analyticsData.analytics.scoreDistribution.reduce((acc, item) => {
          acc[item.scoreRange] = item.count;
          return acc;
        }, {} as Record<string, number>),
        recentSubmissions: analyticsData.analytics.recentSubmissions.map(sub => ({
          id: sub.Id,
          studentName: sub.StudentName,
          score: sub.Score,
          timeSpent: sub.TimeSpent,
          passed: sub.Passed,
          submittedAt: sub.CompletedAt
        })),
        topPerformers: analyticsData.analytics.topPerformers.map(perf => ({
          name: perf.StudentName,
          score: perf.Score,
          attempts: perf.AttemptNumber
        })),
        strugglingStudents: analyticsData.analytics.strugglingStudents.map(strug => ({
          name: strug.StudentName,
          score: strug.Score,
          attempts: strug.AttemptNumber
        }))
      };

      setAnalytics(transformedAnalytics);
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
    <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 4 } }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
          Assessment Analytics
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
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
                  <Typography variant="h4" fontWeight="bold" color="primary" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {analytics.totalSubmissions}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Submissions
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: { xs: 30, sm: 40 }, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="success.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {analytics.passRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pass Rate
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: { xs: 30, sm: 40 }, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="info.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {analytics.averageScore.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Score
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: { xs: 30, sm: 40 }, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="warning.main" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {formatTime(analytics.averageTimeSpent)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Time Spent
                  </Typography>
                </Box>
                <TimerIcon sx={{ fontSize: { xs: 30, sm: 40 }, color: 'warning.main' }} />
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
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Time</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Submitted</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.recentSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
                            <Avatar sx={{ width: { xs: 24, sm: 32 }, height: { xs: 24, sm: 32 }, bgcolor: 'primary.main', fontSize: { xs: '0.75rem', sm: '1rem' } }}>
                              {submission.studentName.split(' ').map((n: string) => n[0]).join('')}
                            </Avatar>
                            <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 100, sm: 'none' } }}>{submission.studentName}</Typography>
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
                        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          {formatTime(submission.timeSpent)}
                        </TableCell>
                        <TableCell align="center">
                          {submission.passed ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <CancelIcon color="error" />
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
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

        {/* Score Distribution Chart */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Score Distribution
              </Typography>
              <Box sx={{ mt: 2 }}>
                {Object.entries(analytics.scoreDistribution).map(([range, count]) => (
                  <Box key={range} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{range}%</Typography>
                      <Typography variant="body2" fontWeight="bold">{count} students</Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 8,
                        bgcolor: 'grey.200',
                        borderRadius: 1,
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          width: `${analytics.totalSubmissions > 0 ? (count / analytics.totalSubmissions) * 100 : 0}%`,
                          height: '100%',
                          bgcolor: range.startsWith('90') ? 'success.main' :
                                  range.startsWith('80') ? 'info.main' :
                                  range.startsWith('70') ? 'warning.main' : 'error.main',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </Box>
                  </Box>
                ))}
                {Object.keys(analytics.scoreDistribution).length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No submission data available
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 0 }}>
        {/* Performance Summary */}
        <Grid item xs={12} lg={8}>
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