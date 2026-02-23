import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer } from '../../components/Responsive';
import AssessmentManager from '../../components/Assessment/AssessmentManager';

export const AssessmentManagementPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();

  if (!lessonId) {
    return (
      <Box>
        <Header />
        <PageContainer>
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
        </PageContainer>
      </Box>
    );
  }

  return (
    <Box>
      <Header />
      <PageContainer>
        <Typography variant="h3" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' } }}>
          Assessment Management
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          Create and manage quizzes, tests, and assignments for your lesson
        </Typography>
        
        <AssessmentManager lessonId={lessonId} />
      </PageContainer>
    </Box>
  );
};