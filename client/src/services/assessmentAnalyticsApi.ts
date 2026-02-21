import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:3001') + '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const authStore = useAuthStore.getState();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface AssessmentOverview {
  totalAssessments: number;
  totalSubmissions: number;
  overallPassRate: number;
  averageScore: number;
  totalActiveStudents: number;
  assessmentsThisMonth: number;
}

export interface AssessmentTypeStats {
  Type: string;
  count: number;
  avgScore: number;
  passRate: number;
  activeStudents: number;
}

export interface PerformanceTrend {
  month: string;
  submissions: number;
  avgScore: number;
  passRate: number;
}

export interface TopAssessment {
  Id: string;
  Title: string;
  Type: string;
  courseTitle: string;
  submissions: number;
  avgScore: number;
  passRate: number;
}

export interface StrugglingArea {
  Id: string;
  Title: string;
  Type: string;
  courseTitle: string;
  submissions: number;
  avgScore: number;
  passRate: number;
  failedAttempts: number;
}

export interface CrossAssessmentAnalytics {
  overview: AssessmentOverview;
  assessmentTypes: AssessmentTypeStats[];
  performanceTrends: PerformanceTrend[];
  topPerformingAssessments: TopAssessment[];
  strugglingAreas: StrugglingArea[];
}

export interface StudentPerformanceData {
  userId: string;
  studentName: string;
  Email: string;
  totalAssessments: number;
  completedAssessments: number;
  passedAssessments: number;
  avgScore: number;
  totalTimeSpent: number;
  lastActivityAt: string | null;
  progressPercentage: number;
}

export interface AssessmentDifficultyData {
  Id: string;
  Title: string;
  Type: string;
  attempts: number;
  avgScore: number;
  passRate: number;
  avgAttempts: number;
  avgTimeSpent: number;
}

export interface StudentPerformanceAnalytics {
  studentPerformance: StudentPerformanceData[];
  assessmentDifficulty: AssessmentDifficultyData[];
}

export interface PerformancePattern {
  assessmentType: string;
  totalAttempts: number;
  avgScore: number;
  passRate: number;
  avgTimeSpent: number;
  avgAttemptsNeeded: number;
}

export interface RecentTrendItem {
  Score: number;
  CompletedAt: string;
  assessmentTitle: string;
  assessmentType: string;
  passed: number;
}

export interface ImprovementArea {
  Type: string;
  Title: string;
  Score: number;
  PassingScore: number;
  AttemptNumber: number;
  courseTitle: string;
}

export interface LearningInsights {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface StudentLearningData {
  performancePatterns: PerformancePattern[];
  recentTrend: RecentTrendItem[];
  improvementAreas: ImprovementArea[];
  insights: LearningInsights;
}

class AssessmentAnalyticsApi {
  private baseUrl = '/assessment-analytics';

  // Get cross-assessment analytics overview for instructors
  async getCrossAssessmentOverview(): Promise<CrossAssessmentAnalytics> {
    const response = await api.get(`${this.baseUrl}/instructor/overview`);
    return response.data;
  }

  // Get detailed student performance for a course
  async getStudentPerformance(courseId: string): Promise<StudentPerformanceAnalytics> {
    const response = await api.get(`${this.baseUrl}/student-performance/${courseId}`);
    return response.data;
  }

  // Get learning insights and recommendations for a student
  async getLearningInsights(studentId: string): Promise<StudentLearningData> {
    const response = await api.get(`${this.baseUrl}/learning-insights/${studentId}`);
    return response.data;
  }

  // Helper method to format assessment type display names
  formatAssessmentType(type: string): string {
    const typeMap: Record<string, string> = {
      'quiz': 'Quiz',
      'test': 'Test',
      'assignment': 'Assignment',
      'practical': 'Practical',
      'exam': 'Exam'
    };
    return typeMap[type.toLowerCase()] || type;
  }

  // Helper method to get performance level based on score
  getPerformanceLevel(score: number): {
    level: 'excellent' | 'good' | 'average' | 'needs-improvement';
    color: 'success' | 'info' | 'warning' | 'error';
    label: string;
  } {
    if (score >= 90) {
      return { level: 'excellent', color: 'success', label: 'Excellent' };
    } else if (score >= 80) {
      return { level: 'good', color: 'info', label: 'Good' };
    } else if (score >= 70) {
      return { level: 'average', color: 'warning', label: 'Average' };
    } else {
      return { level: 'needs-improvement', color: 'error', label: 'Needs Improvement' };
    }
  }

  // Helper method to format time durations
  formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }

  // Helper method to get trend direction
  getTrendDirection(currentValue: number, previousValue: number): 'up' | 'down' | 'stable' {
    const difference = currentValue - previousValue;
    const percentChange = Math.abs(difference / previousValue) * 100;
    
    if (percentChange < 5) return 'stable';
    return difference > 0 ? 'up' : 'down';
  }

  // Helper method to calculate improvement percentage
  calculateImprovement(currentScore: number, previousScore: number): number {
    if (previousScore === 0) return 0;
    return Math.round(((currentScore - previousScore) / previousScore) * 100);
  }
}

export const assessmentAnalyticsApi = new AssessmentAnalyticsApi();