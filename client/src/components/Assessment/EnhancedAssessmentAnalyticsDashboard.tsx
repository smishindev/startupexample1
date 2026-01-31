import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  IconButton,
  Tab,
  Tabs
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { HeaderV5 as Header } from '../Navigation/HeaderV5';
import { 
  assessmentAnalyticsApi, 
  type CrossAssessmentAnalytics,
  type StudentPerformanceAnalytics 
} from '../../services/assessmentAnalyticsApi';
import { instructorApi, type InstructorCourse } from '../../services/instructorApi';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const EnhancedAssessmentAnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [crossAnalytics, setCrossAnalytics] = useState<CrossAssessmentAnalytics | null>(null);
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [selectedCoursePerformance, setSelectedCoursePerformance] = useState<StudentPerformanceAnalytics | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadCoursePerformance(selectedCourseId);
    }
  }, [selectedCourseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [analyticsData, coursesResponse] = await Promise.all([
        assessmentAnalyticsApi.getCrossAssessmentOverview(),
        instructorApi.getCourses()
      ]);
      
      setCrossAnalytics(analyticsData);
      setCourses(coursesResponse.courses);
      
      // Auto-select first course for detailed analysis
      if (coursesResponse.courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(coursesResponse.courses[0].id);
      }
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError('Failed to load assessment analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadCoursePerformance = async (courseId: string) => {
    try {
      const performanceData = await assessmentAnalyticsApi.getStudentPerformance(courseId);
      setSelectedCoursePerformance(performanceData);
    } catch (err: any) {
      console.error('Error loading course performance:', err);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatTrendData = () => {
    if (!crossAnalytics?.performanceTrends) return [];
    return crossAnalytics.performanceTrends.map(trend => ({
      ...trend,
      monthName: new Date(trend.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }));
  };

  const formatTypeData = () => {
    if (!crossAnalytics?.assessmentTypes) return [];
    return crossAnalytics.assessmentTypes.map(type => ({
      ...type,
      displayType: assessmentAnalyticsApi.formatAssessmentType(type.Type)
    }));
  };

  if (loading) {
    return (
      <Box>
        <Header />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error || !crossAnalytics) {
    return (
      <Box>
        <Header />
        <Box sx={{ p: 3 }}>
          <Alert severity="error" action={
            <IconButton data-testid="assessment-analytics-error-retry" color="inherit" size="small" onClick={loadData}>
              <RefreshIcon />
            </IconButton>
          }>
            {error || 'Failed to load analytics data'}
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <Box sx={{ maxWidth: 'xl', mx: 'auto', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Assessment Analytics Dashboard
          </Typography>
          <IconButton data-testid="assessment-analytics-refresh" onClick={loadData} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>

        <Tabs data-testid="assessment-analytics-tabs" value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab data-testid="assessment-analytics-tab-overview" label="Overview" />
          <Tab data-testid="assessment-analytics-tab-performance" label="Performance Analysis" />
          <Tab data-testid="assessment-analytics-tab-insights" label="Student Insights" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {/* Overview Dashboard */}
          <Grid container spacing={3}>
            {/* Key Metrics Cards */}
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {crossAnalytics.overview.totalAssessments}
                  </Typography>
                  <Typography color="text.secondary">Total Assessments</Typography>
                  <Chip 
                    label={`+${crossAnalytics.overview.assessmentsThisMonth} this month`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <PeopleIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                    {crossAnalytics.overview.totalActiveStudents}
                  </Typography>
                  <Typography color="text.secondary">Active Students</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {crossAnalytics.overview.totalSubmissions} submissions
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {crossAnalytics.overview.overallPassRate}%
                  </Typography>
                  <Typography color="text.secondary">Overall Pass Rate</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                    {crossAnalytics.overview.overallPassRate >= 75 ? (
                      <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    ) : (
                      <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <TrendingUpIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                    {crossAnalytics.overview.averageScore}%
                  </Typography>
                  <Typography color="text.secondary">Average Score</Typography>
                  <Chip 
                    label={assessmentAnalyticsApi.getPerformanceLevel(crossAnalytics.overview.averageScore).label}
                    size="small"
                    color={assessmentAnalyticsApi.getPerformanceLevel(crossAnalytics.overview.averageScore).color}
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Performance Trends Chart */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Performance Trends (Last 6 Months)</Typography>
                  <Box height={300}>
                    {crossAnalytics.performanceTrends && crossAnalytics.performanceTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formatTrendData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="monthName" />
                          <YAxis />
                          <ChartTooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="avgScore" 
                            stroke="#8884d8" 
                            name="Avg Score %" 
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="passRate" 
                            stroke="#82ca9d" 
                            name="Pass Rate %" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          No performance trend data available
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Trends will appear as students complete assessments over time
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Assessment Types Distribution */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Assessment Types</Typography>
                  <Box height={300}>
                    {crossAnalytics.assessmentTypes && crossAnalytics.assessmentTypes.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={formatTypeData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ displayType, count }) => `${displayType}: ${count}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {formatTypeData().map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          No assessment types data
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Create different types of assessments to see distribution
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Top Performing Assessments */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                    Top Performing Assessments
                  </Typography>
                  {crossAnalytics.topPerformingAssessments && crossAnalytics.topPerformingAssessments.length > 0 ? (
                    <List>
                      {crossAnalytics.topPerformingAssessments.map((assessment, index) => (
                        <React.Fragment key={assessment.Id}>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                                    {assessment.Title}
                                  </Typography>
                                  <Chip 
                                    label={`${assessment.passRate}%`}
                                    color="success"
                                    size="small"
                                  />
                                </Box>
                              }
                              secondary={
                                <React.Fragment>
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                    {assessment.courseTitle} • {assessmentAnalyticsApi.formatAssessmentType(assessment.Type)}
                                  </span>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={assessment.passRate} 
                                    sx={{ mt: 1, height: 4, borderRadius: 2, display: 'block' }}
                                  />
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                    {assessment.submissions} submissions • Avg: {assessment.avgScore}%
                                  </span>
                                </React.Fragment>
                              }
                            />
                          </ListItem>
                          {index < crossAnalytics.topPerformingAssessments.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Box py={4} textAlign="center">
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        No assessment data available
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Create assessments and have students complete them to see top performers
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Struggling Areas */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarningIcon sx={{ mr: 1, color: 'error.main' }} />
                    Areas Needing Attention
                  </Typography>
                  {crossAnalytics.strugglingAreas && crossAnalytics.strugglingAreas.length > 0 ? (
                    <List>
                      {crossAnalytics.strugglingAreas.map((area, index) => (
                        <React.Fragment key={area.Id}>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                                    {area.Title}
                                  </Typography>
                                  <Chip 
                                    label={`${area.passRate}%`}
                                    color="error"
                                    size="small"
                                  />
                                </Box>
                              }
                              secondary={
                                <React.Fragment>
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                    {area.courseTitle} • {assessmentAnalyticsApi.formatAssessmentType(area.Type)}
                                  </span>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={area.passRate} 
                                    sx={{ 
                                      mt: 1, 
                                      height: 4, 
                                      borderRadius: 2,
                                      display: 'block',
                                      '& .MuiLinearProgress-bar': {
                                        backgroundColor: 'error.main'
                                      }
                                    }}
                                  />
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                    {area.failedAttempts} failures • {area.submissions} submissions
                                  </span>
                                </React.Fragment>
                              }
                            />
                          </ListItem>
                          {index < crossAnalytics.strugglingAreas.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Box py={4} textAlign="center">
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        No struggling areas identified
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Assessment data will highlight areas where students need additional support
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Performance Analysis Tab */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Assessment Type Performance</Typography>
                  {crossAnalytics.assessmentTypes && crossAnalytics.assessmentTypes.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={formatTypeData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="displayType" />
                        <YAxis />
                        <ChartTooltip />
                        <Legend />
                        <Bar dataKey="avgScore" fill="#8884d8" name="Avg Score %" />
                        <Bar dataKey="passRate" fill="#82ca9d" name="Pass Rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box height={400} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        No assessment type data available
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create and assign assessments to see performance comparison by type
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Student Insights Tab */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Course Selection for Detailed Analysis</Typography>
                  {courses && courses.length > 0 ? (
                    <>
                      <Grid container spacing={2}>
                        {courses.map((course) => (
                          <Grid item xs={12} md={6} lg={4} key={course.id}>
                            <Paper 
                              sx={{ 
                                p: 2, 
                                cursor: 'pointer',
                                border: selectedCourseId === course.id ? 2 : 1,
                                borderColor: selectedCourseId === course.id ? 'primary.main' : 'divider',
                                '&:hover': { borderColor: 'primary.main' }
                              }}
                              onClick={() => setSelectedCourseId(course.id)}
                            >
                              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                {course.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {course.students} students • {course.status}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>

                      {selectedCoursePerformance && selectedCoursePerformance.studentPerformance.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="h6" gutterBottom>
                            Student Performance Analysis
                          </Typography>
                          <List>
                            {selectedCoursePerformance.studentPerformance.slice(0, 10).map((student) => (
                          <ListItem key={student.userId}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography>{student.studentName}</Typography>
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Chip 
                                      label={`${student.progressPercentage}% Complete`}
                                      size="small"
                                      color={student.progressPercentage >= 80 ? 'success' : student.progressPercentage >= 60 ? 'warning' : 'error'}
                                    />
                                    <Chip 
                                      label={`Avg: ${student.avgScore}%`}
                                      size="small"
                                      color={assessmentAnalyticsApi.getPerformanceLevel(student.avgScore).color}
                                    />
                                  </Box>
                                </Box>
                              }
                              secondary={
                                <React.Fragment>
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(0, 0, 0, 0.6)' }}>
                                    {student.completedAssessments}/{student.totalAssessments} assessments • 
                                    {student.passedAssessments} passed
                                  </span>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={student.progressPercentage} 
                                    sx={{ mt: 1, height: 4, borderRadius: 2, display: 'block' }}
                                  />
                                </React.Fragment>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                      
                      {selectedCoursePerformance && selectedCoursePerformance.studentPerformance.length === 0 && (
                        <Box sx={{ mt: 3, py: 4, textAlign: 'center' }}>
                          <Typography variant="body1" color="text.secondary" gutterBottom>
                            No student performance data available for this course
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Students need to complete assessments to see performance analytics
                          </Typography>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Box py={6} textAlign="center">
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        No courses available
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create courses to view detailed student performance analytics
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default EnhancedAssessmentAnalyticsDashboard;