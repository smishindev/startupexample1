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

export interface ProgressOverview {
  totalCourses: number;
  avgProgress: number;
  totalTimeSpent: number;
  completedCourses: number;
  inProgressCourses: number;
}

export interface RecentActivity {
  CourseId: string;
  courseTitle: string;
  OverallProgress: number;
  LastAccessedAt: string;
  TimeSpent: number;
  instructorFirstName: string;
  instructorLastName: string;
}

export interface LessonProgress {
  LessonId: string;
  lessonTitle: string;
  OrderIndex: number;
  CompletedAt?: string;
  lessonTimeSpent: number;
  ProgressPercentage: number;
  Notes?: string;
}

export interface CourseLesson {
  Id: string;
  Title: string;
  OrderIndex: number;
  IsRequired: boolean;
}

export interface CourseProgressData {
  OverallProgress: number;
  TimeSpent: number;
  LastAccessedAt?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface CourseProgressStats {
  totalLessons: number;
  completedLessons: number;
  remainingLessons: number;
}

export interface Achievement {
  name: string;
  icon: string;
  description: string;
}

export interface AchievementStats {
  coursesStarted: number;
  coursesCompleted: number;
  totalTimeSpent: number;
  lessonsCompleted: number;
  lastActivity?: string;
}

export interface UserProgressData {
  overview: ProgressOverview;
  recentActivity: RecentActivity[];
}

export interface CourseProgress {
  courseProgress: CourseProgressData;
  lessonProgress: LessonProgress[];
  allLessons: CourseLesson[];
  stats: CourseProgressStats;
}

export interface AchievementsData {
  currentStreak: number;
  stats: AchievementStats;
  badges: Achievement[];
}

export interface CompleteRequest {
  timeSpent?: number;
  notes?: string;
}

export interface UpdateProgressRequest {
  progressPercentage: number;
  timeSpent?: number;
  notes?: string;
}

class ProgressApi {
  async getMyProgress(): Promise<UserProgressData> {
    const response = await api.get('/api/progress/my-progress');
    return response.data;
  }

  async getCourseProgress(courseId: string): Promise<CourseProgress> {
    const response = await api.get(`/api/progress/courses/${courseId}`);
    return response.data;
  }

  async markLessonComplete(lessonId: string, data: CompleteRequest = {}): Promise<{ message: string; lessonId: string; timeSpent: number }> {
    const response = await api.post(`/api/progress/lessons/${lessonId}/complete`, data);
    return response.data;
  }

  async updateLessonProgress(lessonId: string, data: UpdateProgressRequest): Promise<{ message: string; lessonId: string; progressPercentage: number; timeSpent: number }> {
    const response = await api.put(`/api/progress/lessons/${lessonId}/progress`, data);
    return response.data;
  }

  async getAchievements(): Promise<AchievementsData> {
    const response = await api.get('/api/progress/achievements');
    return response.data;
  }
}

export const progressApi = new ProgressApi();