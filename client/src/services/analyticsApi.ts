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
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface CourseAnalytics {
  enrollment: {
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    droppedEnrollments: number;
    avgCompletionDays: number;
  };
  progress: {
    avgProgress: number;
    avgTimeSpent: number;
    completedStudents: number;
    inProgressStudents: number;
    notStartedStudents: number;
  };
  engagement: {
    activeUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    avgSessionTime: number;
  };
  recentActivity: Array<{
    FirstName: string;
    LastName: string;
    Email: string;
    OverallProgress: number;
    LastAccessedAt: string;
    EnrollmentStatus: string;
  }>;
}

export interface DashboardAnalytics {
  overview: {
    totalCourses: number;
    totalStudents: number;
    totalEnrollments: number;
    avgProgress: number;
    totalTimeSpent: number;
  };
  coursePerformance: Array<{
    Id: string;
    Title: string;
    enrolledStudents: number;
    avgProgress: number;
    completedStudents: number;
    avgTimeSpent: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    enrollments: number;
    uniqueStudents: number;
  }>;
  topCourses: Array<{
    Title: string;
    enrollments: number;
    avgProgress: number;
    completions: number;
  }>;
}

export interface ProgressTrend {
  week: number;
  year: number;
  avgProgress: number;
  activeStudents: number;
  totalTimeSpent: number;
}

export interface PerformanceDistribution {
  progressRange: string;
  studentCount: number;
}

class AnalyticsApi {
  // Get analytics for a specific course
  async getCourseAnalytics(courseId: string): Promise<CourseAnalytics> {
    const response = await api.get(`/analytics/courses/${courseId}`);
    return response.data;
  }

  // Get instructor dashboard analytics (all courses)
  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  }

  // Get progress trends for a specific course
  async getCourseProgressTrends(courseId: string): Promise<ProgressTrend[]> {
    const response = await api.get(`/analytics/courses/${courseId}/trends`);
    return response.data;
  }

  // Get student performance distribution for a course
  async getCoursePerformanceDistribution(courseId: string): Promise<PerformanceDistribution[]> {
    const response = await api.get(`/analytics/courses/${courseId}/performance-distribution`);
    return response.data;
  }
}

export const analyticsApi = new AnalyticsApi();
export default analyticsApi;