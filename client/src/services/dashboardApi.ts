import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests (consistent with other API services)
api.interceptors.request.use((config) => {
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

export interface DashboardStats {
  totalCourses: number;
  completedCourses: number;
  hoursLearned: number;
  currentStreak: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'bronze' | 'silver' | 'gold';
  unlockedAt: string;
}

export const dashboardApi = {
  /**
   * Get dashboard statistics for the authenticated user
   */
  async getStats(): Promise<DashboardStats> {
    const response = await api.get('/api/dashboard/stats');
    return response.data.data;
  },
};
