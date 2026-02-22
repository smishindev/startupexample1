import React from 'react';
import { Box } from '@mui/material';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer } from '../../components/Responsive';
import { StudentProgressDashboard } from '../../components/Progress/StudentProgressDashboard';

export const StudentProgressPage: React.FC = () => {
  return (
    <Box>
      <Header />
      <PageContainer maxWidth="xl">
        <StudentProgressDashboard />
      </PageContainer>
    </Box>
  );
};