import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_URL = 'http://localhost:3001/api';

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
export interface StudentEnrollment {
  id: string;
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'suspended' | 'cancelled';
}

export interface StudentProgress {
  overall: number;
  timeSpent: number;
  lastAccessedAt?: string;
  completedLessons: string[];
  totalLessons: number;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  userCreatedAt: string;
  enrollment: StudentEnrollment;
  progress: StudentProgress;
}

export interface DetailedStudentProgress {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
  };
  enrollment: {
    enrolledAt: string;
    status: string;
  };
  progress: {
    overall: number;
    timeSpent: number;
    lastAccessedAt?: string;
    startedAt: string;
    completedAt?: string;
    currentLesson?: string;
    completedLessons: string[];
    performanceMetrics: Record<string, any>;
  };
  lessons: Array<{
    id: string;
    title: string;
    orderIndex: number;
    duration: number;
    isCompleted: boolean;
  }>;
}

export interface StudentAnalytics {
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  suspendedStudents: number;
  averageProgress: number;
  averageTimeSpent: number;
  activeLastWeek: number;
  activeLastMonth: number;
}

export interface StudentFilters {
  courseId?: string;
  search?: string;
  status?: 'active' | 'completed' | 'suspended' | 'cancelled';
  sortBy?: 'enrolledAt' | 'lastName' | 'progress' | 'lastAccessed';
  sortOrder?: 'asc' | 'desc';
}

// API Functions
export const studentsApi = {
  // Get all students for instructor's courses
  getStudents: async (filters: StudentFilters = {}): Promise<Student[]> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/students?${params.toString()}`);
    return response.data;
  },

  // Get detailed progress for specific student and course
  getStudentProgress: async (studentId: string, courseId: string): Promise<DetailedStudentProgress> => {
    const response = await api.get(`/students/${studentId}/progress/${courseId}`);
    return response.data;
  },

  // Update student enrollment status
  updateEnrollmentStatus: async (
    studentId: string, 
    enrollmentId: string, 
    status: 'active' | 'completed' | 'suspended' | 'cancelled'
  ): Promise<void> => {
    await api.put(`/students/${studentId}/enrollment/${enrollmentId}`, { status });
  },

  // Send message to students
  sendMessage: async (data: {
    courseId: string;
    studentIds?: string[];
    subject: string;
    message: string;
    type?: 'message' | 'announcement';
  }): Promise<{ message: string; recipients: number }> => {
    const response = await api.post('/students/message', data);
    return response.data;
  },

  // Get student analytics
  getAnalytics: async (courseId?: string): Promise<StudentAnalytics> => {
    const params = courseId ? `?courseId=${courseId}` : '';
    const response = await api.get(`/students/analytics${params}`);
    return response.data;
  }
};

export default studentsApi;