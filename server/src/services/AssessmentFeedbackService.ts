import OpenAI from 'openai';
import { DatabaseService } from './DatabaseService';
import { AITutoringService } from './AITutoringService';

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

export class AssessmentFeedbackService {
  private openai: OpenAI;
  private db: DatabaseService;
  private aiTutoringService: AITutoringService;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      console.warn('⚠️ OpenAI API key not configured for AI feedback. Falling back to basic feedback.');
      this.openai = null as any;
    } else {
      this.openai = new OpenAI({ apiKey });
    }
    
    this.db = DatabaseService.getInstance();
    this.aiTutoringService = new AITutoringService();
  }

  /**
   * Generate comprehensive AI-powered feedback for an assessment submission
   */
  async generateAssessmentFeedback(
    submissionId: string,
    userId: string,
    assessmentId: string
  ): Promise<AssessmentFeedbackAnalysis> {
    try {
      // Get submission details
      const submission = await this.getSubmissionDetails(submissionId);
      if (!submission) {
        throw new Error('Submission not found');
      }

      // Get assessment and questions
      const assessmentData = await this.getAssessmentDetails(assessmentId);
      const questions = await this.getAssessmentQuestions(assessmentId);
      
      // Get user's learning context
      const userContext = await this.getUserLearningContext(userId, assessmentData.courseId);

      // Generate AI analysis if OpenAI is available
      if (this.openai) {
        return await this.generateAIFeedback(submission, assessmentData, questions, userContext);
      } else {
        return this.generateBasicFeedback(submission, assessmentData, questions);
      }

    } catch (error) {
      console.error('Error generating assessment feedback:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered feedback analysis
   */
  private async generateAIFeedback(
    submission: any,
    assessment: any,
    questions: any[],
    userContext: any
  ): Promise<AssessmentFeedbackAnalysis> {
    const feedback = JSON.parse(submission.Feedback || '{}');
    const answers = JSON.parse(submission.Answers || '{}');
    
    // Analyze each question
    const questionAnalyses = await Promise.all(
      questions.map(async (question) => {
        const questionFeedback = feedback[question.Id];
        if (!questionFeedback) {
          return null;
        }

        return await this.analyzeQuestionWithAI(
          question,
          questionFeedback,
          answers[question.Id],
          userContext
        );
      })
    );

    const validAnalyses = questionAnalyses.filter(Boolean) as QuestionAnalysis[];

    // Generate overall assessment analysis
    const overallAnalysis = await this.generateOverallAnalysisWithAI(
      submission,
      assessment,
      validAnalyses,
      userContext
    );

    // Generate performance insights
    const performanceInsights = await this.generatePerformanceInsightsWithAI(
      submission,
      validAnalyses,
      userContext
    );

    // Generate motivational message
    const motivationalMessage = await this.generateMotivationalMessage(
      submission,
      assessment,
      userContext
    );

    return {
      overallAnalysis,
      questionAnalyses: validAnalyses,
      performanceInsights,
      motivationalMessage
    };
  }

  /**
   * Analyze individual question with AI
   */
  private async analyzeQuestionWithAI(
    question: any,
    questionFeedback: any,
    userAnswer: any,
    userContext: any
  ): Promise<QuestionAnalysis> {
    try {
      const prompt = `Analyze this student's answer and provide detailed feedback:

Question: "${question.QuestionText}"
Question Type: ${question.Type}
Correct Answer: ${JSON.stringify(questionFeedback.correctAnswer)}
Student Answer: ${JSON.stringify(userAnswer)}
Is Correct: ${questionFeedback.isCorrect}
Question Difficulty: ${question.Difficulty || 'Medium'}

Student Context:
- Course: ${userContext.course?.title}
- Level: ${userContext.course?.level}
- Previous Performance: ${userContext.averageScore}%

Provide a JSON response with:
1. personalizedExplanation: Clear explanation tailored to this student
2. conceptsToReview: Array of 2-3 key concepts to study
3. improvementSuggestions: Array of 2-3 actionable improvement tips
4. commonMistakes: Array of common mistakes for this question type (if incorrect)

Be encouraging and constructive. Focus on learning, not just correctness.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const aiAnalysis = JSON.parse(completion.choices[0]?.message?.content || '{}');

      return {
        questionId: question.Id,
        question: question.QuestionText,
        userAnswer,
        correctAnswer: questionFeedback.correctAnswer,
        isCorrect: questionFeedback.isCorrect,
        explanation: question.Explanation,
        aiInsights: {
          personalizedExplanation: aiAnalysis.personalizedExplanation || 'Great effort on this question!',
          conceptsToReview: aiAnalysis.conceptsToReview || [],
          improvementSuggestions: aiAnalysis.improvementSuggestions || [],
          difficulty: question.Difficulty || 'Medium',
          commonMistakes: aiAnalysis.commonMistakes || []
        }
      };
    } catch (error) {
      console.error('Error analyzing question with AI:', error);
      return this.generateBasicQuestionAnalysis(question, questionFeedback, userAnswer);
    }
  }

  /**
   * Generate overall assessment analysis with AI
   */
  private async generateOverallAnalysisWithAI(
    submission: any,
    assessment: any,
    questionAnalyses: QuestionAnalysis[],
    userContext: any
  ): Promise<any> {
    try {
      const correctCount = questionAnalyses.filter(q => q.isCorrect).length;
      const totalQuestions = questionAnalyses.length;
      const scorePercentage = submission.Score;

      const prompt = `Analyze this student's overall assessment performance:

Assessment: "${assessment.title}" (${assessment.type})
Score: ${scorePercentage}% (${correctCount}/${totalQuestions} correct)
Passing Score: ${submission.PassingScore}%
Time Spent: ${submission.TimeSpent} seconds
Attempt Number: ${submission.AttemptNumber}

Student Context:
- Course Level: ${userContext.course?.level}
- Average Performance: ${userContext.averageScore}%
- Learning Velocity: ${userContext.learningVelocity}

Question Performance Summary:
${questionAnalyses.map((q, i) => `${i+1}. ${q.isCorrect ? '✓' : '✗'} - ${q.aiInsights.difficulty}`).join('\n')}

Provide a JSON response with:
1. strengths: Array of 2-3 specific strengths shown
2. weaknesses: Array of 2-3 areas needing improvement
3. nextSteps: Array of 3-4 immediate next learning steps
4. personalizedMessage: Encouraging 2-3 sentence summary
5. studyPlan: Array of 3-5 specific study recommendations

Be specific, actionable, and encouraging.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Error generating overall analysis:', error);
      return this.generateBasicOverallAnalysis(submission, questionAnalyses);
    }
  }

  /**
   * Generate performance insights with AI
   */
  private async generatePerformanceInsightsWithAI(
    submission: any,
    questionAnalyses: QuestionAnalysis[],
    userContext: any
  ): Promise<any> {
    try {
      const prompt = `Analyze learning performance and provide insights:

Performance Data:
- Current Score: ${submission.Score}%
- Time Spent: ${submission.TimeSpent} seconds
- Questions: ${questionAnalyses.length}
- Correct: ${questionAnalyses.filter(q => q.isCorrect).length}
- Average Course Performance: ${userContext.averageScore}%

Question Difficulties:
${questionAnalyses.map(q => `- ${q.aiInsights.difficulty}: ${q.isCorrect ? 'Correct' : 'Incorrect'}`).join('\n')}

Provide JSON with:
1. learningVelocity: "Fast", "Moderate", or "Slow"
2. comprehensionLevel: "Excellent", "Good", "Fair", or "Needs Improvement"  
3. recommendedPace: Specific pacing recommendation
4. skillGaps: Array of 2-3 specific skill gaps to address

Base recommendations on performance patterns and learning context.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.6,
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Error generating performance insights:', error);
      return {
        learningVelocity: 'Moderate',
        comprehensionLevel: submission.Score >= 80 ? 'Good' : 'Fair',
        recommendedPace: 'Continue at your current pace',
        skillGaps: ['Practice more problems', 'Review fundamentals']
      };
    }
  }

  /**
   * Generate motivational message
   */
  private async generateMotivationalMessage(
    submission: any,
    assessment: any,
    userContext: any
  ): Promise<string> {
    try {
      const passed = submission.Score >= submission.PassingScore;
      
      const prompt = `Generate a personalized, motivational message for this student:

Assessment Result: ${passed ? 'PASSED' : 'NOT PASSED'}
Score: ${submission.Score}%
Attempt: ${submission.AttemptNumber}
Course Level: ${userContext.course?.level}

The message should be:
- Encouraging and positive
- 2-3 sentences long
- Specific to their performance
- Motivating for continued learning
- Include appropriate emoji

${passed ? 'Celebrate their success and encourage continued progress.' : 'Be supportive and encouraging about improvement opportunities.'}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.8
      });

      return completion.choices[0]?.message?.content || 
        (passed ? '🎉 Great job! Keep up the excellent work!' : '💪 You\'re making progress! Keep learning and you\'ll succeed!');
    } catch (error) {
      console.error('Error generating motivational message:', error);
      return submission.Score >= submission.PassingScore 
        ? '🎉 Congratulations on passing! Keep up the great work!' 
        : '💪 Keep practicing! You\'re on the right track to success!';
    }
  }

  /**
   * Fallback: Generate basic feedback without AI
   */
  private generateBasicFeedback(
    submission: any,
    assessment: any,
    questions: any[]
  ): AssessmentFeedbackAnalysis {
    const feedback = JSON.parse(submission.Feedback || '{}');
    const answers = JSON.parse(submission.Answers || '{}');
    
    const questionAnalyses = questions
      .filter(question => feedback[question.Id])
      .map(question => this.generateBasicQuestionAnalysis(
        question, 
        feedback[question.Id], 
        answers[question.Id]
      ));

    return {
      overallAnalysis: this.generateBasicOverallAnalysis(submission, questionAnalyses),
      questionAnalyses,
      performanceInsights: {
        learningVelocity: 'Moderate',
        comprehensionLevel: submission.Score >= 80 ? 'Good' : 'Fair',
        recommendedPace: 'Continue practicing regularly',
        skillGaps: ['Review incorrect answers', 'Practice similar questions']
      },
      motivationalMessage: submission.Score >= submission.PassingScore 
        ? '🎉 Great job passing the assessment!' 
        : '💪 Keep practicing! You\'re making good progress!'
    };
  }

  /**
   * Helper method to generate basic question analysis
   */
  private generateBasicQuestionAnalysis(question: any, questionFeedback: any, userAnswer: any): QuestionAnalysis {
    return {
      questionId: question.Id,
      question: question.QuestionText,
      userAnswer,
      correctAnswer: questionFeedback.correctAnswer,
      isCorrect: questionFeedback.isCorrect,
      explanation: question.Explanation,
      aiInsights: {
        personalizedExplanation: questionFeedback.isCorrect 
          ? 'Correct! Well done.' 
          : 'This one needs more practice. Review the explanation below.',
        conceptsToReview: questionFeedback.isCorrect ? [] : ['Review this topic area'],
        improvementSuggestions: questionFeedback.isCorrect ? [] : ['Practice similar questions'],
        difficulty: question.Difficulty || 'Medium',
        commonMistakes: []
      }
    };
  }

  /**
   * Helper method to generate basic overall analysis
   */
  private generateBasicOverallAnalysis(submission: any, questionAnalyses: QuestionAnalysis[]): any {
    const correctCount = questionAnalyses.filter(q => q.isCorrect).length;
    const totalQuestions = questionAnalyses.length;
    
    return {
      strengths: correctCount > 0 ? [`Got ${correctCount} questions correct`] : [],
      weaknesses: correctCount < totalQuestions ? ['Some areas need review'] : [],
      nextSteps: ['Review incorrect answers', 'Practice more questions', 'Study related concepts'],
      personalizedMessage: `You scored ${submission.Score}% on this assessment. Keep practicing!`,
      studyPlan: ['Review the material', 'Take practice quizzes', 'Ask for help if needed']
    };
  }

  /**
   * Get submission details from database
   */
  private async getSubmissionDetails(submissionId: string): Promise<any> {
    const submissions = await this.db.query(`
      SELECT * FROM dbo.AssessmentSubmissions 
      WHERE Id = @submissionId
    `, { submissionId });
    
    return submissions.length > 0 ? submissions[0] : null;
  }

  /**
   * Get assessment details from database
   */
  private async getAssessmentDetails(assessmentId: string): Promise<any> {
    const assessments = await this.db.query(`
      SELECT a.*, c.Title as CourseTitle, c.Id as CourseId 
      FROM dbo.Assessments a
      JOIN dbo.Lessons l ON a.LessonId = l.Id
      JOIN dbo.Courses c ON l.CourseId = c.Id
      WHERE a.Id = @assessmentId
    `, { assessmentId });
    
    return assessments.length > 0 ? {
      ...assessments[0],
      title: assessments[0].Title,
      type: assessments[0].Type,
      courseId: assessments[0].CourseId
    } : null;
  }

  /**
   * Get assessment questions from database
   */
  private async getAssessmentQuestions(assessmentId: string): Promise<any[]> {
    return await this.db.query(`
      SELECT * FROM dbo.AssessmentQuestions 
      WHERE AssessmentId = @assessmentId
      ORDER BY OrderIndex
    `, { assessmentId });
  }

  /**
   * Get user learning context
   */
  private async getUserLearningContext(userId: string, courseId?: string): Promise<any> {
    try {
      const courseQuery = courseId ? `
        SELECT c.*, cp.OverallProgress 
        FROM dbo.Courses c
        LEFT JOIN dbo.CourseProgress cp ON c.Id = cp.CourseId AND cp.UserId = @userId
        WHERE c.Id = @courseId
      ` : null;

      const [courseData, userProgress] = await Promise.all([
        courseQuery ? this.db.query(courseQuery, { userId, courseId }) : [],
        this.db.query(`
          SELECT AVG(CAST(Score as FLOAT)) as averageScore,
                 COUNT(*) as totalAssessments,
                 AVG(CAST(TimeSpent as FLOAT)) as averageTime
          FROM dbo.AssessmentSubmissions 
          WHERE UserId = @userId AND Status = 'completed'
        `, { userId })
      ]);

      return {
        course: courseData.length > 0 ? {
          title: courseData[0].Title,
          level: courseData[0].Level,
          progress: courseData[0].OverallProgress || 0
        } : null,
        averageScore: userProgress[0]?.averageScore || 0,
        totalAssessments: userProgress[0]?.totalAssessments || 0,
        averageTime: userProgress[0]?.averageTime || 0,
        learningVelocity: this.calculateLearningVelocity(userProgress[0])
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {
        course: null,
        averageScore: 0,
        totalAssessments: 0,
        averageTime: 0,
        learningVelocity: 'Moderate'
      };
    }
  }

  /**
   * Calculate learning velocity based on user data
   */
  private calculateLearningVelocity(userData: any): string {
    if (!userData || userData.totalAssessments === 0) {
      return 'Moderate';
    }

    const avgScore = userData.averageScore || 0;
    const avgTime = userData.averageTime || 300; // 5 minutes default

    if (avgScore >= 85 && avgTime <= 180) return 'Fast';
    if (avgScore >= 70 && avgTime <= 300) return 'Moderate';
    return 'Slow';
  }
}