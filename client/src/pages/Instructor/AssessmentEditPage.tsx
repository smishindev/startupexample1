import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Container } from '@mui/material';
import { HeaderV4 as Header } from '../../components/Navigation/HeaderV4';
import QuizCreator from '../../components/Assessment/QuizCreator';

export const AssessmentEditPage: React.FC = () => {
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
            Please navigate from a valid assessment to edit.
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
          Edit Assessment
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          Modify your quiz, test, or assignment
        </Typography>
        
        <QuizCreator assessmentId={assessmentId} />
      </Container>
    </Box>
  );
};