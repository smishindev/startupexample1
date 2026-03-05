import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Skeleton,
  Avatar,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  useTheme,
  Stack,
  type SelectChangeEvent,
} from '@mui/material';
import {
  AttachMoney as RevenueIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  AccountBalanceWallet as WalletIcon,
  ShoppingCart as OrderIcon,
  CreditCard as CardIcon,
  ConfirmationNumber as TotalTxIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer, PageTitle, useResponsive } from '../../components/Responsive';
import {
  instructorRevenueApi,
  type InstructorRevenueMetrics,
  type InstructorMonthlyRevenue,
  type InstructorCourseRevenue,
  type InstructorTransaction,
  type InstructorTransactionFilters,
  type PaginatedInstructorTransactions,
} from '../../services/instructorRevenueApi';

// ── Constants ─────────────────────────────────────────────────────

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const PIE_COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B', '#E91E63', '#3F51B5'];

// ── Helpers ───────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);

const formatCurrencyExact = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);

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
    case 'completed': return 'success';
    case 'pending': return 'warning';
    case 'failed': return 'error';
    case 'refunded': return 'error';
    default: return 'default';
  }
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
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700} noWrap>
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

export const InstructorRevenueDashboard: React.FC = () => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  // Analytics state
  const [metrics, setMetrics] = useState<InstructorRevenueMetrics | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<InstructorMonthlyRevenue[]>([]);
  const [courseRevenue, setCourseRevenue] = useState<InstructorCourseRevenue[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Transactions state
  const [txData, setTxData] = useState<PaginatedInstructorTransactions | null>(null);
  const [txLoading, setTxLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Course search
  const [courseSearch, setCourseSearch] = useState('');
  const [coursePage, setCoursePage] = useState(1);
  const courseLimit = 10;

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<InstructorTransaction | null>(null);

  // ── Debounce search ─────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch analytics data ────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const [metricsRes, monthlyRes, coursesRes] = await Promise.all([
        instructorRevenueApi.getMetrics(),
        instructorRevenueApi.getMonthlyRevenue(),
        instructorRevenueApi.getCourseRevenue(),
      ]);
      setMetrics(metricsRes);
      setMonthlyRevenue(monthlyRes);
      setCourseRevenue(coursesRes);
    } catch {
      toast.error('Failed to load revenue analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // ── Fetch transactions ──────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const filters: InstructorTransactionFilters = { page, limit, sortBy, sortOrder };
      if (debouncedSearch) filters.search = debouncedSearch;
      if (statusFilter) filters.status = statusFilter;
      if (courseFilter) filters.courseId = courseFilter;
      const result = await instructorRevenueApi.getTransactions(filters);
      setTxData(result);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, courseFilter, sortBy, sortOrder]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // ── Detail handler ──────────────────────────────────────────────
  const handleViewDetail = (tx: InstructorTransaction) => {
    setSelectedTx(tx);
    setDetailOpen(true);
  };

  // ── Summary ─────────────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    if (!txData) return null;
    return {
      total: txData.pagination.total,
      showing: txData.transactions.length,
    };
  }, [txData]);

  // ── Chart data ──────────────────────────────────────────────────
  const chartMonthly = useMemo(() =>
    monthlyRevenue.map((m) => ({ ...m, month: m.month.substring(0, 7) })),
    [monthlyRevenue],
  );

  const chartCourses = useMemo(() =>
    courseRevenue
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((c) => ({
        name: c.courseTitle.length > 20 ? c.courseTitle.substring(0, 20) + '…' : c.courseTitle,
        revenue: c.revenue,
        count: c.transactionCount,
        fullTitle: c.courseTitle,
      })),
    [courseRevenue],
  );

  // ── Filtered course revenue (for Course Performance table) ─────
  const filteredCourseRevenue = useMemo(() => {
    if (!courseSearch.trim()) return courseRevenue;
    const q = courseSearch.toLowerCase().trim();
    return courseRevenue.filter((c) => c.courseTitle.toLowerCase().includes(q));
  }, [courseRevenue, courseSearch]);

  const courseTotalPages = Math.ceil(filteredCourseRevenue.length / courseLimit);
  const paginatedCourseRevenue = useMemo(
    () => filteredCourseRevenue.slice((coursePage - 1) * courseLimit, coursePage * courseLimit),
    [filteredCourseRevenue, coursePage, courseLimit],
  );

  // ── Course filter options ───────────────────────────────────────
  const courseOptions = useMemo(
    () => courseRevenue.map((c) => ({ value: c.courseId, label: c.courseTitle })),
    [courseRevenue],
  );

  // ── Render ─────────────────────────────────────────────────────

  return (
    <>
      <Header />
      <PageContainer>
        <PageTitle subtitle="Your earnings, course performance & transactions" icon={<RevenueIcon />}>
          Revenue
        </PageTitle>

        {/* ── Stat Cards ──────────────────────────────────────── */}
        {analyticsLoading ? (
          <Grid container spacing={isMobile ? 1.5 : 3} sx={{ mb: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={12} sm={6} lg={3} key={i}>
                <Card><CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Skeleton variant="text" width={100} />
                  <Skeleton variant="text" width={60} height={40} />
                  <Skeleton variant="text" width={80} />
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>
        ) : metrics && (
          <Grid container spacing={isMobile ? 1.5 : 3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                label="Total Earnings"
                value={formatCurrency(metrics.totalRevenue)}
                icon={<WalletIcon />}
                color={theme.palette.success.main}
                subtitle={`${metrics.refundCount} refund${metrics.refundCount !== 1 ? 's' : ''} (${formatCurrency(metrics.refundTotal)})`}
                testId="instructor-revenue-total"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                label="This Month"
                value={formatCurrency(metrics.monthlyRevenue)}
                icon={<TrendingUpIcon />}
                color={theme.palette.primary.main}
                subtitle="Current month earnings"
                testId="instructor-revenue-monthly"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                label="Avg Transaction"
                value={formatCurrencyExact(metrics.averageOrderValue)}
                icon={<OrderIcon />}
                color={theme.palette.info.main}
                subtitle="Per completed sale"
                testId="instructor-revenue-avg"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                label="Total Sales"
                value={String(metrics.totalTransactions)}
                icon={<TotalTxIcon />}
                color={theme.palette.warning.main}
                subtitle="Completed transactions"
                testId="instructor-revenue-sales"
              />
            </Grid>
          </Grid>
        )}

        {/* ── Charts Row ──────────────────────────────────────── */}
        <Grid container spacing={isMobile ? 1.5 : 3} sx={{ mb: 3 }}>
          {/* Monthly Revenue Bar Chart */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Monthly Earnings (12 months)
                </Typography>
                {analyticsLoading ? (
                  <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 1 }} />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartMonthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        stroke={theme.palette.text.secondary}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke={theme.palette.text.secondary}
                        tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <RechartsTooltip
                        formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="revenue" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Revenue by Course Pie Chart */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Revenue by Course
                </Typography>
                {analyticsLoading ? (
                  <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 1 }} />
                ) : chartCourses.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
                    <Typography variant="body2" color="text.secondary">No revenue data yet</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={chartCourses}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 80 : 90}
                        label={isMobile ? false : ({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={isMobile ? false : { strokeWidth: 1 }}
                        style={{ fontSize: 11 }}
                      >
                        {chartCourses.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(v: number, _name: string, props: any) => [
                          `${formatCurrency(v)} (${props.payload.count} sales)`,
                          props.payload.fullTitle,
                        ]}
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Per-Course Revenue Table ─────────────────────────── */}
        {!analyticsLoading && courseRevenue.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: 1, mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Course Performance{filteredCourseRevenue.length !== courseRevenue.length ? ` (${filteredCourseRevenue.length} of ${courseRevenue.length})` : ` (${courseRevenue.length})`}
                </Typography>
                <TextField
                  size="small"
                  placeholder="Search courses…"
                  value={courseSearch}
                  onChange={(e) => { setCourseSearch(e.target.value); setCoursePage(1); }}
                  sx={{ width: isMobile ? '100%' : 240 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    ...(courseSearch && {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => { setCourseSearch(''); setCoursePage(1); }}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }),
                  }}
                />
              </Box>
              {filteredCourseRevenue.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No courses matching "{courseSearch}"
                </Typography>
              ) : isMobile ? (
                <Stack spacing={1}>
                  {paginatedCourseRevenue.map((c) => (
                    <Box
                      key={c.courseId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {c.courseTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.transactionCount} sales · {c.enrollments} enrolled
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600} color="success.main" sx={{ flexShrink: 0 }}>
                        {formatCurrency(c.revenue)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Revenue</TableCell>
                        <TableCell sx={{ fontWeight: 600, display: { xs: 'none', md: 'table-cell' } }} align="right">Sales</TableCell>
                        <TableCell sx={{ fontWeight: 600, display: { xs: 'none', md: 'table-cell' } }} align="right">Enrollments</TableCell>
                        <TableCell sx={{ fontWeight: 600, display: { xs: 'none', lg: 'table-cell' } }} align="right">Avg Price</TableCell>
                        <TableCell sx={{ fontWeight: 600, display: { xs: 'none', lg: 'table-cell' } }}>Last Sale</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedCourseRevenue.map((c) => (
                        <TableRow key={c.courseId} hover>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>
                              {c.courseTitle}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600} color="success.main">
                              {formatCurrency(c.revenue)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            {c.transactionCount}
                          </TableCell>
                          <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            {c.enrollments}
                          </TableCell>
                          <TableCell align="right" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                            {formatCurrencyExact(c.avgPrice)}
                          </TableCell>
                          <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                            <Typography variant="body2" noWrap>
                              {formatDate(c.lastSaleAt)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {courseTotalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination
                    count={courseTotalPages}
                    page={coursePage}
                    onChange={(_, p) => setCoursePage(p)}
                    color="primary"
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Transactions Filter Bar ─────────────────────────── */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
            <Grid container spacing={isMobile ? 1.5 : 2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search transactions…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    ...(search && {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearch('')}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }),
                  }}
                  data-testid="instructor-tx-search"
                />
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e: SelectChangeEvent) => { setStatusFilter(e.target.value); setPage(1); }}
                  >
                    {STATUSES.map((s) => (
                      <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Course</InputLabel>
                  <Select
                    value={courseFilter}
                    label="Course"
                    onChange={(e: SelectChangeEvent) => { setCourseFilter(e.target.value); setPage(1); }}
                  >
                    <MenuItem value="">All Courses</MenuItem>
                    {courseOptions.map((c) => (
                      <MenuItem key={c.value} value={c.value}>
                        <Typography noWrap sx={{ maxWidth: 200 }}>{c.label}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={12} md={5}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <Select
                      value={sortBy}
                      onChange={(e: SelectChangeEvent) => { setSortBy(e.target.value); setPage(1); }}
                      displayEmpty
                      sx={{ fontSize: '0.85rem' }}
                    >
                      <MenuItem value="date">Date</MenuItem>
                      <MenuItem value="amount">Amount</MenuItem>
                      <MenuItem value="status">Status</MenuItem>
                      <MenuItem value="student">Student</MenuItem>
                      <MenuItem value="course">Course</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                    sx={{ minWidth: 0, px: 1.5, textTransform: 'none' }}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                  <Tooltip title="Refresh">
                    <IconButton size="small" onClick={() => { fetchTransactions(); fetchAnalytics(); }} color="primary">
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* ── Results summary ─────────────────────────────────── */}
        {summaryStats && !txLoading && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Showing {summaryStats.showing} of {summaryStats.total} transactions
            {debouncedSearch && ` matching "${debouncedSearch}"`}
            {statusFilter && ` · ${statusFilter}`}
            {courseFilter && courseOptions.find((c) => c.value === courseFilter) && ` · ${courseOptions.find((c) => c.value === courseFilter)!.label}`}
          </Typography>
        )}

        {/* ── Transaction Table / Cards ───────────────────────── */}
        {txLoading ? (
          <Card>
            <CardContent>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </CardContent>
          </Card>
        ) : !txData || txData.transactions.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                No transactions found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {debouncedSearch || statusFilter || courseFilter
                  ? 'Try adjusting your filters or search query.'
                  : 'Transactions will appear here once students enroll in your courses.'}
              </Typography>
            </CardContent>
          </Card>
        ) : isMobile ? (
          /* ── Mobile: Card List ──────────────────────────────── */
          <Stack spacing={1.5}>
            {txData.transactions.map((tx) => (
              <Card
                key={tx.id}
                onClick={() => handleViewDetail(tx)}
                sx={{ cursor: 'pointer', '&:active': { bgcolor: alpha(theme.palette.primary.main, 0.04) } }}
                data-testid={`instructor-tx-card-${tx.id}`}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: alpha(
                          tx.status === 'completed' ? theme.palette.success.main :
                          tx.status === 'refunded' ? theme.palette.error.main :
                          theme.palette.grey[500],
                          0.12,
                        ),
                        color: tx.status === 'completed' ? theme.palette.success.main :
                               tx.status === 'refunded' ? theme.palette.error.main :
                               theme.palette.grey[500],
                      }}
                    >
                      <ReceiptIcon fontSize="small" />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                          {tx.courseTitle}
                        </Typography>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ ml: 1, flexShrink: 0 }}>
                          {formatCurrencyExact(tx.amount)}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {tx.studentName} · {tx.studentEmail}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                        <Chip
                          label={tx.status}
                          size="small"
                          color={statusColor(tx.status)}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                        {tx.paymentMethodBrand && (
                          <Typography variant="caption" color="text.secondary">
                            {tx.paymentMethodBrand} ····{tx.paymentMethodLast4 || '****'}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {formatDate(tx.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          /* ── Desktop: Table ─────────────────────────────────── */
          <TableContainer component={Paper} elevation={1}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', lg: 'table-cell' } }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', xl: 'table-cell' } }}>Payment</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {txData.transactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    hover
                    sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                    onClick={() => handleViewDetail(tx)}
                    data-testid={`instructor-tx-row-${tx.id}`}
                  >
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Box>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>{tx.studentName}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ maxWidth: 150 }}>
                          {tx.studentEmail}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{tx.courseTitle}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrencyExact(tx.amount)}
                      </Typography>
                      {tx.refundAmount != null && tx.refundAmount > 0 && (
                        <Typography variant="caption" color="error.main">
                          -{formatCurrencyExact(tx.refundAmount)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tx.status}
                        size="small"
                        color={statusColor(tx.status)}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>
                      {tx.paymentMethodBrand ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CardIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption">
                            {tx.paymentMethodBrand} ····{tx.paymentMethodLast4 || '****'}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>{formatDate(tx.createdAt)}</Typography>
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="View details">
                        <IconButton size="small" onClick={() => handleViewDetail(tx)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ── Pagination ──────────────────────────────────────── */}
        {txData && txData.pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={txData.pagination.totalPages}
              page={txData.pagination.page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              size={isMobile ? 'small' : 'medium'}
            />
          </Box>
        )}

        {/* ── Transaction Detail Dialog ───────────────────────── */}
        <Dialog
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
          TransitionProps={{ unmountOnExit: false }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Transaction Details
            <IconButton size="small" onClick={() => setDetailOpen(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {selectedTx ? (
              <Stack spacing={2}>
                {/* Status banner */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    label={selectedTx.status.toUpperCase()}
                    color={statusColor(selectedTx.status)}
                    sx={{ fontWeight: 600 }}
                  />
                  <Typography variant="h5" fontWeight={700}>
                    {formatCurrencyExact(selectedTx.amount)}
                  </Typography>
                </Box>

                {/* Transaction info */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">Transaction</Typography>
                  <DetailRow label="ID" value={selectedTx.id} mono />
                  <DetailRow label="Created" value={formatDateTime(selectedTx.createdAt)} />
                  {selectedTx.completedAt && <DetailRow label="Completed" value={formatDateTime(selectedTx.completedAt)} />}
                  {selectedTx.refundedAt && <DetailRow label="Refunded" value={formatDateTime(selectedTx.refundedAt)} />}
                  {selectedTx.refundAmount != null && selectedTx.refundAmount > 0 && (
                    <DetailRow label="Refund Amount" value={formatCurrencyExact(selectedTx.refundAmount)} color="error.main" />
                  )}
                </Paper>

                {/* Student info */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">Student</Typography>
                  <DetailRow label="Name" value={selectedTx.studentName} />
                  <DetailRow label="Email" value={selectedTx.studentEmail} />
                </Paper>

                {/* Course info */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">Course</Typography>
                  <DetailRow label="Title" value={selectedTx.courseTitle} />
                </Paper>

                {/* Payment info */}
                {selectedTx.paymentMethodBrand && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom color="text.secondary">Payment Method</Typography>
                    <DetailRow
                      label="Card"
                      value={`${selectedTx.paymentMethodBrand} ····${selectedTx.paymentMethodLast4 || '****'}`}
                    />
                  </Paper>
                )}
              </Stack>
            ) : (
              <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No transaction data available.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </PageContainer>
    </>
  );
};

// ── Detail Row Helper ─────────────────────────────────────────────

const DetailRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}> = ({ label, value, mono, color }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, gap: 2 }}>
    <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      fontWeight={500}
      sx={{
        textAlign: 'right',
        wordBreak: 'break-all',
        ...(mono && { fontFamily: 'monospace', fontSize: '0.8rem' }),
        ...(color && { color }),
      }}
    >
      {value}
    </Typography>
  </Box>
);
