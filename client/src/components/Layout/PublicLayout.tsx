/**
 * PublicLayout Component
 * Wraps public-facing pages (courses catalog, course detail) with
 * a guest-appropriate header and footer for unauthenticated users.
 * When the user IS authenticated, the child pages render their own HeaderV5.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { PublicHeader } from '../Navigation/PublicHeader';
import { PublicFooter } from './PublicFooter';
import { useAuthStore } from '../../stores/authStore';

const PublicLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Only show PublicHeader for guests — authenticated pages use HeaderV5 internally */}
      {!isAuthenticated && <PublicHeader />}

      {/* Page content */}
      <Box sx={{ flex: 1 }}>
        <Outlet />
      </Box>

      {/* Footer for guests only — authenticated pages have their own layout */}
      {!isAuthenticated && <PublicFooter />}
    </Box>
  );
};

export default PublicLayout;