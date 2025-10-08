// Bookmark API service for frontend
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Get auth token from auth store instead of localStorage directly
const getAuthToken = () => {
  try {
    // First try to get from localStorage in the format the auth store uses
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed.state?.token || null;
    }
    // Fallback to direct localStorage check
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return localStorage.getItem('token');
  }
};

// Create axios instance with auth
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/bookmarks`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  console.log('BookmarkApi: Getting token for request:', { hasToken: !!token, tokenLength: token?.length });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('BookmarkApi: Added Authorization header');
  } else {
    console.log('BookmarkApi: No token available');
  }
  return config;
});

export interface Bookmark {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  level: string;
  duration: number;
  price: number;
  rating: number;
  enrollmentCount: number;
  tags: string[];
  instructor: {
    name: string;
    avatar: string;
  };
  bookmarkedAt: string;
  notes: string | null;
  isBookmarked: boolean;
}

export interface BookmarkResponse {
  bookmarks: Bookmark[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BookmarkStatus {
  isBookmarked: boolean;
  bookmark?: {
    id: string;
    notes: string | null;
    bookmarkedAt: string;
  } | null;
}

export interface BookmarkCreateResponse {
  success: boolean;
  bookmark: {
    id: string;
    userId: string;
    courseId: string;
    notes: string | null;
    bookmarkedAt: string;
  };
}

export class BookmarkApi {
  /**
   * Get user's bookmarked courses
   */
  static async getBookmarks(page: number = 1, limit: number = 12): Promise<BookmarkResponse> {
    try {
      const response = await apiClient.get(`/?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      throw error;
    }
  }

  /**
   * Add a course to bookmarks
   */
  static async addBookmark(courseId: string, notes?: string): Promise<BookmarkCreateResponse> {
    try {
      const response = await apiClient.post(`/${courseId}`, { notes });
      return response.data;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  }

  /**
   * Remove a course from bookmarks
   */
  static async removeBookmark(courseId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete(`/${courseId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      throw error;
    }
  }

  /**
   * Check if a course is bookmarked
   */
  static async checkBookmarkStatus(courseId: string): Promise<BookmarkStatus> {
    try {
      const response = await apiClient.get(`/check/${courseId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      throw error;
    }
  }

  /**
   * Update bookmark notes
   */
  static async updateBookmarkNotes(courseId: string, notes: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.patch(`/${courseId}`, { notes });
      return response.data;
    } catch (error) {
      console.error('Error updating bookmark notes:', error);
      throw error;
    }
  }

  /**
   * Get multiple courses bookmark status (batch check)
   */
  static async getBookmarkStatuses(courseIds: string[]): Promise<Record<string, boolean>> {
    try {
      const checks = await Promise.allSettled(
        courseIds.map(async (courseId) => {
          const status = await this.checkBookmarkStatus(courseId);
          return { courseId, isBookmarked: status.isBookmarked };
        })
      );

      const statuses: Record<string, boolean> = {};
      checks.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          statuses[result.value.courseId] = result.value.isBookmarked;
        } else {
          // Default to false if check failed
          statuses[courseIds[index]] = false;
        }
      });

      return statuses;
    } catch (error) {
      console.error('Error checking multiple bookmark statuses:', error);
      throw error;
    }
  }
}

export default BookmarkApi;