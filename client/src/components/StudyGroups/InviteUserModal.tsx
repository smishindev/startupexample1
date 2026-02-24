/**
 * Invite User Modal Component
 * Allows group members to invite other users to join the study group
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  InputAdornment
} from '@mui/material';
import { Search as SearchIcon, Person as PersonIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { inviteUser } from '../../services/studyGroupsApi';
import { useResponsive } from '../Responsive/useResponsive';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

interface User {
  Id: string;
  FirstName: string;
  LastName: string;
  Username: string;
  Email: string;
}

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  open,
  onClose,
  groupId,
  groupName
}) => {
  const token = useAuthStore((state) => state.token);
  const { isMobile } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [inviting, setInviting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Search users when query changes (with debounce)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await axios.get(`${API_BASE_URL}/api/users/search`, {
          params: { q: searchQuery, limit: 10 },
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setUsers(response.data.users || []);
      } catch (err: any) {
        console.error('Error searching users:', err);
        setError(err.response?.data?.message || 'Failed to search users');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  const handleInvite = async (user: User) => {
    try {
      setInviting(true);
      setSelectedUser(user);
      setError('');

      await inviteUser(groupId, user.Id);
      
      const displayName = user.FirstName && user.LastName 
        ? `${user.FirstName} ${user.LastName}`
        : user.Username;
      
      toast.success(`Invitation sent to ${displayName}!`);
      handleClose();
    } catch (err: any) {
      console.error('Error inviting user:', err);
      setError(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
      setSelectedUser(null);
    }
  };

  const handleClose = () => {
    if (!inviting) {
      setSearchQuery('');
      setUsers([]);
      setError('');
      setSelectedUser(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      data-testid="invite-user-modal"
    >
      <DialogTitle>
        Invite User to {groupName}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Search Input */}
          <TextField
            label="Search Users"
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={inviting}
            autoFocus
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: loading ? (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ) : undefined
            }}
            helperText="Search for users to invite to this study group"
            data-testid="invite-user-search-input"
          />

          {/* Search Results */}
          {searchQuery.trim().length >= 2 && (
            <Box>
              {users.length > 0 ? (
                <List>
                  {users.map((user) => {
                    const displayName = user.FirstName && user.LastName
                      ? `${user.FirstName} ${user.LastName}`
                      : user.Username;
                    const isInviting = inviting && selectedUser?.Id === user.Id;

                    return (
                      <ListItem
                        key={user.Id}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={displayName}
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.secondary">
                                @{user.Username}
                              </Typography>
                              {user.Email && (
                                <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                                  {user.Email}
                                </Typography>
                              )}
                            </>
                          }
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleInvite(user)}
                          disabled={inviting}
                          data-testid={`invite-button-${user.Id}`}
                        >
                          {isInviting ? (
                            <>
                              <CircularProgress size={16} sx={{ mr: 1 }} />
                              Inviting...
                            </>
                          ) : (
                            'Invite'
                          )}
                        </Button>
                      </ListItem>
                    );
                  })}
                </List>
              ) : loading ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Searching...
                  </Typography>
                </Box>
              ) : (
                <Alert severity="info">
                  No users found matching "{searchQuery}"
                </Alert>
              )}
            </Box>
          )}

          {searchQuery.trim().length < 2 && searchQuery.length > 0 && (
            <Alert severity="info">
              Type at least 2 characters to search
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={inviting}
          data-testid="invite-user-cancel-button"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
