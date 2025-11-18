import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Container } from '@mui/material';
import { Header } from '../../components/Navigation/Header';
import QuizCreator from '../../components/Assessment/QuizCreator';

export const AssessmentCreationPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();

  if (!lessonId) {
    return (
      <Box>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography variant="h5" color="error">
            Lesson ID not found
          </Typography>
          <Typography variant="body1">
            Please navigate from a valid lesson to create assessments.
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
          Create New Assessment
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          Design a quiz, test, or assignment for your lesson
        </Typography>
        
        <QuizCreator lessonId={lessonId} />
      </Container>
    </Box>
  );
};