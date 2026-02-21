import axios from 'axios';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

// Create axios instance
export const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add auth token automatically
axiosInstance.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      const token = parsed?.state?.token;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error parsing auth storage:', error);
    }
  }
  return config;
});

// Response interceptor to handle authentication errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 Unauthorized and 403 Forbidden responses
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Check if the error is due to invalid/expired token
      const errorData = error.response?.data?.error;
      const errorMessage = typeof errorData === 'string' ? errorData.toLowerCase() : '';
      
      if (
        errorMessage.includes('token') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('expired')
      ) {
        // Clear auth state via store (updates both in-memory Zustand AND localStorage)
        const { useAuthStore } = await import('../stores/authStore');
        useAuthStore.getState().logout();
        
        // Redirect to login page if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?session=expired';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
