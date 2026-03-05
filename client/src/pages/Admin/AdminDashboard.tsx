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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  useTheme,
  type Theme,
} from '@mui/material';
import {
  People as PeopleIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  PersonAdd as PersonAddIcon,
  PlaylistAddCheck as EnrollIcon,
  Payment as PaymentIcon,
  Publish as PublishIcon,
  MoneyOff as RefundIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer, PageTitle, useResponsive } from '../../components/Responsive';
import {
  adminApi,
  PlatformStats,
  GrowthDataPoint,
  RevenueMetrics,
  MonthlyRevenuePoint,
  RecentActivityItem,
  TopCourse,
} from '../../services/adminApi';

// ── Helpers ───────────────────────────────────────────────────────

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('en-US').format(value);

const activityIcon = (type: RecentActivityItem['type']) => {
  switch (type) {
    case 'signup':
      return <PersonAddIcon fontSize="small" />;
    case 'enrollment':
      return <EnrollIcon fontSize="small" />;
    case 'payment':
      return <PaymentIcon fontSize="small" />;
    case 'course_published':
      return <PublishIcon fontSize="small" />;
    case 'refund':
      return <RefundIcon fontSize="small" />;
    default:
      return <TrendingUpIcon fontSize="small" />;
  }
};

const activityColor = (type: RecentActivityItem['type']) => {
  switch (type) {
    case 'signup':
      return 'info';
    case 'enrollment':
      return 'success';
    case 'payment':
      return 'primary';
    case 'course_published':
      return 'secondary';
    case 'refund':
      return 'warning';
    default:
      return 'default';
  }
};

/** Resolve a palette color string for activity type avatars */
const getActivityPaletteColor = (type: RecentActivityItem['type'], theme: Theme): string => {
  const map: Record<string, string> = {
    signup: theme.palette.info.main,
    enrollment: theme.palette.success.main,
    payment: theme.palette.primary.main,
    course_published: theme.palette.secondary.main,
    refund: theme.palette.warning.main,
  };
  return map[type] || theme.palette.grey[500];
};

