import axios from 'axios';

const API_BASE_URL = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:3001') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// ===================================
// Types
// ===================================

export interface InstructorPublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  bio: string | null;
  headline: string | null;
  websiteUrl: string | null;
  linkedInUrl: string | null;
  twitterUrl: string | null;
  joinedAt: string;
  stats: {
    totalStudents: number;
    totalCourses: number;
    averageRating: number;
    totalReviews: number;
  };
  courses: InstructorPublicCourse[];
}

export interface InstructorPublicCourse {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  category: string;
  level: string;
  price: number;
  rating: number;
  ratingCount: number;
  enrollmentCount: number;
  duration: number;
}

// ===================================
// API Methods
// ===================================

export const instructorProfileApi = {
  /**
   * Get instructor public profile (no auth required)
   */
  getPublicProfile: async (instructorId: string): Promise<InstructorPublicProfile> => {
    const response = await api.get(`/instructors/${instructorId}/profile`);
    return response.data.data;
  }
};

export default instructorProfileApi;
