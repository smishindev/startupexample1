/**
 * PresencePage Component
 * View online users and manage presence status
 */

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
} from '@mui/material';
import { usePresence } from '../../hooks/usePresence';
import OnlineUsersList from '../../components/Presence/OnlineUsersList';
import PresenceStatusSelector from '../../components/Presence/PresenceStatusSelector';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer } from '../../components/Responsive/PageContainer';
import { PageTitle } from '../../components/Responsive/PageTitle';

const PresencePage: React.FC = () => {
  const { isLoadingStatus } = usePresence({
    autoHeartbeat: true,
    onUserOnline: (data) => {
      console.log('User came online:', data);
    },
    onUserOffline: (data) => {
      console.log('User went offline:', data);
    },
  });

  return (
    <Box>
      <Header />
      <PageContainer maxWidth="lg">
        <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <PageTitle gutterBottom>
                Online Users
              </PageTitle>
              <Typography variant="body2" color="text.secondary">
                See who's currently active on the platform
              </Typography>
            </Grid>
            <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Box display="inline-flex" alignItems="center" gap={2}>
                <Typography variant="body2" color="text.secondary">
                  Your status:
                </Typography>
                {isLoadingStatus ? (
                  <Typography variant="body2" color="text.secondary">Loading...</Typography>
                ) : (
                  <PresenceStatusSelector />
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <OnlineUsersList
              limit={50}
              title="All Online Users"
              compact={false}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Status Options
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" paragraph>
                    <strong>Online:</strong> You're active and available
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Away:</strong> You're temporarily unavailable
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Busy:</strong> Do not disturb mode
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Offline:</strong> You appear offline to others
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </PageContainer>
    </Box>
  );
};

export default PresencePage;
