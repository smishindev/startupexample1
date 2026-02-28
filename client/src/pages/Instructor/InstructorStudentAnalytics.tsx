import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Psychology as AIIcon,
  TrendingDown as DecliningIcon,
  Warning as RiskIcon,
  CheckCircle as SafeIcon,
  Visibility as ViewIcon,
  Message as InterventionIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer } from '../../components/Responsive';
import { useResponsive } from '../../components/Responsive/useResponsive';
import { useSearchParams } from 'react-router-dom';
import { instructorApi } from '../../services/instructorApi';

interface StudentRiskData {
  studentId: string;
  studentName: string;
  email: string;
  courseId: string;
  courseName: string;
  riskLevel: 'low' | 'medium' | 'high';
  currentProgress: number;
  lastActivity: string;
  strugglingAreas: string[];
  recommendedActions: string[];
}

export const InstructorStudentAnalytics: React.FC = () => {
  const { isMobile } = useResponsive();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<StudentRiskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentRiskData | null>(null);
  const [interventionDialog, setInterventionDialog] = useState(false);
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStudentData();
  }, []);

  // Auto-open student details dialog when navigated from InterventionDashboard
  useEffect(() => {
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');
    if (studentId && students.length > 0 && !interventionDialog) {
      const student = students.find(s =>
        s.studentId === studentId && (!courseId || s.courseId === courseId)
      );
      if (student) {
        setSelectedStudent(student);
        setInterventionDialog(true);
      }
    }
  }, [students, searchParams]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      // Fetch at-risk and low-progress students from real APIs
      const [atRiskStudents, lowProgressStudents] = await Promise.all([
        instructorApi.getAtRiskStudents().catch(() => []),
        instructorApi.getLowProgressStudents().catch(() => [])
      ]);

      const mapped: StudentRiskData[] = [];
      const seen = new Set<string>();

      // Map at-risk students (high/critical risk from StudentRiskAssessment)
      for (const s of atRiskStudents) {
        const key = `${s.UserId}-${s.CourseId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        mapped.push({
          studentId: s.UserId,
          studentName: `${s.FirstName || ''} ${s.LastName || ''}`.trim() || 'Unknown',
          email: s.Email || '',
          courseId: s.CourseId,
          courseName: s.CourseName || 'Unknown Course',
          riskLevel: s.RiskLevel === 'critical' ? 'high' : (s.RiskLevel || 'high'),
          currentProgress: s.OverallProgress != null ? Math.round(s.OverallProgress) : 0,
          lastActivity: s.LastUpdated ? new Date(s.LastUpdated).toLocaleDateString() : 'Unknown',
          strugglingAreas: Array.isArray(s.RiskFactors) ? s.RiskFactors : [],
          recommendedActions: Array.isArray(s.RecommendedInterventions) ? s.RecommendedInterventions : []
        });
      }

      // Map low-progress students as medium risk
      for (const s of lowProgressStudents) {
        const key = `${s.UserId}-${s.CourseId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        mapped.push({
          studentId: s.UserId,
          studentName: `${s.FirstName || ''} ${s.LastName || ''}`.trim() || 'Unknown',
          email: s.Email || '',
          courseId: s.CourseId,
          courseName: s.CourseName || 'Unknown Course',
          riskLevel: 'medium',
          currentProgress: s.OverallProgress ?? 0,
          lastActivity: s.LastAccessedAt ? new Date(s.LastAccessedAt).toLocaleDateString() : 'Unknown',
          strugglingAreas: [
            'Low progress',
            ...(s.DaysSinceAccess ? [`Inactive for ${s.DaysSinceAccess} days`] : [])
          ],
          recommendedActions: [
            'Send a reminder to resume the course',
            'Check if the student needs additional support'
          ]
        });
      }

      setStudents(mapped);
    } catch (error) {
      console.error('Error loading student data:', error);
      setFetchError('Failed to load student analytics data.');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudentDetails = async (studentId: string, courseId?: string) => {
    try {
      const student = students.find(s =>
        s.studentId === studentId && (!courseId || s.courseId === courseId)
      );
      if (student) {
        setSelectedStudent(student);
        setInterventionDialog(true);
      }
    } catch (error) {
      console.error('Error loading student details:', error);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'success';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return <RiskIcon />;
      case 'medium': return <DecliningIcon />;
      default: return <SafeIcon />;
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesRisk = filterRisk === 'all' || student.riskLevel === filterRisk;
    const matchesSearch = student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  const riskSummary = {
    high: students.filter(s => s.riskLevel === 'high').length,
    medium: students.filter(s => s.riskLevel === 'medium').length,
    low: students.filter(s => s.riskLevel === 'low').length
  };

  return (
    <Box>
      <Header />
      <PageContainer>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
              Student Analytics & Interventions
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1.25rem' } }}>
              AI-powered insights and intervention recommendations for your students
            </Typography>
          </Box>
          <IconButton data-testid="student-analytics-refresh" onClick={loadStudentData} color="primary" size="large" disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : (
        <>
        {/* Risk Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                    <RiskIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">High Risk</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Needs immediate attention
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'error.main', fontSize: { xs: '1.75rem', sm: '3rem' } }}>
                  {riskSummary.high}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <DecliningIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Medium Risk</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monitor closely
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'warning.main', fontSize: { xs: '1.75rem', sm: '3rem' } }}>
                  {riskSummary.medium}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <SafeIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Low Risk</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Performing well
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main', fontSize: { xs: '1.75rem', sm: '3rem' } }}>
                  {riskSummary.low}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <AIIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">AI Insights</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active recommendations
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: { xs: '1.75rem', sm: '3rem' } }}>
                  {students.reduce((sum, s) => sum + s.recommendedActions.length, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {fetchError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {fetchError}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search students or courses"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="outlined"
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Risk Level</InputLabel>
                <Select
                  value={filterRisk}
                  label="Risk Level"
                  onChange={(e) => setFilterRisk(e.target.value)}
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="high">High Risk</MenuItem>
                  <MenuItem value="medium">Medium Risk</MenuItem>
                  <MenuItem value="low">Low Risk</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Student Risk Table */}
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Course</TableCell>
                <TableCell>Risk Level</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Last Activity</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Struggling Areas</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={`${student.studentId}-${student.courseId}`}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {student.studentName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.email || 'Email hidden'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2">
                        {student.courseName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getRiskIcon(student.riskLevel)}
                        label={student.riskLevel.toUpperCase()}
                        color={getRiskColor(student.riskLevel) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {student.currentProgress}%
                        </Typography>
                        {student.currentProgress < 50 && (
                          <RiskIcon color="error" fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2">
                        {student.lastActivity}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      {student.strugglingAreas.length > 0 ? (
                        <Box>
                          {student.strugglingAreas.slice(0, 2).map((area, index) => (
                            <Chip
                              key={index}
                              label={area}
                              size="small"
                              color="warning"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                          {student.strugglingAreas.length > 2 && (
                            <Typography variant="caption" color="text.secondary">
                              +{student.strugglingAreas.length - 2} more
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="success.main">
                          No issues detected
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleViewStudentDetails(student.studentId, student.courseId)}
                        color="primary"
                        size="small"
                        data-testid={`student-analytics-view-details-${student.studentId}-button`}
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Box>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No student analytics data available
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Student risk analytics and AI-powered insights will appear here once courses have enrolled students with progress data
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </>
        )}

        {/* Student Details Dialog */}
        <Dialog
          open={interventionDialog}
          onClose={() => setInterventionDialog(false)}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <InterventionIcon />
              Intervention Recommendations - {selectedStudent?.studentName}
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedStudent && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Current Progress
                    </Typography>
                    <Typography variant="h6">
                      {selectedStudent.currentProgress}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Risk Level
                    </Typography>
                    <Chip
                      label={selectedStudent.riskLevel.toUpperCase()}
                      color={getRiskColor(selectedStudent.riskLevel) as any}
                      size="small"
                    />
                  </Grid>
                </Grid>

                <Typography variant="h6" gutterBottom>
                  Recommended Interventions
                </Typography>
                <List>
                  {selectedStudent.recommendedActions.map((action, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <AIIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={action} />
                    </ListItem>
                  ))}
                </List>

                {selectedStudent.strugglingAreas.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Struggling Areas
                    </Typography>
                    <Box>
                      {selectedStudent.strugglingAreas.map((area, index) => (
                        <Chip
                          key={index}
                          label={area}
                          color="warning"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInterventionDialog(false)} data-testid="student-analytics-intervention-close-button">
              Close
            </Button>
            <Button
              variant="contained"
              color="primary"
              data-testid="student-analytics-send-message-button"
              disabled={!selectedStudent?.email}
              onClick={() => {
                if (selectedStudent?.email) {
                  window.location.href = `mailto:${selectedStudent.email}`;
                }
              }}
            >
              {selectedStudent?.email ? 'Send Message to Student' : 'Email Unavailable'}
            </Button>
          </DialogActions>
        </Dialog>
      </PageContainer>
    </Box>
  );
};