import { DatabaseService } from './DatabaseService';

export interface AdaptiveAssessmentConfig {
  initialDifficulty: number; // 1-10
  adaptiveThreshold: number; // 0-1, percentage correct needed to increase difficulty
  maxDifficultyChange: number; // Maximum change in difficulty per question
  skillWeighting: boolean; // Whether to use skill-based weighting
}

export interface UserSkillProfile {
  userId: string;
  courseId: string;
  skillLevels: Record<string, number>; // skill -> level (1-10)
  learningVelocity: number; // questions per minute
  confidenceLevel: number; // 0-1
  preferredDifficulty: number; // 1-10
}

export interface AdaptiveQuestionSelection {
  questionId: string;
  difficulty: number;
  adaptiveWeight: number;
  reason: string;
  tags: string[];
}

export interface AdaptiveScoring {
  rawScore: number;
  adaptiveScore: number;
  difficultyBonus: number;
  consistencyBonus: number;
  timeBonus: number;
  finalScore: number;
  skillUpdates: Record<string, number>;
}

export class AdaptiveAssessmentService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // Get user's skill profile
  async getUserSkillProfile(userId: string, courseId: string): Promise<UserSkillProfile> {
    try {
      // Get user's performance history
      const performanceData = await this.db.query(`
        SELECT 
          AVG(CAST(s.Score as FLOAT)) as avgScore,
          AVG(CAST(s.TimeSpent as FLOAT)) as avgTimeSpent,
          COUNT(*) as totalAssessments,
          JSON_VALUE(s.Feedback, '$.skillLevels') as skillLevelsJson
        FROM dbo.AssessmentSubmissions s
        JOIN dbo.Assessments a ON s.AssessmentId = a.Id
        JOIN dbo.Lessons l ON a.LessonId = l.Id
        WHERE s.UserId = @userId AND l.CourseId = @courseId AND s.Status = 'completed'
      `, { userId, courseId });

      const performance = performanceData[0] || {};
      
      // Calculate learning velocity (questions per minute)
      const questionsAnswered = await this.db.query(`
        SELECT COUNT(*) as totalQuestions
        FROM dbo.AssessmentSubmissions s
        JOIN dbo.Assessments a ON s.AssessmentId = a.Id
        JOIN dbo.Questions q ON a.Id = q.AssessmentId
        JOIN dbo.Lessons l ON a.LessonId = l.Id
        WHERE s.UserId = @userId AND l.CourseId = @courseId AND s.Status = 'completed'
      `, { userId, courseId });

      const totalQuestions = questionsAnswered[0]?.totalQuestions || 0;
      const totalTimeMinutes = performance.avgTimeSpent * performance.totalAssessments || 1;
      const learningVelocity = totalQuestions / totalTimeMinutes;

      // Parse or initialize skill levels
      let skillLevels: Record<string, number> = {};
      if (performance.skillLevelsJson) {
        try {
          skillLevels = JSON.parse(performance.skillLevelsJson);
        } catch {
          skillLevels = {};
        }
      }

      return {
        userId,
        courseId,
        skillLevels,
        learningVelocity,
        confidenceLevel: Math.min(performance.avgScore / 100 || 0.5, 1),
        preferredDifficulty: Math.max(1, Math.min(10, Math.round((performance.avgScore || 50) / 10)))
      };
    } catch (error) {
      console.error('Error getting user skill profile:', error);
      // Return default profile
      return {
        userId,
        courseId,
        skillLevels: {},
        learningVelocity: 1,
        confidenceLevel: 0.5,
        preferredDifficulty: 5
      };
    }
  }

  // Select next question adaptively
  async selectAdaptiveQuestion(
    assessmentId: string,
    userId: string,
    answeredQuestionIds: string[],
    recentPerformance: { correct: number; total: number; avgDifficulty: number }
  ): Promise<AdaptiveQuestionSelection | null> {
    try {
      // Get available questions
      const availableQuestions = await this.db.query(`
        SELECT 
          Id, Difficulty, AdaptiveWeight, Tags,
          Question, Type
        FROM dbo.Questions 
        WHERE AssessmentId = @assessmentId 
        AND Id NOT IN (${answeredQuestionIds.map(() => '?').join(',') || 'NULL'})
        ORDER BY OrderIndex
      `, { assessmentId, ...answeredQuestionIds });

      if (availableQuestions.length === 0) {
        return null; // No more questions available
      }

      // Calculate target difficulty based on performance
      const currentAccuracy = recentPerformance.total > 0 ? recentPerformance.correct / recentPerformance.total : 0.5;
      const targetDifficulty = this.calculateTargetDifficulty(
        recentPerformance.avgDifficulty || 5,
        currentAccuracy,
        { adaptiveThreshold: 0.7, maxDifficultyChange: 2 }
      );

      // Score each question
      const scoredQuestions = availableQuestions.map(q => {
        const difficultyScore = 10 - Math.abs(q.Difficulty - targetDifficulty);
        const weightScore = (q.AdaptiveWeight || 1) * 5;
        const diversityScore = this.calculateDiversityScore(q, answeredQuestionIds);
        
        return {
          ...q,
          totalScore: difficultyScore + weightScore + diversityScore,
          difficultyScore,
          weightScore,
          diversityScore
        };
      });

      // Select best question
      const selectedQuestion = scoredQuestions.reduce((best, current) => 
        current.totalScore > best.totalScore ? current : best
      );

      return {
        questionId: selectedQuestion.Id,
        difficulty: selectedQuestion.Difficulty,
        adaptiveWeight: selectedQuestion.AdaptiveWeight || 1,
        reason: `Target difficulty: ${targetDifficulty}, Selected: ${selectedQuestion.Difficulty} (Score: ${selectedQuestion.totalScore.toFixed(1)})`,
        tags: selectedQuestion.Tags ? JSON.parse(selectedQuestion.Tags) : []
      };
    } catch (error) {
      console.error('Error selecting adaptive question:', error);
      return null;
    }
  }

  // Calculate target difficulty for next question
  private calculateTargetDifficulty(
    currentDifficulty: number,
    accuracy: number,
    config: Pick<AdaptiveAssessmentConfig, 'adaptiveThreshold' | 'maxDifficultyChange'>
  ): number {
    let difficultyChange = 0;

    if (accuracy > config.adaptiveThreshold) {
      // Increase difficulty if performing well
      difficultyChange = Math.min(config.maxDifficultyChange, (accuracy - config.adaptiveThreshold) * 4);
    } else if (accuracy < (config.adaptiveThreshold - 0.2)) {
      // Decrease difficulty if struggling
      difficultyChange = -Math.min(config.maxDifficultyChange, (config.adaptiveThreshold - accuracy) * 3);
    }

    return Math.max(1, Math.min(10, currentDifficulty + difficultyChange));
  }

  // Calculate diversity score to avoid repetitive question types
  private calculateDiversityScore(question: any, answeredQuestionIds: string[]): number {
    // This is a simplified diversity calculation
    // In a real implementation, you'd analyze question types, topics, etc.
    return Math.random() * 2; // Placeholder for now
  }

  // Calculate adaptive scoring
  async calculateAdaptiveScore(
    assessmentId: string,
    userId: string,
    answers: Record<string, any>,
    timeSpent: number
  ): Promise<AdaptiveScoring> {
    try {
      // Get questions with their difficulties and correct answers
      const questions = await this.db.query(`
        SELECT Id, Type, CorrectAnswer, Difficulty, AdaptiveWeight, Tags
        FROM dbo.Questions 
        WHERE AssessmentId = @assessmentId 
        ORDER BY OrderIndex
      `, { assessmentId });

      // Get user's skill profile
      const assessment = await this.db.query(`
        SELECT l.CourseId FROM dbo.Assessments a
        JOIN dbo.Lessons l ON a.LessonId = l.Id
        WHERE a.Id = @assessmentId
      `, { assessmentId });
      
      const courseId = assessment[0]?.CourseId;
      const userProfile = courseId ? await this.getUserSkillProfile(userId, courseId) : null;

      let totalScore = 0;
      let totalWeight = 0;
      let difficultySum = 0;
      let correctAnswers = 0;
      const skillUpdates: Record<string, number> = {};

      // Calculate base scores
      for (const question of questions) {
        const userAnswer = answers[question.Id];
        const correctAnswer = JSON.parse(question.CorrectAnswer);
        const weight = question.AdaptiveWeight || 1;
        const difficulty = question.Difficulty || 5;
        
        let isCorrect = false;
        
        // Basic scoring logic (enhanced from the main routes)
        if (question.Type === 'multiple_choice' || question.Type === 'true_false') {
          isCorrect = userAnswer === correctAnswer;
        } else if (question.Type === 'short_answer') {
          isCorrect = userAnswer?.toLowerCase().trim() === correctAnswer?.toLowerCase().trim();
        }
        // Add more sophisticated scoring for other question types

        if (isCorrect) {
          const questionScore = 100 * weight;
          // Difficulty bonus: harder questions worth more
          const difficultyMultiplier = 1 + (difficulty - 5) * 0.1;
          totalScore += questionScore * difficultyMultiplier;
          correctAnswers++;
        }

        totalWeight += weight;
        difficultySum += difficulty;

        // Update skill levels based on question tags
        if (question.Tags) {
          const tags = JSON.parse(question.Tags);
          for (const tag of tags) {
            if (isCorrect) {
              skillUpdates[tag] = (skillUpdates[tag] || userProfile?.skillLevels[tag] || 5) + 0.2;
            } else {
              skillUpdates[tag] = Math.max(1, (skillUpdates[tag] || userProfile?.skillLevels[tag] || 5) - 0.1);
            }
          }
        }
      }

      const rawScore = totalWeight > 0 ? (totalScore / totalWeight) : 0;
      const avgDifficulty = questions.length > 0 ? difficultySum / questions.length : 5;
      const accuracy = questions.length > 0 ? correctAnswers / questions.length : 0;

      // Calculate bonuses
      const difficultyBonus = Math.max(0, (avgDifficulty - 5) * 5); // Bonus for harder questions
      const consistencyBonus = this.calculateConsistencyBonus(accuracy, questions.length);
      const timeBonus = this.calculateTimeBonus(timeSpent, questions.length, userProfile?.learningVelocity || 1);

      // Final adaptive score
      const adaptiveScore = rawScore + difficultyBonus;
      const finalScore = Math.min(100, adaptiveScore + consistencyBonus + timeBonus);

      return {
        rawScore,
        adaptiveScore,
        difficultyBonus,
        consistencyBonus,
        timeBonus,
        finalScore,
        skillUpdates
      };
    } catch (error) {
      console.error('Error calculating adaptive score:', error);
      // Return basic scoring if adaptive fails
      return {
        rawScore: 0,
        adaptiveScore: 0,
        difficultyBonus: 0,
        consistencyBonus: 0,
        timeBonus: 0,
        finalScore: 0,
        skillUpdates: {}
      };
    }
  }

  // Calculate consistency bonus
  private calculateConsistencyBonus(accuracy: number, questionCount: number): number {
    if (questionCount < 3) return 0;
    
    // Bonus for consistent performance (not just lucky guesses)
    if (accuracy >= 0.8) return 5;
    if (accuracy >= 0.6) return 2;
    return 0;
  }

  // Calculate time bonus
  private calculateTimeBonus(timeSpent: number, questionCount: number, learningVelocity: number): number {
    if (questionCount === 0) return 0;
    
    const avgTimePerQuestion = timeSpent / questionCount;
    const expectedTime = 1 / learningVelocity; // Expected time based on user's velocity
    
    // Bonus for completing efficiently (but not too fast to suggest guessing)
    if (avgTimePerQuestion < expectedTime * 1.2 && avgTimePerQuestion > expectedTime * 0.5) {
      return 2;
    }
    return 0;
  }

  // Update user's skill profile after assessment
  async updateUserSkillProfile(
    userId: string,
    courseId: string,
    skillUpdates: Record<string, number>
  ): Promise<void> {
    try {
      // Get current profile
      const currentProfile = await this.getUserSkillProfile(userId, courseId);
      
      // Merge skill updates
      const updatedSkills = { ...currentProfile.skillLevels };
      for (const [skill, newLevel] of Object.entries(skillUpdates)) {
        updatedSkills[skill] = Math.max(1, Math.min(10, newLevel));
      }

      // Store updated skills in user progress or a separate skills table
      // For now, we'll store it in the assessment submission feedback
      // In a full implementation, you'd want a dedicated user skills table
      
      console.log(`Updated skills for user ${userId}:`, updatedSkills);
    } catch (error) {
      console.error('Error updating user skill profile:', error);
    }
  }

  // Generate learning recommendations based on performance
  async generateLearningRecommendations(
    userId: string,
    assessmentId: string,
    performance: AdaptiveScoring
  ): Promise<string[]> {
    try {
      const recommendations: string[] = [];

      // Analyze performance patterns
      if (performance.finalScore < 60) {
        recommendations.push("Consider reviewing the course material before retrying this assessment");
        recommendations.push("Focus on fundamental concepts - practice with easier questions first");
      } else if (performance.finalScore < 80) {
        recommendations.push("Good progress! Review areas where you missed questions");
        recommendations.push("Try practice exercises to reinforce your understanding");
      } else {
        recommendations.push("Excellent work! You're ready for more advanced topics");
        recommendations.push("Consider exploring supplementary materials to deepen your knowledge");
      }

      // Skill-specific recommendations
      const weakSkills = Object.entries(performance.skillUpdates)
        .filter(([_, level]) => level < 6)
        .map(([skill, _]) => skill);

      if (weakSkills.length > 0) {
        recommendations.push(`Focus on improving these skills: ${weakSkills.join(', ')}`);
      }

      // Time-based recommendations
      if (performance.timeBonus === 0) {
        recommendations.push("Take your time to read questions carefully and think through your answers");
      }

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return ["Continue practicing to improve your understanding"];
    }
  }
}

export const adaptiveAssessmentService = new AdaptiveAssessmentService();