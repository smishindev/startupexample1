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
  type SelectChangeEvent,
} from '@mui/material';
import {
  People as PeopleIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  LockReset as ResetIcon,
  Visibility as ViewIcon,
  School as InstructorIcon,
  AdminPanelSettings as AdminIcon,
  Person as StudentIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer, PageTitle, useResponsive } from '../../components/Responsive';
import {
  adminApi,
  AdminUser,
  PaginatedUsers,
  UserFilters,
} from '../../services/adminApi';
import { AdminUserDetailDialog } from './AdminUserDetailDialog';

// ── Helpers ───────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);

const formatDate = (d: string | null) => {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
};

const roleIcon = (role: string) => {
  switch (role) {
    case 'admin': return <AdminIcon fontSize="small" />;
    case 'instructor': return <InstructorIcon fontSize="small" />;
    default: return <StudentIcon fontSize="small" />;
  }
};

const roleColor = (role: string): 'error' | 'primary' | 'default' => {
  switch (role) {
    case 'admin': return 'error';
    case 'instructor': return 'primary';
    default: return 'default';
  }
};

// ── Main Component ────────────────────────────────────────────────

export const AdminUserManagement: React.FC = () => {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  // Data state
  const [data, setData] = useState<PaginatedUsers | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  // UI state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  // Dialogs
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; user: AdminUser | null; newRole: string }>({
    open: false, user: null, newRole: '',
  });
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; user: AdminUser | null; newStatus: boolean }>({
    open: false, user: null, newStatus: false,
  });
  const [resetDialog, setResetDialog] = useState<{ open: boolean; user: AdminUser | null }>({
    open: false, user: null,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const filters: UserFilters = {
        page,
        limit,
        sortBy,
        sortOrder,
      };
      if (debouncedSearch) filters.search = debouncedSearch;
      if (roleFilter) filters.role = roleFilter;
      if (statusFilter) filters.status = statusFilter;

      const result = await adminApi.getUsers(filters);
      setData(result);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, roleFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Action handlers ─────────────────────────────────────────────

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, user: AdminUser) => {
    setAnchorEl(e.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Keep selectedUser so menu content stays visible during fade-out animation
  };

  const handleViewDetail = (user: AdminUser) => {
    setDetailUserId(user.id);
    setDetailOpen(true);
    handleMenuClose();
  };

  // ── Role change ────────────────────────────────────────────────
  const openRoleDialog = (user: AdminUser) => {
    setRoleDialog({ open: true, user, newRole: user.role });
    handleMenuClose();
  };

  const confirmRoleChange = async () => {
    if (!roleDialog.user || roleDialog.newRole === roleDialog.user.role) {
      setRoleDialog({ open: false, user: null, newRole: '' });
      return;
    }
    try {
      await adminApi.updateUserRole(roleDialog.user.id, roleDialog.newRole);
      toast.success(`Role updated to ${roleDialog.newRole}`);
      fetchUsers();
    } catch {
      toast.error('Failed to change role');
    }
    setRoleDialog({ open: false, user: null, newRole: '' });
  };

  // ── Status toggle ──────────────────────────────────────────────
  const openStatusDialog = (user: AdminUser) => {
    setStatusDialog({ open: true, user, newStatus: !user.isActive });
    handleMenuClose();
  };

  const confirmStatusChange = async () => {
    if (!statusDialog.user) return;
    try {
      await adminApi.updateUserStatus(statusDialog.user.id, statusDialog.newStatus);
      toast.success(statusDialog.newStatus ? 'User activated' : 'User deactivated');
      fetchUsers();
    } catch {
      toast.error('Failed to change status');
    }
    setStatusDialog({ open: false, user: null, newStatus: false });
  };

  // ── Password reset ─────────────────────────────────────────────
  const openResetDialog = (user: AdminUser) => {
    setResetDialog({ open: true, user });
    handleMenuClose();
  };

  const confirmPasswordReset = async () => {
    if (!resetDialog.user) return;
    try {
      const result = await adminApi.resetUserPassword(resetDialog.user.id);
      toast.success(result.message);
    } catch {
      toast.error('Failed to reset password');
    }
    setResetDialog({ open: false, user: null });
  };

  // ── Summary stats ──────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    if (!data) return null;
    return {
      total: data.pagination.total,
      showing: data.users.length,
      page: data.pagination.page,
      totalPages: data.pagination.totalPages,
    };
  }, [data]);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <>
      <Header />
      <PageContainer>
        <PageTitle subtitle="Manage platform users, roles, and accounts" icon={<PeopleIcon />}>
          User Management
        </PageTitle>

        {/* ── Filter Bar ──────────────────────────────────────── */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
            <Grid container spacing={isMobile ? 1.5 : 2} alignItems="center">
              {/* Search */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search by name, email, or username…"
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
                  data-testid="admin-users-search"
                />
              </Grid>

              {/* Role filter */}
              <Grid item xs={6} sm={3} md={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={roleFilter}
                    label="Role"
                    onChange={(e: SelectChangeEvent) => { setRoleFilter(e.target.value); setPage(1); }}
                    data-testid="admin-users-role-filter"
                  >
                    <MenuItem value="">All Roles</MenuItem>
                    <MenuItem value="student">Student</MenuItem>
                    <MenuItem value="instructor">Instructor</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Status filter */}
              <Grid item xs={6} sm={3} md={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e: SelectChangeEvent) => { setStatusFilter(e.target.value); setPage(1); }}
                    data-testid="admin-users-status-filter"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Sort */}
              <Grid item xs={6} sm={3} md={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort By"
                    onChange={(e: SelectChangeEvent) => { setSortBy(e.target.value); setPage(1); }}
                  >
                    <MenuItem value="created">Joined Date</MenuItem>
                    <MenuItem value="name">Name</MenuItem>
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="role">Role</MenuItem>
                    <MenuItem value="lastLogin">Last Login</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Sort order + Refresh */}
              <Grid item xs={6} sm={3} md={2}>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                    sx={{ minWidth: 0, px: 1.5, textTransform: 'none' }}
                  >
                    {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
                  </Button>
                  <Tooltip title="Refresh">
                    <IconButton size="small" onClick={fetchUsers} color="primary">
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
            Showing {summaryStats.showing} of {summaryStats.total} users
            {debouncedSearch && ` matching "${debouncedSearch}"`}
            {roleFilter && ` · ${roleFilter}`}
            {statusFilter && ` · ${statusFilter}`}
          </Typography>
        )}

        {/* ── User Table (desktop) / Card List (mobile) ───────── */}
        {loading ? (
          <Card>
            <CardContent>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </CardContent>
          </Card>
        ) : !data || data.users.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <PeopleIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                No users found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or search query.
              </Typography>
            </CardContent>
          </Card>
        ) : isMobile ? (
          /* ── Mobile: Card List ──────────────────────────────── */
          <Stack spacing={1.5}>
            {data.users.map((user) => (
              <Card
                key={user.id}
                data-testid={`admin-user-card-${user.id}`}
                onClick={() => handleViewDetail(user)}
                sx={{ cursor: 'pointer', '&:active': { bgcolor: alpha(theme.palette.primary.main, 0.04) } }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Avatar
                      src={user.avatar || undefined}
                      sx={{ width: 40, height: 40, bgcolor: alpha(theme.palette.primary.main, 0.12) }}
                    >
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" noWrap>
                          {user.firstName} {user.lastName}
                        </Typography>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMenuOpen(e, user); }}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {user.email}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          icon={roleIcon(user.role)}
                          label={user.role}
                          size="small"
                          color={roleColor(user.role)}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                        <Chip
                          label={user.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={user.isActive ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', alignSelf: 'center' }}>
                          {formatDate(user.createdAt)}
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
                  <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', lg: 'table-cell' } }}>Enrollments</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Spent</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', lg: 'table-cell' } }}>Last Login</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.users.map((user) => (
                  <TableRow
                    key={user.id}
                    hover
                    sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                    onClick={() => handleViewDetail(user)}
                    data-testid={`admin-user-row-${user.id}`}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          src={user.avatar || undefined}
                          sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.primary.main, 0.12), fontSize: '0.75rem' }}
                        >
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            @{user.username}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                        {user.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={roleIcon(user.role)}
                        label={user.role}
                        size="small"
                        color={roleColor(user.role)}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={user.isActive ? 'success' : 'default'}
                        variant={user.isActive ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.7rem', height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{user.enrollmentCount}</TableCell>
                    <TableCell>{formatCurrency(user.totalSpent)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>{formatDate(user.createdAt)}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Typography variant="body2" noWrap>{formatDate(user.lastLoginAt)}</Typography>
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, user)}>
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
          {selectedUser && [
            <MenuItem key="view" onClick={() => handleViewDetail(selectedUser)} data-testid="admin-user-action-view">
              <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
              <ListItemText>View Details</ListItemText>
            </MenuItem>,
            <MenuItem key="role" onClick={() => openRoleDialog(selectedUser)} data-testid="admin-user-action-role">
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Change Role</ListItemText>
            </MenuItem>,
            <MenuItem
              key="status"
              onClick={() => openStatusDialog(selectedUser)}
              data-testid="admin-user-action-status"
            >
              <ListItemIcon>
                {selectedUser.isActive ? <BlockIcon fontSize="small" color="error" /> : <ActiveIcon fontSize="small" color="success" />}
              </ListItemIcon>
              <ListItemText>{selectedUser.isActive ? 'Deactivate' : 'Activate'}</ListItemText>
            </MenuItem>,
            <MenuItem key="reset" onClick={() => openResetDialog(selectedUser)} data-testid="admin-user-action-reset">
              <ListItemIcon><ResetIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Reset Password</ListItemText>
            </MenuItem>,
          ]}
        </Menu>

        {/* ── Role Change Dialog ──────────────────────────────── */}
        <Dialog open={roleDialog.open} onClose={() => setRoleDialog({ open: false, user: null, newRole: '' })} maxWidth="xs" fullWidth>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogContent>
            {roleDialog.user && (
              <>
                <DialogContentText sx={{ mb: 2 }}>
                  Change role for <strong>{roleDialog.user.firstName} {roleDialog.user.lastName}</strong> ({roleDialog.user.email})
                </DialogContentText>
                <FormControl fullWidth size="small">
                  <InputLabel>New Role</InputLabel>
                  <Select
                    value={roleDialog.newRole}
                    label="New Role"
                    onChange={(e: SelectChangeEvent) => setRoleDialog((prev) => ({ ...prev, newRole: e.target.value }))}
                  >
                    <MenuItem value="student">Student</MenuItem>
                    <MenuItem value="instructor">Instructor</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRoleDialog({ open: false, user: null, newRole: '' })}>Cancel</Button>
            <Button
              variant="contained"
              onClick={confirmRoleChange}
              disabled={!roleDialog.newRole || roleDialog.newRole === roleDialog.user?.role}
            >
              Update Role
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Status Change (Activate/Deactivate) Dialog ──────── */}
        <Dialog open={statusDialog.open} onClose={() => setStatusDialog({ open: false, user: null, newStatus: false })} maxWidth="xs" fullWidth>
          <DialogTitle>
            {statusDialog.newStatus ? 'Activate User' : 'Deactivate User'}
          </DialogTitle>
          <DialogContent>
            {statusDialog.user && (
              <DialogContentText>
                {statusDialog.newStatus
                  ? `Activate the account for ${statusDialog.user.firstName} ${statusDialog.user.lastName}? They will be able to log in again.`
                  : `Deactivate ${statusDialog.user.firstName} ${statusDialog.user.lastName}? They will be unable to log in until reactivated.`}
              </DialogContentText>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatusDialog({ open: false, user: null, newStatus: false })}>Cancel</Button>
            <Button
              variant="contained"
              color={statusDialog.newStatus ? 'success' : 'error'}
              onClick={confirmStatusChange}
            >
              {statusDialog.newStatus ? 'Activate' : 'Deactivate'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Password Reset Dialog ───────────────────────────── */}
        <Dialog open={resetDialog.open} onClose={() => setResetDialog({ open: false, user: null })} maxWidth="xs" fullWidth>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogContent>
            {resetDialog.user && (
              <DialogContentText>
                Send a password reset to <strong>{resetDialog.user.email}</strong>?
                A temporary reset token will be generated.
              </DialogContentText>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetDialog({ open: false, user: null })}>Cancel</Button>
            <Button variant="contained" onClick={confirmPasswordReset}>
              Reset Password
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── User Detail Dialog ──────────────────────────────── */}
        {detailUserId && (
          <AdminUserDetailDialog
            open={detailOpen}
            userId={detailUserId}
            onClose={() => { setDetailOpen(false); setDetailUserId(null); }}
            onRoleChange={(user) => {
              // Merge with full AdminUser from data list for the dialog state
              const fullUser = data?.users.find((u) => u.id === user.id);
              if (fullUser) setRoleDialog({ open: true, user: fullUser, newRole: user.role });
              setDetailOpen(false);
            }}
            onStatusChange={(user) => {
              const fullUser = data?.users.find((u) => u.id === user.id);
              if (fullUser) setStatusDialog({ open: true, user: fullUser, newStatus: !user.isActive });
              setDetailOpen(false);
            }}
            onResetPassword={(user) => {
              const fullUser = data?.users.find((u) => u.id === user.id);
              if (fullUser) setResetDialog({ open: true, user: fullUser });
              setDetailOpen(false);
            }}
          />
        )}
      </PageContainer>
    </>
  );
};
