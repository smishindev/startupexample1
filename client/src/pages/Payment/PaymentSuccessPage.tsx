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
  IconButton,
  Tooltip,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ShareIcon from '@mui/icons-material/Share';
import TwitterIcon from '@mui/icons-material/Twitter';
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import Confetti from 'react-confetti';
import { coursesApi } from '../../services/coursesApi';
import { HeaderV4 } from '../../components/Navigation/HeaderV4';
import { useAuthStore } from '../../stores/authStore';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const { token } = useAuthStore();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const loadCourseAndConfirmEnrollment = async () => {
      if (!courseId) {
        setError('Course ID is missing');
        setLoading(false);
        return;
      }

      try {
        // Load course data
        const courseData = await coursesApi.getCourse(courseId);
        setCourse(courseData);

        // Confirm enrollment (in case webhook wasn't triggered)
        try {
          const API_BASE_URL = 'http://localhost:3001/api';
          const response = await fetch(`${API_BASE_URL}/payments/confirm-enrollment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ courseId }),
          });
          
          if (response.ok) {
            console.log('✅ Enrollment confirmed');
          } else {
            console.warn('Failed to confirm enrollment:', response.status);
          }
        } catch (enrollError) {
          console.warn('Could not confirm enrollment:', enrollError);
          // Non-critical, webhook might have already handled it
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading course:', err);
        setError('Failed to load course details');
        setLoading(false);
      }
    };

    loadCourseAndConfirmEnrollment();

    // Stop confetti after 5 seconds
    const confettiTimer = setTimeout(() => setShowConfetti(false), 5000);

    // Handle window resize for confetti
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(confettiTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [courseId]);

  const handleShare = (platform: string) => {
    const shareUrl = window.location.origin + `/courses/${courseId}`;
    const shareText = `I just enrolled in ${course?.Title}! 🎉`;

    const urls: { [key: string]: string } = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  if (loading) {
    return (
      <>
        <HeaderV4 />
        <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>
            Confirming your enrollment...
          </Typography>
        </Container>
      </>
    );
  }

  if (error || !course) {
    return (
      <>
        <HeaderV4 />
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error || 'Failed to load course details'}
          </Alert>
          <Button variant="contained" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        </Container>
      </>
    );
  }

  return (
    <>
      <HeaderV4 />
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={500}
        />
      )}
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            mb: 4,
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 60, color: 'white' }} />
          </Box>

          <Box sx={{ fontSize: '3rem', mb: 2 }}>
            🎉
          </Box>
          <Typography variant="h3" gutterBottom fontWeight="bold">
            Congratulations!
          </Typography>

          <Typography variant="h5" sx={{ mb: 2, opacity: 0.95 }}>
            You're now enrolled in
          </Typography>

          <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
            {course.Title}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
            <Tooltip title="Share on Twitter">
              <IconButton
                onClick={() => handleShare('twitter')}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
              >
                <TwitterIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share on Facebook">
              <IconButton
                onClick={() => handleShare('facebook')}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
              >
                <FacebookIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share on LinkedIn">
              <IconButton
                onClick={() => handleShare('linkedin')}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
              >
                <LinkedInIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 4 }}>

          <Box sx={{ bgcolor: 'primary.50', p: 3, borderRadius: 2, mb: 3, border: '1px solid', borderColor: 'primary.200' }}>
            <Typography variant="h6" gutterBottom color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              📧 Check Your Email
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              A confirmation email has been sent with:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 3 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                Course access details
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Receipt and invoice (PDF)
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Getting started guide
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<PlayArrowIcon />}
              onClick={() => navigate(`/courses/${courseId}`)}
              sx={{
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
              }}
            >
              Start Learning Now
            </Button>

            <Button
              variant="outlined"
              size="large"
              fullWidth
              startIcon={<ReceiptIcon />}
              onClick={() => navigate('/profile/transactions')}
              sx={{ py: 1.5 }}
            >
              View Receipt & Invoice
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

          <Box sx={{ p: 3, bgcolor: 'success.50', borderRadius: 2, border: '1px solid', borderColor: 'success.200' }}>
            <Typography variant="body1" fontWeight="bold" color="success.dark" gutterBottom>
              💡 What's Next?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Start with the first lesson to build momentum
              • Join the course discussion forum
              • Complete your profile for personalized recommendations
              • Set a learning schedule to stay on track
            </Typography>
          </Box>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              🔒 <strong>30-Day Money-Back Guarantee:</strong> You can request a full refund within 30 days if you've completed less than 50% of the course.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </>
  );
};

export default PaymentSuccessPage;
