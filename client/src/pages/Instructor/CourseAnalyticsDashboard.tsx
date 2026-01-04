import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  PlayCircle as PlayCircleIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { HeaderV4 as Header } from '../../components/Navigation/HeaderV4';
import { PageHeader } from '../../components/Navigation/PageHeader';
import { analyticsApi, type CourseAnalytics, type DashboardAnalytics } from '../../services/analyticsApi';
import { instructorApi, type InstructorCourse } from '../../services/instructorApi';

const PERFORMANCE_COLORS = ['#f44336', '#ff9800', '#ffc107', '#4caf50', '#2196f3', '#9c27b0'];

export const CourseAnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('dashboard');
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardAnalytics | null>(null);
  const [courseData, setCourseData] = useState<CourseAnalytics | null>(null);
  const [performanceDistribution, setPerformanceDistribution] = useState<any[]>([]);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse === 'dashboard') {
      loadDashboardData();
    } else {
      loadCourseData(selectedCourse);
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      const coursesData = await instructorApi.getCourses();
      setCourses(coursesData);
    } catch (err) {
      console.error('Error loading courses:', err);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await analyticsApi.getDashboardAnalytics();
      setDashboardData(data);
      setCourseData(null);
      setPerformanceDistribution([]);
    } catch (err: any) {
      console.error('Error loading dashboard analytics:', err);
      setError('Failed to load dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseData = async (courseId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const [analytics, distribution] = await Promise.all([
        analyticsApi.getCourseAnalytics(courseId),
        analyticsApi.getCoursePerformanceDistribution(courseId)
      ]);
      
      setCourseData(analytics);
      setPerformanceDistribution(distribution);
      setDashboardData(null);
    } catch (err: any) {
      console.error('Error loading course analytics:', err);
      setError(`Failed to load course analytics: ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <>
      <Header />
      <PageHeader
        title="Analytics Hub"
        subtitle={selectedCourse === 'dashboard' 
          ? 'Overview of all your courses' 
          : courses.find(c => c.id?.toString() === selectedCourse)?.title || 'Course Analytics'
        }
        icon={<TrendingUpIcon sx={{ fontSize: 32 }} />}
        actions={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="textSecondary">
              View:
            </Typography>
            <Select
              data-testid="course-analytics-course-select"
              size="small"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="dashboard">All Courses Overview</MenuItem>
              {courses.map((course, index) => (
                <MenuItem key={course.id || `course-${index}`} value={course.id?.toString() || course.id}>
                  {course.title}
                </MenuItem>
              ))}
            </Select>
          </Box>
        }
      />
      <Container maxWidth="xl" sx={{ py: 4 }}>

        {/* Dashboard or Course Specific View */}
        {selectedCourse === 'dashboard' && dashboardData && (
          <DashboardView data={dashboardData} />
        )}

        {selectedCourse !== 'dashboard' && courseData && (
          <CourseView 
            data={courseData} 
            distribution={performanceDistribution}
            courseTitle={courses.find(c => c.id?.toString() === selectedCourse)?.title || 'Course'}
          />
        )}
      </Container>
    </>
  );
};

const DashboardView: React.FC<{ data: DashboardAnalytics }> = ({ data }) => {
  const { overview, coursePerformance, monthlyTrends, topCourses } = data;

  return (
    <Grid container spacing={3}>
      {/* Overview Stats */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <SchoolIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">{overview.totalCourses || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Courses
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PeopleIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">{overview.totalStudents || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Students
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">{overview.totalEnrollments || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Enrollments
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CheckCircleIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">{Math.round(overview.avgProgress || 0)}%</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Progress
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TimeIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">
                      {Math.round((overview.totalTimeSpent || 0) / 60)}h
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Time
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Monthly Trends Chart */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Monthly Enrollment Trends
            </Typography>
            <Box height={300}>
              {monthlyTrends && monthlyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="enrollments" stroke="#2196f3" name="Enrollments" />
                    <Line type="monotone" dataKey="uniqueStudents" stroke="#4caf50" name="Unique Students" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No enrollment data available
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enrollment trends will appear once students start enrolling in courses
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Courses */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Performing Courses
            </Typography>
            {topCourses && topCourses.length > 0 ? (
              <List dense>
                {topCourses.map((course, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={course.Title}
                      secondary={`${course.enrollments} enrollments • ${Math.round(course.avgProgress)}% avg progress`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box py={4} textAlign="center">
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No course performance data yet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Top courses will appear here based on completion rates
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Course Performance Table */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Course Performance Overview
            </Typography>
            {coursePerformance && coursePerformance.length > 0 ? (
              <Box overflow="auto">
                <Grid container spacing={2}>
                  {coursePerformance.map((course, index) => (
                    <Grid item xs={12} sm={6} md={4} key={course.Id || index}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="medium" noWrap>
                          {course.Title}
                        </Typography>
                        <Box mt={1}>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">Students:</Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {course.enrolledStudents}
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">Avg Progress:</Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {Math.round(course.avgProgress || 0)}%
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">Completed:</Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {course.completedStudents}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={course.avgProgress || 0}
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ) : (
              <Box py={6} textAlign="center">
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No course performance data available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create courses and enroll students to see performance metrics
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const CourseView: React.FC<{ 
  data: CourseAnalytics; 
  distribution: any[];
  courseTitle: string;
}> = ({ data, distribution, courseTitle }) => {
  const { enrollment, progress, engagement, recentActivity } = data;

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Grid container spacing={3}>
      {/* Course Header */}
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom>
          {courseTitle} Analytics
        </Typography>
      </Grid>

      {/* Key Metrics */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PeopleIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">{enrollment.totalEnrollments || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Enrollments
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">{progress.completedStudents || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Completed
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <PlayCircleIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">{progress.inProgressStudents || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      In Progress
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography variant="h4">{Math.round(progress.avgProgress || 0)}%</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Progress
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Performance Distribution Chart */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Student Performance Distribution
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ progressRange, studentCount }) => `${progressRange}: ${studentCount}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="studentCount"
                    nameKey="progressRange"
                  >
                    {distribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PERFORMANCE_COLORS[index % PERFORMANCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Engagement Stats */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Student Engagement
            </Typography>
            <Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Weekly Active Users:</Typography>
                <Chip 
                  label={engagement.weeklyActiveUsers || 0} 
                  color="primary" 
                  size="small" 
                />
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Monthly Active Users:</Typography>
                <Chip 
                  label={engagement.monthlyActiveUsers || 0} 
                  color="secondary" 
                  size="small" 
                />
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body2">Avg Session Time:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {Math.round(engagement.avgSessionTime || 0)} minutes
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Total Active Users:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {engagement.activeUsers || 0}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Student Activity
            </Typography>
            <List>
              {recentActivity.map((activity, index) => (
                <ListItem key={index} divider={index < recentActivity.length - 1}>
                  <ListItemAvatar>
                    <Avatar>
                      {activity.FirstName[0]}{activity.LastName[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${activity.FirstName} ${activity.LastName}`}
                    secondary={
                      <React.Fragment>
                        <span style={{ display: 'block', color: 'rgba(0, 0, 0, 0.6)' }}>
                          {activity.Email}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <LinearProgress
                            variant="determinate"
                            value={activity.OverallProgress}
                            sx={{ flexGrow: 1, height: 4 }}
                          />
                          <span style={{ fontSize: '0.75rem' }}>
                            {activity.OverallProgress}%
                          </span>
                        </span>
                      </React.Fragment>
                    }
                  />
                  <Box textAlign="right">
                    <Chip
                      label={activity.EnrollmentStatus}
                      color={activity.EnrollmentStatus === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                    <Typography variant="caption" display="block" mt={0.5}>
                      {activity.LastAccessedAt ? formatDate(activity.LastAccessedAt) : 'Never'}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default CourseAnalyticsDashboard;