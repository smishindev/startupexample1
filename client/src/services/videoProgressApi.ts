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
  videoLessonId: string;
  currentPosition: number;
  duration: number;
  watchedPercentage?: number;
}

export interface VideoProgressResponse {
  videoLessonId: string;
  userId: string;
  currentPosition: number;
  duration: number;
  watchedPercentage: number;
  completed: boolean;
  lastWatched: string;
}

export interface VideoAnalyticsEvent {
  eventType: 'play' | 'pause' | 'seek' | 'complete' | 'speed_change' | 'quality_change';
  timestamp: number;
  data?: Record<string, any>;
}

export interface CourseVideoProgress {
  videoLessonId: string;
  lessonTitle: string;
  currentPosition: number;
  duration: number;
  watchedPercentage: number;
  completed: boolean;
  lastWatched: string;
}

/**
 * Update video progress (auto-save every 5 seconds)
 */
export const updateVideoProgress = async (
  videoLessonId: string,
  currentPosition: number
): Promise<VideoProgressResponse> => {
  const token = getAuthToken();
  const response = await axios.post(
    `${API_URL}/api/video-progress/${videoLessonId}/update`,
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
 */
export const getVideoProgress = async (
  videoLessonId: string
): Promise<VideoProgressResponse | null> => {
  const token = getAuthToken();
  const response = await axios.get(
    `${API_URL}/api/video-progress/${videoLessonId}`,
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
 */
export const markVideoComplete = async (
  videoLessonId: string
): Promise<VideoProgressResponse> => {
  const token = getAuthToken();
  const response = await axios.post(
    `${API_URL}/api/video-progress/${videoLessonId}/complete`,
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
 * Track analytics events (play, pause, seek, speed change, etc.)
 */
export const trackVideoEvent = async (
  videoLessonId: string,
  event: VideoAnalyticsEvent
): Promise<void> => {
  const token = getAuthToken();
  await axios.post(
    `${API_URL}/api/video-progress/${videoLessonId}/event`,
    event,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
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
