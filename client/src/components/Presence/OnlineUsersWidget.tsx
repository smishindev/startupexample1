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

const OnlineUsersWidget: React.FC = () => {
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
    
    // Refresh every 30 seconds
    const interval = setInterval(loadOnlineUsers, 30000);
    
    return () => clearInterval(interval);
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
    <Card>
      <CardHeader
        avatar={<PeopleIcon color="primary" />}
        title="Online Now"
        action={
          <Chip 
            label={users.length}
            color="success"
            size="small"
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
            <AvatarGroup max={6} sx={{ mb: 2, justifyContent: 'flex-start' }}>
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
