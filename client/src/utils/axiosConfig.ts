import axios from 'axios';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

// Create axios instance
export const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Response interceptor to handle authentication errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized and 403 Forbidden responses
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Check if the error is due to invalid/expired token
      const errorMessage = error.response?.data?.error?.toLowerCase() || '';
      
      if (
        errorMessage.includes('token') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('expired')
      ) {
        // Clear invalid auth data from localStorage
        localStorage.removeItem('auth-storage');
        
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
