import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useAuthStore } from '../stores/authStore';

export const AuthDebug: React.FC = () => {
  const { user, token, isAuthenticated } = useAuthStore();

  const testInstructorAPI = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/instructor/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API Response Status:', response.status);
      console.log('API Response:', await response.json());
    } catch (error) {
      console.error('API Test Error:', error);
    }
  };

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        Authentication Debug
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</Typography>
        <Typography><strong>User:</strong> {user ? `${user.firstName} ${user.lastName} (${user.email})` : 'None'}</Typography>
        <Typography><strong>Token:</strong> {token ? `${token.substring(0, 20)}...` : 'None'}</Typography>
        <Typography><strong>User Role:</strong> {user?.role || 'None'}</Typography>
      </Box>

      <Button variant="contained" onClick={testInstructorAPI}>
        Test Instructor API
      </Button>
    </Paper>
  );
};

export default AuthDebug;