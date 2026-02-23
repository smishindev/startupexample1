import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer } from '../../components/Responsive';
import AssessmentAnalytics from '../../components/Assessment/AssessmentAnalytics';

export const AssessmentViewPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();

  if (!assessmentId) {
    return (
      <Box>
        <Header />
        <PageContainer>
          <Typography variant="h5" color="error">
            Assessment ID not found
          </Typography>
          <Typography variant="body1">
            Please navigate from a valid assessment to view details.
          </Typography>
        </PageContainer>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <PageContainer>
        <Typography variant="h3" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' } }}>
          Assessment Details & Analytics
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          View performance data and student submissions
        </Typography>
        
        <AssessmentAnalytics assessmentId={assessmentId} />
      </PageContainer>
    </Box>
  );
};