import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Get token from auth store
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    
    // Handle token expiration
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth data and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export interface InstructorStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalStudents: number;
  totalEnrollments: number;
  avgRating: number;
  totalRevenue: number;
  monthlyGrowth: number;
  completionRate: number;
}

export interface InstructorCourse {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category?: string;
  level?: string;
  status: 'draft' | 'published' | 'archived';
  students: number;
  lessons: number;
  rating: number;
  revenue: number;
  progress: number;
  createdAt: string;
  lastUpdated: string;
  price: number;
}

export interface CourseLesson {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'text' | 'quiz';
  content?: string;
  videoUrl?: string;
  videoFile?: {
    id: string;
    url: string;
    originalName: string;
    mimeType: string;
  };
  useFileUpload?: boolean;
  duration?: number;
  order: number;
}

export interface CourseFormData {
  title: string;
  subtitle?: string;
  description: string;
  thumbnail?: string;
  category?: string;
  level?: string;
  language?: string;
  price?: number;
  tags?: string[];
  requirements?: string[];
  whatYouWillLearn?: string[];
  isPublic?: boolean;
  allowComments?: boolean;
  certificateEnabled?: boolean;
  lessons?: CourseLesson[];
}

export const instructorApi = {
  // Get instructor dashboard stats
  getStats: async (): Promise<InstructorStats> => {
    try {
      const response = await api.get('/instructor/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch instructor stats:', error);
      throw error;
    }
  },

  // Get instructor's courses
  getCourses: async (status?: string): Promise<InstructorCourse[]> => {
    try {
      const params = status ? { status } : {};
      const response = await api.get('/instructor/courses', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch instructor courses:', error);
      throw error;
    }
  },

  // Create new course
  createCourse: async (courseData: CourseFormData): Promise<{ id: string; message: string; status: string }> => {
    try {
      const response = await api.post('/instructor/courses', courseData);
      return response.data;
    } catch (error) {
      console.error('Failed to create course:', error);
      throw error;
    }
  },

  // Update course
  updateCourse: async (courseId: string, courseData: Partial<CourseFormData>): Promise<{ message: string }> => {
    try {
      const response = await api.put(`/instructor/courses/${courseId}`, courseData);
      return response.data;
    } catch (error) {
      console.error('Failed to update course:', error);
      throw error;
    }
  },

  // Delete course
  deleteCourse: async (courseId: string): Promise<{ message: string }> => {
    try {
      const response = await api.delete(`/instructor/courses/${courseId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete course:', error);
      throw error;
    }
  },

  // Publish course
  publishCourse: async (courseId: string): Promise<{ message: string }> => {
    try {
      const response = await api.post(`/instructor/courses/${courseId}/publish`);
      return response.data;
    } catch (error) {
      console.error('Failed to publish course:', error);
      throw error;
    }
  },

  // Get course analytics
  getCourseAnalytics: async (courseId: string) => {
    try {
      const response = await api.get(`/instructor/courses/${courseId}/analytics`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch course analytics:', error);
      throw error;
    }
  },

  // Get at-risk students for intervention dashboard
  getAtRiskStudents: async () => {
    try {
      const response = await api.get('/instructor/at-risk-students');
      return response.data.students || [];
    } catch (error) {
      console.error('Failed to fetch at-risk students:', error);
      throw error;
    }
  },

  // Get low progress students
  getLowProgressStudents: async () => {
    try {
      const response = await api.get('/instructor/low-progress-students');
      return response.data.students || [];
    } catch (error) {
      console.error('Failed to fetch low progress students:', error);
      throw error;
    }
  },

  // Get pending assessments
  getPendingAssessments: async () => {
    try {
      const response = await api.get('/instructor/pending-assessments');
      return response.data.assessments || [];
    } catch (error) {
      console.error('Failed to fetch pending assessments:', error);
      throw error;
    }
  }
};

export default instructorApi;