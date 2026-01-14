import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const authStore = useAuthStore.getState();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

// Enhanced interfaces building on existing progress types
export interface LearningRecommendation {
  id: string;
  type: 'content' | 'practice' | 'review' | 'assessment' | 'skill';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionText: string;
  resourceUrl?: string;
  estimatedTime?: number; // in minutes
  completedAt?: string;
  courseId?: string;
  lessonId?: string;
  assessmentId?: string;
  skillArea?: string;
  reason: string; // Why this recommendation was made
}

export interface AdaptiveLearningPath {
  id: string;
  studentId: string;
  courseId: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  targetLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedCompletionWeeks: number;
  progress: number; // 0-100
  milestones: LearningMilestone[];
  recommendations: LearningRecommendation[];
  lastUpdated: string;
  strengths: SkillArea[];
  improvementAreas: SkillArea[];
}

export interface LearningMilestone {
  id: string;
  title: string;
  description: string;
  order: number;
  targetDate: string;
  completed: boolean;
  completedAt?: string;
  requirements: string[];
  skills: string[];
}

export interface SkillArea {
  name: string;
  level: number; // 0-100
  assessments: number; // count of assessments in this area
  averageScore: number;
  trend: 'improving' | 'stable' | 'declining';
  lastAssessed: string;
}

export interface PerformanceInsights {
  overallTrend: 'improving' | 'stable' | 'declining';
  learningVelocity: number; // lessons per week
  consistencyScore: number; // 0-100, based on regular activity
  engagementScore: number; // 0-100, based on time spent and interaction
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  strengthAreas: string[];
  strugglingAreas: string[];
  suggestedInterventions: string[];
}

export interface StudentProgressAnalytics {
  basicProgress: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    totalTimeSpent: number; // in hours
    averageCompletion: number; // 0-100
  };
  performanceInsights: PerformanceInsights;
  adaptivePaths: AdaptiveLearningPath[];
  recentRecommendations: LearningRecommendation[];
  skillMap: SkillArea[];
  achievementMilestones: {
    completed: number;
    inProgress: number;
    upcoming: number;
  };
}

export interface RecommendationRequest {
  studentId?: string;
  courseId?: string;
  assessmentResults?: {
    assessmentId: string;
    score: number;
    timeSpent: number;
    struggledAreas: string[];
  }[];
  learningPreferences?: {
    preferredDifficulty: 'easy' | 'medium' | 'challenging';
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
    studyTimePreference: 'short' | 'medium' | 'long';
  };
}

export interface LearningPathUpdateRequest {
  pathId: string;
  milestoneId?: string;
  markCompleted?: boolean;
  adjustDifficulty?: 'increase' | 'decrease';
  skipToMilestone?: string;
}

class StudentProgressIntegrationApi {
  private baseUrl = '/api/student-progress';

  // Get comprehensive student progress analytics
  async getStudentProgressAnalytics(studentId?: string): Promise<StudentProgressAnalytics | null> {
    const endpoint = studentId 
      ? `${this.baseUrl}/analytics/${studentId}`
      : `${this.baseUrl}/analytics/me`;
    
    const response = await api.get(endpoint);
    return response.data;
  }

  // Get personalized learning recommendations
  async getPersonalizedRecommendations(request: RecommendationRequest = {}): Promise<LearningRecommendation[]> {
    const response = await api.post(`${this.baseUrl}/recommendations`, request);
    return response.data;
  }

  // Get adaptive learning path for a course
  async getAdaptiveLearningPath(courseId: string, studentId?: string): Promise<AdaptiveLearningPath> {
    const endpoint = studentId 
      ? `${this.baseUrl}/adaptive-path/${courseId}/${studentId}`
      : `${this.baseUrl}/adaptive-path/${courseId}/me`;
    
    const response = await api.get(endpoint);
    return response.data;
  }

  // Update learning path based on performance
  async updateLearningPath(request: LearningPathUpdateRequest): Promise<AdaptiveLearningPath> {
    const response = await api.patch(`${this.baseUrl}/adaptive-path/update`, request);
    return response.data;
  }

  // Mark recommendation as completed
  async completeRecommendation(recommendationId: string): Promise<{ success: boolean }> {
    const response = await api.patch(`${this.baseUrl}/recommendations/${recommendationId}/complete`);
    return response.data;
  }

  // Get skill assessment and recommendations
  async getSkillAssessment(courseId: string, skillArea?: string): Promise<{
    currentSkills: SkillArea[];
    recommendedAssessments: LearningRecommendation[];
    nextLearningGoals: string[];
  }> {
    const params = skillArea ? { skillArea } : {};
    const response = await api.get(`${this.baseUrl}/skills/${courseId}`, { params });
    return response.data;
  }

  // Generate learning path based on goals
  async generateLearningPath(request: {
    courseId: string;
    targetLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    timeCommitment: number; // hours per week
    focusAreas?: string[];
    deadline?: string;
  }): Promise<AdaptiveLearningPath> {
    const response = await api.post(`${this.baseUrl}/generate-path`, request);
    return response.data;
  }

  // Track learning activity for recommendation engine
  async trackLearningActivity(activity: {
    type: 'lesson_completed' | 'assessment_taken' | 'content_viewed' | 'practice_session';
    resourceId: string;
    courseId: string;
    timeSpent: number;
    performance?: {
      score?: number;
      accuracy?: number;
      completionRate?: number;
    };
    engagement?: {
      attentionScore?: number;
      interactionCount?: number;
      pauseCount?: number;
    };
  }): Promise<{ 
    activityRecorded: boolean; 
    newRecommendations?: LearningRecommendation[];
    pathUpdated?: boolean;
  }> {
    const response = await api.post(`${this.baseUrl}/track-activity`, activity);
    return response.data;
  }

  // Get progress comparison with peers (anonymous)
  async getPeerComparison(courseId: string): Promise<{
    yourProgress: number;
    averageProgress: number;
    yourRank: string; // percentile, e.g., "top 25%"
    averageTimeSpent: number;
    yourTimeSpent: number;
    suggestions: string[];
  }> {
    const response = await api.get(`${this.baseUrl}/peer-comparison/${courseId}`);
    return response.data;
  }

  // Get intervention suggestions for instructors
  async getInterventionSuggestions(studentId: string, courseId?: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    interventions: Array<{
      type: 'immediate' | 'short_term' | 'long_term';
      priority: 'high' | 'medium' | 'low';
      action: string;
      description: string;
      expectedOutcome: string;
    }>;
    studentInsights: {
      strugglingAreas: string[];
      strengths: string[];
      learningPattern: string;
      engagementLevel: string;
    };
  }> {
    const params = courseId ? { courseId } : {};
    const response = await api.get(`${this.baseUrl}/interventions/${studentId}`, { params });
    return response.data;
  }
}

export const studentProgressApi = new StudentProgressIntegrationApi();