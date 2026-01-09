import React from 'react';
import { Paper, Typography, Button, Alert } from '@mui/material';
import { Quiz as QuizIcon } from '@mui/icons-material';
import { LessonContent } from '../../services/lessonApi';

interface QuizContentItemProps {
  content: LessonContent;
  index: number;
  total: number;
  onComplete: () => void;
  isCompleted: boolean;
}

export const QuizContentItem: React.FC<QuizContentItemProps> = ({
  index,
  onComplete,
  isCompleted
}) => {
  return (
    <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
      <QuizIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Quiz #{index + 1}
      </Typography>
      <Alert severity="info" sx={{ my: 2 }}>
        Quiz functionality coming soon! This feature will be available in a future update.
      </Alert>
      <Button
        variant="contained"
        onClick={onComplete}
        disabled={isCompleted}
      >
        {isCompleted ? 'Completed' : 'Skip for Now'}
      </Button>
    </Paper>
  );
};
