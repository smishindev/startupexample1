/**
 * JWT Token Utilities
 * Provides client-side JWT token validation and expiration checking
 */

interface JWTPayload {
  sub: string; // user ID
  email: string;
  role: string;
  iat: number; // issued at (timestamp)
  exp: number; // expiration (timestamp)
}

/**
 * Decode JWT token without verifying signature (client-side safe)
 * Used only for checking expiration and extracting payload data
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    // JWT has 3 parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (middle part)
    const payload = parts[1];
    
    // Add padding if needed for proper base64 decoding
    const paddedPayload = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
    
    // Decode base64url to JSON
    const decoded = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.warn('Failed to decode JWT token:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * @param token JWT token string
 * @param bufferSeconds Optional buffer to consider token expired N seconds early (default: 60)
 * @returns true if expired, false if valid, null if invalid token
 */
export function isTokenExpired(token: string, bufferSeconds: number = 60): boolean | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null; // Invalid token
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const expirationWithBuffer = payload.exp - bufferSeconds;
  
  return currentTimestamp >= expirationWithBuffer;
}

/**
 * Get token expiration time in milliseconds
 * @param token JWT token string
 * @returns expiration timestamp in milliseconds, or null if invalid
 */
export function getTokenExpiration(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }
  
  return payload.exp * 1000; // Convert to milliseconds
}

/**
 * Calculate time until token expires
 * @param token JWT token string
 * @returns milliseconds until expiration, or null if invalid/expired
 */
export function getTimeUntilExpiration(token: string): number | null {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return null;
  }
  
  const timeUntilExpiry = expiration - Date.now();
  return timeUntilExpiry > 0 ? timeUntilExpiry : null;
}

/**
 * Check if token should be refreshed
 * Recommends refresh when token expires in less than 5 minutes
 * @param token JWT token string
 * @returns true if should refresh, false otherwise
 */
export function shouldRefreshToken(token: string): boolean {
  const timeUntilExpiry = getTimeUntilExpiration(token);
  if (!timeUntilExpiry) {
    return true; // Token invalid or expired, should refresh
  }
  
  // Refresh if expires in less than 5 minutes (300000ms)
  return timeUntilExpiry < 300000;
}