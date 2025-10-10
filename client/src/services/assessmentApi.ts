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

export interface Assessment {
  id: string;
  lessonId: string;
  title: string;
  type: 'quiz' | 'test' | 'assignment' | 'project' | 'practical';
  passingScore: number;
  maxAttempts: number;
  timeLimit?: number;
  isAdaptive: boolean;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  questions?: Question[];
  userSubmissions?: AssessmentSubmission[];
}

export interface Question {
  id: string;
  assessmentId: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'code' | 'drag_drop' | 'fill_blank';
  question: string;
  options?: string[];
  correctAnswer?: any;
  explanation?: string;
  difficulty: number;
  tags: string[];
  adaptiveWeight?: number;
  orderIndex: number;
}

export interface AssessmentSubmission {
  id: string;
  userId: string;
  assessmentId: string;
  answers: Record<string, any>;
  score: number;
  maxScore: number;
  timeSpent: number;
  attemptNumber: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt?: string;
  feedback?: Record<string, any>;
}

export interface CreateAssessmentRequest {
  lessonId: string;
  title: string;
  type: Assessment['type'];
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  isAdaptive?: boolean;
  questions?: Omit<Question, 'id' | 'assessmentId'>[];
}

export interface UpdateAssessmentRequest {
  title?: string;
  type?: Assessment['type'];
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  isAdaptive?: boolean;
}

export interface StartAssessmentResponse {
  submissionId: string;
  attemptNumber: number;
  message?: string;
}

export interface SubmitAssessmentRequest {
  answers: Record<string, any>;
}

export interface SubmitAssessmentResponse {
  score: number;
  maxScore: number;
  passed: boolean;
  timeSpent: number;
  feedback: Record<string, any>;
}

class AssessmentApiService {
  private baseUrl = '/api/assessments';

  // Get all assessments for a lesson
  async getAssessmentsByLesson(lessonId: string): Promise<Assessment[]> {
    const response = await api.get(`${this.baseUrl}/lesson/${lessonId}`);
    return response.data;
  }

  // Get assessment details with questions
  async getAssessment(assessmentId: string): Promise<Assessment> {
    const response = await api.get(`${this.baseUrl}/${assessmentId}`);
    return response.data;
  }

  // Create new assessment (instructors only)
  async createAssessment(assessmentData: CreateAssessmentRequest): Promise<Assessment> {
    const response = await api.post(this.baseUrl, assessmentData);
    return response.data;
  }

  // Update assessment (instructors only)
  async updateAssessment(assessmentId: string, updates: UpdateAssessmentRequest): Promise<Assessment> {
    const response = await api.put(`${this.baseUrl}/${assessmentId}`, updates);
    return response.data;
  }

  // Delete assessment (instructors only)
  async deleteAssessment(assessmentId: string): Promise<{ message: string }> {
    const response = await api.delete(`${this.baseUrl}/${assessmentId}`);
    return response.data;
  }

  // Start assessment attempt (students only)
  async startAssessment(assessmentId: string): Promise<StartAssessmentResponse> {
    const response = await api.post(`${this.baseUrl}/${assessmentId}/start`);
    return response.data;
  }

  // Submit assessment answers (students only)
  async submitAssessment(submissionId: string, answers: SubmitAssessmentRequest): Promise<SubmitAssessmentResponse> {
    const response = await api.post(`${this.baseUrl}/submissions/${submissionId}/submit`, answers);
    return response.data;
  }

  // Get submission results
  async getSubmissionResults(submissionId: string): Promise<AssessmentSubmission> {
    const response = await api.get(`${this.baseUrl}/submissions/${submissionId}/results`);
    return response.data;
  }

  // Helper methods for frontend components

  // Get assessment with user progress
  async getAssessmentWithProgress(assessmentId: string): Promise<Assessment & { canTakeAssessment: boolean; attemptsLeft: number }> {
    const assessment = await this.getAssessment(assessmentId);
    const userSubmissions = assessment.userSubmissions || [];
    
    const completedAttempts = userSubmissions.filter(sub => sub.status === 'completed').length;
    const hasInProgress = userSubmissions.some(sub => sub.status === 'in_progress');
    
    return {
      ...assessment,
      canTakeAssessment: !hasInProgress && completedAttempts < assessment.maxAttempts,
      attemptsLeft: Math.max(0, assessment.maxAttempts - completedAttempts)
    };
  }

