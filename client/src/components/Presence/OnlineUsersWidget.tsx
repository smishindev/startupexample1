/**
 * OnlineUsersWidget Component
 * Dashboard widget showing online users
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  Avatar,
  AvatarGroup,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import { People as PeopleIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { presenceApi } from '../../services/presenceApi';
import { OnlineUser } from '../../types/presence';
import OnlineIndicator from '../Presence/OnlineIndicator';
import { socketService } from '../../services/socketService';

interface OnlineUsersWidgetProps {
  maxAvatars?: number;
}

const OnlineUsersWidget: React.FC<OnlineUsersWidgetProps> = ({ maxAvatars = 8 }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOnlineUsers = async () => {
    try {
      const response = await presenceApi.getOnlineUsers(10);
      setUsers(response.users);
    } catch (error) {
      console.error('Error loading online users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOnlineUsers();
    
    // Listen for real-time presence changes
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('presence-changed', loadOnlineUsers);
      
      return () => {
        socket.off('presence-changed', loadOnlineUsers);
      };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="online-users-widget">
      <CardHeader
        avatar={<PeopleIcon color="primary" />}
        title="Online Now"
        action={
          <Chip 
            label={users.length}
            color="success"
            size="small"
            data-testid="online-users-count-chip"
          />
        }
      />
      <CardContent>
        {users.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No users currently online
          </Typography>
        ) : (
          <Box>
            <AvatarGroup max={maxAvatars} sx={{ mb: 2, justifyContent: 'flex-start' }}>
              {users.map((user) => (
                <Box key={user.UserId} position="relative">
                  <Avatar
                    src={user.Avatar || undefined}
                    alt={`${user.FirstName} ${user.LastName}`}
                    sx={{ width: 40, height: 40 }}
                  >
                    {user.FirstName.charAt(0)}{user.LastName.charAt(0)}
                  </Avatar>
                  <Box
                    position="absolute"
                    bottom={0}
                    right={0}
                  >
                    <OnlineIndicator 
                      status={user.Status}
                      size="small"
                      showTooltip={false}
                    />
                  </Box>
                </Box>
              ))}
            </AvatarGroup>
            
            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate('/presence')}
              sx={{ mt: 1 }}
              data-testid="online-users-view-all-button"
            >
              View All Online Users
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default OnlineUsersWidget;
