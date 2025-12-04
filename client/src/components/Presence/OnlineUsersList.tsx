/**
 * OnlineUsersList Component
 * Display list of currently online users
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { presenceApi } from '../../services/presenceApi';
import { OnlineUser } from '../../types/presence';
import UserPresenceBadge from './UserPresenceBadge';
import { socketService } from '../../services/socketService';

interface OnlineUsersListProps {
  limit?: number;
  courseId?: string;
  title?: string;
  compact?: boolean;
}

const OnlineUsersList: React.FC<OnlineUsersListProps> = ({ 
  limit = 50,
  courseId,
  title = 'Online Users',
  compact = false,
}) => {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOnlineUsers = async () => {
    try {
      setError(null);
      
      let response;
      if (courseId) {
        response = await presenceApi.getOnlineUsersInCourse(courseId);
      } else {
        response = await presenceApi.getOnlineUsers(limit);
      }
      
      setUsers(response.users);
    } catch (err) {
      console.error('Error loading online users:', err);
      setError('Failed to load online users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOnlineUsers();
    
    // Refresh every 30 seconds as fallback
    const interval = setInterval(loadOnlineUsers, 30000);
    
    // Listen for real-time presence changes
    const handlePresenceChanged = (data: any) => {
      console.log('Presence changed, refreshing list:', data);
      loadOnlineUsers();
    };
    
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('presence-changed', handlePresenceChanged);
    }
    
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('presence-changed', handlePresenceChanged);
      }
    };
  }, [courseId, limit]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Typography color="text.secondary">
            No users currently online
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {title}
          </Typography>
          <Chip 
            label={`${users.length} online`}
            color="success"
            size="small"
          />
        </Box>

        <List dense={compact}>
          {users.map((user) => (
            <ListItem key={user.UserId} sx={{ px: compact ? 0 : 2 }}>
              <ListItemAvatar>
                <UserPresenceBadge
                  avatarUrl={user.Avatar}
                  firstName={user.FirstName}
                  lastName={user.LastName}
                  status={user.Status}
                  lastSeenAt={user.LastSeenAt}
                  size={compact ? 32 : 40}
                />
              </ListItemAvatar>
              <ListItemText
                primary={`${user.FirstName} ${user.LastName}`}
                secondary={
                  <React.Fragment>
                    <Typography variant="caption" component="span" display="block">
                      {user.Role}
                    </Typography>
                    {user.Activity && (
                      <Typography 
                        variant="caption"
                        component="span"
                        color="text.secondary"
                        sx={{ 
                          fontStyle: 'italic',
                          display: 'block',
                          mt: 0.5,
                        }}
                      >
                        {user.Activity}
                      </Typography>
                    )}
                  </React.Fragment>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default OnlineUsersList;
