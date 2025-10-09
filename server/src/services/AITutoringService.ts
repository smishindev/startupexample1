import OpenAI from 'openai';
import { DatabaseService } from './DatabaseService';

export interface TutoringContext {
  userId: string;
  courseId?: string;
  lessonId?: string;
  userProgress?: any;
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  learningGoals?: string[];
  currentTopic?: string;
}

export interface AIResponse {
  content: string;
  suggestions?: string[];
  resources?: string[];
  followUpQuestions?: string[];
}

export class AITutoringService {
  private openai: OpenAI;
  private db: DatabaseService;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      throw new Error('❌ OpenAI API key is required! Please add your API key to the .env file. Get one free at: https://platform.openai.com/api-keys');
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    
    this.db = DatabaseService.getInstance();
    console.log('✅ AI Tutoring Service initialized with OpenAI API');
  }

  /**
   * Generate AI tutoring response based on user message and context
   */
  async generateResponse(
    message: string,
    context: TutoringContext
  ): Promise<AIResponse> {
    try {
      // Build context-aware system prompt
      const systemPrompt = await this.buildSystemPrompt(context);
      
      // Prepare conversation history
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...(context.previousMessages?.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })) || []),
        { role: 'user', content: message }
      ];

      // Generate AI response
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cost-effective model for tutoring
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      const aiContent = completion.choices[0]?.message?.content || '';

      // Generate follow-up suggestions
      const suggestions = await this.generateFollowUpSuggestions(message, aiContent, context);

      return {
        content: aiContent,
        suggestions,
        followUpQuestions: suggestions.slice(0, 3), // Use first 3 as questions
      };

    } catch (error) {
      console.error('AI Tutoring Service Error:', error);
      
      // Return a helpful error message instead of fallback
      return {
        content: "I'm sorry, but I'm currently experiencing technical difficulties. This might be due to:\n\n• Invalid or missing OpenAI API key\n• Network connectivity issues\n• API rate limits\n\nPlease check your API key configuration and try again. If the problem persists, contact support.",
        suggestions: ["Check your OpenAI API key", "Verify network connection", "Try again in a moment"],
        followUpQuestions: []
      };
    }
  }

  /**
   * Build context-aware system prompt
   */
  private async buildSystemPrompt(context: TutoringContext): Promise<string> {
    let prompt = `You are an expert AI tutor for the Mishin Learn platform. Your role is to:

1. Provide clear, helpful explanations tailored to the student's level
2. Break down complex concepts into digestible steps
3. Encourage active learning through questions and examples
4. Be patient, supportive, and motivating
5. Adapt your teaching style to the student's needs

Guidelines:
- Use clear, concise language
- Provide practical examples when explaining concepts
- Ask follow-up questions to check understanding
- Suggest practice exercises when appropriate
- Be encouraging and positive in your responses
- Use markdown formatting for code examples and structure`;

    // Add course/lesson specific context
    if (context.courseId) {
      const courseContext = await this.getCourseContext(context.courseId);
      if (courseContext) {
        prompt += `\n\nCurrent Course Context:\n${courseContext}`;
      }
    }

    if (context.lessonId) {
      const lessonContext = await this.getLessonContext(context.lessonId);
      if (lessonContext) {
        prompt += `\n\nCurrent Lesson Context:\n${lessonContext}`;
      }
    }

    // Add user progress context
    if (context.userProgress) {
      prompt += `\n\nStudent Progress:\n${JSON.stringify(context.userProgress, null, 2)}`;
    }

    return prompt;
  }

  /**
   * Get course context for AI prompt
   */
  private async getCourseContext(courseId: string): Promise<string | null> {
    try {
      const course = await this.db.query(`
        SELECT Title, Description, Level, Category
        FROM dbo.Courses
        WHERE Id = @courseId
      `, { courseId });

      if (course.length > 0) {
        const { Title, Description, Level, Category } = course[0];
        return `Course: ${Title}\nLevel: ${Level}\nCategory: ${Category}\nDescription: ${Description}`;
      }
    } catch (error) {
      console.error('Error fetching course context:', error);
    }
    return null;
  }

  /**
   * Get lesson context for AI prompt
   */
  private async getLessonContext(lessonId: string): Promise<string | null> {
    try {
      const lesson = await this.db.query(`
        SELECT l.Title, l.Description, l.ContentType, c.Title as CourseTitle
        FROM dbo.Lessons l
        JOIN dbo.Courses c ON l.CourseId = c.Id
        WHERE l.Id = @lessonId
      `, { lessonId });

      if (lesson.length > 0) {
        const { Title, Description, ContentType, CourseTitle } = lesson[0];
        return `Current Lesson: ${Title}\nCourse: ${CourseTitle}\nType: ${ContentType}\nDescription: ${Description}`;
      }
    } catch (error) {
      console.error('Error fetching lesson context:', error);
    }
    return null;
  }

  /**
   * Generate follow-up suggestions
   */
  private async generateFollowUpSuggestions(
    userMessage: string,
    aiResponse: string,
    context: TutoringContext
  ): Promise<string[]> {
    try {
      const prompt = `Based on this tutoring conversation, suggest 3-5 helpful follow-up questions or topics the student might want to explore next:

Student Message: "${userMessage}"
AI Response: "${aiResponse}"

Generate short, actionable suggestions that would help the student learn more effectively.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.8,
      });

      const suggestions = completion.choices[0]?.message?.content
        ?.split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 5) || [];

      return suggestions;
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [
        "Can you explain this concept with an example?",
        "What should I practice next?",
        "How can I apply this in a real project?",
        "What are common mistakes to avoid?",
        "Can you recommend additional resources?"
      ];
    }
  }

  /**
   * Generate learning recommendations based on user progress
   */
  async generateLearningRecommendations(userId: string): Promise<string[]> {
    try {
      // Get user's learning progress and history
      const userProgress = await this.getUserProgressContext(userId);
      
      const prompt = `Based on this student's learning progress, provide 5 personalized learning recommendations:

${JSON.stringify(userProgress, null, 2)}

Focus on:
1. Next logical learning steps
2. Areas that need reinforcement
3. Practical projects to solidify knowledge
4. Skills that complement current learning

Provide actionable, specific recommendations.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content
        ?.split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 5) || [
          "Practice building a small project with your current skills",
          "Review fundamental concepts you've learned recently",
          "Try solving coding challenges to reinforce knowledge",
          "Explore real-world applications of your skills",
          "Connect with other learners for collaborative learning"
        ];

    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [
        "Please check your OpenAI API key configuration",
        "Verify your network connection",
        "Try refreshing the page",
        "Contact support if issues persist"
      ];
    }
  }

  /**
   * Get user progress context for recommendations
   */
  private async getUserProgressContext(userId: string): Promise<any> {
    try {
      const progress = await this.db.query(`
        SELECT 
          c.Title as CourseTitle,
          c.Category,
          c.Level,
          up.OverallProgress,
          up.TimeSpent,
          up.LastAccessedAt
        FROM dbo.UserProgress up
        JOIN dbo.Courses c ON up.CourseId = c.Id
        WHERE up.UserId = @userId
        ORDER BY up.LastAccessedAt DESC
      `, { userId });

      return {
        enrolledCourses: progress.length,
        recentActivity: progress.slice(0, 3),
        totalTimeSpent: progress.reduce((sum, p) => sum + (p.TimeSpent || 0), 0),
        averageProgress: progress.length > 0 
          ? progress.reduce((sum, p) => sum + (p.OverallProgress || 0), 0) / progress.length 
          : 0
      };
    } catch (error) {
      console.error('Error fetching user progress:', error);
      return {};
    }
  }
}