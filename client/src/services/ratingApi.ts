import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const authStore = useAuthStore.getState();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

// Types
export interface CourseRating {
  Id: string;
  CourseId: string;
  UserId: string;
  Rating: number;
  ReviewText: string | null;
  IsEdited: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  FirstName?: string;
  LastName?: string;
  Avatar?: string;
  CourseTitle?: string; // For instructor summary
}

export interface RatingSummary {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface PaginatedRatings {
  ratings: CourseRating[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface InstructorRatingSummary {
  totalRatings: number;
  averageRating: number;
  recentRatings: CourseRating[];
}

class RatingApi {
  /**
   * Get paginated ratings for a course
   */
  async getCourseRatings(
    courseId: string,
    options: { page?: number; limit?: number; sort?: 'newest' | 'oldest' | 'highest' | 'lowest' } = {}
  ): Promise<PaginatedRatings> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.sort) params.append('sort', options.sort);

    const response = await api.get(`/api/ratings/courses/${courseId}?${params.toString()}`);
    return response.data;
  }

  /**
   * Get rating distribution summary for a course
   */
  async getRatingSummary(courseId: string): Promise<RatingSummary> {
    const response = await api.get(`/api/ratings/courses/${courseId}/summary`);
    return response.data;
  }

  /**
   * Get current user's rating for a course
   */
  async getMyRating(courseId: string): Promise<CourseRating | null> {
    const response = await api.get(`/api/ratings/courses/${courseId}/my-rating`);
    return response.data.rating;
  }

  /**
   * Submit or update a rating (upsert)
   */
  async submitRating(courseId: string, data: { rating: number; reviewText?: string }): Promise<{
    success: boolean;
    message: string;
    rating: CourseRating;
    isNew: boolean;
  }> {
    const response = await api.post(`/api/ratings/courses/${courseId}`, data);
    return response.data;
  }

  /**
   * Delete your rating for a course
   */
  async deleteRating(courseId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/api/ratings/courses/${courseId}`);
    return response.data;
  }

  /**
   * Get instructor's rating summary across all courses
   */
  async getInstructorRatingSummary(): Promise<InstructorRatingSummary> {
    const response = await api.get('/api/ratings/instructor/summary');
    return response.data;
  }
}

export const ratingApi = new RatingApi();
