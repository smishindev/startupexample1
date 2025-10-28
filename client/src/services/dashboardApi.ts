import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const authStore = useAuthStore.getState();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
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
