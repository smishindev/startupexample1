import axios from 'axios';

const API_URL = 'http://localhost:3001';

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
    const response = await axios.get(`${API_URL}/api/dashboard/stats`);
    return response.data.data;
  },
};
