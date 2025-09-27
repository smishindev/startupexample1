import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth data and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LessonContent {
  type: 'video' | 'text' | 'quiz';
  data: any;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  content: LessonContent[];
  orderIndex: number;
  duration: number; // in minutes
  isRequired: boolean;
  prerequisites: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonRequest {
  courseId: string;
  title: string;
  description: string;
  content?: LessonContent[];
  orderIndex?: number;
  duration?: number;
  isRequired?: boolean;
  prerequisites?: string[];
}

export interface UpdateLessonRequest {
  title?: string;
  description?: string;
  content?: LessonContent[];
  orderIndex?: number;
  duration?: number;
  isRequired?: boolean;
  prerequisites?: string[];
}

export interface ReorderLessonsRequest {
  courseId: string;
  lessonIds: string[];
}

export const lessonApi = {
  // Get all lessons for a course
  getLessons: async (courseId: string): Promise<Lesson[]> => {
    const response = await api.get(`/api/lessons/${courseId}`);
    return response.data;
  },

  // Get single lesson
  getLesson: async (lessonId: string): Promise<Lesson> => {
    const response = await api.get(`/api/lessons/lesson/${lessonId}`);
    return response.data;
  },

  // Create new lesson
  createLesson: async (lesson: CreateLessonRequest): Promise<Lesson> => {
    const response = await api.post('/api/lessons', lesson);
    return response.data;
  },

  // Update lesson
  updateLesson: async (lessonId: string, lesson: UpdateLessonRequest): Promise<Lesson> => {
    const response = await api.put(`/api/lessons/${lessonId}`, lesson);
    return response.data;
  },

  // Delete lesson
  deleteLesson: async (lessonId: string): Promise<void> => {
    await api.delete(`/api/lessons/${lessonId}`);
  },

  // Reorder lessons
  reorderLessons: async (request: ReorderLessonsRequest): Promise<void> => {
    await api.post('/api/lessons/reorder', request);
  },
};

// Content type templates
export const createVideoContent = (videoUrl: string, transcript?: string): LessonContent => ({
  type: 'video',
  data: {
    url: videoUrl,
    transcript: transcript || '',
    autoPlay: false,
    subtitles: []
  }
});

export const createTextContent = (htmlContent: string): LessonContent => ({
  type: 'text',
  data: {
    html: htmlContent,
    readingTime: Math.ceil(htmlContent.split(' ').length / 200) // ~200 words per minute
  }
});

export const createQuizContent = (questions: any[]): LessonContent => ({
  type: 'quiz',
  data: {
    questions,
    passingScore: 70,
    allowRetries: true,
    maxAttempts: 3
  }
});