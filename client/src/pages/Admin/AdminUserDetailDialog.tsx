import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  Chip,
  Divider,
  Grid,
  Skeleton,
  List,
  ListItem,
  ListItemText,
  IconButton,
  alpha,
  useTheme,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  LockReset as ResetIcon,
  School as InstructorIcon,
  AdminPanelSettings as AdminIcon,
  Person as StudentIcon,
  Email as EmailIcon,
  CalendarMonth as CalendarIcon,
  Login as LoginIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

import { useResponsive } from '../../components/Responsive';
import { adminApi, AdminUserDetail } from '../../services/adminApi';

// ── Helpers ───────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);

const formatDate = (d: string | null | undefined) => {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
};

const formatDateTime = (d: string | null | undefined) => {
  if (!d) return '—';
  try { return format(parseISO(d), 'MMM d, yyyy h:mm a'); } catch { return d; }
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

const statusChipColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  switch (status) {
    case 'active': case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'completed': return 'info';
    case 'failed': case 'refunded': return 'error';
    default: return 'default';
  }
};

// ── Props ─────────────────────────────────────────────────────────

interface AdminUserDetailDialogProps {
  open: boolean;
  userId: string;
  onClose: () => void;
  onRoleChange: (user: { id: string; role: string; firstName: string; lastName: string; email: string; isActive: boolean }) => void;
  onStatusChange: (user: { id: string; role: string; firstName: string; lastName: string; email: string; isActive: boolean }) => void;
  onResetPassword: (user: { id: string; role: string; firstName: string; lastName: string; email: string; isActive: boolean }) => void;
}

// ── Component ─────────────────────────────────────────────────────

export const AdminUserDetailDialog: React.FC<AdminUserDetailDialogProps> = ({
  open,
  userId,
  onClose,
  onRoleChange,
  onStatusChange,
  onResetPassword,
}) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    adminApi
      .getUserById(userId)
      .then(setUser)
      .catch(() => toast.error('Failed to load user details'))
      .finally(() => setLoading(false));
  }, [open, userId]);

  const actionPayload = user
    ? { id: user.id, role: user.role, firstName: user.firstName, lastName: user.lastName, email: user.email, isActive: user.isActive }
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
      data-testid="admin-user-detail-dialog"
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        User Details
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Skeleton variant="circular" width={56} height={56} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={28} />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="30%" />
              </Box>
            </Box>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Box>
        ) : user ? (
          <>
            {/* ── Profile Header ───────────────────────────────── */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Avatar
                src={user.avatar || undefined}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                  fontSize: '1.2rem',
                }}
              >
                {user.firstName?.[0]}{user.lastName?.[0]}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" noWrap>
                  {user.firstName} {user.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  @{user.username}
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
                    variant={user.isActive ? 'filled' : 'outlined'}
                    sx={{ fontSize: '0.7rem', height: 22 }}
                  />
                  {user.emailVerified && (
                    <Chip
                      label="Email verified"
                      size="small"
                      color="info"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 22 }}
                    />
                  )}
                </Box>
              </Box>
            </Box>

            {/* ── Meta Info ────────────────────────────────────── */}
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body2">{user.email}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon fontSize="small" color="action" />
                <Typography variant="body2">Joined {formatDate(user.createdAt)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LoginIcon fontSize="small" color="action" />
                <Typography variant="body2">Last login: {formatDateTime(user.lastLoginAt)}</Typography>
              </Box>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {/* ── Stats ────────────────────────────────────────── */}
            <Typography variant="subtitle2" gutterBottom>
              Account Stats
            </Typography>
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {[
                { label: 'Enrollments', value: user.stats.enrollmentCount },
                { label: 'Completed', value: user.stats.completedCourses },
                { label: 'Total Spent', value: formatCurrency(user.stats.totalSpent) },
                { label: 'Refunds', value: formatCurrency(user.stats.totalRefunds) },
                ...(user.stats.coursesCreated > 0
                  ? [{ label: 'Courses Created', value: user.stats.coursesCreated }]
                  : []),
              ].map((stat) => (
                <Grid item xs={6} sm={4} key={stat.label}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h6" fontWeight={600}>{stat.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* ── Enrollments ──────────────────────────────────── */}
            {user.enrollments.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Enrollments ({user.enrollments.length})
                </Typography>
                <List dense disablePadding sx={{ mb: 2, maxHeight: 200, overflow: 'auto' }}>
                  {user.enrollments.map((e) => (
                    <ListItem key={e.courseId} sx={{ px: 1 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap>{e.courseTitle}</Typography>
                        }
                        secondary={formatDate(e.enrolledAt)}
                      />
                      <Chip
                        label={e.status}
                        size="small"
                        color={statusChipColor(e.status)}
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* ── Recent Transactions ──────────────────────────── */}
            {user.recentTransactions.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Recent Transactions ({user.recentTransactions.length})
                </Typography>
                <List dense disablePadding sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {user.recentTransactions.map((t) => (
                    <ListItem key={t.id} sx={{ px: 1 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap>{t.courseTitle}</Typography>
                        }
                        secondary={formatDate(t.createdAt)}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {formatCurrency(t.amount)}
                        </Typography>
                        <Chip
                          label={t.status}
                          size="small"
                          color={statusChipColor(t.status)}
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </>
        ) : (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            User not found
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: { xs: 1.5, sm: 3 }, py: 1.5, flexWrap: 'wrap', gap: 1 }}>
        {user && actionPayload && (
          <Stack direction="row" spacing={0.5} sx={{ mr: 'auto', flexWrap: 'wrap', gap: 0.5 }}>
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => onRoleChange(actionPayload)}
            >
              Role
            </Button>
            <Button
              size="small"
              color={user.isActive ? 'error' : 'success'}
              startIcon={user.isActive ? <BlockIcon /> : <ActiveIcon />}
              onClick={() => onStatusChange(actionPayload)}
            >
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              size="small"
              startIcon={<ResetIcon />}
              onClick={() => onResetPassword(actionPayload)}
            >
              Reset PW
            </Button>
          </Stack>
        )}
        <Button onClick={onClose} variant="outlined" size="small">Close</Button>
      </DialogActions>
    </Dialog>
  );
};
