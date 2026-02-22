import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  IconButton,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  CircularProgress,
  Pagination
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Warning as WarningIcon,
  TrendingUp as ProgressIcon,
  EmojiEvents as AchievementIcon,
  Assignment as AssignmentIcon,
  School as CourseIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { HeaderV5 as HeaderV4 } from '../../components/Navigation/HeaderV5';
import { notificationApi, Notification } from '../../services/notificationApi';
import { useNotificationStore } from '../../stores/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageTitle } from '../../components/Responsive';

const NotificationItem: React.FC<{
  item: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (url: string) => void;
}> = ({ item, onMarkRead, onDelete, onNavigate }) => {
  const icon = useMemo(() => {
    switch (item.Type) {
      case 'risk':
      case 'intervention':
        return <WarningIcon color="error" />;
      case 'progress':
        return <ProgressIcon color="primary" />;
      case 'achievement':
        return <AchievementIcon color="success" />;
      case 'assignment':
      case 'assessment':
        return <AssignmentIcon color="info" />;
      case 'course':
        return <CourseIcon color="secondary" />;
      default:
        return <NotificationsIcon />;
    }
  }, [item.Type]);

  const priorityColor = useMemo(() => {
    switch (item.Priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'normal':
        return 'info';
      case 'low':
      default:
        return 'default';
    }
  }, [item.Priority]);

  const handleClick = () => {
    if (item.ActionUrl) {
      if (!item.IsRead) {
        onMarkRead(item.Id);
      }
      onNavigate(item.ActionUrl);
    }
  };

  return (
    <Box 
      data-testid={`notification-item-${item.Id}`}
      sx={{ 
        p: 2, 
        display: 'flex', 
        gap: 2, 
        alignItems: 'flex-start',
        cursor: item.ActionUrl ? 'pointer' : 'default',
        '&:hover': item.ActionUrl ? { bgcolor: 'action.hover' } : {}
      }}
      onClick={handleClick}
    >
      <Box sx={{ mt: 0.5 }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {item.Title}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" onClick={(e) => e.stopPropagation()}>
            {!item.IsRead && (
              <Button size="small" onClick={() => onMarkRead(item.Id)} data-testid={`notification-item-mark-read-${item.Id}`}>
                Mark read
              </Button>
            )}
            <IconButton size="small" onClick={() => onDelete(item.Id)} data-testid={`notification-item-delete-${item.Id}`}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {item.Message}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Chip label={item.Priority} size="small" color={priorityColor as any} />
          <Typography variant="caption" color="text.secondary">
            {formatDistanceToNow(new Date(item.CreatedAt), { addSuffix: true })}
          </Typography>
          {item.IsRead ? (
            <Chip size="small" label="Read" />
          ) : (
            <Chip size="small" color="primary" label="Unread" />
          )}
          {item.ActionUrl && (
            <Chip size="small" label={item.ActionText || 'View'} variant="outlined" />
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, setNotifications, removeNotification, markAsRead: markStoreAsRead, markAllAsRead: markAllStoreAsRead } = useNotificationStore();
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [, setCurrentTime] = useState(Date.now()); // Force re-render for relative time updates

  // Update relative timestamps every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (show === 'unread' && n.IsRead) return false;
      if (typeFilter !== 'all' && n.Type !== typeFilter) return false;
      if (priorityFilter !== 'all' && n.Priority !== priorityFilter) return false;
      return true;
    });
  }, [notifications, show, typeFilter, priorityFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const { notifications: fetchedNotifications } = await notificationApi.getNotifications(true, {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        limit: 100
      });
      setNotifications(fetchedNotifications);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      markStoreAsRead(id);
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllAsRead();
      markAllStoreAsRead();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const remove = async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      removeNotification(id);
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  useEffect(() => {
    fetchAll();
    setPage(1); // Reset to first page when filters change
  }, [show, typeFilter, priorityFilter]);

  // No socket listeners needed here - managed centrally in App.tsx
  // All real-time updates come through the Zustand store

  return (
    <>
      <HeaderV4 />
      <PageContainer maxWidth="lg" sx={{ pt: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', mb: 2, gap: { xs: 1.5, sm: 0 } }}>
          <PageTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0 }}>
            <NotificationsIcon />
            Notifications
          </PageTitle>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/settings/notifications')}
              variant="outlined"
              size="small"
              data-testid="notifications-preferences-button"
            >
              Preferences
            </Button>
            <Button startIcon={<DoneAllIcon />} onClick={markAll} disabled={filtered.every(i => i.IsRead)} data-testid="notifications-mark-all-read-button">
              Mark all read
            </Button>
            <Button onClick={fetchAll} data-testid="notifications-refresh-button">Refresh</Button>
          </Stack>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={show}
              onChange={(_, val) => setShow(val || 'all')}
              data-testid="notifications-show-toggle"
            >
              <ToggleButton value="all" data-testid="notifications-show-all">All</ToggleButton>
              <ToggleButton value="unread" data-testid="notifications-show-unread">Unread</ToggleButton>
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ minWidth: { xs: 120, sm: 160 } }}>
              <InputLabel id="type-label">Type</InputLabel>
              <Select labelId="type-label" label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} data-testid="notifications-type-filter">
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="progress">Progress</MenuItem>
                <MenuItem value="risk">Risk</MenuItem>
                <MenuItem value="intervention">Intervention</MenuItem>
                <MenuItem value="achievement">Achievement</MenuItem>
                <MenuItem value="assignment">Assignment</MenuItem>
                <MenuItem value="assessment">Assessment</MenuItem>
                <MenuItem value="course">Course</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: { xs: 120, sm: 160 } }}>
              <InputLabel id="priority-label">Priority</InputLabel>
              <Select labelId="priority-label" label="Priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} data-testid="notifications-priority-filter">
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Paper>

        <Paper>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <NotificationsNoneIcon sx={{ fontSize: { xs: 48, md: 56 }, color: 'text.secondary', mb: 1 }} />
              <Typography color="text.secondary">No notifications to show</Typography>
            </Box>
          ) : (
            <>
              {paginatedItems.map((n, i) => (
                <React.Fragment key={n.Id}>
                  {i > 0 && <Divider />}
                  <NotificationItem item={n} onMarkRead={markRead} onDelete={remove} onNavigate={navigate} />
                </React.Fragment>
              ))}
              {totalPages > 1 && (
                <>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <Pagination 
                      count={totalPages} 
                      page={page} 
                      onChange={(_, val) => setPage(val)} 
                      color="primary"
                      showFirstButton
                      showLastButton
                      data-testid="notifications-pagination"
                    />
                  </Box>
                </>
              )}
            </>
          )}
        </Paper>
      </PageContainer>
    </>
  );
};

export default NotificationsPage;
