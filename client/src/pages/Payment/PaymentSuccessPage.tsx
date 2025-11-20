/**
 * PaymentSuccessPage - Displays after successful payment
 * Shows confirmation and provides navigation to course content
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { coursesApi } from '../../services/coursesApi';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) {
        setError('Course ID is missing');
        setLoading(false);
        return;
      }

      try {
        const courseData = await coursesApi.getCourse(courseId);
        setCourse(courseData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading course:', err);
        setError('Failed to load course details');
        setLoading(false);
      }
    };

    loadCourse();
  }, [courseId]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Confirming your enrollment...
        </Typography>
      </Container>
    );
  }

  if (error || !course) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Failed to load course details'}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'success.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'white' }} />
        </Box>

        <Typography variant="h4" gutterBottom color="success.main">
          Payment Successful!
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          You're now enrolled in <strong>{course.Title}</strong>
        </Typography>

        <Box sx={{ bgcolor: 'grey.50', p: 3, borderRadius: 2, mb: 4 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            📧 A confirmation email has been sent to your inbox with:
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            • Course access details
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            • Receipt and invoice
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            • Getting started guide
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<PlayArrowIcon />}
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            Start Learning
          </Button>

          <Button
            variant="outlined"
            size="large"
            fullWidth
            startIcon={<ReceiptIcon />}
            onClick={() => navigate('/profile/transactions')}
          >
            View Receipt
          </Button>

          <Button
            variant="text"
            size="medium"
            fullWidth
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
        </Box>

        <Box sx={{ mt: 4, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            💡 <strong>Next Steps:</strong> Check out the first lesson and complete your
            profile to get personalized recommendations!
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default PaymentSuccessPage;
