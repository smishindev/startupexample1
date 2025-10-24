import { Router } from 'express';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';
import { AITutoringService, TutoringContext } from '../services/AITutoringService';

const router = Router();
const db = DatabaseService.getInstance();
const aiService = new AITutoringService();

// Get tutoring session history
router.get('/sessions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    const sessions = await db.query(`
      SELECT 
        ts.Id,
        COALESCE(c.Title, 'General Tutoring Session') as Title,
        ts.StartedAt as CreatedAt,
        COALESCE(ts.EndedAt, ts.StartedAt) as UpdatedAt,
        CASE WHEN ts.EndedAt IS NULL THEN 'active' ELSE 'completed' END as Status,
        COUNT(tm.Id) as MessageCount
      FROM dbo.TutoringSessions ts
      LEFT JOIN dbo.TutoringMessages tm ON ts.Id = tm.SessionId
      LEFT JOIN dbo.Courses c ON ts.CourseId = c.Id
      WHERE ts.UserId = @userId
      GROUP BY ts.Id, c.Title, ts.StartedAt, ts.EndedAt
      ORDER BY ts.StartedAt DESC
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
    const { title, subject, courseId, lessonId } = req.body;
    const userId = req.user?.userId;
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    // Build initial context
    const context = {
      subject: subject || 'General Learning',
      courseId,
      lessonId,
      userQuery: title,
      startedAt: now
    };

    await db.execute(`
      INSERT INTO dbo.TutoringSessions (Id, UserId, CourseId, LessonId, StartedAt, Context)
      VALUES (@id, @userId, @courseId, @lessonId, @startedAt, @context)
    `, {
      id: sessionId,
      userId,
      courseId: courseId || null,
      lessonId: lessonId || null,
      startedAt: now,
      context: JSON.stringify(context)
    });

    res.status(201).json({ 
      Id: sessionId, 
      Title: title || 'New Tutoring Session',
      Status: 'active',
      CreatedAt: now,
      UpdatedAt: now
    });
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
        Timestamp as CreatedAt,
        'text' as MessageType
      FROM dbo.TutoringMessages
      WHERE SessionId = @sessionId
      ORDER BY Timestamp ASC
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
    const { content, model } = req.body; // Accept model parameter
    const userId = req.user?.userId;

    console.log(`📨 Processing tutoring message with model: ${model || 'default'}`);

    // Verify user owns the session and get session context
    const sessionData = await db.query(`
      SELECT Id, CourseId, LessonId, Context FROM dbo.TutoringSessions 
      WHERE Id = @sessionId AND UserId = @userId
    `, { sessionId, userId });

    if (sessionData.length === 0) {
      return res.status(403).json({ error: 'Access denied to this session' });
    }

    const session = sessionData[0];
    const now = new Date().toISOString();
    
    // Update session context with selected model
    let sessionContext = {};
    try {
      sessionContext = JSON.parse(session.Context || '{}');
    } catch (e) {
      console.error('Error parsing session context:', e);
    }
    
    if (model) {
      sessionContext = { ...sessionContext, preferredModel: model };
      await db.execute(`
        UPDATE dbo.TutoringSessions 
        SET Context = @context 
        WHERE Id = @sessionId
      `, { sessionId, context: JSON.stringify(sessionContext) });
    }
    
    // Store user message
    const userMessageId = uuidv4();
    await db.execute(`
      INSERT INTO dbo.TutoringMessages (Id, SessionId, Content, Role, Timestamp)
      VALUES (@id, @sessionId, @content, @role, @timestamp)
    `, {
      id: userMessageId,
      sessionId,
      content,
      role: 'user',
      timestamp: now
    });

    // Get previous messages for context
    const previousMessages = await db.query(`
      SELECT Role, Content FROM dbo.TutoringMessages
      WHERE SessionId = @sessionId AND Id != @userMessageId
      ORDER BY Timestamp ASC
    `, { sessionId, userMessageId });

    // Build tutoring context
    const tutoringContext: TutoringContext = {
      userId: userId!,
      courseId: session.CourseId,
      lessonId: session.LessonId,
      previousMessages: previousMessages.map(msg => ({
        role: msg.Role as 'user' | 'assistant',
        content: msg.Content
      }))
    };

    // Generate AI response with selected model
    const aiResponse = await aiService.generateResponse(content, tutoringContext, model);
    
    // Store AI response with model info in metadata
    const aiMessageId = uuidv4();
    const aiTimestamp = new Date().toISOString();
    await db.execute(`
      INSERT INTO dbo.TutoringMessages (Id, SessionId, Content, Role, Timestamp, Metadata)
      VALUES (@id, @sessionId, @content, @role, @timestamp, @metadata)
    `, {
      id: aiMessageId,
      sessionId,
      content: aiResponse.content,
      role: 'ai',
      timestamp: aiTimestamp,
      metadata: JSON.stringify({
        suggestions: aiResponse.suggestions,
        followUpQuestions: aiResponse.followUpQuestions,
        model: model || 'gpt-4o-mini' // Store which model was used
      })
    });

    res.json({
      userMessage: {
        Id: userMessageId,
        Content: content,
        Role: 'user',
        CreatedAt: now,
        MessageType: 'text'
      },
      aiMessage: {
        Id: aiMessageId,
        Content: aiResponse.content,
        Role: 'assistant',
        CreatedAt: aiTimestamp,
        MessageType: 'text',
        suggestions: aiResponse.suggestions,
        followUpQuestions: aiResponse.followUpQuestions
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