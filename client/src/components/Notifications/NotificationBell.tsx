import React, { useState, useEffect } from 'react';
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
import { socketService } from '../../services/socketService';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export const NotificationBell: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const open = Boolean(anchorEl);

  // Fetch notifications and unread count
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [notificationsResult, count, qCount] = await Promise.all([
        notificationApi.getNotifications(false), // Only unread
        notificationApi.getUnreadCount(),
        notificationApi.getQueuedCount().catch(() => 0)
      ]);
      setNotifications(notificationsResult.notifications);
      setUnreadCount(count);
      setQueuedCount(qCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch for historical notifications
    fetchNotifications();
    
    // Connect socket and setup real-time listeners
    const connectSocket = async () => {
      try {
        await socketService.connect();
        console.log('✅ [NotificationBell] Socket connected for notifications');
        
        // Listen for new notifications
        socketService.onNotification((notification) => {
          console.log('🔔 [NotificationBell] Received real-time notification:', notification);
          
          // Add to notifications list (cast to proper type)
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
          setNotifications(prev => [newNotification, ...prev]);
          
          // Increment unread count
          setUnreadCount(prev => prev + 1);
          
          // Don't show toast here - the feature-specific components 
          // (like StudentSessionsList) already show appropriate toasts
          // This just adds the notification silently to the bell
        });
        
        // Listen for notification-read events from other devices
        socketService.onNotificationRead((data) => {
          console.log('✅ [NotificationBell] Notification marked as read:', data.notificationId);
          
          // Remove from local list if present
          setNotifications(prev => prev.filter(n => n.Id !== data.notificationId));
          setUnreadCount(prev => Math.max(0, prev - 1));
        });

        // Listen for mark-all-read events
        socketService.onNotificationsReadAll((data) => {
          console.log('✅ [NotificationBell] All notifications marked as read on another tab');
          setNotifications([]);
          setUnreadCount(0);
        });

        // Listen for notification-deleted events from other tabs/page
        socketService.onNotificationDeleted((data) => {
          console.log('✅ [NotificationBell] Notification deleted:', data.notificationId);
          setNotifications(prev => prev.filter(n => n.Id !== data.notificationId));
          setUnreadCount(prev => Math.max(0, prev - 1));
        });
        
      } catch (error) {
        console.error('❌ [NotificationBell] Socket connection failed, will use REST API only:', error);
        // Fallback: Socket connection failed, but initial fetch already loaded notifications
      }
    };
    
    connectSocket();
    
    // Don't disconnect socket on unmount - it's shared across the app
    // Just log that this component is unmounting
    return () => {
      console.log('🔕 [NotificationBell] Component unmounting (socket stays connected)');
    };
  }, [navigate]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications(); // Refresh when opening to sync counts and queued
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      await notificationApi.markAsRead(notification.Id);
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.Id !== notification.Id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
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
      setNotifications([]);
      setUnreadCount(0);
      handleClose();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await notificationApi.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.Id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
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
        ) : notifications.length === 0 ? (
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
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.Id}>
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
