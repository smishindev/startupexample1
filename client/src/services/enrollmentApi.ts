import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Get token from Zustand auth store in localStorage
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const parsedAuth = JSON.parse(authStorage);
      const token = parsedAuth?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to parse auth storage:', error);
    }
  }
  return config;
});

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired (401) and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsedAuth = JSON.parse(authStorage);
          const refreshTokenFn = parsedAuth?.state?.refreshToken;
          
          if (refreshTokenFn) {
            // Get fresh auth store state to call refresh
            const { useAuthStore } = await import('../stores/authStore');
            const refreshed = await useAuthStore.getState().validateToken();
            
            if (refreshed) {
              // Retry the original request with new token
              const newAuthStorage = localStorage.getItem('auth-storage');
              const newAuth = JSON.parse(newAuthStorage || '{}');
              const newToken = newAuth?.state?.token;
              
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
              }
            }
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export interface Enrollment {
  enrollmentId: string;
  EnrolledAt: string;
  Status: string;
  CompletedAt?: string;
  courseId: string;
  Title: string;
  Description: string;
  Thumbnail?: string;
  Duration: string;
  Level: string;
  Price: number;
  instructorFirstName: string;
  instructorLastName: string;
  OverallProgress: number;
  TimeSpent: number;
  LastAccessedAt: string;
}

export interface EnrollmentStatus {
  enrolled: boolean;
  enrollmentId?: string;
  status?: string;
  enrolledAt?: string;
  completedAt?: string;
}

export interface EnrollmentStats {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  droppedEnrollments: number;
  avgProgress: number;
}

export interface EnrollmentResponse {
  enrollmentId: string;
  courseId: string;
  courseTitle?: string;
  status: string;
  enrolledAt: string;
  message: string;
  code: string;
  nextSteps?: {
    startLearning: string;
    viewProgress: string;
    courseDetail: string;
  };
}

export interface EnrollmentError {
  error: string;
  code: string;
  enrollmentId?: string;
}

class EnrollmentApi {
  async getMyEnrollments(): Promise<Enrollment[]> {
    const response = await api.get('/api/enrollment/my-enrollments');
    return response.data;
  }

  async getEnrollmentStatus(courseId: string): Promise<EnrollmentStatus> {
    const response = await api.get(`/api/enrollment/courses/${courseId}/enrollment-status`);
    return response.data;
  }

  async enrollInCourse(courseId: string): Promise<EnrollmentResponse> {
    try {
      const response = await api.post(`/api/enrollment/courses/${courseId}/enroll`);
      return response.data;
    } catch (error: any) {
      // Enhanced error handling with specific error codes
      if (error.response?.data) {
        const errorData = error.response.data as EnrollmentError;
        throw new Error(JSON.stringify({
          message: errorData.error,
          code: errorData.code,
          enrollmentId: errorData.enrollmentId,
          status: error.response.status
        }));
      }
      throw new Error('Failed to enroll in course. Please try again.');
    }
  }

  async unenrollFromCourse(courseId: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/api/enrollment/courses/${courseId}/unenroll`);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to unenroll from course. Please try again.');
    }
  }

  async getCourseStats(courseId: string): Promise<EnrollmentStats> {
    const response = await api.get(`/api/enrollment/courses/${courseId}/stats`);
    return response.data;
  }
}

export const enrollmentApi = new EnrollmentApi();