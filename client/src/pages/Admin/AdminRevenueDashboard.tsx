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
  DialogContentText,
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
  MoneyOff as RefundIcon,
  Visibility as ViewIcon,
  AccountBalanceWallet as WalletIcon,
  ShoppingCart as OrderIcon,
  CreditCard as CardIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  adminApi,
  RevenueMetrics,
  MonthlyRevenuePoint,
  AdminTransaction,
  AdminTransactionDetail,
  PaginatedTransactions,
  TransactionFilters,
  RevenueBreakdown,
} from '../../services/adminApi';

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

export const AdminRevenueDashboard: React.FC = () => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  // Analytics state
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenuePoint[]>([]);
  const [breakdown, setBreakdown] = useState<RevenueBreakdown | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Transactions state
  const [txData, setTxData] = useState<PaginatedTransactions | null>(null);
  const [txLoading, setTxLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTx, setDetailTx] = useState<AdminTransactionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Refund dialog
  const [refundDialog, setRefundDialog] = useState<{ open: boolean; tx: AdminTransaction | null; reason: string; submitting: boolean }>({
    open: false, tx: null, reason: '', submitting: false,
  });

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
      const [metricsRes, monthlyRes, breakdownRes] = await Promise.all([
        adminApi.getRevenue(),
        adminApi.getMonthlyRevenue(),
        adminApi.getRevenueBreakdown(),
      ]);
      setRevenueMetrics(metricsRes);
      setMonthlyRevenue(monthlyRes);
      setBreakdown(breakdownRes);
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
      const filters: TransactionFilters = { page, limit, sortBy, sortOrder };
      if (debouncedSearch) filters.search = debouncedSearch;
      if (statusFilter) filters.status = statusFilter;
      const result = await adminApi.getTransactions(filters);
      setTxData(result);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, sortBy, sortOrder]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // ── Detail handler ──────────────────────────────────────────────
  const handleViewDetail = async (tx: AdminTransaction) => {
    setDetailTx(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = await adminApi.getTransactionById(tx.id);
      setDetailTx(detail);
    } catch {
      toast.error('Failed to load transaction details');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Refund handlers ─────────────────────────────────────────────
  const openRefundDialog = (tx: AdminTransaction) => {
    setRefundDialog({ open: true, tx, reason: '', submitting: false });
    setDetailOpen(false);
  };

  const confirmRefund = async () => {
    if (!refundDialog.tx || !refundDialog.reason.trim()) return;
    setRefundDialog((prev) => ({ ...prev, submitting: true }));
    try {
      await adminApi.processRefund(refundDialog.tx.id, refundDialog.reason.trim());
      toast.success('Refund processed successfully');
      setRefundDialog({ open: false, tx: null, reason: '', submitting: false });
      fetchTransactions();
      fetchAnalytics();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to process refund';
      toast.error(msg);
      setRefundDialog((prev) => ({ ...prev, submitting: false }));
    }
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

  const chartDaily = useMemo(() =>
    (breakdown?.dailyRevenue || []).map((d) => ({
      ...d,
      date: d.date.substring(5, 10), // MM-DD
    })),
    [breakdown],
  );

  // ── Render ─────────────────────────────────────────────────────

  return (
    <>
      <Header />
      <PageContainer>
        <PageTitle subtitle="Revenue analytics, transactions & refunds" icon={<RevenueIcon />}>
          Revenue
        </PageTitle>

        {/* ── Stat Cards ──────────────────────────────────────── */}
        {analyticsLoading ? (
          <Grid container spacing={isMobile ? 1.5 : 3} sx={{ mb: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid item xs={6} md={6} lg={3} key={i}>
                <Card><CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Skeleton variant="text" width={100} />
                  <Skeleton variant="text" width={60} height={40} />
                  <Skeleton variant="text" width={80} />
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>
        ) : revenueMetrics && (
          <Grid container spacing={isMobile ? 1.5 : 3} sx={{ mb: 3 }}>
            <Grid item xs={6} md={6} lg={3}>
              <StatCard
                label="Total Revenue"
                value={formatCurrency(revenueMetrics.totalRevenue)}
                icon={<WalletIcon />}
                color={theme.palette.success.main}
                subtitle={`${revenueMetrics.refundCount} refunds processed`}
                testId="admin-revenue-total"
              />
            </Grid>
            <Grid item xs={6} md={6} lg={3}>
              <StatCard
                label="This Month"
                value={formatCurrency(revenueMetrics.monthlyRevenue)}
                icon={<TrendingUpIcon />}
                color={theme.palette.primary.main}
                subtitle="Current month revenue"
                testId="admin-revenue-monthly"
              />
            </Grid>
            <Grid item xs={6} md={6} lg={3}>
              <StatCard
                label="Avg Transaction"
                value={formatCurrencyExact(revenueMetrics.averageOrderValue)}
                icon={<OrderIcon />}
                color={theme.palette.info.main}
                subtitle="Per completed transaction"
                testId="admin-revenue-avg"
              />
            </Grid>
            <Grid item xs={6} md={6} lg={3}>
              <StatCard
                label="Total Refunds"
                value={formatCurrency(revenueMetrics.refundTotal)}
                icon={<RefundIcon />}
                color={theme.palette.error.main}
                subtitle={`${revenueMetrics.refundCount} refunds`}
                testId="admin-revenue-refunds"
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
                  Monthly Revenue (12 months)
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

          {/* Revenue by Category Pie Chart */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Revenue by Category
                </Typography>
                {analyticsLoading || !breakdown ? (
                  <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 1 }} />
                ) : breakdown.byCategory.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
                    <Typography variant="body2" color="text.secondary">No data available</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={breakdown.byCategory}
                        dataKey="revenue"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 80 : 90}
                        label={isMobile ? false : ({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                        labelLine={isMobile ? false : { strokeWidth: 1 }}
                        style={{ fontSize: 12 }}
                      >
                        {breakdown.byCategory.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(v: number, _name: string, props: any) => [
                          `${formatCurrency(v)} (${props.payload.count} txns)`,
                          props.payload.category,
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

        {/* ── Daily Revenue + Top Instructors Row ─────────────── */}
        <Grid container spacing={isMobile ? 1.5 : 3} sx={{ mb: 3 }}>
          {/* Daily Revenue Line Chart */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Daily Revenue (30 days)
                </Typography>
                {analyticsLoading || !breakdown ? (
                  <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartDaily} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                      <XAxis
                        dataKey="date"
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
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke={theme.palette.success.main}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Top Instructors */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Top Instructors by Revenue
                </Typography>
                {analyticsLoading || !breakdown ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} variant="rectangular" height={36} sx={{ mb: 1, borderRadius: 1 }} />
                  ))
                ) : breakdown.topInstructors.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No instructor data
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {breakdown.topInstructors.map((inst, i) => (
                      <Box
                        key={inst.instructorId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.primary.main, i === 0 ? 0.06 : 0.02),
                        }}
                      >
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
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap fontWeight={i === 0 ? 600 : 400}>
                            {inst.instructorName || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {inst.transactionCount} transactions
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600} color="success.main">
                          {formatCurrency(inst.revenue)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Refund Summary ──────────────────────────────────── */}
        {!analyticsLoading && breakdown && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Refund Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} color="error.main" noWrap>
                      {formatCurrency(breakdown.refundSummary.totalRefunds)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Total Refunded</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} noWrap>
                      {breakdown.refundSummary.refundCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Refund Count</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} noWrap>
                      {formatCurrencyExact(breakdown.refundSummary.avgRefund)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Avg Refund</Typography>
                  </Box>
                </Grid>
              </Grid>
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
                  data-testid="admin-tx-search"
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
                <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 90 }, width: '100%' }}>
                  <InputLabel>Sort</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort"
                    onChange={(e: SelectChangeEvent) => { setSortBy(e.target.value); setPage(1); }}
                  >
                    <MenuItem value="date">Date</MenuItem>
                    <MenuItem value="amount">Amount</MenuItem>
                    <MenuItem value="status">Status</MenuItem>
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="course">Course</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={12} md={5}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
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
                Try adjusting your filters or search query.
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
                data-testid={`admin-tx-card-${tx.id}`}
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
                      {tx.status === 'refunded' ? <RefundIcon fontSize="small" /> : <ReceiptIcon fontSize="small" />}
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
                        {tx.userName} · {tx.userEmail}
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
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', lg: 'table-cell' } }}>Transaction</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', lg: 'table-cell' } }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', xl: 'table-cell' } }}>Payment</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {txData.transactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    hover
                    sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                    onClick={() => handleViewDetail(tx)}
                    data-testid={`admin-tx-row-${tx.id}`}
                  >
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 120, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {tx.id.substring(0, 8)}…
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Box>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 130 }}>{tx.userName}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ maxWidth: 130 }}>
                          {tx.userEmail}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{tx.courseTitle}</Typography>
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
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="View details">
                          <IconButton size="small" onClick={() => handleViewDetail(tx)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {tx.status === 'completed' && (
                          <Tooltip title="Process refund">
                            <IconButton size="small" color="error" onClick={() => openRefundDialog(tx)}>
                              <RefundIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
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
            {detailLoading ? (
              <Box sx={{ py: 3 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} variant="text" height={36} sx={{ mb: 0.5 }} />
                ))}
              </Box>
            ) : detailTx ? (
              <Stack spacing={2}>
                {/* Status banner */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    label={detailTx.status.toUpperCase()}
                    color={statusColor(detailTx.status)}
                    sx={{ fontWeight: 600 }}
                  />
                  <Typography variant="h5" fontWeight={700}>
                    {formatCurrencyExact(detailTx.amount)}
                  </Typography>
                </Box>

                {/* Transaction info */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">Transaction</Typography>
                  <DetailRow label="ID" value={detailTx.id} mono />
                  <DetailRow label="Created" value={formatDateTime(detailTx.createdAt)} />
                  {detailTx.completedAt && <DetailRow label="Completed" value={formatDateTime(detailTx.completedAt)} />}
                  {detailTx.refundedAt && <DetailRow label="Refunded" value={formatDateTime(detailTx.refundedAt)} />}
                  {detailTx.refundAmount != null && detailTx.refundAmount > 0 && (
                    <DetailRow label="Refund Amount" value={formatCurrencyExact(detailTx.refundAmount)} color="error.main" />
                  )}
                  {detailTx.refundReason && <DetailRow label="Refund Reason" value={detailTx.refundReason} />}
                </Paper>

                {/* User info */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">Customer</Typography>
                  <DetailRow label="Name" value={detailTx.userName} />
                  <DetailRow label="Email" value={detailTx.userEmail} />
                </Paper>

                {/* Course info */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">Course</Typography>
                  <DetailRow label="Title" value={detailTx.courseTitle} />
                  <DetailRow label="Category" value={detailTx.courseCategory} />
                  <DetailRow label="Instructor" value={detailTx.instructorName} />
                </Paper>

                {/* Payment info */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">Payment</Typography>
                  {detailTx.paymentMethodBrand && (
                    <DetailRow label="Card" value={`${detailTx.paymentMethodBrand} ····${detailTx.paymentMethodLast4 || '****'}`} />
                  )}
                  {detailTx.stripePaymentIntentId && (
                    <DetailRow label="Stripe PI" value={detailTx.stripePaymentIntentId} mono />
                  )}
                  {detailTx.stripeChargeId && (
                    <DetailRow label="Stripe Charge" value={detailTx.stripeChargeId} mono />
                  )}
                </Paper>

                {/* Invoice */}
                {detailTx.invoice && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom color="text.secondary">Invoice</Typography>
                    <DetailRow label="Invoice #" value={detailTx.invoice.invoiceNumber} />
                    <DetailRow label="Subtotal" value={formatCurrencyExact(detailTx.invoice.amount)} />
                    <DetailRow label="Tax" value={formatCurrencyExact(detailTx.invoice.taxAmount)} />
                    <DetailRow label="Total" value={formatCurrencyExact(detailTx.invoice.totalAmount)} />
                  </Paper>
                )}
              </Stack>
            ) : (
              <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No transaction data available.
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
            {detailTx?.status === 'completed' && (
              <Button
                variant="contained"
                color="error"
                startIcon={<RefundIcon />}
                onClick={() => openRefundDialog(detailTx)}
                sx={{ order: { xs: 1, sm: 0 } }}
              >
                Process Refund
              </Button>
            )}
            <Button onClick={() => setDetailOpen(false)} sx={{ order: { xs: 0, sm: 1 }, ml: { sm: 'auto' } }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Refund Confirmation Dialog ──────────────────────── */}
        <Dialog
          open={refundDialog.open}
          onClose={() => !refundDialog.submitting && setRefundDialog({ open: false, tx: null, reason: '', submitting: false })}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Process Refund</DialogTitle>
          <DialogContent>
            {refundDialog.tx && (
              <>
                <DialogContentText sx={{ mb: 2 }}>
                  Refund <strong>{formatCurrencyExact(refundDialog.tx.amount)}</strong> to{' '}
                  <strong>{refundDialog.tx.userName}</strong> for course{' '}
                  <strong>"{refundDialog.tx.courseTitle}"</strong>?
                </DialogContentText>
                <TextField
                  fullWidth
                  size="small"
                  label="Refund Reason"
                  placeholder="Enter reason for refund…"
                  multiline
                  rows={3}
                  value={refundDialog.reason}
                  onChange={(e) => setRefundDialog((prev) => ({ ...prev, reason: e.target.value }))}
                  required
                  disabled={refundDialog.submitting}
                  data-testid="admin-refund-reason"
                />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button
              onClick={() => setRefundDialog({ open: false, tx: null, reason: '', submitting: false })}
              disabled={refundDialog.submitting}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={confirmRefund}
              disabled={!refundDialog.reason.trim() || refundDialog.submitting}
            >
              {refundDialog.submitting ? 'Processing…' : 'Confirm Refund'}
            </Button>
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
