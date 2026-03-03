import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer } from '../../components/Responsive';
import QuizCreator from '../../components/Assessment/QuizCreator';

export const AssessmentCreationPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();

  if (!lessonId) {
    return (
      <Box>
        <Header />
        <PageContainer>
          <Typography variant="h5" color="error">
            Lesson ID not found
          </Typography>
          <Typography variant="body1">
            Please navigate from a valid lesson to create assessments.
          </Typography>
        </PageContainer>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <PageContainer>
        <QuizCreator lessonId={lessonId} />
      </PageContainer>
    </Box>
  );
};