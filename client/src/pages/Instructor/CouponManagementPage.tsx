/**
 * CouponManagementPage — Instructor coupon / discount code management
 * Route: /instructor/coupons
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Tooltip,
  Alert,
  CircularProgress,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Stack,
  Card,
  CardContent,
  InputAdornment,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PeopleIcon from '@mui/icons-material/People';
import { format } from 'date-fns';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer, PageTitle, useResponsive, ResponsiveDialog } from '../../components/Responsive';
import { CourseSelector } from '../../components/Common/CourseSelector';
import {
  getInstructorCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deactivateCoupon,
  type Coupon,
  type CouponDetail,
  type CreateCouponInput,
} from '../../services/couponApi';
import { instructorApi } from '../../services/instructorApi';

// ─── Helpers ─────────────────────────────────────────────────────────────

const discountLabel = (c: Coupon) =>
  c.DiscountType === 'percentage' ? `${c.DiscountValue}%` : `$${c.DiscountValue.toFixed(2)}`;

const discountColor = (c: Coupon): 'primary' | 'secondary' =>
  c.DiscountType === 'percentage' ? 'primary' : 'secondary';

const isExpired = (c: Coupon) => !!c.ExpiresAt && new Date(c.ExpiresAt) < new Date();

const couponStatus = (c: Coupon): { label: string; color: 'success' | 'error' | 'warning' } => {
  if (!c.IsActive) return { label: 'Inactive', color: 'error' };
  if (isExpired(c)) return { label: 'Expired', color: 'warning' };
  if (c.MaxUses !== null && c.UsedCount >= c.MaxUses) return { label: 'Exhausted', color: 'warning' };
  return { label: 'Active', color: 'success' };
};

// ─── Stat Card ───────────────────────────────────────────────────────────

interface StatCardProps { icon: React.ReactNode; label: string; value: string | number; color: string }

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, borderLeft: 4, borderColor: color }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ color, fontSize: 32 }}>{icon}</Box>
      <Box>
        <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem' } }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </Box>
  </Paper>
);

// ─── Create / Edit Dialog ────────────────────────────────────────────────

interface CouponFormState {
  code: string;
  courseId: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  maxUses: string;
  expiresAt: string;
  minimumPrice: string;
}

const EMPTY_FORM: CouponFormState = {
  code: '', courseId: '', discountType: 'percentage', discountValue: '',
  maxUses: '', expiresAt: '', minimumPrice: '',
};

interface CouponFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Coupon | null;
}

const CouponFormDialog: React.FC<CouponFormDialogProps> = ({ open, onClose, onSaved, editing }) => {
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructorCourses, setInstructorCourses] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      instructorApi.getCoursesForDropdown('published')
        .then((courses) => setInstructorCourses(courses))
        .catch(() => {/* non-fatal */});
      if (editing) {
        setForm({
          code: editing.Code,
          courseId: editing.CourseId ?? '',
          discountType: editing.DiscountType,
          discountValue: editing.DiscountValue.toString(),
          maxUses: editing.MaxUses?.toString() ?? '',
              expiresAt: editing.ExpiresAt ? editing.ExpiresAt.substring(0, 10) : '',
          minimumPrice: editing.MinimumPrice > 0 ? editing.MinimumPrice.toString() : '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setError(null);
    }
  }, [open, editing]);

  const handleChange = (field: keyof CouponFormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.code.trim()) { setError('Coupon code is required'); return; }
    if (!form.discountValue || parseFloat(form.discountValue) <= 0) {
      setError('Discount value must be greater than 0'); return;
    }
    if (form.discountType === 'percentage' && parseFloat(form.discountValue) > 100) {
      setError('Percentage discount cannot exceed 100%'); return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: CreateCouponInput = {
        code: form.code.trim().toUpperCase(),
        courseId: form.courseId || null,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
        minimumPrice: form.minimumPrice ? parseFloat(form.minimumPrice) : 0,
      };
      if (editing) {
        await updateCoupon(editing.Id, {
          discountType: payload.discountType,
          discountValue: payload.discountValue,
          maxUses: payload.maxUses,
          expiresAt: payload.expiresAt,
          minimumPrice: payload.minimumPrice,
        });
      } else {
        await createCoupon(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onClose={onClose} title={editing ? 'Edit Coupon' : 'Create Coupon'} maxWidth="sm">
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2.5}>

          {/* Code */}
          <TextField
            label="Coupon Code"
            value={form.code}
            onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
            disabled={!!editing}
            helperText={editing ? 'Code cannot be changed after creation' : 'e.g. SUMMER20, FLAT10 — alphanumeric, hyphens, underscores'}
            inputProps={{ maxLength: 50, style: { fontFamily: 'monospace', letterSpacing: 2 } }}
            fullWidth
            required
          />

          {/* Course (only on create) */}
          {!editing && (
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Apply to course (leave empty to apply to ALL your courses)
              </Typography>
              <CourseSelector
                courses={instructorCourses}
                value={form.courseId}
                onChange={(id) => handleChange('courseId', id ?? '')}
                label="Course (optional)"
              />
            </Box>
          )}

          {/* Discount Type + Value */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={5}>
              <FormControl fullWidth>
                <InputLabel>Discount Type</InputLabel>
                <Select
                  value={form.discountType}
                  label="Discount Type"
                  onChange={(e) => handleChange('discountType', e.target.value)}
                >
                  <MenuItem value="percentage">Percentage (%)</MenuItem>
                  <MenuItem value="fixed">Fixed Amount ($)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={7}>
              <TextField
                label={form.discountType === 'percentage' ? 'Percentage Off' : 'Amount Off ($)'}
                value={form.discountValue}
                onChange={(e) => handleChange('discountValue', e.target.value)}
                type="number"
                inputProps={{ min: 0.01, max: form.discountType === 'percentage' ? 100 : undefined, step: 0.01 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {form.discountType === 'percentage' ? '%' : '$'}
                    </InputAdornment>
                  ),
                }}
                fullWidth
                required
              />
            </Grid>
          </Grid>

          {/* Max Uses + Expiry */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Max Uses (leave blank = unlimited)"
                value={form.maxUses}
                onChange={(e) => handleChange('maxUses', e.target.value)}
                type="number"
                inputProps={{ min: 1, step: 1 }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Expiry Date (optional)"
                value={form.expiresAt}
                onChange={(e) => handleChange('expiresAt', e.target.value)}
                type="date"
                inputProps={{ min: format(new Date(), 'yyyy-MM-dd') }}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
          </Grid>

          {/* Minimum Price */}
          <TextField
            label="Minimum Course Price ($) — 0 for no minimum"
            value={form.minimumPrice}
            onChange={(e) => handleChange('minimumPrice', e.target.value)}
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Coupon'}
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
};

// ─── Detail Dialog ───────────────────────────────────────────────────────

interface CouponDetailDialogProps {
  open: boolean;
  couponId: string | null;
  onClose: () => void;
  onEdit: (c: Coupon) => void;
}

const CouponDetailDialog: React.FC<CouponDetailDialogProps> = ({ open, couponId, onClose, onEdit }) => {
  const [data, setData] = useState<CouponDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && couponId) {
      setLoading(true);
      getCouponById(couponId)
        .then(setData)
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }
  }, [open, couponId]);

  const handleCopy = () => {
    if (data?.Code) {
      navigator.clipboard.writeText(data.Code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const status = data ? couponStatus(data) : null;

  return (
    <ResponsiveDialog open={open} onClose={onClose} title="Coupon Details" maxWidth="sm">
      <DialogContent>
        {loading && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}
        {!loading && !data && <Alert severity="error">Failed to load coupon details.</Alert>}
        {!loading && data && (
          <Stack spacing={2.5}>
            {/* Code */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'grey.50', p: 2, borderRadius: 2 }}>
              <Typography variant="h5" fontFamily="monospace" letterSpacing={3} fontWeight="bold" flexGrow={1}>
                {data.Code}
              </Typography>
              <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
                <IconButton size="small" onClick={handleCopy}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {status && <Chip label={status.label} color={status.color} size="small" />}
            </Box>

            {/* Key stats */}
            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <Typography variant="h6" color="primary.main" fontWeight="bold">
                    {discountLabel(data)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.DiscountType === 'percentage' ? 'Percent off' : 'Fixed amount off'}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold">
                    {data.UsedCount}{data.MaxUses !== null ? ` / ${data.MaxUses}` : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Uses</Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Meta */}
            <Stack spacing={0.75}>
              {data.CourseTitle && (
                <Typography variant="body2">
                  <strong>Course:</strong> {data.CourseTitle}
                </Typography>
              )}
              {!data.CourseId && (
                <Typography variant="body2" color="text.secondary">
                  Applies to all your courses
                </Typography>
              )}
              {data.MinimumPrice > 0 && (
                <Typography variant="body2">
                  <strong>Min price:</strong> ${data.MinimumPrice.toFixed(2)}
                </Typography>
              )}
              {data.ExpiresAt && (
                <Typography variant="body2">
                  <strong>Expires:</strong> {format(new Date(data.ExpiresAt), 'MMM dd, yyyy')}
                </Typography>
              )}
              <Typography variant="body2">
                <strong>Created:</strong> {format(new Date(data.CreatedAt), 'MMM dd, yyyy')}
              </Typography>
            </Stack>

            {/* Recent usage */}
            {data.recentUsage.length > 0 && (
              <>
                <Divider />
                <Typography variant="subtitle2" gutterBottom>Recent Usage</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Course</TableCell>
                        <TableCell align="right">Saved</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.recentUsage.map((u) => (
                        <TableRow key={u.Id}>
                          <TableCell>{u.StudentName}</TableCell>
                          <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.CourseTitle}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>
                            ${u.DiscountAmount.toFixed(2)}
                          </TableCell>
                          <TableCell>{format(new Date(u.UsedAt), 'MMM d')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        {data && (
          <Button variant="outlined" startIcon={<EditIcon />}
            onClick={() => { onClose(); onEdit(data); }}
          >
            Edit
          </Button>
        )}
      </DialogActions>
    </ResponsiveDialog>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────

const CouponManagementPage: React.FC = () => {
  const { isMobile } = useResponsive();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [_totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);           // 0-indexed for TablePagination
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Coupon | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Coupon | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Debounce search to avoid an API call per keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInstructorCoupons({
        page: page + 1,
        limit,
        search: debouncedSearch,
        active: activeOnly || undefined,
      });
      setCoupons(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, activeOnly]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  // Derived summary stats from loaded data
  const activeCoupons = coupons.filter((c) => c.IsActive && !isExpired(c)).length;
  const totalUses = coupons.reduce((s, c) => s + c.UsedCount, 0);

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deactivateCoupon(deactivateTarget.Id);
      setDeactivateTarget(null);
      fetchCoupons();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate coupon. Please try again.');
      setDeactivateTarget(null);
    } finally {
      setDeactivating(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await updateCoupon(coupon.Id, { isActive: !coupon.IsActive });
      fetchCoupons();
    } catch (err: any) {
      setError(err.message || 'Failed to update coupon status. Please try again.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <Header />
      <PageContainer sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <PageTitle subtitle="Create and manage discount codes for your courses">
            Coupon Management
          </PageTitle>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            size={isMobile ? 'medium' : 'large'}
          >
            New Coupon
          </Button>
        </Box>

        {/* Stat Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              icon={<LocalOfferIcon fontSize="inherit" />}
              label="Total Coupons"
              value={total}
              color="primary.main"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              icon={<CheckCircleIcon fontSize="inherit" />}
              label="Active (shown)"
              value={activeCoupons}
              color="success.main"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              icon={<PeopleIcon fontSize="inherit" />}
              label="Total Uses (shown)"
              value={totalUses}
              color="secondary.main"
            />
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper elevation={1} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder="Search by code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 260 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
            <FormControlLabel
              control={<Switch checked={activeOnly} onChange={(e) => { setActiveOnly(e.target.checked); setPage(0); }} />}
              label="Active only"
            />
          </Box>
        </Paper>

        {/* Error */}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Content */}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
        ) : coupons.length === 0 ? (
          <Paper elevation={1} sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
            <LocalOfferIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No coupons yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first discount code to boost course enrollments
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              Create First Coupon
            </Button>
          </Paper>
        ) : isMobile ? (
          /* Mobile: Card list + pagination */
          <Box>
            <Stack spacing={1.5}>
              {coupons.map((coupon) => {
                const st = couponStatus(coupon);
                return (
                  <Card key={coupon.Id} elevation={1} sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ pb: '12px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" fontFamily="monospace" fontWeight="bold" letterSpacing={1.5}>
                            {coupon.Code}
                          </Typography>
                          <Chip label={st.label} color={st.color} size="small" />
                        </Box>
                        <Chip label={discountLabel(coupon)} color={discountColor(coupon)} size="small" variant="outlined" />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {coupon.CourseTitle ?? 'All courses'}
                        {coupon.MaxUses !== null && ` · ${coupon.UsedCount}/${coupon.MaxUses} uses`}
                        {coupon.MaxUses === null && ` · ${coupon.UsedCount} uses`}
                        {coupon.ExpiresAt && ` · Exp ${format(new Date(coupon.ExpiresAt), 'MMM d, yy')}`}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                        <IconButton size="small" onClick={() => setDetailId(coupon.Id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => setEditTarget(coupon)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <Switch
                          size="small"
                          checked={coupon.IsActive}
                          onChange={() => handleToggleActive(coupon)}
                        />
                        <Box sx={{ flexGrow: 1 }} />
                        <IconButton size="small" color="error" onClick={() => setDeactivateTarget(coupon)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={limit}
              rowsPerPageOptions={[limit]}
              onPageChange={(_, newPage) => setPage(newPage)}
              sx={{ mt: 1 }}
            />
          </Box>
        ) : (
          /* Desktop: Table */
          <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><strong>Code</strong></TableCell>
                    <TableCell><strong>Discount</strong></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><strong>Course</strong></TableCell>
                    <TableCell><strong>Uses</strong></TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}><strong>Expires</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Active</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {coupons.map((coupon) => {
                    const st = couponStatus(coupon);
                    return (
                      <TableRow key={coupon.Id} hover>
                        <TableCell>
                          <Typography fontFamily="monospace" fontWeight="bold" letterSpacing={1.5} fontSize={13}>
                            {coupon.Code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={discountLabel(coupon)} color={discountColor(coupon)} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell
                          sx={{ display: { xs: 'none', md: 'table-cell' }, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          <Tooltip title={coupon.CourseTitle ?? 'All courses'}>
                            <span>{coupon.CourseTitle ?? <em style={{ opacity: 0.6 }}>All courses</em>}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {coupon.UsedCount}
                          {coupon.MaxUses !== null && (
                            <Typography component="span" variant="caption" color="text.secondary">
                              /{coupon.MaxUses}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          {coupon.ExpiresAt ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarTodayIcon fontSize="inherit" sx={{ opacity: 0.5 }} />
                              {format(new Date(coupon.ExpiresAt), 'MMM d, yyyy')}
                            </Box>
                          ) : (
                            <Typography color="text.secondary" variant="caption">Never</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip label={st.label} color={st.color} size="small" />
                        </TableCell>
                        <TableCell>
                          <Switch
                            size="small"
                            checked={coupon.IsActive}
                            onChange={() => handleToggleActive(coupon)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View details">
                            <IconButton size="small" onClick={() => setDetailId(coupon.Id)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => setEditTarget(coupon)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deactivate">
                            <IconButton size="small" color="error" onClick={() => setDeactivateTarget(coupon)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={limit}
              rowsPerPageOptions={[limit]}
              onPageChange={(_, newPage) => setPage(newPage)}
              sx={{ borderTop: 1, borderColor: 'divider' }}
            />
          </Paper>
        )}

        {/* Create Dialog */}
        <CouponFormDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSaved={fetchCoupons}
        />

        {/* Edit Dialog */}
        <CouponFormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={fetchCoupons}
          editing={editTarget}
        />

        {/* Detail Dialog */}
        <CouponDetailDialog
          open={!!detailId}
          couponId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(c) => { setDetailId(null); setEditTarget(c); }}
        />

        {/* Deactivate Confirm */}
        <ResponsiveDialog
          open={!!deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          title="Deactivate Coupon"
          maxWidth="xs"
        >
          <DialogContent>
            <DialogContentText>
              Are you sure you want to deactivate coupon{' '}
              <strong style={{ fontFamily: 'monospace' }}>{deactivateTarget?.Code}</strong>?
              Students will no longer be able to use it at checkout.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeactivateTarget(null)} disabled={deactivating}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDeactivate} disabled={deactivating}
              startIcon={deactivating ? <CircularProgress size={16} /> : <CancelIcon />}
            >
              {deactivating ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogActions>
        </ResponsiveDialog>
      </PageContainer>
    </>
  );
};

export default CouponManagementPage;
