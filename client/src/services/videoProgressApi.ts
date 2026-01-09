import axios from 'axios';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

// Helper function to get auth token from Zustand store
const getAuthToken = (): string | null => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const parsedAuth = JSON.parse(authStorage);
      return parsedAuth?.state?.token || null;
    } catch (error) {
      console.warn('Failed to parse auth storage:', error);
      return null;
    }
  }
  return null;
};

export interface VideoProgressUpdate {
  contentItemId: string; // Format: {lessonId}-video-{index}
  currentPosition: number;
  duration: number;
  watchedPercentage?: number;
}

export interface VideoProgressResponse {
  contentItemId: string; // Format: {lessonId}-video-{index}
  userId: string;
  currentPosition: number;
  duration: number;
  watchedPercentage: number;
  completed: boolean;
  lastWatched: string;
}

export interface CourseVideoProgress {
  contentItemId: string; // Format: {lessonId}-video-{index}
  lessonTitle: string;
  currentPosition: number;
  duration: number;
  watchedPercentage: number;
  completed: boolean;
  lastWatched: string;
}

/**
 * Update video progress (auto-save every 5 seconds)
 * @param contentItemId - Format: {lessonId}-video-{index}
 */
export const updateVideoProgress = async (
  contentItemId: string,
  currentPosition: number
): Promise<VideoProgressResponse> => {
  const token = getAuthToken();
  const response = await axios.post(
    `${API_URL}/api/video-progress/${contentItemId}/update`,
    { 
      lastPosition: Math.floor(currentPosition),
      watchedDuration: Math.floor(currentPosition),
      playbackSpeed: 1.0
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

/**
 * Get current video progress for a user
 * @param contentItemId - Format: {lessonId}-video-{index}
 */
export const getVideoProgress = async (
  contentItemId: string
): Promise<VideoProgressResponse | null> => {
  const token = getAuthToken();
  const response = await axios.get(
    `${API_URL}/api/video-progress/${contentItemId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

/**
 * Mark video as completed (automatically happens at 90% or can be called manually)
 * @param contentItemId - Format: {lessonId}-video-{index}
 */
export const markVideoComplete = async (
  contentItemId: string
): Promise<VideoProgressResponse> => {
  const token = getAuthToken();
  const response = await axios.post(
    `${API_URL}/api/video-progress/${contentItemId}/complete`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

/**
 * Get all video progress for a course
 */
export const getCourseVideoProgress = async (
  courseId: string
): Promise<CourseVideoProgress[]> => {
  const token = getAuthToken();
  const response = await axios.get(
    `${API_URL}/api/video-progress/course/${courseId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};
