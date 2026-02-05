import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Typography,
  Box,
  Alert
} from '@mui/material';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

const API_URL = 'http://localhost:3001/api';

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface User {
  Id: string;
  FirstName: string;
  LastName: string;
  Username: string;
  Email: string;
}

interface UserSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

export const UserSearchDialog: React.FC<UserSearchDialogProps> = ({ open, onClose, onSelectUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setUsers([]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setUsers([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await api.get('/users/search', {
          params: { q: searchQuery, limit: 20 }
        });
        setUsers(response.data.users || response.data);
      } catch (error: any) {
        console.error('Failed to search users:', error);
        setError(error.response?.data?.message || 'Failed to search users');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelectUser = (userId: string) => {
    onSelectUser(userId);
    onClose();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Start a Conversation</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : users.length === 0 && searchQuery.length >= 2 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No users found
            </Typography>
          </Box>
        ) : searchQuery.length < 2 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Type at least 2 characters to search
            </Typography>
          </Box>
        ) : (
          <List>
            {users.map((user) => (
              <ListItem key={user.Id} disablePadding>
                <ListItemButton onClick={() => handleSelectUser(user.Id)}>
                  <ListItemAvatar>
                    <Avatar>
                      {getInitials(user.FirstName, user.LastName)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${user.FirstName} ${user.LastName}`}
                    secondary={user.Email}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};