  // Get best score for an assessment
  getBestScore(userSubmissions: AssessmentSubmission[]): number {
    if (!userSubmissions || userSubmissions.length === 0) return 0;
    return Math.max(...userSubmissions.map(sub => sub.score));
  }

  // Get latest attempt
  getLatestAttempt(userSubmissions: AssessmentSubmission[]): AssessmentSubmission | null {
    if (!userSubmissions || userSubmissions.length === 0) return null;
    return userSubmissions.reduce((latest, current) => 
      new Date(current.startedAt) > new Date(latest.startedAt) ? current : latest
    );
  }

  // Check if user passed assessment
  hasPassedAssessment(assessment: Assessment, userSubmissions: AssessmentSubmission[]): boolean {
    const bestScore = this.getBestScore(userSubmissions);
    return bestScore >= assessment.passingScore;
  }

  // Format time for display
  formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }

  // Calculate assessment statistics for instructors
  async getAssessmentStatistics(_assessmentId: string): Promise<{
    totalAttempts: number;
    averageScore: number;
    passRate: number;
    averageTimeSpent: number;
    difficultyDistribution: Record<number, number>;
  }> {
    // This would need additional backend endpoint for instructor analytics
    // For now, return empty stats structure
    return {
      totalAttempts: 0,
      averageScore: 0,
      passRate: 0,
      averageTimeSpent: 0,
      difficultyDistribution: {}
    };
  }

  // Validate answers before submission
  validateAnswers(questions: Question[], answers: Record<string, any>): {
    isValid: boolean;
    missingAnswers: string[];
    invalidAnswers: string[];
  } {
    const missingAnswers: string[] = [];
    const invalidAnswers: string[] = [];

    questions.forEach(question => {
      const answer = answers[question.id];
      
      if (answer === undefined || answer === null || answer === '') {
        missingAnswers.push(question.id);
        return;
      }

      // Basic validation based on question type
      switch (question.type) {
        case 'multiple_choice':
          if (!question.options?.includes(answer)) {
            invalidAnswers.push(question.id);
          }
          break;
        case 'true_false':
          if (typeof answer !== 'boolean') {
            invalidAnswers.push(question.id);
          }
          break;
        case 'short_answer':
        case 'essay':
          if (typeof answer !== 'string' || answer.trim().length === 0) {
            invalidAnswers.push(question.id);
          }
          break;
        case 'code':
          if (typeof answer !== 'string') {
            invalidAnswers.push(question.id);
          }
          break;
        // Add more validation for other question types
      }
    });

    return {
      isValid: missingAnswers.length === 0 && invalidAnswers.length === 0,
      missingAnswers,
      invalidAnswers
    };
  }

  // Generate question templates for quiz creation
  getQuestionTemplate(type: Question['type']): Partial<Question> {
    const baseTemplate = {
      question: '',
      difficulty: 5,
      tags: [],
      explanation: '',
      orderIndex: 0
    };

    switch (type) {
      case 'multiple_choice':
        return {
          ...baseTemplate,
          type,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'Option A'
        };
      case 'true_false':
        return {
          ...baseTemplate,
          type,
          options: ['True', 'False'],
          correctAnswer: true
        };
      case 'short_answer':
        return {
          ...baseTemplate,
          type,
          correctAnswer: ''
        };
      case 'essay':
        return {
          ...baseTemplate,
          type,
          correctAnswer: 'Sample answer or grading rubric'
        };
      case 'code':
        return {
          ...baseTemplate,
          type,
          correctAnswer: '// Expected code solution'
        };
      case 'drag_drop':
        return {
          ...baseTemplate,
          type,
          options: ['Item 1', 'Item 2', 'Item 3'],
          correctAnswer: ['Item 1', 'Item 2', 'Item 3'] // Order matters
        };
      case 'fill_blank':
        return {
          ...baseTemplate,
          type,
          correctAnswer: ['blank1', 'blank2'] // Array of correct answers for blanks
        };
      default:
        return baseTemplate;
    }
  }
}

export const assessmentApi = new AssessmentApiService();