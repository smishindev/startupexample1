import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  AccountCircle,
  PersonAdd,
  MarkEmailRead,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuthStore, RegisterData } from '../../stores/authStore';
import { toast } from 'sonner';

const learningStyles = [
  { value: 'visual', label: 'Visual (I learn best with images and diagrams)' },
  { value: 'auditory', label: 'Auditory (I learn best by listening)' },
  { value: 'kinesthetic', label: 'Kinesthetic (I learn best through hands-on activities)' },
  { value: 'reading_writing', label: 'Reading/Writing (I learn best through text)' },
];

const userRoles = [
  { value: 'student', label: 'Student - I want to learn' },
  { value: 'instructor', label: 'Instructor - I want to teach' },
];

const steps = ['Basic Information', 'Account Security', 'Learning Preferences'];

interface RegisterFormProps {
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'student', // Default to student
    learningStyle: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof RegisterData | 'confirmPassword') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    
    if (field === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
    
    // Clear global error when user types
    if (error) {
      clearError();
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    switch (step) {
      case 0: // Basic Information
        if (!formData.firstName.trim()) {
          errors.firstName = 'First name is required';
        } else if (formData.firstName.trim().length < 2) {
          errors.firstName = 'First name must be at least 2 characters';
        }
        
        if (!formData.lastName.trim()) {
          errors.lastName = 'Last name is required';
        } else if (formData.lastName.trim().length < 2) {
          errors.lastName = 'Last name must be at least 2 characters';
        }
        
        if (!formData.email.trim()) {
          errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errors.email = 'Please enter a valid email address';
        }
        break;
        
      case 1: // Account Security
        if (!formData.username.trim()) {
          errors.username = 'Username is required';
        } else if (formData.username.trim().length < 3) {
          errors.username = 'Username must be at least 3 characters';
        } else if (/\s/.test(formData.username)) {
          errors.username = 'Username cannot contain spaces';
        }
        
        if (!formData.password) {
          errors.password = 'Password is required';
        } else {
          if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
          } else if (!/(?=.*[a-z])/.test(formData.password)) {
            errors.password = 'Password must contain at least one lowercase letter';
          } else if (!/(?=.*[A-Z])/.test(formData.password)) {
            errors.password = 'Password must contain at least one uppercase letter';
          } else if (!/(?=.*\d)/.test(formData.password)) {
            errors.password = 'Password must contain at least one number';
          }
        }
        
        if (!confirmPassword) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }
        break;
        
      case 2: // Learning Preferences (optional)
        // No required fields in this step
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    console.log('handleNext called, current activeStep:', activeStep);
    if (validateStep(activeStep)) {
      console.log('Validation passed, incrementing step from', activeStep, 'to', activeStep + 1);
      setActiveStep(prev => prev + 1);
    } else {
      console.log('Validation failed');
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      console.log('Enter pressed on step:', activeStep);
      if (activeStep < steps.length - 1) {
        console.log('Calling handleNext');
        handleNext();
      } else if (activeStep === steps.length - 1) {
        console.log('On final step, calling handleSubmit');
        handleSubmit(event as any);
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('handleSubmit called, activeStep:', activeStep, 'steps.length - 1:', steps.length - 1, 'isSubmitting:', isSubmitting);
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('Already submitting, ignoring');
      return;
    }
    
    // Only submit if we're on the final step
    if (activeStep !== steps.length - 1) {
      console.log('Not on final step, ignoring submit');
      return;
    }
    
    console.log('On final step, validating and submitting');
    if (!validateStep(activeStep)) {
      console.log('Validation failed');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await register({
        ...formData,
        email: formData.email.trim(),
        username: formData.username.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      });
      
      if (success) {
        onSuccess?.();
        toast.success('Registration successful! Please check your email to verify your account.');
        setShowVerificationDialog(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <TextField
              fullWidth
              id="firstName"
              label="First Name"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              onKeyDown={handleKeyDown}
              error={!!validationErrors.firstName}
              helperText={validationErrors.firstName}
              margin="normal"
              required
              autoComplete="given-name"
              autoFocus
              disabled={isLoading}
              inputProps={{ 'data-testid': 'register-first-name-input' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              id="lastName"
              label="Last Name"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              onKeyDown={handleKeyDown}
              error={!!validationErrors.lastName}
              helperText={validationErrors.lastName}
              margin="normal"
              required
              autoComplete="family-name"
              disabled={isLoading}
              inputProps={{ 'data-testid': 'register-last-name-input' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              select
              id="role"
              label="I am a..."
              value={formData.role || 'student'}
              onChange={handleChange('role')}
              error={!!validationErrors.role}
              helperText={validationErrors.role || 'Choose your role'}
              margin="normal"
              required
              disabled={isLoading}
              SelectProps={{ 'data-testid': 'register-role-select' }}
            >
              {userRoles.map((option) => (
                <MenuItem key={option.value} value={option.value} data-testid={`register-role-${option.value}-option`}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              id="email"
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              onKeyDown={handleKeyDown}
              error={!!validationErrors.email}
              helperText={validationErrors.email}
              margin="normal"
              required
              autoComplete="email"
              disabled={isLoading}
              inputProps={{ 'data-testid': 'register-email-input' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </>
        );
        
      case 1:
        return (
          <>
            <TextField
              fullWidth
              id="username"
              label="Username"
              value={formData.username}
              onChange={handleChange('username')}
              onKeyDown={handleKeyDown}
              error={!!validationErrors.username}
              helperText={validationErrors.username || 'This will be your unique identifier'}
              margin="normal"
              required
              autoComplete="username"
              disabled={isLoading}
              inputProps={{ 'data-testid': 'register-username-input' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccountCircle color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              onKeyDown={handleKeyDown}
              error={!!validationErrors.password}
              helperText={validationErrors.password}
              margin="normal"
              required
              autoComplete="new-password"
              disabled={isLoading}
              inputProps={{ 'data-testid': 'register-password-input' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isLoading}
                      data-testid="register-toggle-password-visibility"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              id="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={handleChange('confirmPassword')}
              onKeyDown={handleKeyDown}
              error={!!validationErrors.confirmPassword}
              helperText={validationErrors.confirmPassword}
              margin="normal"
              required
              autoComplete="new-password"
              disabled={isLoading}
              inputProps={{ 'data-testid': 'register-confirm-password-input' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      disabled={isLoading}
                      data-testid="register-toggle-confirm-password-visibility"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        );
        
      case 2:
        return (
          <>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Help us personalize your learning experience by selecting your preferred learning style:
            </Typography>
            
            <TextField
              fullWidth
              select
              id="learningStyle"
              label="Learning Style (Optional)"
              value={formData.learningStyle}
              onChange={handleChange('learningStyle')}              onKeyDown={handleKeyDown}              margin="normal"
              disabled={isLoading}
              helperText="We'll use this to recommend the best content for you"
              SelectProps={{ 'data-testid': 'register-learning-style-select' }}
            >
              <MenuItem value="">
                <em>I'm not sure / Skip this step</em>
              </MenuItem>
              {learningStyles.map((style) => (
                <MenuItem key={style.value} value={style.value}>
                  {style.label}
                </MenuItem>
              ))}
            </TextField>
          </>
        );
        
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
      px={2}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: '100%',
          boxShadow: 3,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <PersonAdd sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom>
              Create Account
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Join Smart Learning Platform today
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={(e) => {
            console.log('Form onSubmit triggered, activeStep:', activeStep);
            e.preventDefault();
            e.stopPropagation();
            // ONLY allow submission on final step
            if (activeStep === steps.length - 1) {
              handleSubmit(e);
            } else {
              console.log('Form submit prevented - not on final step');
            }
          }} noValidate>
            {renderStepContent(activeStep)}

            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
              <Button
                type="button"
                color="inherit"
                disabled={activeStep === 0 || isLoading || isSubmitting}
                onClick={handleBack}
                sx={{ mr: 1 }}
                data-testid="register-back-button"
              >
                Back
              </Button>
              <Box sx={{ flex: '1 1 auto' }} />
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading || isSubmitting}
                  sx={{ minWidth: 120 }}
                  data-testid="register-submit-button"
                >
                  {isLoading || isSubmitting ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={(e) => {
                    console.log('Next button clicked, current step:', activeStep);
                    e.preventDefault();
                    e.stopPropagation();
                    handleNext();
                  }} 
                  variant="contained" 
                  type="button"
                  disabled={isLoading || isSubmitting}
                  data-testid="register-next-button"
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>

          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                underline="hover"
                fontWeight="medium"
                data-testid="register-login-link"
              >
                Sign in
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Email Verification Dialog */}
      <Dialog
        open={showVerificationDialog}
        onClose={() => {
          setShowVerificationDialog(false);
          navigate('/verify-email');
        }}
        maxWidth="sm"
        fullWidth
        data-testid="register-verification-dialog"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MarkEmailRead color="primary" />
          Verify Your Email
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>Welcome to our platform!</strong>
            <br /><br />
            We've sent a verification code to <strong>{formData.email}</strong>.
            <br /><br />
            Please check your email (including spam folder) and enter the 6-digit code to verify your account.
            <br /><br />
            The code will expire in 24 hours.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowVerificationDialog(false);
            navigate('/dashboard');
          }} data-testid="register-verify-later-button">
            Verify Later
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowVerificationDialog(false);
              navigate('/verify-email');
            }}
            autoFocus
            data-testid="register-verify-now-button"
          >
            Verify Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RegisterForm;