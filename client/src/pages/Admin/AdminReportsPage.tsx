import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Skeleton,
  Avatar,
  Tooltip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  Tabs,
  Tab,
  alpha,
  useTheme,
  Stack,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from '@mui/material';
import {
  Assessment as ReportsIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  History as AuditIcon,
  HealthAndSafety as HealthIcon,
  Star as StarIcon,
  People as PeopleIcon,
  EmojiEvents as TrophyIcon,
  Storage as StorageIcon,
  CheckCircle as OkIcon,
  Refresh as RefreshIcon,
  MenuBook as CourseIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer, PageTitle, useResponsive } from '../../components/Responsive';
import {
  adminApi,
  SystemHealth,
  AuditLogEntry,
  PaginatedAuditLog,
  PopularCourse,
  InstructorLeaderboardEntry,
} from '../../services/adminApi';

// ── Helpers ───────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);

const formatDate = (d: string | null) => {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
};

const formatDateTime = (d: string | null) => {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d, yyyy h:mm a'); } catch { return d; }
};

const statusColor = (s: string): 'success' | 'warning' | 'default' | 'error' => {
  switch (s) {
    case 'published': return 'success';
    case 'draft': return 'warning';
    case 'archived': return 'default';
    case 'deleted': return 'error';
    default: return 'default';
  }
};

// ── Tab Panel ─────────────────────────────────────────────────────

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
    {value === index && children}
  </Box>
);

// ── Main Component ────────────────────────────────────────────────

