import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { Comment, CreateCommentRequest, CommentsResponse } from '../types/comment';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface GetCommentsOptions {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'likes';
}

export const commentApi = {
  /**
   * Get all comments for an entity
   */
  getComments: async (
    entityType: string,
    entityId: string,
    options?: GetCommentsOptions
  ): Promise<CommentsResponse> => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.sort) params.append('sort', options.sort);
    
    const url = `/api/comments/${entityType}/${entityId}${params.toString() ? `?${params}` : ''}`;
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Create a new comment or reply
   */
  createComment: async (data: CreateCommentRequest): Promise<Comment> => {
    const response = await api.post('/api/comments', data);
    return response.data.comment;
  },

  /**
   * Update own comment (within 5-minute window)
   */
  updateComment: async (commentId: string, content: string): Promise<Comment> => {
    const response = await api.put(`/api/comments/${commentId}`, { content });
    return response.data.comment;
  },

  /**
   * Delete own comment (soft delete)
   */
  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(`/api/comments/${commentId}`);
  },

  /**
   * Toggle like on a comment
   */
  toggleLike: async (commentId: string): Promise<{ isLiked: boolean; likesCount: number }> => {
    const response = await api.post(`/api/comments/${commentId}/like`);
    return response.data;
  },
};

export default commentApi;
