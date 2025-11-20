/**
 * CourseCheckoutPage - Stripe checkout flow for course purchases
 * Integrates with Stripe Payment Element for secure payment processing
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardMedia,
  CardContent,
  Grid,
} from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { coursesApi } from '../../services/coursesApi';
import { createPaymentIntent } from '../../services/paymentApi';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';

const stripePromise = loadStripe((import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface Course {
  Id: string;
  Title: string;
  Description: string;
  Price: number;
  ThumbnailUrl?: string;
  InstructorName?: string;
}

/**
 * Checkout Form Component (inside Elements provider)
 */
const CheckoutForm: React.FC<{ course: Course; onSuccess: () => void }> = ({ course, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success?courseId=${course.Id}`,
        },
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed. Please try again.');
        setProcessing(false);
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('An unexpected error occurred. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ mb: 3 }}>
        <PaymentElement />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        disabled={!stripe || processing}
        startIcon={processing ? <CircularProgress size={20} /> : <LockIcon />}
      >
        {processing ? 'Processing...' : `Pay $${course.Price.toFixed(2)}`}
      </Button>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          🔒 Secure payment powered by Stripe
        </Typography>
      </Box>
    </form>
  );
};

/**
 * Main Checkout Page Component
 */
const CourseCheckoutPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeCheckout = async () => {
      if (!courseId) {
        setError('Course ID is missing');
        setLoading(false);
        return;
      }

      try {
        // Fetch course details
        const courseData = await coursesApi.getCourse(courseId);
        setCourse(courseData);

        // Create payment intent
        const { clientSecret: secret } = await createPaymentIntent(
          courseId,
          courseData.Price,
          'usd'
        );
        setClientSecret(secret);
        setLoading(false);
      } catch (err: any) {
        console.error('Checkout initialization error:', err);
        setError(
          err.response?.data?.message ||
          'Failed to initialize checkout. Please try again.'
        );
        setLoading(false);
      }
    };

    initializeCheckout();
  }, [courseId]);

  const handlePaymentSuccess = () => {
    // Redirect to success page
    navigate(`/payment/success?courseId=${courseId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Loading checkout...
        </Typography>
      </Container>
    );
  }

  if (error || !course || !clientSecret) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Failed to load checkout'}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/courses')}>
          Back to Courses
        </Button>
      </Container>
    );
  }

  const stripeOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#1976d2',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Complete Your Purchase
      </Typography>

      <Grid container spacing={4}>
        {/* Order Summary */}
        <Grid item xs={12} md={5}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Card sx={{ mb: 3 }}>
              {course.ThumbnailUrl && (
                <CardMedia
                  component="img"
                  height="140"
                  image={course.ThumbnailUrl}
                  alt={course.Title}
                />
              )}
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {course.Title}
                </Typography>
                {course.InstructorName && (
                  <Typography variant="body2" color="text.secondary">
                    by {course.InstructorName}
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Course Price</Typography>
              <Typography fontWeight="bold">${course.Price.toFixed(2)}</Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6" color="primary">
                ${course.Price.toFixed(2)}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: 'success.50', p: 2, borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <CheckCircleIcon color="success" fontSize="small" />
                <Box>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    What's Included:
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    • Lifetime access to course content
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    • All lessons and materials
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    • Certificate of completion
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary">
                    • 30-day refund guarantee
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Payment Form */}
        <Grid item xs={12} md={7}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Payment Information
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Elements stripe={stripePromise} options={stripeOptions}>
              <CheckoutForm course={course} onSuccess={handlePaymentSuccess} />
            </Elements>
          </Paper>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              By completing this purchase, you agree to our Terms of Service and Refund Policy.
              You can request a full refund within 30 days if you've completed less than 50% of the course.
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CourseCheckoutPage;