export const AdminReportsPage: React.FC = () => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const [tab, setTab] = useState(0);

  // Popular courses
  const [courses, setCourses] = useState<PopularCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Instructor leaderboard
  const [instructors, setInstructors] = useState<InstructorLeaderboardEntry[]>([]);
  const [instructorsLoading, setInstructorsLoading] = useState(true);

  // Audit log
  const [auditData, setAuditData] = useState<PaginatedAuditLog | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditPage, setAuditPage] = useState(1);
  const [auditType, setAuditType] = useState('all');

  // System health
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // ── Fetchers ────────────────────────────────────────────────────

  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const data = await adminApi.getPopularCourses(20);
      setCourses(data);
    } catch {
      toast.error('Failed to load popular courses');
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  const fetchInstructors = useCallback(async () => {
    setInstructorsLoading(true);
    try {
      const data = await adminApi.getInstructorLeaderboard(20);
      setInstructors(data);
    } catch {
      toast.error('Failed to load instructor leaderboard');
    } finally {
      setInstructorsLoading(false);
    }
  }, []);

  const fetchAuditLog = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await adminApi.getAuditLog({ page: auditPage, limit: 20, type: auditType });
      setAuditData(data);
    } catch {
      toast.error('Failed to load audit log');
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, auditType]);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await adminApi.getSystemHealth();
      setHealth(data);
    } catch {
      toast.error('Failed to load system health');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Fetch data when tab changes
  useEffect(() => {
    if (tab === 0) fetchCourses();
    else if (tab === 1) fetchInstructors();
    else if (tab === 2) fetchAuditLog();
    else if (tab === 3) fetchHealth();
  }, [tab, fetchCourses, fetchInstructors, fetchAuditLog, fetchHealth]);

  // ── Refresh handler ─────────────────────────────────────────────
  const handleRefresh = () => {
    if (tab === 0) fetchCourses();
    else if (tab === 1) fetchInstructors();
    else if (tab === 2) fetchAuditLog();
    else if (tab === 3) fetchHealth();
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <>
      <Header />
      <PageContainer>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <PageTitle subtitle="Popular courses, instructor rankings, audit trail & system health" icon={<ReportsIcon />}>
            Reports
          </PageTitle>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── Tabs ──────────────────────────────────────────── */}
        <Card sx={{ mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant={isMobile ? 'scrollable' : 'fullWidth'}
            scrollButtons={isMobile ? 'auto' : false}
            allowScrollButtonsMobile
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              icon={<TrendingUpIcon />}
              iconPosition="start"
              label={isMobile ? 'Courses' : 'Popular Courses'}
              sx={{ textTransform: 'none', minHeight: 48 }}
              data-testid="admin-reports-tab-courses"
            />
            <Tab
              icon={<TrophyIcon />}
              iconPosition="start"
              label={isMobile ? 'Instructors' : 'Top Instructors'}
              sx={{ textTransform: 'none', minHeight: 48 }}
              data-testid="admin-reports-tab-instructors"
            />
            <Tab
              icon={<AuditIcon />}
              iconPosition="start"
              label={isMobile ? 'Audit' : 'Audit Log'}
              sx={{ textTransform: 'none', minHeight: 48 }}
              data-testid="admin-reports-tab-audit"
            />
            <Tab
              icon={<HealthIcon />}
              iconPosition="start"
              label={isMobile ? 'Health' : 'System Health'}
              sx={{ textTransform: 'none', minHeight: 48 }}
              data-testid="admin-reports-tab-health"
            />
          </Tabs>
        </Card>

        {/* ── Tab 0: Popular Courses ──────────────────────────── */}
        <TabPanel value={tab} index={0}>
          {coursesLoading ? (
            <Card>
              <CardContent>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
              </CardContent>
            </Card>
          ) : courses.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <CourseIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h6" color="text.secondary">No courses found</Typography>
              </CardContent>
            </Card>
          ) : isMobile ? (
            /* Mobile: Card List */
            <Stack spacing={1.5}>
              {courses.map((c, i) => (
                <Card key={c.id} data-testid={`admin-popular-course-${i}`}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: i < 3 ? theme.palette.primary.main : theme.palette.grey[400],
                          fontSize: '0.85rem',
                          fontWeight: 700,
                        }}
                      >
                        {i + 1}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>{c.title}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {c.instructorName || 'No instructor'} · {c.category}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Chip
                            label={c.status}
                            size="small"
                            color={statusColor(c.status)}
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            <PeopleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption">{c.enrollmentCount}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                            <Typography variant="caption">{c.rating.toFixed(1)}</Typography>
                          </Box>
                          <Typography variant="caption" fontWeight={600} color="success.main">
                            {formatCurrency(c.revenue)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            /* Desktop: Table */
            <TableContainer component={Paper} elevation={1}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Instructor</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Enrollments</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Rating</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {courses.map((c, i) => (
                    <TableRow key={c.id} hover data-testid={`admin-popular-course-${i}`}>
                      <TableCell>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: '0.75rem',
                            bgcolor: i < 3 ? theme.palette.primary.main : theme.palette.grey[400],
                          }}
                        >
                          {i + 1}
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>{c.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                          {c.instructorName || 'No instructor'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={c.category.replace('_', ' ')}
                          size="small"
                          sx={{ fontSize: '0.7rem', height: 22, textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={c.status}
                          size="small"
                          color={statusColor(c.status)}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">{c.enrollmentCount}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          <Typography variant="body2">{c.rating.toFixed(1)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({c.ratingCount})
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color="success.main">
                          {formatCurrency(c.revenue)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* ── Tab 1: Top Instructors ──────────────────────────── */}
        <TabPanel value={tab} index={1}>
          {instructorsLoading ? (
            <Card>
              <CardContent>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
              </CardContent>
            </Card>
          ) : instructors.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <SchoolIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h6" color="text.secondary">No instructors found</Typography>
              </CardContent>
            </Card>
          ) : isMobile ? (
            /* Mobile: Card List */
            <Stack spacing={1.5}>
              {instructors.map((inst, i) => (
                <Card key={inst.id} data-testid={`admin-instructor-${i}`}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: i < 3 ? theme.palette.warning.main : theme.palette.grey[400],
                          fontSize: '0.85rem',
                          fontWeight: 700,
                        }}
                      >
                        {i + 1}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>{inst.name || 'Unknown'}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {inst.email}
                        </Typography>
                        <Grid container spacing={0.5} sx={{ mt: 0.5 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Students</Typography>
                            <Typography variant="body2" fontWeight={600}>{inst.totalStudents}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Revenue</Typography>
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {formatCurrency(inst.totalRevenue)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Courses</Typography>
                            <Typography variant="body2">{inst.publishedCourses} / {inst.totalCourses}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Rating</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                              <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                              <Typography variant="body2">{inst.avgRating.toFixed(1)} ({inst.totalRatings})</Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            /* Desktop: Table */
            <TableContainer component={Paper} elevation={1}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Instructor</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Courses</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Students</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Revenue</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Avg Rating</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {instructors.map((inst, i) => (
                    <TableRow key={inst.id} hover data-testid={`admin-instructor-${i}`}>
                      <TableCell>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: '0.75rem',
                            bgcolor: i < 3 ? theme.palette.warning.main : theme.palette.grey[400],
                          }}
                        >
                          {i + 1}
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                          {inst.name || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 180 }} color="text.secondary">
                          {inst.email}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={`${inst.publishedCourses} published / ${inst.totalCourses} total`}>
                          <Typography variant="body2">
                            {inst.publishedCourses} / {inst.totalCourses}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>{inst.totalStudents}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color="success.main">
                          {formatCurrency(inst.totalRevenue)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          <Typography variant="body2">{inst.avgRating.toFixed(1)}</Typography>
                          <Typography variant="caption" color="text.secondary">({inst.totalRatings})</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>{formatDate(inst.joinedAt)}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* ── Tab 2: Audit Log ────────────────────────────────── */}
        <TabPanel value={tab} index={2}>
          {/* Filter bar */}
          <Box sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={auditType}
                label="Event Type"
                onChange={(e: SelectChangeEvent) => { setAuditType(e.target.value); setAuditPage(1); }}
              >
                <MenuItem value="all">All Events</MenuItem>
                <MenuItem value="deletion">Account Deletions</MenuItem>
                <MenuItem value="ownership">Ownership Changes</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {auditLoading ? (
            <Card>
              <CardContent>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={56} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
              </CardContent>
            </Card>
          ) : !auditData || auditData.entries.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <AuditIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h6" color="text.secondary">No audit log entries</Typography>
                <Typography variant="body2" color="text.secondary">
                  Account deletions and course ownership changes will appear here.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Showing {auditData.entries.length} of {auditData.pagination.total} entries
              </Typography>
              <Stack spacing={1.5}>
                {auditData.entries.map((entry) => (
                  <AuditEntryCard key={entry.id} entry={entry} isMobile={isMobile} theme={theme} />
                ))}
              </Stack>

              {auditData.pagination.totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={auditData.pagination.totalPages}
                    page={auditData.pagination.page}
                    onChange={(_, p) => setAuditPage(p)}
                    color="primary"
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>

        {/* ── Tab 3: System Health ────────────────────────────── */}
        <TabPanel value={tab} index={3}>
          {healthLoading ? (
            <Grid container spacing={isMobile ? 1.5 : 3}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Grid item xs={12} md={6} key={i}>
                  <Card><CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Skeleton variant="text" width={140} />
                    <Skeleton variant="rectangular" height={80} sx={{ mt: 1, borderRadius: 1 }} />
                  </CardContent></Card>
                </Grid>
              ))}
            </Grid>
          ) : !health ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <HealthIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  Unable to load system health
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={isMobile ? 1.5 : 3}>
              {/* Database Status */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <StorageIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Database Status
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <OkIcon sx={{ color: 'success.main' }} />
                      <Typography variant="body1" fontWeight={600} color="success.main">
                        {health.database.status === 'connected' ? 'Connected' : health.database.status}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Last checked: {formatDateTime(health.database.timestamp)}
                    </Typography>

                    <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 1 }}>Table Row Counts</Typography>
                    <Stack spacing={0.5}>
                      {health.tables.map((t) => (
                        <Box
                          key={t.name}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 0.5,
                            px: 1,
                            borderRadius: 1,
                            bgcolor: alpha(theme.palette.primary.main, 0.03),
                          }}
                        >
                          <Typography variant="body2">{t.name}</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {t.rowCount.toLocaleString()}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* User Summary */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <PeopleIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        User Summary
                      </Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.success.main, 0.06) }}>
                          <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} color="success.main">
                            {health.userSummary.totalActive}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Active Users</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.error.main, 0.06) }}>
                          <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} color="error.main">
                            {health.userSummary.totalInactive}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Inactive Users</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                          <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} color="primary.main">
                            {health.userSummary.loggedInToday}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">Logged In Today</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.info.main, 0.06) }}>
                          <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} color="info.main">
                            {health.userSummary.loggedInThisWeek}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">This Week</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Recent Activity Timestamps */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <AuditIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Last Activity Timestamps
                      </Typography>
                    </Box>
                    <Stack spacing={1.5}>
                      <ActivityTimestamp
                        label="Last User Signup"
                        value={health.recentActivity.lastSignup}
                        icon={<PersonIcon sx={{ fontSize: 18 }} />}
                        theme={theme}
                      />
                      <ActivityTimestamp
                        label="Last Enrollment"
                        value={health.recentActivity.lastEnrollment}
                        icon={<SchoolIcon sx={{ fontSize: 18 }} />}
                        theme={theme}
                      />
                      <ActivityTimestamp
                        label="Last Transaction"
                        value={health.recentActivity.lastTransaction}
                        icon={<TrendingUpIcon sx={{ fontSize: 18 }} />}
                        theme={theme}
                      />
                      <ActivityTimestamp
                        label="Last Login"
                        value={health.recentActivity.lastLogin}
                        icon={<PersonIcon sx={{ fontSize: 18 }} />}
                        theme={theme}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Platform Progress (visual) */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <HealthIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        User Engagement
                      </Typography>
                    </Box>
                    {(() => {
                      const total = health.userSummary.totalActive + health.userSummary.totalInactive;
                      const activeRatio = total > 0 ? (health.userSummary.totalActive / total) * 100 : 0;
                      const weeklyRatio = health.userSummary.totalActive > 0
                        ? (health.userSummary.loggedInThisWeek / health.userSummary.totalActive) * 100
                        : 0;
                      const dailyRatio = health.userSummary.totalActive > 0
                        ? (health.userSummary.loggedInToday / health.userSummary.totalActive) * 100
                        : 0;

                      return (
                        <Stack spacing={2}>
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2">Active Users</Typography>
                              <Typography variant="body2" fontWeight={600}>{activeRatio.toFixed(1)}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, activeRatio)}
                              color="success"
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2">Weekly Active (of active)</Typography>
                              <Typography variant="body2" fontWeight={600}>{weeklyRatio.toFixed(1)}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, weeklyRatio)}
                              color="info"
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2">Daily Active (of active)</Typography>
                              <Typography variant="body2" fontWeight={600}>{dailyRatio.toFixed(1)}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, dailyRatio)}
                              color="primary"
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        </Stack>
                      );
                    })()}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>
      </PageContainer>
    </>
  );
};