// ── Stat Card ─────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  testId?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, subtitle, testId }) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  return (
    <Card
      data-testid={testId}
      sx={{
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: theme.shadows[4] },
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, md: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" color="text.secondary" noWrap gutterBottom>
              {label}
            </Typography>
            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              fontWeight={700}
              noWrap
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: alpha(color, 0.12),
              color,
              width: { xs: 36, md: 48 },
              height: { xs: 36, md: 48 },
              ml: 1,
              flexShrink: 0,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

// ── Main Component ────────────────────────────────────────────────

export const AdminDashboard: React.FC = () => {
  const { isMobile } = useResponsive();
  const theme = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [growth, setGrowth] = useState<GrowthDataPoint[]>([]);
  const [revenue, setRevenue] = useState<RevenueMetrics | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenuePoint[]>([]);
  const [activity, setActivity] = useState<RecentActivityItem[]>([]);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);

  // Fetch all dashboard data in parallel
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, growthRes, revenueRes, monthlyRes, activityRes, coursesRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getGrowth(),
        adminApi.getRevenue(),
        adminApi.getMonthlyRevenue(),
        adminApi.getRecentActivity(15),
        adminApi.getTopCourses(5),
      ]);
      setStats(statsRes);
      setGrowth(growthRes);
      setRevenue(revenueRes);
      setMonthlyRevenue(monthlyRes);
      setActivity(activityRes);
      setTopCourses(coursesRes);
    } catch (err) {
      toast.error('Failed to load admin dashboard data');
      console.error('Admin dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Skeleton loaders ──────────────────────────────────────────
  const StatSkeleton = () => (
    <Card>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Skeleton variant="text" width={100} />
        <Skeleton variant="text" width={60} height={40} />
        <Skeleton variant="text" width={80} />
      </CardContent>
    </Card>
  );

  return (
    <>
      <Header />
      <PageContainer>
        <PageTitle subtitle="Platform overview and key metrics" icon={<AdminIcon />}>
          Admin Dashboard
        </PageTitle>

        {/* ── Stat Cards ──────────────────────────────────────── */}
        <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 3 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={6} md={6} lg={3} key={i}>
                <StatSkeleton />
              </Grid>
            ))
          ) : stats ? (
            <>
              <Grid item xs={6} md={6} lg={3}>
                <StatCard
                  label="Total Users"
                  value={formatNumber(stats.totalUsers)}
                  icon={<PeopleIcon />}
                  color={theme.palette.primary.main}
                  subtitle={`${formatNumber(stats.totalInstructors)} instructors · ${formatNumber(stats.totalStudents)} students`}
                  testId="admin-stat-users"
                />
              </Grid>
              <Grid item xs={6} md={6} lg={3}>
                <StatCard
                  label="Courses"
                  value={formatNumber(stats.totalCourses)}
                  icon={<SchoolIcon />}
                  color={theme.palette.success.main}
                  subtitle={`${formatNumber(stats.publishedCourses)} published · ${formatNumber(stats.draftCourses)} drafts`}
                  testId="admin-stat-courses"
                />
              </Grid>
              <Grid item xs={6} md={6} lg={3}>
                <StatCard
                  label="Enrollments"
                  value={formatNumber(stats.totalEnrollments)}
                  icon={<TrendingUpIcon />}
                  color={theme.palette.info.main}
                  subtitle={`${formatNumber(stats.activeEnrollments)} active · ${formatNumber(stats.completedEnrollments)} completed`}
                  testId="admin-stat-enrollments"
                />
              </Grid>
              <Grid item xs={6} md={6} lg={3}>
                <StatCard
                  label="Total Revenue"
                  value={formatCurrency(stats.totalRevenue)}
                  icon={<MoneyIcon />}
                  color={theme.palette.warning.main}
                  subtitle={`${formatCurrency(stats.totalRefunds)} refunded`}
                  testId="admin-stat-revenue"
                />
              </Grid>
            </>
          ) : null}
        </Grid>

        {/* ── Charts Row ──────────────────────────────────────── */}
        <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 3 }}>
          {/* Growth Chart */}
          <Grid item xs={12} lg={7}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  30-Day Growth
                </Typography>
                {loading ? (
                  <Skeleton variant="rectangular" height={isMobile ? 240 : 300} />
                ) : (
                  <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
                    <LineChart data={growth} margin={{ top: 5, right: 10, left: isMobile ? -15 : 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.4)} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        interval={isMobile ? 6 : 4}
                        tickFormatter={(d) => {
                          try { return format(parseISO(d), isMobile ? 'd' : 'MMM d'); } catch { return d; }
                        }}
                      />
                      <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} allowDecimals={false} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                        labelFormatter={(d) => {
                          try { return format(parseISO(d as string), 'MMM d, yyyy'); } catch { return d; }
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="newUsers"
                        name="New Users"
                        stroke={theme.palette.primary.main}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="newEnrollments"
                        name="New Enrollments"
                        stroke={theme.palette.success.main}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Monthly Revenue Chart */}
          <Grid item xs={12} lg={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Revenue
                </Typography>
                {loading ? (
                  <Skeleton variant="rectangular" height={isMobile ? 240 : 300} />
                ) : (
                  <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
                    <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: isMobile ? -15 : 0, bottom: isMobile ? 30 : 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.4)} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: isMobile ? 9 : 12 }}
                        angle={isMobile ? -45 : 0}
                        textAnchor={isMobile ? 'end' : 'middle'}
                      />
                      <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} tickFormatter={(v) => `$${v}`} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      />
                      <Bar
                        dataKey="revenue"
                        name="Revenue"
                        fill={theme.palette.primary.main}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Bottom Row: Revenue Summary + Activity + Top Courses */}
        <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 3 }}>
          {/* Revenue Summary */}
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Revenue Summary
                </Typography>
                {loading ? (
                  <>
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="70%" />
                  </>
                ) : revenue ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        This Month
                      </Typography>
                      <Typography variant="h5" fontWeight={600}>
                        {formatCurrency(revenue.monthlyRevenue)}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Avg Order Value
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        {formatCurrency(revenue.averageOrderValue)}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Refunds
                      </Typography>
                      <Typography variant="h6" fontWeight={600} color="warning.main">
                        {formatCurrency(revenue.refundTotal)} ({revenue.refundCount})
                      </Typography>
                    </Box>
                  </Box>
                ) : null}
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                <Typography variant="h6" gutterBottom sx={{ px: 1 }}>
                  Recent Activity
                </Typography>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, px: 1, py: 0.5 }}>
                      <Skeleton variant="circular" width={32} height={32} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="80%" />
                        <Skeleton variant="text" width="40%" />
                      </Box>
                    </Box>
                  ))
                ) : (
                  <List dense disablePadding sx={{ maxHeight: 340, overflow: 'auto' }}>
                    {activity.map((item, i) => (
                      <React.Fragment key={item.id}>
                        <ListItem alignItems="flex-start" sx={{ px: 1 }}>
                          <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                bgcolor: alpha(getActivityPaletteColor(item.type, theme), 0.12),
                                color: getActivityPaletteColor(item.type, theme),
                              }}
                            >
                              {activityIcon(item.type)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="body2" noWrap>
                                {item.description}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {(() => {
                                  try {
                                    return format(parseISO(item.timestamp), 'MMM d, h:mm a');
                                  } catch {
                                    return item.timestamp;
                                  }
                                })()}
                              </Typography>
                            }
                          />
                          <Chip
                            label={item.type.replace('_', ' ')}
                            size="small"
                            color={activityColor(item.type) as any}
                            variant="outlined"
                            sx={{
                              fontSize: '0.65rem',
                              height: 20,
                              ml: 0.5,
                              flexShrink: 0,
                              display: { xs: 'none', sm: 'flex' },
                            }}
                          />
                        </ListItem>
                        {i < activity.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    ))}
                    {activity.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                        No recent activity
                      </Typography>
                    )}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Top Courses */}
          <Grid item xs={12} md={12} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Courses
                </Typography>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} variant="text" width="100%" height={36} />
                  ))
                ) : (
                  <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 340 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            Enrolled
                          </TableCell>
                          {!isMobile && (
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              Revenue
                            </TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {topCourses.map((course) => (
                          <TableRow key={course.courseId} hover>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: isMobile ? 120 : 180 }}>
                                {course.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {course.instructorName}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{formatNumber(course.enrollmentCount)}</TableCell>
                            {!isMobile && (
                              <TableCell align="right">{formatCurrency(course.revenue)}</TableCell>
                            )}
                          </TableRow>
                        ))}
                        {topCourses.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No courses yet
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </PageContainer>
    </>
  );
};
