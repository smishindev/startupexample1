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
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  alpha,
  useTheme,
  Stack,
  Rating,
  type SelectChangeEvent,
} from '@mui/material';
import {
  School as CourseIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Publish as PublishIcon,
  Archive as ArchiveIcon,
  Drafts as DraftIcon,
  SwapHoriz as ReassignIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer, PageTitle, useResponsive } from '../../components/Responsive';
import {
  adminApi,
  AdminCourse,
  PaginatedCourses,
  CourseFilters,
} from '../../services/adminApi';
import { AdminCourseDetailDialog } from './AdminCourseDetailDialog';

// ── Constants ─────────────────────────────────────────────────────

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'programming', label: 'Programming' },
  { value: 'data_science', label: 'Data Science' },
  { value: 'design', label: 'Design' },
  { value: 'business', label: 'Business' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'language', label: 'Language' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'science', label: 'Science' },
  { value: 'arts', label: 'Arts' },
  { value: 'other', label: 'Other' },
];

const LEVELS = [
  { value: '', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
  { value: 'deleted', label: 'Deleted' },
];

// ── Helpers ───────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);

const formatDate = (d: string | null) => {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
};

const statusColor = (s: string): 'success' | 'warning' | 'default' | 'error' | 'info' => {
  switch (s) {
    case 'published': return 'success';
    case 'draft': return 'warning';
    case 'archived': return 'info';
    case 'deleted': return 'error';
    default: return 'default';
  }
};

const statusIcon = (s: string) => {
  switch (s) {
    case 'published': return <PublishIcon fontSize="small" />;
    case 'draft': return <DraftIcon fontSize="small" />;
    case 'archived': return <ArchiveIcon fontSize="small" />;
    case 'deleted': return <DeleteIcon fontSize="small" />;
    default: return null;
  }
};

const levelColor = (l: string): 'default' | 'info' | 'warning' | 'error' => {
  switch (l) {
    case 'beginner': return 'info';
    case 'intermediate': return 'default';
    case 'advanced': return 'warning';
    case 'expert': return 'error';
    default: return 'default';
  }
};

const categoryLabel = (c: string) =>
  CATEGORIES.find((cat) => cat.value === c)?.label || c;

// ── Main Component ────────────────────────────────────────────────

export const AdminCourseManagement: React.FC = () => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  // Data state
  const [data, setData] = useState<PaginatedCourses | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [sortBy, setSortBy] = useState('updated');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  // UI state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCourse, setSelectedCourse] = useState<AdminCourse | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCourseId, setDetailCourseId] = useState<string | null>(null);

  // Dialogs
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; course: AdminCourse | null; newStatus: string }>({
    open: false, course: null, newStatus: '',
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; course: AdminCourse | null }>({
    open: false, course: null,
  });
  const [reassignDialog, setReassignDialog] = useState<{ open: boolean; course: AdminCourse | null; newInstructorId: string }>({
    open: false, course: null, newInstructorId: '',
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const filters: CourseFilters = { page, limit, sortBy, sortOrder };
      if (debouncedSearch) filters.search = debouncedSearch;
      if (statusFilter) filters.status = statusFilter;
      if (categoryFilter) filters.category = categoryFilter;
      if (levelFilter) filters.level = levelFilter;

      const result = await adminApi.getCourses(filters);
      setData(result);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, categoryFilter, levelFilter, sortBy, sortOrder]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // ── Action handlers ─────────────────────────────────────────────

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, course: AdminCourse) => {
    setAnchorEl(e.currentTarget);
    setSelectedCourse(course);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetail = (course: AdminCourse) => {
    setDetailCourseId(course.id);
    setDetailOpen(true);
    handleMenuClose();
  };

  // ── Status change ──────────────────────────────────────────────
  const openStatusDialog = (course: AdminCourse, newStatus: string) => {
    setStatusDialog({ open: true, course, newStatus });
    handleMenuClose();
  };

  const confirmStatusChange = async () => {
    if (!statusDialog.course) return;
    try {
      await adminApi.updateCourseStatus(statusDialog.course.id, statusDialog.newStatus);
      toast.success(`Course status updated to ${statusDialog.newStatus}`);
      fetchCourses();
    } catch {
      toast.error('Failed to change course status');
    }
    setStatusDialog({ open: false, course: null, newStatus: '' });
  };

  // ── Delete ─────────────────────────────────────────────────────
  const openDeleteDialog = (course: AdminCourse) => {
    setDeleteDialog({ open: true, course });
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (!deleteDialog.course) return;
    try {
      await adminApi.deleteCourse(deleteDialog.course.id);
      toast.success('Course deleted');
      fetchCourses();
    } catch {
      toast.error('Failed to delete course');
    }
    setDeleteDialog({ open: false, course: null });
  };

  // ── Reassign ───────────────────────────────────────────────────
  const openReassignDialog = (course: AdminCourse) => {
    setReassignDialog({ open: true, course, newInstructorId: '' });
    handleMenuClose();
  };

  const confirmReassign = async () => {
    if (!reassignDialog.course || !reassignDialog.newInstructorId.trim()) return;
    try {
      await adminApi.reassignCourse(reassignDialog.course.id, reassignDialog.newInstructorId.trim());
      toast.success('Course reassigned');
      fetchCourses();
    } catch {
      toast.error('Failed to reassign course');
    }
    setReassignDialog({ open: false, course: null, newInstructorId: '' });
  };

  // ── Summary ────────────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    if (!data) return null;
    return {
      total: data.pagination.total,
      showing: data.courses.length,
      page: data.pagination.page,
      totalPages: data.pagination.totalPages,
    };
  }, [data]);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <>
      <Header />
      <PageContainer>
        <PageTitle subtitle="Manage courses, statuses, and content" icon={<CourseIcon />}>
          Course Management
        </PageTitle>

        {/* ── Filter Bar ──────────────────────────────────────── */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
            <Grid container spacing={isMobile ? 1.5 : 2} alignItems="center">
              {/* Search */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search courses…"
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
                  data-testid="admin-courses-search"
                />
              </Grid>

              {/* Status filter */}
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

              {/* Category filter */}
              <Grid item xs={6} sm={3} md={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    label="Category"
                    onChange={(e: SelectChangeEvent) => { setCategoryFilter(e.target.value); setPage(1); }}
                  >
                    {CATEGORIES.map((c) => (
                      <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Level filter */}
              <Grid item xs={6} sm={3} md={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Level</InputLabel>
                  <Select
                    value={levelFilter}
                    label="Level"
                    onChange={(e: SelectChangeEvent) => { setLevelFilter(e.target.value); setPage(1); }}
                  >
                    {LEVELS.map((l) => (
                      <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Sort + Order + Refresh */}
              <Grid item xs={6} sm={6} md={3}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 90 }, flex: 1 }}>
                    <InputLabel>Sort</InputLabel>
                    <Select
                      value={sortBy}
                      label="Sort"
                      onChange={(e: SelectChangeEvent) => { setSortBy(e.target.value); setPage(1); }}
                    >
                      <MenuItem value="updated">Updated</MenuItem>
                      <MenuItem value="created">Created</MenuItem>
                      <MenuItem value="title">Title</MenuItem>
                      <MenuItem value="price">Price</MenuItem>
                      <MenuItem value="rating">Rating</MenuItem>
                      <MenuItem value="enrollments">Enrollments</MenuItem>
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
                    <IconButton size="small" onClick={fetchCourses} color="primary">
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* ── Results summary ─────────────────────────────────── */}
        {summaryStats && !loading && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Showing {summaryStats.showing} of {summaryStats.total} courses
            {debouncedSearch && ` matching "${debouncedSearch}"`}
            {statusFilter && ` · ${statusFilter}`}
            {categoryFilter && ` · ${categoryLabel(categoryFilter)}`}
            {levelFilter && ` · ${levelFilter}`}
          </Typography>
        )}

        {/* ── Course Table (desktop) / Card List (mobile) ──────── */}
        {loading ? (
          <Card>
            <CardContent>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </CardContent>
          </Card>
        ) : !data || data.courses.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CourseIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                No courses found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or search query.
              </Typography>
            </CardContent>
          </Card>
        ) : isMobile ? (
          /* ── Mobile: Card List ──────────────────────────────── */
          <Stack spacing={1.5}>
            {data.courses.map((course) => (
              <Card
                key={course.id}
                onClick={() => handleViewDetail(course)}
                sx={{ cursor: 'pointer', '&:active': { bgcolor: alpha(theme.palette.primary.main, 0.04) } }}
                data-testid={`admin-course-card-${course.id}`}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Avatar
                      src={course.thumbnail || undefined}
                      variant="rounded"
                      sx={{ width: 48, height: 48, bgcolor: alpha(theme.palette.primary.main, 0.12) }}
                    >
                      <CourseIcon fontSize="small" />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                          {course.title}
                        </Typography>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMenuOpen(e, course); }}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {course.instructorName || 'No instructor'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Chip
                          icon={statusIcon(course.status) || undefined}
                          label={course.status}
                          size="small"
                          color={statusColor(course.status)}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                        <Chip
                          label={course.level}
                          size="small"
                          color={levelColor(course.level)}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 'auto' }}>
                          <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                          <Typography variant="caption">{course.rating.toFixed(1)}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {course.enrollmentCount} students
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
                  <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', lg: 'table-cell' } }}>Instructor</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', xl: 'table-cell' } }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', lg: 'table-cell' } }}>Level</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Rating</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Students</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', xl: 'table-cell' } }}>Updated</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.courses.map((course) => (
                  <TableRow
                    key={course.id}
                    hover
                    sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                    onClick={() => handleViewDetail(course)}
                    data-testid={`admin-course-row-${course.id}`}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          src={course.thumbnail || undefined}
                          variant="rounded"
                          sx={{ width: 36, height: 36, bgcolor: alpha(theme.palette.primary.main, 0.12), fontSize: '0.75rem' }}
                        >
                          <CourseIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {course.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {course.lessonCount} lessons
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 130 }}>
                        {course.instructorName || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={course.status}
                        size="small"
                        color={statusColor(course.status)}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>
                      <Typography variant="body2" noWrap>{categoryLabel(course.category)}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Chip
                        label={course.level}
                        size="small"
                        color={levelColor(course.level)}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Rating value={course.rating} precision={0.1} size="small" readOnly sx={{ fontSize: '0.9rem' }} />
                        <Typography variant="caption" color="text.secondary">
                          ({course.ratingCount})
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{course.enrollmentCount}</TableCell>
                    <TableCell>{formatCurrency(course.price)}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>
                      <Typography variant="body2" noWrap>{formatDate(course.updatedAt)}</Typography>
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, course)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ── Pagination ──────────────────────────────────────── */}
        {data && data.pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={data.pagination.totalPages}
              page={data.pagination.page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              size={isMobile ? 'small' : 'medium'}
            />
          </Box>
        )}

        {/* ── Context Menu ────────────────────────────────────── */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {selectedCourse && [
            <MenuItem key="view" onClick={() => handleViewDetail(selectedCourse)}>
              <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
              <ListItemText>View Details</ListItemText>
            </MenuItem>,
            // Show status transitions based on current status
            ...(selectedCourse.status !== 'published' ? [
              <MenuItem key="publish" onClick={() => openStatusDialog(selectedCourse, 'published')}>
                <ListItemIcon><PublishIcon fontSize="small" color="success" /></ListItemIcon>
                <ListItemText>Publish</ListItemText>
              </MenuItem>,
            ] : []),
            ...(selectedCourse.status !== 'draft' ? [
              <MenuItem key="draft" onClick={() => openStatusDialog(selectedCourse, 'draft')}>
                <ListItemIcon><DraftIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Revert to Draft</ListItemText>
              </MenuItem>,
            ] : []),
            ...(selectedCourse.status !== 'archived' ? [
              <MenuItem key="archive" onClick={() => openStatusDialog(selectedCourse, 'archived')}>
                <ListItemIcon><ArchiveIcon fontSize="small" color="info" /></ListItemIcon>
                <ListItemText>Archive</ListItemText>
              </MenuItem>,
            ] : []),
            <MenuItem key="reassign" onClick={() => openReassignDialog(selectedCourse)}>
              <ListItemIcon><ReassignIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Reassign Instructor</ListItemText>
            </MenuItem>,
            ...(selectedCourse.status !== 'deleted' ? [
              <MenuItem key="delete" onClick={() => openDeleteDialog(selectedCourse)}>
                <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
              </MenuItem>,
            ] : []),
          ]}
        </Menu>

        {/* ── Status Change Dialog ────────────────────────────── */}
        <Dialog
          open={statusDialog.open}
          onClose={() => setStatusDialog({ open: false, course: null, newStatus: '' })}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Change Course Status</DialogTitle>
          <DialogContent>
            {statusDialog.course && (
              <Typography variant="body1" color="text.secondary" component="div">
                Change <strong>"{statusDialog.course.title}"</strong> from{' '}
                <Chip label={statusDialog.course.status} size="small" color={statusColor(statusDialog.course.status)} variant="outlined" sx={{ mx: 0.5 }} />
                to{' '}
                <Chip label={statusDialog.newStatus} size="small" color={statusColor(statusDialog.newStatus)} variant="outlined" sx={{ mx: 0.5 }} />
                ?
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatusDialog({ open: false, course: null, newStatus: '' })}>Cancel</Button>
            <Button variant="contained" onClick={confirmStatusChange}>
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Delete Confirmation Dialog ──────────────────────── */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, course: null })}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Delete Course</DialogTitle>
          <DialogContent>
            {deleteDialog.course && (
              <DialogContentText>
                Are you sure you want to delete <strong>"{deleteDialog.course.title}"</strong>?
                This will set the course status to deleted. Students will no longer be able to access it.
              </DialogContentText>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, course: null })}>Cancel</Button>
            <Button variant="contained" color="error" onClick={confirmDelete}>
              Delete Course
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Reassign Instructor Dialog ──────────────────────── */}
        <Dialog
          open={reassignDialog.open}
          onClose={() => setReassignDialog({ open: false, course: null, newInstructorId: '' })}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Reassign Instructor</DialogTitle>
          <DialogContent>
            {reassignDialog.course && (
              <>
                <DialogContentText sx={{ mb: 2 }}>
                  Reassign <strong>"{reassignDialog.course.title}"</strong> from{' '}
                  <strong>{reassignDialog.course.instructorName || 'no instructor'}</strong> to a new instructor.
                </DialogContentText>
                <TextField
                  fullWidth
                  size="small"
                  label="New Instructor ID"
                  placeholder="Enter instructor user ID…"
                  value={reassignDialog.newInstructorId}
                  onChange={(e) => setReassignDialog((prev) => ({ ...prev, newInstructorId: e.target.value }))}
                  helperText="Enter the user ID of the instructor to assign this course to"
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReassignDialog({ open: false, course: null, newInstructorId: '' })}>Cancel</Button>
            <Button
              variant="contained"
              onClick={confirmReassign}
              disabled={!reassignDialog.newInstructorId.trim()}
            >
              Reassign
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Course Detail Dialog ────────────────────────────── */}
        <AdminCourseDetailDialog
          open={detailOpen}
          courseId={detailCourseId || ''}
          onClose={() => setDetailOpen(false)}
          onStatusChange={(course: { id: string; title: string; status: string }) => {
            // Find from list; if course is in current page, pre-fill
            const fullCourse = data?.courses.find((c) => c.id === course.id);
            if (fullCourse) {
              // Offer publish/archive based on current
              const nextStatus = course.status === 'published' ? 'archived' : 'published';
              setStatusDialog({ open: true, course: fullCourse, newStatus: nextStatus });
            }
            setDetailOpen(false);
          }}
          onReassign={(course: { id: string; title: string; instructorName: string }) => {
            const fullCourse = data?.courses.find((c) => c.id === course.id);
            if (fullCourse) setReassignDialog({ open: true, course: fullCourse, newInstructorId: '' });
            setDetailOpen(false);
          }}
          onDelete={(course: { id: string; title: string }) => {
            const fullCourse = data?.courses.find((c) => c.id === course.id);
            if (fullCourse) setDeleteDialog({ open: true, course: fullCourse });
            setDetailOpen(false);
          }}
        />
      </PageContainer>
    </>
  );
};
