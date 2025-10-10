import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Container } from '@mui/material';
import { Header } from '../../components/Navigation/Header';
import AssessmentManager from '../../components/Assessment/AssessmentManager';

export const AssessmentManagementPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();

  if (!lessonId) {
    return (
      <Box>
        <Header />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" color="error">
                Lesson ID not found
              </Typography>
              <Typography variant="body1">
                Please navigate to a valid lesson to manage assessments.
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
        <Typography variant="h3" gutterBottom>
          Assessment Management
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          Create and manage quizzes, tests, and assignments for your lesson
        </Typography>
        
        <AssessmentManager lessonId={lessonId} />
      </Container>
    </Box>
  );
};