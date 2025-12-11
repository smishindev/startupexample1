import React from 'react';
import { Box, Container, Paper, Typography, Alert } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { Header } from '../../components/Navigation/Header';

const SettingsPage: React.FC = () => {
  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <SettingsIcon fontSize="large" color="primary" />
            <Typography variant="h4" fontWeight="bold">
              Settings
            </Typography>
          </Box>
          <Alert severity="info">
            Advanced settings coming soon! This page will include notification preferences, 
            privacy settings, course recommendations, and more customization options.
          </Alert>
          <Typography variant="body1" sx={{ mt: 3 }}>
            In the meantime, you can manage your personal information and billing address in the <strong>Profile</strong> page.
          </Typography>
        </Paper>
      </Container>
    </>
  );
};

export default SettingsPage;
