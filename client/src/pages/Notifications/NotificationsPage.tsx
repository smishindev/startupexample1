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
import { HeaderV4 } from '../../components/Navigation/HeaderV4';
import { notificationApi, Notification } from '../../services/notificationApi';
import { socketService } from '../../services/socketService';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

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
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filtered = useMemo(() => {
    return items.filter(n => {
      if (show === 'unread' && n.IsRead) return false;
      if (typeFilter !== 'all' && n.Type !== typeFilter) return false;
      if (priorityFilter !== 'all' && n.Priority !== priorityFilter) return false;
      return true;
    });
  }, [items, show, typeFilter, priorityFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const { notifications } = await notificationApi.getNotifications(true, {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        limit: 100
      });
      setItems(notifications);
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
    setPage(1); // Reset to first page when filters change
  }, [show, typeFilter, priorityFilter]);

  useEffect(() => {
    // Setup socket listeners for real-time updates
    const setupListeners = () => {
      // App.tsx handles socket connection - just check if it's ready
      if (!socketService.isConnected()) {
        console.log('🔌 [NotificationsPage] Socket not ready yet, will retry via reconnect handler');
        return;
      }
      
      console.log('✅ [NotificationsPage] Socket ready, setting up listeners...');
      
      try {
        // Listen for new notifications
        socketService.onNotification((notification) => {
          console.log('NotificationsPage: Received new notification', notification);
          
          // Check if notification already exists to prevent duplicates
          setItems(prev => {
            const exists = prev.some(n => n.Id === notification.id);
            if (exists) {
              console.log('⚠️ [NotificationsPage] Notification already exists, skipping:', notification.id);
              return prev;
            }
            
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
            
            return [newNotification, ...prev];
          });
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
        
        console.log('✅ [NotificationsPage] All Socket.IO listeners registered successfully');
      } catch (error) {
        console.error('❌ [NotificationsPage] Failed to setup Socket.IO listeners:', error);
      }
    };

    // Try to setup listeners immediately if socket is already connected
    setupListeners();

    // Re-setup listeners when socket connects/reconnects
    const handleConnect = () => {
      console.log('🔄 [NotificationsPage] Socket connected - setting up listeners');
      setupListeners();
    };

    socketService.onConnect(handleConnect);

    // Clean up listeners when component unmounts (socket stays connected for app)
    return () => {
      console.log('🔕 [NotificationsPage] Component unmounting - cleaning up listeners');
      socketService.offConnect(handleConnect);
      socketService.offNotification();
      socketService.offNotificationRead();
      socketService.offNotificationsReadAll();
      socketService.offNotificationDeleted();
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
            <Button
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/settings/notifications')}
              variant="outlined"
              size="small"
              data-testid="notifications-preferences-button"
            >
              Preferences
            </Button>
            <Button startIcon={<DoneAllIcon />} onClick={markAll} disabled={items.every(i => i.IsRead)} data-testid="notifications-mark-all-read-button">
              Mark all read
            </Button>
            <Button onClick={fetchAll} data-testid="notifications-refresh-button">Refresh</Button>
          </Stack>
        </Stack>

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

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="type-label">Type</InputLabel>
              <Select labelId="type-label" label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} data-testid="notifications-type-filter">
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
              <NotificationsNoneIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 1 }} />
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
      </Container>
    </>
  );
};

export default NotificationsPage;
