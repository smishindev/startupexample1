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
  archivedCourses: number;
  totalStudents: number;
  totalEnrollments: number;
  avgRating: number;
  totalRevenue: number;
  completionRate: number;
  pendingEnrollments: number;
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
  ratingCount?: number;
  revenue: number;
  progress: number;
  createdAt: string;
  lastUpdated: string;
  price: number;
  prerequisites?: string[];
  learningOutcomes?: string[];
  // Enrollment Controls (Phase 2)
  maxEnrollment?: number | null;
  enrollmentOpenDate?: string | null;
  enrollmentCloseDate?: string | null;
  requiresApproval?: boolean;
  // Certificate Settings (Phase 3)
  certificateEnabled?: boolean;
  certificateTitle?: string | null;
  certificateTemplate?: string;
  // Advanced Visibility (Phase 4)
  visibility?: 'public' | 'unlisted';
  previewToken?: string | null;
}

export interface CoursesResponse {
  courses: InstructorCourse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCourses: number;
    hasMore: boolean;
  };
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
  prerequisites?: string[]; // Course IDs that must be completed first
  learningOutcomes?: string[]; // What students will learn
  // Enrollment Controls (Phase 2)
  maxEnrollment?: number | null;
  enrollmentOpenDate?: string | null;
  enrollmentCloseDate?: string | null;
  requiresApproval?: boolean;
  isPublic?: boolean;
  allowComments?: boolean;
  certificateEnabled?: boolean;
  certificateTitle?: string | null;
  certificateTemplate?: string;
  // Advanced Visibility (Phase 4)
  visibility?: 'public' | 'unlisted';
  lessons?: CourseLesson[];
}

export interface PendingEnrollment {
  EnrollmentId: string;
  CourseId: string;
  UserId: string;
  EnrolledAt: string;
  Status: string;
  CourseTitle: string;
  FirstName: string;
  LastName: string;
  Email: string;
  ProfilePicture?: string;
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
  getCourses: async (status?: string, page: number = 1, limit: number = 12): Promise<CoursesResponse> => {
    try {
      const params: any = { page, limit };
      if (status) {
        params.status = status;
      }
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
  },

  // ============= ENROLLMENT APPROVAL SYSTEM (Phase 2) =============
  
  // Get pending enrollments
  getPendingEnrollments: async (courseId?: string): Promise<{ enrollments: PendingEnrollment[]; total: number }> => {
    try {
      const params = courseId ? { courseId } : {};
      const response = await api.get('/instructor/enrollments/pending', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch pending enrollments:', error);
      throw error;
    }
  },

  // Approve an enrollment
  approveEnrollment: async (enrollmentId: string): Promise<{ message: string; enrollmentId: string; studentName: string }> => {
    try {
      const response = await api.put(`/instructor/enrollments/${enrollmentId}/approve`);
      return response.data;
    } catch (error) {
      console.error('Failed to approve enrollment:', error);
      throw error;
    }
  },

  // Reject an enrollment
  rejectEnrollment: async (enrollmentId: string, reason?: string): Promise<{ message: string; enrollmentId: string; studentName: string }> => {
    try {
      const response = await api.put(`/instructor/enrollments/${enrollmentId}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error('Failed to reject enrollment:', error);
      throw error;
    }
  },

  // Generate or regenerate preview token for a course
  generatePreviewToken: async (courseId: string): Promise<{ message: string; previewToken: string }> => {
    try {
      const response = await api.post(`/instructor/courses/${courseId}/preview-token`);
      return response.data;
    } catch (error) {
      console.error('Failed to generate preview token:', error);
      throw error;
    }
  }
};

export default instructorApi;