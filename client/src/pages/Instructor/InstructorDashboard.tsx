import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Paper,
  Chip,
  LinearProgress,
  Divider,
  Fab,
  ListItemText,
  ListItemIcon,
  Menu,
  MenuItem,
  Pagination,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  Avatar,
  Alert,
  AlertTitle,
  Tooltip,
  Skeleton
} from '@mui/material';
import {
  Add as AddIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Analytics as AnalyticsIcon,
  Publish as PublishIcon,
  Drafts as DraftIcon,
  PlayCircleOutline,
  HourglassEmpty as PendingIcon,
  AttachMoney as MoneyIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { instructorApi, InstructorStats, InstructorCourse, PendingEnrollment } from '../../services/instructorApi';
import { formatCategory, getCategoryGradient } from '../../utils/courseHelpers';
import { useCatalogRealtimeUpdates } from '../../hooks/useCatalogRealtimeUpdates';
import { PageContainer, PageTitle, useResponsive } from '../../components/Responsive';

export const InstructorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [, setTick] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState<InstructorStats>({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    archivedCourses: 0,
    totalStudents: 0,
    totalEnrollments: 0,
    avgRating: 0,
    totalRevenue: 0,
    completionRate: 0,
    pendingEnrollments: 0
  });
  const [pendingEnrollments, setPendingEnrollments] = useState<PendingEnrollment[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // Real-time updates: refresh data silently when courses change
  useCatalogRealtimeUpdates(() => {
    loadStats(true);
    loadCourses(statusFilter, currentPage, true);
    loadPendingEnrollments();
  });

  useEffect(() => {
    loadStats();
    loadCourses('all', 1);
    loadPendingEnrollments();
  }, []);

  // Re-render every 60s so relative timestamps ("3 minutes ago") stay fresh
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const loadStats = async (silent: boolean = false) => {
    try {
      if (!silent) setStatsLoading(true);
      const statsData = await instructorApi.getStats();
      setStats(statsData);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
      }
    } finally {
      if (!silent) setStatsLoading(false);
    }
  };

  const loadCourses = async (status: string = 'all', page: number = 1, silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const filterStatus = status === 'all' ? undefined : status;
      const coursesResponse = await instructorApi.getCourses(filterStatus, page, 12);
      setCourses(coursesResponse.courses);
      setCurrentPage(coursesResponse.pagination.currentPage);
      setTotalPages(coursesResponse.pagination.totalPages);
      setTotalCourses(coursesResponse.pagination.totalCourses);
    } catch (error: any) {
      if (!silent) {
        toast.error('Failed to load courses');
      }
      if (!silent) setCourses([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadPendingEnrollments = async () => {
    try {
      const data = await instructorApi.getPendingEnrollments();
      setPendingEnrollments(data.enrollments);
    } catch {
      // Non-critical — silently ignore
    }
  };

  const handleStatusFilterChange = (_event: React.SyntheticEvent, newValue: string) => {
    setStatusFilter(newValue);
    setCurrentPage(1);
    loadCourses(newValue, 1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    loadCourses(statusFilter, value);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleCourseMenuOpen = (event: React.MouseEvent<HTMLElement>, courseId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedCourse(courseId);
  };

  const handleCourseMenuClose = () => {
    setAnchorEl(null);
    setSelectedCourse(null);
  };

  const handleApproveEnrollment = async (enrollmentId: string) => {
    try {
      await instructorApi.approveEnrollment(enrollmentId);
      toast.success('Enrollment approved');
      loadPendingEnrollments();
      loadStats(true);
      loadCourses(statusFilter, currentPage, true);
    } catch {
      toast.error('Failed to approve enrollment');
    }
  };

  const handleRejectEnrollment = async (enrollmentId: string) => {
    try {
      await instructorApi.rejectEnrollment(enrollmentId);
      toast.success('Enrollment rejected');
      loadPendingEnrollments();
      loadStats(true);
    } catch {
      toast.error('Failed to reject enrollment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <PublishIcon fontSize="small" />;
      case 'draft': return <DraftIcon fontSize="small" />;
      default: return <ArchiveIcon fontSize="small" />;
    }
  };

  const StatCard = ({ icon, value, label, color, onClick, testId, badge }: {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    color?: string;
    onClick?: () => void;
    testId?: string;
    badge?: number;
  }) => (
    <Card 
      sx={{ 
        height: '100%', 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 3 } : {},
      }} 
      onClick={onClick}
      data-testid={testId}
    >
      <CardContent sx={{ 
        textAlign: 'center', 
        py: 2.5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 140
      }}>
        <Box sx={{ height: 40, display: 'flex', alignItems: 'center', mb: 1 }}>
          {badge !== undefined && badge > 0 ? (
            <Badge badgeContent={badge} color="error" max={99}>
              {icon}
            </Badge>
          ) : icon}
        </Box>
        {statsLoading ? (
          <Skeleton variant="text" width={60} height={40} />
        ) : (
          <Typography variant="h4" component="div" sx={{ mb: 0.5, color: color || 'text.primary', fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
            {value}
          </Typography>
        )}
        <Typography color="text.secondary" variant="body2">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Header />
      <PageContainer>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <PageTitle
          subtitle="Manage your courses and track your teaching performance"
          icon={<SchoolIcon sx={{ fontSize: 28 }} />}
        >
          Instructor Dashboard
        </PageTitle>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/instructor/courses/create?type=blank')}
          sx={{ borderRadius: 2 }}
          size={isMobile ? 'small' : 'medium'}
          data-testid="instructor-create-course-header-button"
        >
          Create Course
        </Button>
      </Box>

      {/* Stats Overview - 4 primary cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<SchoolIcon color="primary" sx={{ fontSize: 40 }} />}
            value={stats.totalCourses}
            label="Total Courses"
            testId="instructor-total-courses-card"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PeopleIcon color="primary" sx={{ fontSize: 40 }} />}
            value={stats.totalStudents.toLocaleString()}
            label="Total Students"
            testId="instructor-total-students-card"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<MoneyIcon color="primary" sx={{ fontSize: 40 }} />}
            value={`$${stats.totalRevenue.toLocaleString()}`}
            label="Total Revenue"
            testId="instructor-total-revenue-card"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PendingIcon sx={{ fontSize: 40, color: stats.pendingEnrollments > 0 ? 'warning.main' : 'text.disabled' }} />}
            value={stats.pendingEnrollments}
            label="Pending Approvals"
            badge={stats.pendingEnrollments}
            onClick={stats.pendingEnrollments > 0 ? () => {
              const el = document.getElementById('pending-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            } : undefined}
            testId="instructor-pending-enrollments-card"
          />
        </Grid>
      </Grid>

      {/* Secondary stats row */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Published</Typography>
            <Typography variant="h6" color="success.main">{stats.publishedCourses}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Drafts</Typography>
            <Typography variant="h6" color="warning.main">{stats.draftCourses}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Avg Rating</Typography>
            <Typography variant="h6" sx={{ color: 'warning.main' }}>
              {stats.avgRating > 0 ? `${Number(stats.avgRating).toFixed(1)} ★` : 'N/A'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 1.5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
            <Typography variant="h6" color="primary">
              {stats.completionRate > 0 ? `${stats.completionRate}%` : 'N/A'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Pending Enrollment Approvals */}
      {pendingEnrollments.length > 0 && (
        <Box id="pending-section" sx={{ mb: 4 }}>
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={() => navigate('/instructor/students')}
              >
                View All
              </Button>
            }
          >
            <AlertTitle>Pending Enrollment Approvals ({pendingEnrollments.length})</AlertTitle>
            Students are waiting for your approval to enroll in your courses.
          </Alert>
          <Grid container spacing={2}>
            {pendingEnrollments.slice(0, 4).map((enrollment) => (
              <Grid item xs={12} sm={6} md={3} key={enrollment.EnrollmentId}>
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar 
                      src={enrollment.ProfilePicture || undefined}
                      sx={{ width: 32, height: 32 }}
                    >
                      {enrollment.FirstName?.[0]}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {enrollment.FirstName} {enrollment.LastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {enrollment.CourseTitle}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Requested {formatDistanceToNow(new Date(enrollment.EnrolledAt), { addSuffix: true })}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      fullWidth
                      onClick={() => handleApproveEnrollment(enrollment.EnrollmentId)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      fullWidth
                      onClick={() => handleRejectEnrollment(enrollment.EnrollmentId)}
                    >
                      Reject
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
          {pendingEnrollments.length > 4 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              +{pendingEnrollments.length - 4} more pending — <Button size="small" onClick={() => navigate('/instructor/students')}>View All</Button>
            </Typography>
          )}
        </Box>
      )}

      {/* Course List Header with Tabs */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6">
          My Courses ({totalCourses})
        </Typography>
        <Tabs
          value={statusFilter}
          onChange={handleStatusFilterChange}
          textColor="primary"
          indicatorColor="primary"
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons="auto"
          sx={{ minHeight: 36 }}
        >
          <Tab label="All" value="all" sx={{ minHeight: 36, py: 0 }} />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Published
                {stats.publishedCourses > 0 && (
                  <Chip label={stats.publishedCourses} size="small" color="success" sx={{ height: 20, fontSize: '0.7rem' }} />
                )}
              </Box>
            } 
            value="published" 
            sx={{ minHeight: 36, py: 0 }} 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Drafts
                {stats.draftCourses > 0 && (
                  <Chip label={stats.draftCourses} size="small" color="warning" sx={{ height: 20, fontSize: '0.7rem' }} />
                )}
              </Box>
            } 
            value="draft" 
            sx={{ minHeight: 36, py: 0 }} 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Archived
                {stats.archivedCourses > 0 && (
                  <Chip label={stats.archivedCourses} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                )}
              </Box>
            } 
            value="archived" 
            sx={{ minHeight: 36, py: 0 }} 
          />
        </Tabs>
      </Box>

      {/* Loading Indicator */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={3}>
        {!loading && courses.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {statusFilter === 'all' ? 'No courses created yet' : `No ${statusFilter} courses`}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {statusFilter === 'all' 
                  ? 'Create your first course to start teaching and sharing your knowledge!'
                  : `You don't have any ${statusFilter} courses. Try a different filter.`
                }
              </Typography>
              {statusFilter === 'all' && (
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/instructor/courses/create?type=blank')}
                  size="large"
                >
                  Create Your First Course
                </Button>
              )}
            </Paper>
          </Grid>
        ) : (
          courses.map((course) => (
            <Grid item xs={12} sm={6} md={4} key={course.id}>
              <Card 
                onClick={() => navigate(`/instructor/courses/${course.id}/edit`)}
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                  },
                  '&:hover::after': {
                    opacity: 1,
                  },
                }}
              >
                <Box
                  sx={{
                    height: 200,
                    backgroundImage: course.thumbnail ? `url(${course.thumbnail})` : getCategoryGradient(course.category),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    '&::before': course.thumbnail ? {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 100%)',
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                    } : {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)',
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                    },
                    '.MuiCard-root:hover &::before': {
                      opacity: 1,
                    },
                  }}
                >
                  {!course.thumbnail && (
                    <PlayCircleOutline 
                      sx={{ 
                        fontSize: 56, 
                        color: 'white', 
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                        transition: 'all 0.3s ease',
                        '.MuiCard-root:hover &': {
                          transform: 'scale(1.2)',
                        },
                      }} 
                    />
                  )}
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <Chip
                      icon={getStatusIcon(course.status)}
                      label={course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                      color={getStatusColor(course.status) as any}
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(8px)',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                    <IconButton
                      size="small"
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(8px)',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,1)',
                          transform: 'scale(1.1)',
                        },
                      }}
                      onClick={(e) => handleCourseMenuOpen(e, course.id)}
                      data-testid={`instructor-dashboard-course-menu-${course.id}-button`}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ 
                    position: 'absolute', 
                    bottom: 12, 
                    left: 12, 
                    display: 'flex', 
                    gap: 1 
                  }}>
                    {course.category && (
                      <Chip
                        label={formatCategory(course.category)}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.25)',
                          backdropFilter: 'blur(8px)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          border: '1px solid rgba(255,255,255,0.3)',
                        }}
                      />
                    )}
                    {course.level && (
                      <Chip
                        label={course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                        size="small"
                        sx={{
                          bgcolor: course.level === 'beginner' 
                            ? 'rgba(76, 175, 80, 0.9)' 
                            : course.level === 'intermediate' 
                            ? 'rgba(255, 152, 0, 0.9)' 
                            : course.level === 'advanced'
                            ? 'rgba(244, 67, 54, 0.9)'
                            : 'rgba(183, 28, 28, 0.9)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          border: '1px solid rgba(255,255,255,0.3)',
                        }}
                      />
                    )}
                  </Box>
                </Box>
              
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" component="h3" gutterBottom noWrap>
                  {course.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 2, 
                    flexGrow: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minHeight: '2.5em'
                  }}
                >
                  {course.description}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${course.students} students`}
                    size="small" 
                    sx={{ 
                      fontWeight: 500,
                      fontSize: '0.7rem',
                      height: 24,
                    }}
                  />
                  <Chip 
                    label={`${course.lessons} lessons`}
                    size="small" 
                    variant="outlined"
                    sx={{ 
                      fontWeight: 500,
                      fontSize: '0.7rem',
                      borderColor: 'divider',
                      height: 24,
                    }}
                  />
                </Box>

                {course.status === 'draft' && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Publish Readiness
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {course.progress}%
                      </Typography>
                    </Box>
                    <Tooltip title={
                      course.progress < 100 
                        ? 'Add description, thumbnail, and 3+ lessons to reach 100%' 
                        : 'Ready to publish!'
                    }>
                      <LinearProgress 
                        variant="determinate" 
                        value={course.progress} 
                        color={course.progress >= 100 ? 'success' : 'primary'}
                      />
                    </Tooltip>
                  </Box>
                )}
                
                {course.status === 'published' && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Rating:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                        {course.rating > 0 ? `${course.rating} ★` : 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Revenue:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                        ${course.revenue}
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/instructor/courses/${course.id}/edit`);
                      }}
                      fullWidth
                      data-testid={`instructor-course-edit-button-${course.id}`}
                    >
                      Edit Course
                    </Button>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/courses/${course.id}`);
                      }}
                      variant="outlined"
                      fullWidth
                      data-testid={`instructor-course-preview-button-${course.id}`}
                    >
                      Preview
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<AnalyticsIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/instructor/analytics?courseId=${course.id}`);
                      }}
                      variant="outlined"
                      fullWidth
                      data-testid={`instructor-course-analytics-button-${course.id}`}
                    >
                      Analytics
                    </Button>
                    <Button
                      size="small"
                      startIcon={<PeopleIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/instructor/students?courseId=${course.id}`);
                      }}
                      variant="outlined"
                      fullWidth
                      data-testid={`instructor-course-students-button-${course.id}`}
                    >
                      Students
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          ))
        )}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size={isMobile ? 'small' : 'large'}
            siblingCount={isMobile ? 0 : 1}
            showFirstButton
            showLastButton
            disabled={loading}
          />
        </Box>
      )}

      {/* Course Count Info */}
      {totalCourses > 0 && (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2, mb: 4 }}>
          Showing {(currentPage - 1) * 12 + 1} - {Math.min(currentPage * 12, totalCourses)} of {totalCourses} courses
        </Typography>
      )}

      </PageContainer>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: { xs: 88, md: 24 }, right: { xs: 16, md: 24 } }}
        onClick={() => navigate('/instructor/courses/create?type=blank')}
        data-testid="instructor-fab-create-course"
      >
        <AddIcon />
      </Fab>

      {/* Course Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCourseMenuClose}
      >
        <MenuItem onClick={() => {
          navigate(`/instructor/courses/${selectedCourse}/edit`);
          handleCourseMenuClose();
        }} data-testid="instructor-dashboard-course-menu-edit">
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Course</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/courses/${selectedCourse}`);
          handleCourseMenuClose();
        }} data-testid="instructor-dashboard-course-menu-preview">
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Preview Course</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/instructor/analytics?courseId=${selectedCourse}`);
          handleCourseMenuClose();
        }} data-testid="instructor-dashboard-course-menu-analytics">
          <ListItemIcon><AnalyticsIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View Analytics</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/instructor/students?courseId=${selectedCourse}`);
          handleCourseMenuClose();
        }} data-testid="instructor-dashboard-course-menu-students">
          <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Manage Students</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};