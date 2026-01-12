import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isTokenExpired } from '../utils/jwtUtils';
import { getFriendlyErrorMessage } from '../utils/errorMessages';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'instructor' | 'admin';
  learningStyle?: string | null;
  avatar?: string | null;
  preferences?: Record<string, any> | null;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isLoggingOut: boolean;

  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  updateUser: (userData: Partial<User>) => void;
  updateEmailVerified: (verified: boolean) => void;
  
  // Token validation
  validateToken: () => Promise<boolean>;
  isTokenValid: () => boolean;
}

export interface RegisterData {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: 'student' | 'instructor';
  learningStyle?: string;
}

export interface LoginResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

const API_BASE_URL = 'http://localhost:3001/api';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isLoggingOut: false,

      // Actions
      login: async (email: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, rememberMe }),
          });

          const data: LoginResponse = await response.json();

          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return true;
          } else {
            const friendlyError = getFriendlyErrorMessage(
              data.error?.code,
              data.error?.message
            );
            set({
              error: friendlyError,
              isLoading: false,
            });
            return false;
          }
        } catch (error) {
          set({
            error: getFriendlyErrorMessage('NETWORK_ERROR'),
            isLoading: false,
          });
          return false;
        }
      },

      register: async (userData: RegisterData): Promise<boolean> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          });

          const data: LoginResponse = await response.json();

          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return true;
          } else {
            const friendlyError = getFriendlyErrorMessage(
              data.error?.code,
              data.error?.message
            );
            set({
              error: friendlyError,
              isLoading: false,
            });
            return false;
          }
        } catch (error) {
          set({
            error: getFriendlyErrorMessage('NETWORK_ERROR'),
            isLoading: false,
          });
          return false;
        }
      },

      logout: async () => {
        // Prevent multiple simultaneous logout calls
        const { isLoggingOut } = get();
        if (isLoggingOut) {
          console.log('Logout already in progress, skipping...');
          return;
        }

        set({ isLoggingOut: true });

        // Call logout endpoint if token exists to set user offline
        const { token } = get();
        if (token) {
          try {
            // Use a timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            await fetch(`${API_BASE_URL}/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              console.error('Logout endpoint timeout');
            } else {
              console.error('Logout endpoint error:', error);
            }
            // Continue with logout even if API call fails
          }
        }

        // Clear auth state - socket disconnect will be handled by App.tsx useEffect cleanup
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isLoggingOut: false,
        });
      },

      refreshToken: async (): Promise<boolean> => {
        const { token } = get();
        if (!token) return false;

        try {
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          const data = await response.json();

          if (data.success && data.data?.token) {
            const newToken = data.data.token;
            set({ token: newToken });
            
            // Fetch fresh user data with new token
            try {
              const userResponse = await fetch(`${API_BASE_URL}/auth/verify`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${newToken}`,
                },
              });
              
              const userData = await userResponse.json();
              if (userData.success && userData.data?.user) {
                set({ user: userData.data.user });
              }
            } catch (userError) {
              console.warn('Failed to fetch updated user data after token refresh:', userError);
              // Continue anyway, token was refreshed successfully
            }
            
            return true;
          } else {
            // Refresh failed, logout user
            get().logout();
            return false;
          }
        } catch (error) {
          // Refresh failed, logout user
          get().logout();
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, ...userData },
          });
        }
      },

      updateEmailVerified: (verified: boolean) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, emailVerified: verified },
          });
        }
      },

      // Token validation methods
      isTokenValid: (): boolean => {
        const { token } = get();
        if (!token) return false;
        
        const expired = isTokenExpired(token);
        return expired === false; // true if not expired, false if expired or invalid
      },

      validateToken: async (): Promise<boolean> => {
        const { token, refreshToken, logout } = get();
        
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return false;
        }

        const expired = isTokenExpired(token);
        
        // If token is invalid, logout immediately
        if (expired === null) {
          console.warn('Invalid token detected, logging out...');
          logout();
          return false;
        }

        // If token is expired, try to refresh
        if (expired === true) {
          console.log('Token expired, attempting refresh...');
          const refreshed = await refreshToken();
          if (!refreshed) {
            return false; // refresh already calls logout on failure
          }
          return true;
        }

        // Token is valid but verify with backend
        try {
          const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            // Backend says token is invalid (user deleted, etc.)
            console.warn('Your session has ended. Please sign in again.');
            logout();
            return false;
          }

          // Update user data from verify response
          const data = await response.json();
          if (data.success && data.data?.user) {
            set({ user: data.data.user });
          }

          return true;
        } catch (error) {
          console.error('Token verification error:', error);
          // Network error - don't logout, assume token is still valid
          return true;
        }
      },
    }),
    {
      name: 'auth-storage', // unique name for localStorage key
      partialize: (state) => ({ 
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper hook for authenticated API calls
export const useAuthenticatedFetch = () => {
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    if (!token) {
      throw new Error('No authentication token available');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    let response = await fetch(url, { ...options, headers });

    // If token is expired, try to refresh
    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        const newToken = useAuthStore.getState().token;
        const newHeaders = {
          ...headers,
          'Authorization': `Bearer ${newToken}`,
        };
        response = await fetch(url, { ...options, headers: newHeaders });
      }
    }

    return response;
  };

  return authenticatedFetch;
};