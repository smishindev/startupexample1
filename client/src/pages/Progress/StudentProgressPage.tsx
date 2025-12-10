import React from 'react';
import { Box } from '@mui/material';
import { HeaderV4 as Header } from '../../components/Navigation/HeaderV4';
import { StudentProgressDashboard } from '../../components/Progress/StudentProgressDashboard';

export const StudentProgressPage: React.FC = () => {
  return (
    <Box>
      <Header />
      <StudentProgressDashboard />
    </Box>
  );
};