/**
 * CourseCheckoutPage - Stripe checkout flow for course purchases
 * Integrates with Stripe Payment Element for secure payment processing
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { HeaderV4 } from '../../components/Navigation/HeaderV4';

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
  const [retryCount, setRetryCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Payment system not loaded. Please refresh the page.');
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
        // Categorize errors for better user feedback
        let userMessage = submitError.message || 'Payment failed. Please try again.';
        
        switch (submitError.type) {
          case 'card_error':
            userMessage = submitError.message || 'Your card was declined. Please try a different card.';
            break;
          case 'validation_error':
            userMessage = 'Please check your payment information and try again.';
            break;
          case 'invalid_request_error':
            userMessage = 'There was an issue with your payment. Please contact support if this continues.';
            break;
          case 'api_error':
            userMessage = 'A payment processing error occurred. Please try again in a moment.';
            break;
          case 'rate_limit_error':
            userMessage = 'Too many requests. Please wait a moment and try again.';
            break;
          default:
            userMessage = submitError.message || 'Payment failed. Please try again.';
        }
        
        setError(userMessage);
        setRetryCount(prev => prev + 1);
        setProcessing(false);

        // Log error for debugging
        console.error('Payment error:', {
          type: submitError.type,
          code: submitError.code,
          message: submitError.message,
          retryAttempt: retryCount + 1,
        });
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error('Unexpected payment error:', err);
      setError('An unexpected error occurred. Please check your internet connection and try again.');
      setRetryCount(prev => prev + 1);
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
          {retryCount > 1 && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Retry attempt {retryCount}. If the issue persists, please contact support.
            </Typography>
          )}
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
        data-testid="payment-submit-button"
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
  const initializingCourseRef = useRef<string | null>(null); // Track which course is being initialized

  // Memoize Stripe options - must be at top level before any returns
  const stripeOptions = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      appearance: {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: '#1976d2',
          borderRadius: '8px',
        },
      },
    };
  }, [clientSecret]);

  useEffect(() => {
    const initializeCheckout = async () => {
      // Prevent duplicate initialization for the same course (React 18 Strict Mode protection)
      if (initializingCourseRef.current === courseId) {
        console.log(`Checkout already initializing for course ${courseId}, skipping duplicate call`);
        return;
      }

      if (!courseId) {
        setError('Course ID is missing');
        setLoading(false);
        return;
      }

      initializingCourseRef.current = courseId;

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
        
        // Detailed error messages based on status code
        let errorMessage = 'Failed to initialize checkout. Please try again.';
        
        if (err.response) {
          switch (err.response.status) {
            case 400:
              errorMessage = err.response.data?.message || 'Invalid request. Please check your course selection.';
              break;
            case 401:
              errorMessage = 'Please log in to continue with your purchase.';
              setTimeout(() => navigate('/login'), 2000);
              break;
            case 404:
              errorMessage = 'Course not found. It may have been removed or is no longer available.';
              break;
            case 409:
              errorMessage = 'You are already enrolled in this course.';
              setTimeout(() => navigate('/my-learning'), 2000);
              break;
            case 500:
              errorMessage = 'Payment system error. Please try again in a few moments.';
              break;
            case 503:
              errorMessage = 'Payment service is temporarily unavailable. Please try again later.';
              break;
            default:
              errorMessage = err.response.data?.message || errorMessage;
          }
        } else if (err.request) {
          // Network error
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        setError(errorMessage);
        setLoading(false);
        initializingCourseRef.current = null; // Reset on error to allow retry
      }
    };

    initializeCheckout();

    // Cleanup function
    return () => {
      // Only reset if still initializing this specific course
      if (initializingCourseRef.current === courseId) {
        initializingCourseRef.current = null;
      }
    };
  }, [courseId, navigate]);

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

  if (error || !course || !clientSecret || !stripeOptions) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Failed to load checkout'}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/courses')} data-testid="checkout-error-back-button">
          Back to Courses
        </Button>
      </Container>
    );
  }

  return (
    <>
      <HeaderV4 />
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
    </>
  );
};

export default CourseCheckoutPage;
