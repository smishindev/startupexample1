import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Container } from '@mui/material';
import { Header } from '../../components/Navigation/Header';
import QuizTaker from '../../components/Assessment/QuizTaker';

export const AssessmentTakingPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();

  if (!assessmentId) {
    return (
      <Box>
        <Header />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" color="error">
                Assessment ID not found
              </Typography>
              <Typography variant="body1">
                Please navigate to a valid assessment to begin.
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <QuizTaker assessmentId={assessmentId} />
      </Container>
    </Box>
  );
};