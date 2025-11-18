import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Container } from '@mui/material';
import { Header } from '../../components/Navigation/Header';
import AssessmentAnalytics from '../../components/Assessment/AssessmentAnalytics';

export const AssessmentViewPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();

  if (!assessmentId) {
    return (
      <Box>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography variant="h5" color="error">
            Assessment ID not found
          </Typography>
          <Typography variant="body1">
            Please navigate from a valid assessment to view details.
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h3" gutterBottom>
          Assessment Details & Analytics
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          View performance data and student submissions
        </Typography>
        
        <AssessmentAnalytics assessmentId={assessmentId} />
      </Container>
    </Box>
  );
};