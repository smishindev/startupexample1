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
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  AccountCircle,
  PersonAdd,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuthStore, RegisterData } from '../../stores/authStore';

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
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateStep(activeStep)) return;
    
    const success = await register({
      ...formData,
      email: formData.email.trim(),
      username: formData.username.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
    });
    
    if (success) {
      onSuccess?.();
      navigate('/dashboard');
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
              error={!!validationErrors.firstName}
              helperText={validationErrors.firstName}
              margin="normal"
              required
              autoComplete="given-name"
              autoFocus
              disabled={isLoading}
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
              error={!!validationErrors.lastName}
              helperText={validationErrors.lastName}
              margin="normal"
              required
              autoComplete="family-name"
              disabled={isLoading}
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
            >
              {userRoles.map((option) => (
                <MenuItem key={option.value} value={option.value}>
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
              error={!!validationErrors.email}
              helperText={validationErrors.email}
              margin="normal"
              required
              autoComplete="email"
              disabled={isLoading}
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
              error={!!validationErrors.username}
              helperText={validationErrors.username || 'This will be your unique identifier'}
              margin="normal"
              required
              autoComplete="username"
              disabled={isLoading}
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
              error={!!validationErrors.password}
              helperText={validationErrors.password}
              margin="normal"
              required
              autoComplete="new-password"
              disabled={isLoading}
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
              error={!!validationErrors.confirmPassword}
              helperText={validationErrors.confirmPassword}
              margin="normal"
              required
              autoComplete="new-password"
              disabled={isLoading}
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
              onChange={handleChange('learningStyle')}
              margin="normal"
              disabled={isLoading}
              helperText="We'll use this to recommend the best content for you"
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

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {renderStepContent(activeStep)}

            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
              <Button
                color="inherit"
                disabled={activeStep === 0 || isLoading}
                onClick={handleBack}
                sx={{ mr: 1 }}
              >
                Back
              </Button>
              <Box sx={{ flex: '1 1 auto' }} />
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  sx={{ minWidth: 120 }}
                >
                  {isLoading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext} variant="contained">
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
              >
                Sign In
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};