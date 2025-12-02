/**
 * Office Hours API Service
 * Handles all API calls related to office hours scheduling and queue management
 */

import axios from 'axios';
import {
  OfficeHoursSchedule,
  QueueEntry,
  QueueStats,
  CreateScheduleData,
  UpdateScheduleData,
  JoinQueueData,
  MyQueueStatus
} from '../types/officeHours';

const API_URL = 'http://localhost:3001/api/office-hours';

// Get auth token from storage
const getAuthToken = (): string | null => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const parsed = JSON.parse(authStorage);
    return parsed?.state?.token || null;
  }
  return null;
};

// Axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: API_URL,
});

// Add auth token to all requests
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Office Hours API Methods
 */
export const officeHoursApi = {
  /**
   * 1. Create office hours schedule (instructor only)
   */
  async createSchedule(data: CreateScheduleData): Promise<OfficeHoursSchedule> {
    try {
      const response = await apiClient.post('/schedule', data);
      return response.data.schedule || response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create schedule');
    }
  },

  /**
   * 2. Get instructor's office hours schedules
   */
  async getInstructorSchedules(instructorId: string): Promise<OfficeHoursSchedule[]> {
    try {
      const response = await apiClient.get(`/schedule/${instructorId}`);
      return response.data.schedules || response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch schedules');
    }
  },

  /**
   * 3. Update office hours schedule (instructor only)
   */
  async updateSchedule(scheduleId: string, data: UpdateScheduleData): Promise<OfficeHoursSchedule> {
    try {
      const response = await apiClient.put(`/schedule/${scheduleId}`, data);
      return response.data.schedule || response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update schedule');
    }
  },

  /**
   * 4. Delete office hours schedule (instructor only)
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      await apiClient.delete(`/schedule/${scheduleId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete schedule');
    }
  },

  /**
   * 5. Join office hours queue (student)
   */
  async joinQueue(data: JoinQueueData): Promise<{ queueEntry: QueueEntry; position: number }> {
    try {
      const response = await apiClient.post('/queue/join', data);
      return {
        queueEntry: response.data.queueEntry,
        position: response.data.position || 0
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to join queue');
    }
  },

  /**
   * 6. Get current queue for instructor
   */
  async getQueue(instructorId: string): Promise<{ queue: QueueEntry[]; stats: QueueStats }> {
    try {
      const response = await apiClient.get(`/queue/${instructorId}`);
      return {
        queue: response.data.queue || [],
        stats: response.data.stats || { waiting: 0, admitted: 0 }
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch queue');
    }
  },

  /**
   * 7. Admit student from queue (instructor only)
   */
  async admitStudent(queueId: string): Promise<QueueEntry> {
    try {
      const response = await apiClient.post(`/queue/${queueId}/admit`);
      return response.data.queueEntry || response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to admit student');
    }
  },

  /**
   * 8. Complete office hours session (instructor only)
   */
  async completeSession(queueId: string): Promise<QueueEntry> {
    try {
      const response = await apiClient.post(`/queue/${queueId}/complete`);
      return response.data.queueEntry || response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to complete session');
    }
  },

  /**
   * 9. Cancel queue entry (student or instructor)
   */
  async cancelQueueEntry(queueId: string): Promise<void> {
    try {
      await apiClient.post(`/queue/${queueId}/cancel`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to cancel queue entry');
    }
  },

  /**
   * 10. Get my queue status for a specific instructor
   */
  async getMyQueueStatus(instructorId: string): Promise<MyQueueStatus> {
    try {
      const response = await apiClient.get(`/my-queue/${instructorId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch queue status');
    }
  },

  /**
   * 11. Get all instructors (helper method for dropdown)
   * This uses the existing users API endpoint
   */
  async getInstructors(): Promise<any[]> {
    try {
      const token = getAuthToken();
      const response = await axios.get('http://localhost:3001/api/users/instructors', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch instructors');
    }
  }
};

export default officeHoursApi;
