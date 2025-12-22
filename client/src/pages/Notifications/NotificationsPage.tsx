import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
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
  CircularProgress
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
} from '@mui/icons-material';
import { HeaderV4 } from '../../components/Navigation/HeaderV4';
import { notificationApi, Notification } from '../../services/notificationApi';
import { socketService } from '../../services/socketService';
import { formatDistanceToNow } from 'date-fns';

const NotificationItem: React.FC<{
  item: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ item, onMarkRead, onDelete }) => {
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

  return (
    <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      <Box sx={{ mt: 0.5 }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {item.Title}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {!item.IsRead && (
              <Button size="small" onClick={() => onMarkRead(item.Id)}>
                Mark read
              </Button>
            )}
            <IconButton size="small" onClick={() => onDelete(item.Id)}>
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
        </Stack>
      </Box>
    </Box>
  );
};

export const NotificationsPage: React.FC = () => {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return items.filter(n => {
      if (show === 'unread' && n.IsRead) return false;
      if (typeFilter !== 'all' && n.Type !== typeFilter) return false;
      if (priorityFilter !== 'all' && n.Priority !== priorityFilter) return false;
      return true;
    });
  }, [items, show, typeFilter, priorityFilter]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const data = await notificationApi.getNotifications(true);
      setItems(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setItems(prev => prev.map(n => (n.Id === id ? { ...n, IsRead: true, ReadAt: new Date().toISOString() } : n)));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllAsRead();
      setItems(prev => prev.map(n => ({ ...n, IsRead: true, ReadAt: new Date().toISOString() })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const remove = async (id: string) => {
    try {
      await notificationApi.deleteNotification(id);
      setItems(prev => prev.filter(n => n.Id !== id));
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  useEffect(() => {
    fetchAll();

    // Setup socket listeners for real-time updates
    const connectSocket = async () => {
      try {
        await socketService.connect();
        
        // Listen for new notifications
        socketService.onNotification((notification) => {
          console.log('NotificationsPage: Received new notification', notification);
          
          // Add to list
          const newNotification: Notification = {
            Id: notification.id,
            UserId: '',
            Type: notification.type as any,
            Priority: notification.priority as any,
            Title: notification.title,
            Message: notification.message,
            Data: null,
            RelatedEntityId: null,
            RelatedEntityType: null,
            ActionUrl: notification.actionUrl || null,
            ActionText: notification.actionText || null,
            CreatedAt: new Date().toISOString(),
            ReadAt: null,
            ExpiresAt: null,
            IsRead: false
          };
          setItems(prev => [newNotification, ...prev]);
        });

        // Listen for read events from other tabs
        socketService.onNotificationRead((data) => {
          setItems(prev => prev.map(n => 
            n.Id === data.notificationId ? { ...n, IsRead: true, ReadAt: new Date().toISOString() } : n
          ));
        });

        // Listen for read-all events
        socketService.onNotificationsReadAll(() => {
          setItems(prev => prev.map(n => ({ ...n, IsRead: true, ReadAt: new Date().toISOString() })));
        });

        // Listen for delete events from other tabs
        socketService.onNotificationDeleted((data) => {
          setItems(prev => prev.filter(n => n.Id !== data.notificationId));
        });
      } catch (error) {
        console.error('Socket connection failed:', error);
      }
    };

    connectSocket();

    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <>
      <HeaderV4 />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <NotificationsIcon />
            <Typography variant="h5">Notifications</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<DoneAllIcon />} onClick={markAll} disabled={items.every(i => i.IsRead)}>
              Mark all read
            </Button>
            <Button onClick={fetchAll}>Refresh</Button>
          </Stack>
        </Stack>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={show}
              onChange={(_, val) => setShow(val || 'all')}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="unread">Unread</ToggleButton>
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="type-label">Type</InputLabel>
              <Select labelId="type-label" label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="progress">Progress</MenuItem>
                <MenuItem value="risk">Risk</MenuItem>
                <MenuItem value="intervention">Intervention</MenuItem>
                <MenuItem value="achievement">Achievement</MenuItem>
                <MenuItem value="assignment">Assignment</MenuItem>
                <MenuItem value="course">Course</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="priority-label">Priority</InputLabel>
              <Select labelId="priority-label" label="Priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
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
              <NotificationsNoneIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1 }} />
              <Typography color="text.secondary">No notifications to show</Typography>
            </Box>
          ) : (
            <>
              {filtered.map((n, i) => (
                <React.Fragment key={n.Id}>
                  {i > 0 && <Divider />}
                  <NotificationItem item={n} onMarkRead={markRead} onDelete={remove} />
                </React.Fragment>
              ))}
            </>
          )}
        </Paper>
      </Container>
    </>
  );
};

export default NotificationsPage;
