/**
 * CourseCheckoutPage — 2-step Stripe checkout with coupon support
 * Step 1: Review order + optional coupon code
 * Step 2: Stripe Payment Element (amount already finalised)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
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
  TextField,
  Collapse,
  IconButton,
} from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { coursesApi } from '../../services/coursesApi';
import { createPaymentIntent } from '../../services/paymentApi';
import { validateCoupon, type CouponValidationResult } from '../../services/couponApi';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { HeaderV5 as HeaderV4 } from '../../components/Navigation/HeaderV5';
import { PageContainer, PageTitle } from '../../components/Responsive';

const stripePromise = loadStripe((import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || '');

// ─── Types ────────────────────────────────────────────────────────────────

interface Course {
  Id: string;
  Title: string;
  Description: string;
  Price: number;
  ThumbnailUrl?: string;
  InstructorName?: string;
}

// ─── Checkout Form (inside Stripe Elements) ──────────────────────────────

interface CheckoutFormProps {
  course: Course;
  finalAmount: number;
  coupon: CouponValidationResult | null;
  onSuccess: () => void;
  onBack: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ course, finalAmount, coupon, onSuccess, onBack }) => {
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
        let msg = submitError.message || 'Payment failed. Please try again.';
        if (submitError.type === 'card_error') msg = submitError.message || 'Your card was declined. Please try a different card.';
        else if (submitError.type === 'validation_error') msg = 'Please check your payment information and try again.';
        setError(msg);
        setRetryCount((r) => r + 1);
        setProcessing(false);
      } else {
        onSuccess();
      }
    } catch {
      setError('An unexpected error occurred. Please check your internet connection and try again.');
      setRetryCount((r) => r + 1);
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Price summary above the form */}
      <Box sx={{ mb: 2.5, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        {coupon && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography variant="body2" color="text.secondary">Original price</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
              ${course.Price.toFixed(2)}
            </Typography>
          </Box>
        )}
        {coupon && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography variant="body2" color="success.main">
              Coupon ({coupon.code}) — {coupon.description}
            </Typography>
            <Typography variant="body2" color="success.main">
              −${coupon.discountAmount.toFixed(2)}
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight="bold">Total due</Typography>
          <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
            ${finalAmount.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <PaymentElement />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          {retryCount > 1 && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
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
        {processing ? 'Processing...' : `Pay $${finalAmount.toFixed(2)}`}
      </Button>

      <Box sx={{ mt: 1.5, textAlign: 'center' }}>
        <Button
          variant="text"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          disabled={processing}
        >
          Back to order review
        </Button>
      </Box>

      <Box sx={{ mt: 1.5, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          🔒 Secure payment powered by Stripe
        </Typography>
      </Box>
    </form>
  );
};

// ─── OrderSummary — shared between both steps ─────────────────────────────

interface OrderSummaryProps {
  course: Course;
  coupon: CouponValidationResult | null;
  finalAmount: number;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ course, coupon, finalAmount }) => (
  <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
    <Typography variant="h6" gutterBottom>Order Summary</Typography>
    <Divider sx={{ my: 2 }} />
    <Card sx={{ mb: 3 }}>
      {course.ThumbnailUrl && (
        <CardMedia component="img" height="140" image={course.ThumbnailUrl} alt={course.Title} />
      )}
      <CardContent>
        <Typography variant="h6" gutterBottom>{course.Title}</Typography>
        {course.InstructorName && (
          <Typography variant="body2" color="text.secondary">by {course.InstructorName}</Typography>
        )}
      </CardContent>
    </Card>

    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
      <Typography>Course Price</Typography>
      <Typography fontWeight="bold" sx={coupon ? { textDecoration: 'line-through', color: 'text.secondary' } : {}}>
        ${course.Price.toFixed(2)}
      </Typography>
    </Box>

    {coupon && (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography color="success.main">Discount ({coupon.description})</Typography>
        <Typography color="success.main">−${coupon.discountAmount.toFixed(2)}</Typography>
      </Box>
    )}

    <Divider sx={{ my: 2 }} />

    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
      <Typography variant="h6">Total</Typography>
      <Typography variant="h6" color="primary">${finalAmount.toFixed(2)}</Typography>
    </Box>

    <Box sx={{ bgcolor: 'success.50', p: 2, borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <CheckCircleIcon color="success" fontSize="small" />
        <Box>
          <Typography variant="body2" fontWeight="bold" color="success.main">What's Included:</Typography>
          <Typography variant="caption" display="block" color="text.secondary">• Lifetime access to course content</Typography>
          <Typography variant="caption" display="block" color="text.secondary">• All lessons and materials</Typography>
          <Typography variant="caption" display="block" color="text.secondary">• Certificate of completion</Typography>
          <Typography variant="caption" display="block" color="text.secondary">• 30-day refund guarantee</Typography>
        </Box>
      </Box>
    </Box>
  </Paper>
);

// ─── Review Step ─────────────────────────────────────────────────────────

interface ReviewStepProps {
  course: Course;
  initialCoupon?: CouponValidationResult | null;
  onContinue: (coupon: CouponValidationResult | null) => Promise<void>;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ course, initialCoupon, onContinue }) => {
  const [couponCode, setCouponCode] = useState(initialCoupon?.code ?? '');
  const [coupon, setCoupon] = useState<CouponValidationResult | null>(initialCoupon ?? null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);

  const finalAmount = coupon ? coupon.finalAmount : course.Price;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const result = await validateCoupon(couponCode.trim(), course.Id, course.Price);
      setCoupon(result);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  const handleContinue = async () => {
    setContinuing(true);
    try {
      await onContinue(coupon);
      // parent switches to 'payment' step — component will unmount, no reset needed
    } catch {
      // PI creation failed; parent already set piError, allow user to retry
      setContinuing(false);
    }
  };

  return (
    <Grid container spacing={4}>
      {/* Order Summary */}
      <Grid item xs={12} md={5}>
        <OrderSummary course={course} coupon={coupon} finalAmount={finalAmount} />
      </Grid>

      {/* Coupon + Continue */}
      <Grid item xs={12} md={7}>
        {/* Coupon Code Box */}
        <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <LocalOfferIcon color="action" />
            <Typography variant="h6">Have a coupon code?</Typography>
          </Box>

          <Collapse in={!coupon}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                size="small"
                fullWidth
                inputProps={{ style: { fontFamily: 'monospace', letterSpacing: 1 } }}
                error={!!couponError}
                helperText={couponError}
              />
              <Button
                variant="outlined"
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || couponLoading}
                sx={{ minWidth: { xs: 80, sm: 100 }, whiteSpace: 'nowrap' }}
              >
                {couponLoading ? <CircularProgress size={18} /> : 'Apply'}
              </Button>
            </Box>
          </Collapse>

          <Collapse in={!!coupon}>
            {coupon && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, bgcolor: 'success.50', borderRadius: 1 }}>
                <CheckCircleIcon color="success" fontSize="small" />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    Coupon applied!
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    <strong style={{ fontFamily: 'monospace' }}>{coupon.code}</strong> — {coupon.description} (save ${coupon.discountAmount.toFixed(2)})
                  </Typography>
                </Box>
                <IconButton size="small" onClick={handleRemoveCoupon}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Collapse>
        </Paper>

        {/* Payment Method Preview */}
        <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Payment</Typography>
          <Typography variant="body2" color="text.secondary">
            Your payment details are securely handled by Stripe. Click Continue to enter your card information.
          </Typography>
        </Paper>

        {/* Continue Button */}
        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={continuing ? <CircularProgress size={20} /> : <LockIcon />}
          onClick={handleContinue}
          disabled={continuing}
          sx={{ py: 1.5 }}
        >
          {continuing ? 'Loading…' : `Continue to Payment ($${finalAmount.toFixed(2)})`}
        </Button>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            By completing this purchase, you agree to our Terms of Service and Refund Policy.
            You can request a full refund within 30 days if you've completed less than 50% of the course.
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
};

// ─── Main Checkout Page ──────────────────────────────────────────────────

const CourseCheckoutPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);

  // Step control
  const [step, setStep] = useState<'review' | 'payment'>('review');

  // Payment step state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPI, setLoadingPI] = useState(false);
  const [piError, setPiError] = useState<string | null>(null);
  const [activeCoupon, setActiveCoupon] = useState<CouponValidationResult | null>(null);
  const [finalAmount, setFinalAmount] = useState(0);

  const creatingPIRef = useRef(false);

  // Stripe options — memoised to keep Elements stable
  const stripeOptions = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      appearance: {
        theme: 'stripe' as const,
        variables: { colorPrimary: '#1976d2', borderRadius: '8px' },
      },
    };
  }, [clientSecret]);

  // Load course on mount
  useEffect(() => {
    if (!courseId) { setCourseError('Course ID is missing'); setLoadingCourse(false); return; }
    coursesApi.getCourse(courseId)
      .then((data) => { setCourse(data); setLoadingCourse(false); })
      .catch((err: any) => {
        setCourseError(err?.response?.data?.message || 'Failed to load course details.');
        setLoadingCourse(false);
      });
  }, [courseId]);

  // Called when user clicks "Continue to Payment" in review step
  const handleContinueToPayment = async (coupon: CouponValidationResult | null) => {
    if (!courseId || !course) {
      throw new Error('Course information is missing. Please refresh the page.');
    }
    if (creatingPIRef.current) return; // debounce guard — silent (button already disabled)
    creatingPIRef.current = true;
    setLoadingPI(true);
    setPiError(null);
    setActiveCoupon(coupon);
    const amount = coupon ? coupon.finalAmount : course.Price;
    setFinalAmount(amount);
    try {
      const { clientSecret: secret } = await createPaymentIntent(
        courseId,
        amount,
        'usd',
        coupon?.code
      );
      setClientSecret(secret);
      setStep('payment');
    } catch (err: any) {
      let msg = 'Failed to initialise payment. Please try again.';
      if (err?.response?.data?.message) msg = err.response.data.message;
      else if (err?.message) msg = err.message;
      setPiError(msg);
      throw err; // re-throw so ReviewStep can reset its 'continuing' state
    } finally {
      setLoadingPI(false);
      creatingPIRef.current = false;
    }
  };

  const handleBackToReview = () => {
    setStep('review');
    setClientSecret(null);
    setPiError(null);
    // activeCoupon is intentionally kept so ReviewStep re-mounts with the coupon pre-applied
    creatingPIRef.current = false;
  };

  const handlePaymentSuccess = () => {
    navigate(`/payment/success?courseId=${courseId}`);
  };

  // ── Loading / Error states ──

  if (loadingCourse) {
    return (
      <>
        <HeaderV4 />
        <PageContainer sx={{ pt: 4, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 3 }}>Loading checkout…</Typography>
        </PageContainer>
      </>
    );
  }

  if (courseError || !course) {
    return (
      <>
        <HeaderV4 />
        <PageContainer sx={{ pt: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>{courseError || 'Failed to load course'}</Alert>
          <Button variant="contained" onClick={() => navigate('/courses')}>Back to Courses</Button>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <HeaderV4 />
      <PageContainer sx={{ pt: 4 }}>
        <PageTitle sx={{ mb: { xs: 2, md: 4 } }}>Complete Your Purchase</PageTitle>

        {/* PI error banner */}
        {piError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPiError(null)}>
            {piError}
          </Alert>
        )}

        {/* PI loading overlay */}
        {loadingPI && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Setting up secure payment…</Typography>
          </Box>
        )}

        {!loadingPI && step === 'review' && (
          <ReviewStep course={course} initialCoupon={activeCoupon} onContinue={handleContinueToPayment} />
        )}

        {!loadingPI && step === 'payment' && clientSecret && stripeOptions && (
          <Grid container spacing={4}>
            {/* Order Summary (condensed) */}
            <Grid item xs={12} md={5}>
              <OrderSummary course={course} coupon={activeCoupon} finalAmount={finalAmount} />
            </Grid>

            {/* Payment Form */}
            <Grid item xs={12} md={7}>
              <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom>Payment Information</Typography>
                <Divider sx={{ my: 2 }} />
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <CheckoutForm
                    course={course}
                    finalAmount={finalAmount}
                    coupon={activeCoupon}
                    onSuccess={handlePaymentSuccess}
                    onBack={handleBackToReview}
                  />
                </Elements>
              </Paper>
            </Grid>
          </Grid>
        )}
      </PageContainer>
    </>
  );
};

export default CourseCheckoutPage;
