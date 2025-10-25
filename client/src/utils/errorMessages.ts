/**
 * Maps technical error codes to user-friendly messages
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'INVALID_CREDENTIALS': 'The email or password you entered is incorrect. Please try again.',
  'ACCOUNT_DISABLED': 'Your account has been disabled. Please contact support for assistance.',
  'TOKEN_MISSING': 'Please sign in to continue.',
  'TOKEN_EXPIRED': 'Your session has expired. Please sign in again.',
  'TOKEN_INVALID': 'Your session is no longer valid. Please sign in again.',
  'USER_NOT_FOUND': 'We couldn\'t find an account with those credentials.',
  'UNAUTHORIZED': 'You need to be signed in to access this page.',
  'FORBIDDEN': 'You don\'t have permission to access this resource.',
  
  // Validation errors
  'VALIDATION_ERROR': 'Please check your information and try again.',
  'INVALID_EMAIL': 'Please enter a valid email address.',
  'WEAK_PASSWORD': 'Your password doesn\'t meet the security requirements.',
  'INVALID_USERNAME': 'Username must be at least 3 characters with no spaces.',
  'USER_EXISTS': 'An account with this email or username already exists.',
  
  // CSRF errors
  'CSRF_TOKEN_MISSING': 'Security validation failed. Please refresh and try again.',
  'CSRF_TOKEN_INVALID': 'Security validation failed. Please refresh and try again.',
  'CSRF_TOKEN_EXPIRED': 'Your session security token has expired. Please refresh.',
  'CSRF_TOKEN_MISMATCH': 'Security validation failed. Please refresh and try again.',
  
  // Password reset errors
  'INVALID_TOKEN': 'This reset code is invalid or has expired. Please request a new one.',
  'RESET_TOKEN_EXPIRED': 'This reset code has expired. Please request a new one.',
  
  // Network/Server errors
  'NETWORK_ERROR': 'Unable to connect. Please check your internet connection.',
  'SERVER_ERROR': 'Something went wrong on our end. Please try again later.',
  'AUTH_ERROR': 'Authentication failed. Please try signing in again.',
  'SERVER_CONFIG_ERROR': 'Server configuration error. Please contact support.',
};

/**
 * Get user-friendly error message from error code or fallback message
 */
export const getFriendlyErrorMessage = (errorCode?: string, fallbackMessage?: string): string => {
  if (errorCode && AUTH_ERROR_MESSAGES[errorCode]) {
    return AUTH_ERROR_MESSAGES[errorCode];
  }
  
  return fallbackMessage || AUTH_ERROR_MESSAGES['SERVER_ERROR'];
};

/**
 * Format validation error for password strength
 */
export const formatPasswordError = (technicalMessage?: string): string => {
  if (!technicalMessage) return 'Please choose a stronger password.';
  
  // Map technical requirements to friendly versions
  const friendlyRequirements: Record<string, string> = {
    'at least 8 characters': 'be at least 8 characters long',
    'lowercase letter': 'include at least one lowercase letter',
    'uppercase letter': 'include at least one uppercase letter',
    'number': 'include at least one number',
  };
  
  let friendlyMessage = technicalMessage;
  for (const [technical, friendly] of Object.entries(friendlyRequirements)) {
    friendlyMessage = friendlyMessage.replace(technical, friendly);
  }
  
  return friendlyMessage;
};