// ── Audit Entry Card (sub-component) ──────────────────────────────

const AuditEntryCard: React.FC<{
  entry: AuditLogEntry;
  isMobile: boolean;
  theme: any;
}> = ({ entry, isMobile, theme }) => (
  <Card>
    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: alpha(
              entry.type === 'account_deletion' ? theme.palette.error.main : theme.palette.info.main,
              0.12,
            ),
            color: entry.type === 'account_deletion' ? theme.palette.error.main : theme.palette.info.main,
          }}
        >
          {entry.type === 'account_deletion' ? <PersonIcon fontSize="small" /> : <CourseIcon fontSize="small" />}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: 0.5 }}>
            <Typography variant="subtitle2" sx={{ wordBreak: 'break-word' }}>
              {entry.description}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {formatDateTime(entry.timestamp)}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, wordBreak: 'break-word' }}>
            {entry.details}
          </Typography>
          <Chip
            label={entry.type === 'account_deletion' ? 'Account Deletion' : 'Ownership Change'}
            size="small"
            color={entry.type === 'account_deletion' ? 'error' : 'info'}
            variant="outlined"
            sx={{ fontSize: '0.65rem', height: 20, mt: 0.5 }}
          />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ── Activity Timestamp (sub-component) ────────────────────────────

const ActivityTimestamp: React.FC<{
  label: string;
  value: string | null;
  icon: React.ReactNode;
  theme: any;
}> = ({ label, value, icon, theme }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      p: 1,
      borderRadius: 1,
      bgcolor: alpha(theme.palette.primary.main, 0.03),
    }}
  >
    <Avatar
      sx={{
        width: 32,
        height: 32,
        bgcolor: alpha(theme.palette.primary.main, 0.1),
        color: theme.palette.primary.main,
      }}
    >
      {icon}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500} noWrap>
        {value ? formatDateTime(value) : 'No activity yet'}
      </Typography>
    </Box>
  </Box>
);
