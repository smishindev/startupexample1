import React from 'react';
import { Box } from '@mui/material';
import { Header } from '../../components/Navigation/Header';
import { StudentProgressDashboard } from '../../components/Progress/StudentProgressDashboard';

export const StudentProgressPage: React.FC = () => {
  return (
    <Box>
      <Header />
      <StudentProgressDashboard />
    </Box>
  );
};