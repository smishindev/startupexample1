import React, { useState, useEffect, useMemo } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
  Stack,
  Tooltip,
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
  Close as CloseIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { notificationApi, Notification } from '../../services/notificationApi';
import { useNotificationStore } from '../../stores/notificationStore';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  // Error handling moved to individual operations
  const [, setCurrentTime] = useState(Date.now()); // Force re-render for relative time updates
  
  // Get full notification list and counts from centralized store
  const { notifications, unreadCount, queuedCount, setNotifications, setUnreadCount, setQueuedCount, markAsRead: markStoreAsRead, markAllAsRead: markAllStoreAsRead } = useNotificationStore();
  
  // Filter to show only unread notifications in dropdown (computed from store)
  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.IsRead).slice(0, 5), // Show max 5 recent unread
    [notifications]
  );

  const open = Boolean(anchorEl);

  // Update relative timestamps every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch notifications and unread count
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [notificationsResult, count, qCount] = await Promise.all([
        notificationApi.getNotifications(true), // Fetch ALL for store (limit to recent)
        notificationApi.getUnreadCount(),
        notificationApi.getQueuedCount().catch(() => 0)
      ]);
      setNotifications(notificationsResult.notifications); // Update store with full list
      setUnreadCount(count); // Store count
      setQueuedCount(qCount || 0); // Store queued count
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications on mount - Socket listeners are centralized in App.tsx
  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications(); // Refresh when opening to sync counts and queued
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read via API (will trigger socket event for cross-tab sync)
      await notificationApi.markAsRead(notification.Id);
      
      // Immediately update store for instant UI response (optimistic update)
      markStoreAsRead(notification.Id);
      
      // Navigate if action URL exists
      if (notification.ActionUrl) {
        navigate(notification.ActionUrl);
      }
      
      handleClose();
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      
      // Immediately update store for instant UI response (optimistic update)
      markAllStoreAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await notificationApi.deleteNotification(notificationId);
      // The socket event from App.tsx will handle store updates
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
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
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'normal':
        return 'info';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <>
      <Tooltip title={queuedCount > 0 ? `Notifications (quiet hours: ${queuedCount} queued)` : 'Notifications'}>
        <IconButton
          onClick={handleClick}
          size="large"
          aria-label={`show ${unreadCount} new notifications`}
          color="inherit"
          data-testid="notification-bell-button"
        >
          <Box sx={{ position: 'relative' }}>
            <Badge badgeContent={unreadCount} color="error" data-testid="notification-bell-badge">
              {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
            </Badge>
            {queuedCount > 0 && (
              <Badge
                overlap="circular"
                color="info"
                badgeContent={queuedCount > 9 ? '9+' : queuedCount}
                sx={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 }
                }}
              />
            )}
          </Box>
        </IconButton>
      </Tooltip>

      <Menu
        data-testid="notification-bell-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 420,
            maxHeight: 600,
            overflow: 'visible',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Notification Settings">
                <IconButton 
                  size="small" 
                  onClick={() => {
                    navigate('/settings/notifications');
                    handleClose();
                  }}
                  data-testid="notification-bell-settings-button"
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {unreadCount > 0 && (
                <Button size="small" onClick={handleMarkAllRead} data-testid="notification-bell-mark-all-read-button">
                  Mark all read
                </Button>
              )}
            </Stack>
          </Box>
          {unreadCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        {/* Notification List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : unreadNotifications.length === 0 ? (
          <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No new notifications
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              You're all caught up!
            </Typography>
            <Button
              data-testid="notification-bell-manage-preferences-button"
              size="small"
              variant="outlined"
              onClick={() => {
                navigate('/settings/notifications');
                handleClose();
              }}
            >
              Manage Preferences
            </Button>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {unreadNotifications.map((notification, index) => (
              <React.Fragment key={notification.Id || `notification-${index}`}>
                {index > 0 && <Divider />}
                <MenuItem
                  data-testid={`notification-item-${notification.Id}`}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    alignItems: 'flex-start',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ mr: 1.5, mt: 0.5 }}>
                    {getNotificationIcon(notification.Type)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, wordBreak: 'break-word', pr: 1 }}>
                        {notification.Title}
                      </Typography>
                      <IconButton
                        data-testid={`notification-delete-${notification.Id}`}
                        size="small"
                        onClick={(e) => handleDeleteNotification(notification.Id, e)}
                        sx={{ ml: 1, flexShrink: 0 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, wordBreak: 'break-word' }}>
                      {notification.Message}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={notification.Priority}
                        size="small"
                        color={getPriorityColor(notification.Priority) as any}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(notification.CreatedAt), { addSuffix: true })}
                      </Typography>
                    </Stack>
                  </Box>
                </MenuItem>
              </React.Fragment>
            ))}
          </Box>
        )}

        {/* Footer */}
        <Divider />
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button
            data-testid="notification-bell-view-all-button"
            fullWidth
            onClick={() => {
              navigate('/notifications');
              handleClose();
            }}
          >
            View All Notifications
          </Button>
        </Box>
      </Menu>
    </>
  );
};
