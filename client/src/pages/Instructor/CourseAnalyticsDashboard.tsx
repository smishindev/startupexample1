import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  ListItemAvatar,
  Avatar,
  Paper,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  PlayCircle as PlayCircleIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon
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
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer, PageTitle } from '../../components/Responsive';
import { analyticsApi, type CourseAnalytics, type DashboardAnalytics } from '../../services/analyticsApi';
import { instructorApi, type InstructorCourse } from '../../services/instructorApi';
import { CourseSelector } from '../../components/Common/CourseSelector';

const PERFORMANCE_COLORS = ['#f44336', '#ff9800', '#ffc107', '#4caf50', '#2196f3', '#9c27b0'];

export const CourseAnalyticsDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('dashboard');
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardAnalytics | null>(null);
  const [courseData, setCourseData] = useState<CourseAnalytics | null>(null);
  const [performanceDistribution, setPerformanceDistribution] = useState<any[]>([]);

  useEffect(() => {
    loadCourses();
  }, []);

  // Set initial selected course from URL parameter
  useEffect(() => {
    const courseIdFromUrl = searchParams.get('courseId');
    if (courseIdFromUrl && courses.length > 0) {
      // Verify the course exists in the instructor's courses
      const courseExists = courses.some(c => c.id === courseIdFromUrl);
      if (courseExists) {
        setSelectedCourse(courseIdFromUrl);
      }
    }
  }, [searchParams, courses]);

  useEffect(() => {
    if (selectedCourse === 'dashboard') {
      loadDashboardData();
    } else {
      loadCourseData(selectedCourse);
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      setCoursesError(null);
      const courses = await instructorApi.getCoursesForDropdown();
      setCourses(courses);
    } catch (err) {
      console.error('Error loading courses:', err);
      setCoursesError('Failed to load courses list.');
    }
  };

  const handleRefresh = () => {
    loadCourses();
    if (selectedCourse === 'dashboard') {
      loadDashboardData();
    } else {
      loadCourseData(selectedCourse);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDashboardData(null);
      setCourseData(null);
      setPerformanceDistribution([]);
      
      const data = await analyticsApi.getDashboardAnalytics();
      setDashboardData(data);
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
      setDashboardData(null);
      setCourseData(null);
      setPerformanceDistribution([]);
      
      const [analytics, distribution] = await Promise.all([
        analyticsApi.getCourseAnalytics(courseId),
        analyticsApi.getCoursePerformanceDistribution(courseId)
      ]);
      
      setCourseData(analytics);
      setPerformanceDistribution(distribution);
    } catch (err: any) {
      console.error('Error loading course analytics:', err);
      setError(`Failed to load course analytics: ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <PageContainer>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <PageTitle
          subtitle={selectedCourse === 'dashboard' 
            ? 'Overview of all your courses' 
            : courses.find(c => c.id?.toString() === selectedCourse)?.title || 'Course Analytics'
          }
          icon={<TrendingUpIcon sx={{ fontSize: 28 }} />}
        >
          Analytics Hub
        </PageTitle>
        <Box display="flex" alignItems="center" gap={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <IconButton onClick={handleRefresh} color="primary" size="small" disabled={loading} data-testid="course-analytics-refresh-button">
            <RefreshIcon />
          </IconButton>
          <CourseSelector
            courses={courses}
            value={selectedCourse}
            onChange={(id: string) => setSelectedCourse(id)}
            allOption={{ value: 'dashboard', label: 'All Courses Overview' }}
            disabled={loading}
            size="small"
            sx={{ minWidth: { xs: 0, sm: 200 }, flex: { xs: 1, sm: 'none' } }}
            testId="course-analytics-course-select"
          />
        </Box>
      </Box>

        {coursesError && (
          <Alert severity="warning" sx={{ mb: 2 }}>{coursesError}</Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Dashboard or Course Specific View */}
            {!error && selectedCourse === 'dashboard' && dashboardData && (
              <DashboardView data={dashboardData} />
            )}

            {!error && selectedCourse !== 'dashboard' && courseData && (
              <CourseView 
                data={courseData} 
                distribution={performanceDistribution}
                courseTitle={courses.find(c => c.id?.toString() === selectedCourse)?.title || 'Course'}
              />
            )}
          </>
        )}
      </PageContainer>
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
          <Grid item xs={6} sm={4} md>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Box display="flex" alignItems="center">
                  <SchoolIcon color="primary" sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" noWrap>{overview.totalCourses || 0}</Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
                      Total Courses
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Box display="flex" alignItems="center">
                  <PeopleIcon color="primary" sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" noWrap>{overview.totalStudents || 0}</Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
                      Total Students
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Box display="flex" alignItems="center">
                  <TrendingUpIcon color="primary" sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" noWrap>{overview.totalEnrollments || 0}</Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
                      Enrollments
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Box display="flex" alignItems="center">
                  <CheckCircleIcon color="primary" sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" noWrap>{Math.round(overview.avgProgress || 0)}%</Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
                      Avg Progress
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Box display="flex" alignItems="center">
                  <TimeIcon color="primary" sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" noWrap>
                      {Math.round((overview.totalTimeSpent || 0) / 60)}h
                    </Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
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
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" textAlign="center">
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
            <CoursePerformanceTable coursePerformance={coursePerformance} />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// --- Sortable, searchable, paginated Course Performance Table ---
type SortKey = 'Title' | 'enrolledStudents' | 'avgProgress' | 'completedStudents' | 'avgTimeSpent';
type SortDir = 'asc' | 'desc';

const CoursePerformanceTable: React.FC<{
  coursePerformance: DashboardAnalytics['coursePerformance'];
}> = ({ coursePerformance }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('enrolledStudents');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleSort = (column: SortKey) => {
    if (sortBy === column) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
    setPage(0);
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return coursePerformance;
    return coursePerformance.filter(c => c.Title?.toLowerCase().includes(term));
  }, [coursePerformance, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      if (sortBy === 'Title') {
        aVal = (a.Title || '').toLowerCase();
        bVal = (b.Title || '').toLowerCase();
      } else {
        aVal = (a as any)[sortBy] || 0;
        bVal = (b as any)[sortBy] || 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortBy, sortDir]);

  const paged = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getProgressColor = (progress: number): string => {
    if (progress >= 70) return '#4caf50';
    if (progress >= 40) return '#ff9800';
    return '#f44336';
  };

  if (!coursePerformance || coursePerformance.length === 0) {
    return (
      <Box py={6} textAlign="center">
        <Typography variant="h6" gutterBottom>Course Performance Overview</Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          No course performance data available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create courses and enroll students to see performance metrics
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6">
          Course Performance Overview
          <Chip label={`${filtered.length} of ${coursePerformance.length}`} size="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
        </Typography>
        <TextField
          size="small"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: { xs: 0, sm: 250 }, width: { xs: '100%', sm: 'auto' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 220 }}>
                <TableSortLabel
                  active={sortBy === 'Title'}
                  direction={sortBy === 'Title' ? sortDir : 'asc'}
                  onClick={() => handleSort('Title')}
                >
                  Course
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={sortBy === 'enrolledStudents'}
                  direction={sortBy === 'enrolledStudents' ? sortDir : 'asc'}
                  onClick={() => handleSort('enrolledStudents')}
                >
                  Students
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 180 }}>
                <TableSortLabel
                  active={sortBy === 'avgProgress'}
                  direction={sortBy === 'avgProgress' ? sortDir : 'asc'}
                  onClick={() => handleSort('avgProgress')}
                >
                  Avg Progress
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={sortBy === 'completedStudents'}
                  direction={sortBy === 'completedStudents' ? sortDir : 'asc'}
                  onClick={() => handleSort('completedStudents')}
                >
                  Completed
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                <TableSortLabel
                  active={sortBy === 'avgTimeSpent'}
                  direction={sortBy === 'avgTimeSpent' ? sortDir : 'asc'}
                  onClick={() => handleSort('avgTimeSpent')}
                >
                  Avg Time
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paged.length > 0 ? paged.map((course, index) => {
              const progress = Math.round(course.avgProgress || 0);
              return (
                <TableRow key={course.Id || `course-${page * rowsPerPage + index}`} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 300 }}>
                      {course.Title}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={course.enrolledStudents} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 8,
                            borderRadius: 1,
                            bgcolor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getProgressColor(progress),
                            },
                          }}
                        />
                      </Box>
                      <Typography variant="body2" fontWeight="medium" sx={{ minWidth: 40, textAlign: 'right' }}>
                        {progress}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    {course.completedStudents}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {Math.round((course.avgTimeSpent || 0))} min
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No courses match "{search}"
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        showFirstButton
        showLastButton
        sx={{
          '.MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'center' },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          },
        }}
      />
    </Box>
  );
};

const CourseView: React.FC<{ 
  data: CourseAnalytics; 
  distribution: any[];
  courseTitle: string;
}> = ({ data, distribution, courseTitle }) => {
  const { enrollment, progress, engagement, recentActivity } = data;
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down('sm'));

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Grid container spacing={3}>
      {/* Course Header */}
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom noWrap sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          {courseTitle} Analytics
        </Typography>
      </Grid>

      {/* Key Metrics */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Box display="flex" alignItems="center">
                  <PeopleIcon color="primary" sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" noWrap>{enrollment.totalEnrollments || 0}</Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
                      Enrollments
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Box display="flex" alignItems="center">
                  <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" noWrap>{progress.completedStudents || 0}</Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
                      Completed
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Box display="flex" alignItems="center">
                  <PlayCircleIcon color="primary" sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" noWrap>{progress.inProgressStudents || 0}</Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
                      In Progress
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Box display="flex" alignItems="center">
                  <TrendingUpIcon color="primary" sx={{ mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" noWrap>{Math.round(progress.avgProgress || 0)}%</Typography>
                    <Typography variant="caption" color="textSecondary" noWrap>
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
              {distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ progressRange, studentCount, cx: pieCx, x }) => {
                        if (isMobileView) return null;
                        // Shorten label when it's on the inner side
                        const isLeft = x < pieCx;
                        const short = progressRange?.replace('-', '–');
                        return isLeft ? `${studentCount}` : `${short}: ${studentCount}`;
                      }}
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
              ) : (
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" textAlign="center">
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No student progress data yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Distribution will appear once students begin the course
                  </Typography>
                </Box>
              )}
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
            {recentActivity.length === 0 ? (
              <Box py={4} textAlign="center">
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No recent student activity
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Activity will appear here as students access the course
                </Typography>
              </Box>
            ) : (
            <List>
              {recentActivity.map((activity, index) => (
                <ListItem
                  key={index}
                  divider={index < recentActivity.length - 1}
                  sx={{
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    gap: { xs: 1, sm: 0 },
                    alignItems: 'flex-start',
                  }}
                >
                  <ListItemAvatar sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <Avatar>
                      {activity.FirstName?.[0]?.toUpperCase() || ''}{activity.LastName?.[0]?.toUpperCase() || ''}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${activity.FirstName} ${activity.LastName}`}
                    primaryTypographyProps={{ noWrap: true }}
                    secondary={
                      <React.Fragment>
                        <Typography component="span" variant="caption" color="text.secondary" display="block" noWrap>
                          {activity.Email || 'Email hidden'}
                        </Typography>
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={activity.OverallProgress}
                            sx={{ flexGrow: 1, height: 4 }}
                          />
                          <Typography component="span" variant="caption">
                            {activity.OverallProgress}%
                          </Typography>
                        </Box>
                      </React.Fragment>
                    }
                    sx={{ minWidth: 0 }}
                  />
                  <Box sx={{ textAlign: 'right', flexShrink: 0, ml: { xs: 0, sm: 2 }, width: { xs: '100%', sm: 'auto' }, display: 'flex', flexDirection: { xs: 'row', sm: 'column' }, alignItems: { xs: 'center', sm: 'flex-end' }, gap: 0.5 }}>
                    <Chip
                      label={activity.EnrollmentStatus}
                      color={activity.EnrollmentStatus === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {activity.LastAccessedAt ? formatDate(activity.LastAccessedAt) : 'Never'}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default CourseAnalyticsDashboard;