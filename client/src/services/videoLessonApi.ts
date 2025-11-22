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

export interface VideoLesson {
  id: string;
  lessonId: string;
  videoUrl: string;
  duration: number;
  transcriptUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * Get video lesson details by lesson ID
 */
export const getVideoLessonByLessonId = async (lessonId: string): Promise<VideoLesson | null> => {
  try {
    const token = getAuthToken();
    const response = await axios.get(
      `${API_URL}/api/video-lessons/lesson/${lessonId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.videoLesson;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null; // No video lesson for this lesson
    }
    throw error;
  }
};

/**
 * Get video lesson by video lesson ID
 */
export const getVideoLesson = async (videoLessonId: string): Promise<VideoLesson> => {
  const token = getAuthToken();
  const response = await axios.get(
    `${API_URL}/api/video-lessons/${videoLessonId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data.videoLesson;
};

/**
 * Parse VTT transcript file
 */
export const parseVTTTranscript = async (transcriptUrl: string): Promise<TranscriptSegment[]> => {
  try {
    const response = await axios.get(transcriptUrl);
    const vttContent = response.data;
    
    const segments: TranscriptSegment[] = [];
    const lines = vttContent.split('\n');
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Check if this is a timestamp line (e.g., "00:00:01.000 --> 00:00:05.000")
      if (line.includes('-->')) {
        const [startStr, endStr] = line.split('-->').map((s: string) => s.trim());
        const startTime = parseVTTTimestamp(startStr);
        const endTime = parseVTTTimestamp(endStr);
        
        // Get the text (next non-empty line)
        i++;
        let text = '';
        while (i < lines.length && lines[i].trim() !== '') {
          text += (text ? ' ' : '') + lines[i].trim();
          i++;
        }
        
        if (text) {
          segments.push({ startTime, endTime, text });
        }
      }
      i++;
    }
    
    return segments;
  } catch (error) {
    console.error('Failed to parse VTT transcript:', error);
    return [];
  }
};

/**
 * Parse VTT timestamp to seconds
 */
const parseVTTTimestamp = (timestamp: string): number => {
  const parts = timestamp.split(':');
  if (parts.length === 3) {
    // HH:MM:SS.mmm format
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    // MM:SS.mmm format
    const minutes = parseInt(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
};
