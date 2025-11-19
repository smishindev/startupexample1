import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Container } from '@mui/material';
import { Header } from '../../components/Navigation/Header';
import { LessonManagement } from '../../components/Lessons/LessonManagement';

export const LessonManagementPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();

  if (!courseId) {
    return (
      <Box>
        <Header />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" color="error">
                Course ID not found
              </Typography>
              <Typography variant="body1">
                Please navigate to a valid course to manage lessons.
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
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Content Upload System
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Upload and manage video content, documents, and images for your lessons
          </Typography>
        </Box>
        
        <LessonManagement courseId={courseId} />
      </Container>
    </Box>
  );
};