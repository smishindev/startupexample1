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

export interface ContentProgressItem {
  contentItemId: string; // Format: {lessonId}-{type}-{index}
  contentType: 'video' | 'text' | 'quiz';
  isCompleted: boolean;
  completedAt?: string;
  progressData?: any;
}

/**
 * Get all content progress for a lesson
 * Returns progress for all content items (videos, texts, quizzes)
 * Currently only video progress is tracked in the database
 */
export const getLessonContentProgress = async (lessonId: string): Promise<ContentProgressItem[]> => {
  const token = getAuthToken();
  try {
    // For now, we query video progress which includes ContentItemId
    // TODO: Create unified content-progress endpoint when text/quiz tracking is added
    const response = await axios.get(
      `${API_URL}/api/video-progress/lesson/${lessonId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    // Transform video progress to content progress format
    const videoProgress = response.data.progress || [];
    return videoProgress.map((vp: any) => ({
      contentItemId: vp.contentItemId,
      contentType: 'video' as const,
      isCompleted: vp.isCompleted || false,
      completedAt: vp.completedAt,
      progressData: {
        lastPosition: vp.lastPosition,
        watchedDuration: vp.watchedDuration,
        totalDuration: vp.totalDuration
      }
    }));
  } catch (error) {
    console.error('Failed to fetch content progress:', error);
    return [];
  }
};

/**
 * Mark content item as complete
 * Works for videos, text, and quizzes
 * For videos: uses video-progress complete endpoint
 * For text/quiz: currently marks via video progress for consistency (TODO: create unified endpoint)
 */
export const markContentComplete = async (
  contentItemId: string,
  progressData?: any
): Promise<void> => {
  const token = getAuthToken();
  
  // For now, use video-progress endpoint which supports ContentItemId
  // Video content uses the full completion endpoint
  // Text/quiz content can use same endpoint (they'll just have 100% completion immediately)
  await axios.post(
    `${API_URL}/api/video-progress/${contentItemId}/complete`,
    { progressData },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

/**
 * Check if all content in a lesson is complete
 */
export const isLessonContentComplete = (
  lessonContent: any[],
  contentProgress: { [key: string]: ContentProgressItem }
): boolean => {
  if (!lessonContent || lessonContent.length === 0) return false;
  
  return lessonContent.every(item => {
    const progress = contentProgress[item.id];
    return progress && progress.isCompleted;
  });
};
