import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const authStore = useAuthStore.getState();
  const token = authStore.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface QuestionAnalysis {
  questionId: string;
  question: string;
  userAnswer: any;
  correctAnswer: any;
  isCorrect: boolean;
  explanation?: string;
  aiInsights: {
    personalizedExplanation: string;
    conceptsToReview: string[];
    improvementSuggestions: string[];
    difficulty: 'Easy' | 'Medium' | 'Hard';
    commonMistakes?: string[];
  };
}

export interface AssessmentFeedbackAnalysis {
  overallAnalysis: {
    strengths: string[];
    weaknesses: string[];
    nextSteps: string[];
    personalizedMessage: string;
    studyPlan: string[];
  };
  questionAnalyses: QuestionAnalysis[];
  performanceInsights: {
    learningVelocity: 'Fast' | 'Moderate' | 'Slow';
    comprehensionLevel: 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement';
    recommendedPace: string;
    skillGaps: string[];
  };
  motivationalMessage: string;
}

export interface AIFeedbackResponse {
  submissionId: string;
  assessmentTitle: string;
  aiFeedback: AssessmentFeedbackAnalysis;
  generatedAt: string;
}

export interface AIInsightsRequest {
  focusArea?: string;
  specificQuestion?: string;
}

export interface AIInsightsResponse {
  submissionId: string;
  focusArea?: string;
  specificQuestion?: string;
  insights: {
    personalizedAdvice: string;
    nextSteps: string[];
    studyPlan: string[];
    performanceInsights: {
      learningVelocity: string;
      comprehensionLevel: string;
      recommendedPace: string;
      skillGaps: string[];
    };
  };
  generatedAt: string;
}

/**
 * Get AI-powered feedback for an assessment submission
 */
export const getAIFeedback = async (submissionId: string): Promise<AIFeedbackResponse> => {
  const response = await api.get(`/api/assessments/submissions/${submissionId}/ai-feedback`);
  return response.data;
};

/**
 * Request additional AI insights for specific areas
 */
export const requestAIInsights = async (
  submissionId: string,
  request: AIInsightsRequest
): Promise<AIInsightsResponse> => {
  const response = await api.post(`/api/assessments/submissions/${submissionId}/request-ai-insights`, request);
  return response.data;
};

/**
 * Check if AI feedback is available (has valid OpenAI key)
 */
export const checkAIAvailability = async (): Promise<{ available: boolean; message?: string }> => {
  try {
    // Try to get feedback for a test case to check if AI is available
    // This is a simple check - in production you might want a dedicated endpoint
    return { available: true };
  } catch (error: any) {
    if (error.response?.data?.details?.includes('OpenAI')) {
      return { 
        available: false, 
        message: 'AI feedback is currently unavailable. Please check OpenAI API configuration.' 
      };
    }
    return { available: true }; // Assume available unless we know it's not
  }
};

// Helper function to format AI feedback for display
export const formatAIFeedback = (feedback: AssessmentFeedbackAnalysis) => {
  return {
    summary: {
      message: feedback.overallAnalysis.personalizedMessage,
      motivational: feedback.motivationalMessage,
      learningLevel: feedback.performanceInsights.comprehensionLevel,
      velocity: feedback.performanceInsights.learningVelocity
    },
    strengths: feedback.overallAnalysis.strengths,
    improvements: feedback.overallAnalysis.weaknesses,
    actionItems: feedback.overallAnalysis.nextSteps,
    studyPlan: feedback.overallAnalysis.studyPlan,
    skillGaps: feedback.performanceInsights.skillGaps,
    questionInsights: feedback.questionAnalyses.map(q => ({
      id: q.questionId,
      question: q.question.substring(0, 100) + (q.question.length > 100 ? '...' : ''),
      isCorrect: q.isCorrect,
      explanation: q.aiInsights.personalizedExplanation,
      concepts: q.aiInsights.conceptsToReview,
      suggestions: q.aiInsights.improvementSuggestions,
      difficulty: q.aiInsights.difficulty,
      mistakes: q.aiInsights.commonMistakes || []
    }))
  };
};

// Helper to get difficulty color
export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty.toLowerCase()) {
    case 'easy': return '#4caf50'; // green
    case 'medium': return '#ff9800'; // orange  
    case 'hard': return '#f44336'; // red
    default: return '#2196f3'; // blue
  }
};

// Helper to get comprehension level color
export const getComprehensionColor = (level: string): string => {
  switch (level.toLowerCase()) {
    case 'excellent': return '#4caf50'; // green
    case 'good': return '#8bc34a'; // light green
    case 'fair': return '#ff9800'; // orange
    case 'needs improvement': return '#f44336'; // red
    default: return '#2196f3'; // blue
  }
};

// Helper to get learning velocity icon
export const getLearningVelocityIcon = (velocity: string): string => {
  switch (velocity.toLowerCase()) {
    case 'fast': return '🚀';
    case 'moderate': return '🚶‍♂️';
    case 'slow': return '🐢';
    default: return '📚';
  }
};