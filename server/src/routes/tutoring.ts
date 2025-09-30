import { Router } from 'express';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

// Mock OpenAI service (replace with actual OpenAI integration)
class AITutoringService {
  async generateResponse(message: string, context?: any): Promise<string> {
    // Simulate AI response generation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple rule-based responses for demo
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! I'm your AI tutor. I'm here to help you learn and answer any questions you have. What would you like to study today?";
    }
    
    if (lowerMessage.includes('javascript') || lowerMessage.includes('js')) {
      return "JavaScript is a versatile programming language! Here are some key concepts:\n\n" +
             "• Variables (let, const, var)\n" +
             "• Functions and arrow functions\n" +
             "• Objects and arrays\n" +
             "• Promises and async/await\n" +
             "• DOM manipulation\n\n" +
             "What specific aspect of JavaScript would you like to explore?";
    }
    
    if (lowerMessage.includes('react')) {
      return "React is a popular JavaScript library for building user interfaces! Key concepts include:\n\n" +
             "• Components (functional and class)\n" +
             "• JSX syntax\n" +
             "• Props and state\n" +
             "• Hooks (useState, useEffect, etc.)\n" +
             "• Event handling\n\n" +
             "Would you like me to explain any of these concepts in detail?";
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('explain')) {
      return "I'd be happy to help! I can assist you with:\n\n" +
             "• Programming concepts (JavaScript, React, Python, etc.)\n" +
             "• Debugging code issues\n" +
             "• Best practices and coding patterns\n" +
             "• Learning path recommendations\n" +
             "• Practice exercises\n\n" +
             "Just ask me about any topic you'd like to learn!";
    }
    
    if (lowerMessage.includes('example') || lowerMessage.includes('code')) {
      return "Here's a simple JavaScript example:\n\n" +
             "```javascript\n" +
             "// Function to greet a user\n" +
             "function greetUser(name) {\n" +
             "  return `Hello, ${name}! Welcome to coding!`;\n" +
             "}\n\n" +
             "// Usage\n" +
             "console.log(greetUser('Alice'));\n" +
             "```\n\n" +
             "This demonstrates function declaration, template literals, and function calls. Would you like me to explain any part of this code?";
    }
    
    // Default response
    return "That's an interesting question! As your AI tutor, I'm here to help you learn. " +
           "Could you provide more context about what you'd like to understand? " +
           "I can help with programming concepts, explanations, examples, and learning guidance.";
  }

  async generateLearningRecommendations(userId: string): Promise<string[]> {
    // Simulate personalized recommendations
    return [
      "Based on your progress, try building a React todo app",
      "Practice JavaScript array methods (map, filter, reduce)",
      "Learn about async/await for handling promises",
      "Explore CSS Flexbox for better layouts",
      "Try implementing a simple REST API with Node.js"
    ];
  }
}

const aiService = new AITutoringService();

// Get tutoring session history
router.get('/sessions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    const sessions = await db.query(`
      SELECT 
        ts.Id,
        ts.Title,
        ts.CreatedAt,
        ts.UpdatedAt,
        ts.Status,
        COUNT(tm.Id) as MessageCount
      FROM dbo.TutoringSessions ts
      LEFT JOIN dbo.TutoringMessages tm ON ts.Id = tm.SessionId
      WHERE ts.UserId = @userId
      GROUP BY ts.Id, ts.Title, ts.CreatedAt, ts.UpdatedAt, ts.Status
      ORDER BY ts.UpdatedAt DESC
    `, { userId });

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching tutoring sessions:', error);
    res.status(500).json({ error: 'Failed to fetch tutoring sessions' });
  }
});

// Create new tutoring session
router.post('/sessions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, subject } = req.body;
    const userId = req.user?.userId;
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    await db.execute(`
      INSERT INTO dbo.TutoringSessions (Id, UserId, Title, Subject, Status, CreatedAt, UpdatedAt)
      VALUES (@id, @userId, @title, @subject, @status, @createdAt, @updatedAt)
    `, {
      id: sessionId,
      userId,
      title: title || 'New Tutoring Session',
      subject: subject || 'General',
      status: 'active',
      createdAt: now,
      updatedAt: now
    });

    res.status(201).json({ sessionId, title, subject, status: 'active' });
  } catch (error) {
    console.error('Error creating tutoring session:', error);
    res.status(500).json({ error: 'Failed to create tutoring session' });
  }
});

// Get messages for a tutoring session
router.get('/sessions/:sessionId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    // Verify user owns the session
    const session = await db.query(`
      SELECT Id FROM dbo.TutoringSessions 
      WHERE Id = @sessionId AND UserId = @userId
    `, { sessionId, userId });

    if (session.length === 0) {
      return res.status(403).json({ error: 'Access denied to this session' });
    }

    const messages = await db.query(`
      SELECT 
        Id,
        Content,
        Role,
        CreatedAt,
        MessageType
      FROM dbo.TutoringMessages
      WHERE SessionId = @sessionId
      ORDER BY CreatedAt ASC
    `, { sessionId });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching tutoring messages:', error);
    res.status(500).json({ error: 'Failed to fetch tutoring messages' });
  }
});

// Send message to AI tutor
router.post('/sessions/:sessionId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    // Verify user owns the session
    const session = await db.query(`
      SELECT Id FROM dbo.TutoringSessions 
      WHERE Id = @sessionId AND UserId = @userId
    `, { sessionId, userId });

    if (session.length === 0) {
      return res.status(403).json({ error: 'Access denied to this session' });
    }

    const now = new Date().toISOString();
    
    // Store user message
    const userMessageId = uuidv4();
    await db.execute(`
      INSERT INTO dbo.TutoringMessages (Id, SessionId, Content, Role, MessageType, CreatedAt)
      VALUES (@id, @sessionId, @content, @role, @messageType, @createdAt)
    `, {
      id: userMessageId,
      sessionId,
      content,
      role: 'user',
      messageType: 'text',
      createdAt: now
    });

    // Generate AI response
    const aiResponse = await aiService.generateResponse(content);
    
    // Store AI response
    const aiMessageId = uuidv4();
    await db.execute(`
      INSERT INTO dbo.TutoringMessages (Id, SessionId, Content, Role, MessageType, CreatedAt)
      VALUES (@id, @sessionId, @content, @role, @messageType, @createdAt)
    `, {
      id: aiMessageId,
      sessionId,
      content: aiResponse,
      role: 'assistant',
      messageType: 'text',
      createdAt: new Date().toISOString()
    });

    // Update session timestamp
    await db.execute(`
      UPDATE dbo.TutoringSessions 
      SET UpdatedAt = @updatedAt 
      WHERE Id = @sessionId
    `, {
      sessionId,
      updatedAt: new Date().toISOString()
    });

    res.json({
      userMessage: {
        id: userMessageId,
        content,
        role: 'user',
        createdAt: now
      },
      aiMessage: {
        id: aiMessageId,
        content: aiResponse,
        role: 'assistant',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing tutoring message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get learning recommendations
router.get('/recommendations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const recommendations = await aiService.generateLearningRecommendations(userId!);
    
    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

export { router as tutoringRoutes };