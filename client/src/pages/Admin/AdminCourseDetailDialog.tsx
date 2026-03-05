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
  Rating,
  alpha,
  useTheme,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SwapHoriz as ReassignIcon,
  School as CourseIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  CalendarMonth as CalendarIcon,
  Update as UpdateIcon,
  Publish as PublishIcon,
  Archive as ArchiveIcon,
  Drafts as DraftIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

import { useResponsive } from '../../components/Responsive';
import { adminApi, AdminCourseDetail } from '../../services/adminApi';

// ── Helpers ───────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);

const formatDate = (d: string | null | undefined) => {
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

const enrollmentStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  switch (status) {
    case 'active': case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'completed': return 'info';
    case 'suspended': case 'cancelled': case 'rejected': return 'error';
    default: return 'default';
  }
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

// ── Props ─────────────────────────────────────────────────────────

interface AdminCourseDetailDialogProps {
  open: boolean;
  courseId: string;
  onClose: () => void;
  onStatusChange: (course: { id: string; title: string; status: string }) => void;
  onReassign: (course: { id: string; title: string; instructorName: string }) => void;
  onDelete: (course: { id: string; title: string }) => void;
}

// ── Component ─────────────────────────────────────────────────────

export const AdminCourseDetailDialog: React.FC<AdminCourseDetailDialogProps> = ({
  open,
  courseId,
  onClose,
  onStatusChange,
  onReassign,
  onDelete,
}) => {
  const theme = useTheme();
  const { isMobile } = useResponsive();
  const [course, setCourse] = useState<AdminCourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !courseId) return;
    setCourse(null);
    setLoading(true);
    adminApi
      .getCourseById(courseId)
      .then(setCourse)
      .catch(() => toast.error('Failed to load course details'))
      .finally(() => setLoading(false));
  }, [open, courseId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
      data-testid="admin-course-detail-dialog"
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Course Details
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Skeleton variant="rounded" width={56} height={56} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="70%" height={28} />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="30%" />
              </Box>
            </Box>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 1, borderRadius: 1 }} />
            ))}
          </Box>
        ) : course ? (
          <>
            {/* ── Course Header ─────────────────────────────────── */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Avatar
                src={course.thumbnail || undefined}
                variant="rounded"
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.palette.primary.main,
                }}
              >
                <CourseIcon />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" sx={{ lineHeight: 1.3, wordBreak: 'break-word' }}>
                  {course.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
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
                  <Chip
                    label={course.visibility}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 22 }}
                  />
                  <Chip
                    label={formatCurrency(course.price)}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 22 }}
                  />
                </Box>
              </Box>
            </Box>

            {/* ── Description ──────────────────────────────────── */}
            {course.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3, maxHeight: 100, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {course.description}
              </Typography>
            )}

            {/* ── Meta Info ────────────────────────────────────── */}
            <Stack spacing={1} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  Instructor: {course.instructorName || '—'}
                </Typography>
              </Box>
              {course.instructorEmail && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon fontSize="small" color="action" />
                  <Typography variant="body2">{course.instructorEmail}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon fontSize="small" color="action" />
                <Typography variant="body2">Created {formatDate(course.createdAt)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <UpdateIcon fontSize="small" color="action" />
                <Typography variant="body2">Updated {formatDate(course.updatedAt)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Rating value={course.rating} precision={0.1} size="small" readOnly />
                <Typography variant="body2">
                  {course.rating.toFixed(1)} ({course.ratingCount} reviews)
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {/* ── Stats ────────────────────────────────────────── */}
            <Typography variant="subtitle2" gutterBottom>
              Course Stats
            </Typography>
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {[
                { label: 'Lessons', value: course.stats.lessonCount },
                { label: 'Active Students', value: course.stats.activeStudents },
                { label: 'Completed', value: course.stats.completedStudents },
                { label: 'Revenue', value: formatCurrency(course.stats.totalRevenue) },
                { label: 'Avg Rating', value: course.stats.avgRating > 0 ? course.stats.avgRating.toFixed(1) : '—' },
                { label: 'Duration', value: formatDuration(course.duration) },
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

            {/* ── Lessons ──────────────────────────────────────── */}
            {course.lessons.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Lessons ({course.lessons.length})
                </Typography>
                <List dense disablePadding sx={{ mb: 2, maxHeight: 200, overflow: 'auto' }}>
                  {course.lessons.map((lesson, i) => (
                    <ListItem key={lesson.id} sx={{ px: 1 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap>
                            {i + 1}. {lesson.title}
                          </Typography>
                        }
                        secondary={formatDuration(lesson.duration)}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* ── Recent Enrollments ───────────────────────────── */}
            {course.recentEnrollments.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Recent Enrollments ({course.recentEnrollments.length})
                </Typography>
                <List dense disablePadding sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {course.recentEnrollments.map((e) => (
                    <ListItem key={e.userId} sx={{ px: 1 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap>{e.userName}</Typography>
                        }
                        secondary={formatDate(e.enrolledAt)}
                      />
                      <Chip
                        label={e.status}
                        size="small"
                        color={enrollmentStatusColor(e.status)}
                        variant="outlined"
                        sx={{ fontSize: '0.65rem', height: 20 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </>
        ) : (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Course not found
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: { xs: 1.5, sm: 3 }, py: 1.5, flexWrap: 'wrap', gap: 1 }}>
        {course && (
          <Stack direction="row" spacing={0.5} sx={{ mr: 'auto', flexWrap: 'wrap', gap: 0.5 }}>
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={() => onStatusChange({ id: course.id, title: course.title, status: course.status })}
            >
              Status
            </Button>
            <Button
              size="small"
              startIcon={<ReassignIcon />}
              onClick={() => onReassign({ id: course.id, title: course.title, instructorName: course.instructorName })}
            >
              Reassign
            </Button>
            {course.status !== 'deleted' && (
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => onDelete({ id: course.id, title: course.title })}
              >
                Delete
              </Button>
            )}
          </Stack>
        )}
        <Button onClick={onClose} variant="outlined" size="small">Close</Button>
      </DialogActions>
    </Dialog>
  );
};
