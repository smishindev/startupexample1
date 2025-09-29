import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const db = DatabaseService.getInstance();

// Lesson content types
export interface LessonContent {
  type: 'video' | 'text' | 'quiz';
  data: any;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  content: LessonContent[];
  orderIndex: number;
  duration: number;
  isRequired: boolean;
  prerequisites: string[];
  createdAt: string;
  updatedAt: string;
}

// GET /lessons/:courseId - Get all lessons for a course
router.get('/:courseId', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log(`[LESSONS] Starting lessons request for courseId: ${req.params.courseId}`);
    const { courseId } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    console.log(`[LESSON API] Request to get lessons for courseId: ${courseId}, userId: ${userId}, userRole: ${userRole}`);

    // Verify user owns the course or is enrolled
    const courseCheck = await db.query(
      `SELECT Id, InstructorId FROM dbo.Courses 
       WHERE Id = @courseId AND (InstructorId = @userId OR Id IN (
         SELECT CourseId FROM dbo.Enrollments WHERE UserId = @userId
       ))`,
      { courseId, userId }
    );

    console.log(`[LESSON API] Course check result:`, courseCheck);
    console.log(`[LESSON API] User ${userId} role ${userRole} trying to access course ${courseId}`);

    if (!courseCheck.length) {
      console.log(`[LESSON API] Access denied - course not found or user not authorized`);
      return res.status(403).json({ error: 'Access denied to course lessons' });
    }

    const result = await db.query(
      `SELECT Id, CourseId, Title, Description, ContentJson, OrderIndex, 
              Duration, IsRequired, Prerequisites, CreatedAt, UpdatedAt
       FROM dbo.Lessons 
       WHERE CourseId = @courseId 
       ORDER BY OrderIndex ASC`,
      { courseId }
    );

    const lessons: Lesson[] = result.map((row: any) => ({
      id: row.Id,
      courseId: row.CourseId,
      title: row.Title,
      description: row.Description,
      content: JSON.parse(row.ContentJson || '[]'),
      orderIndex: row.OrderIndex,
      duration: row.Duration,
      isRequired: row.IsRequired,
      prerequisites: JSON.parse(row.Prerequisites || '[]'),
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt
    }));

    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// GET /lessons/lesson/:id - Get single lesson
router.get('/lesson/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Get lesson with course ownership check
    const result = await db.query(
      `SELECT l.Id, l.CourseId, l.Title, l.Description, l.ContentJson, l.OrderIndex, 
              l.Duration, l.IsRequired, l.Prerequisites, l.CreatedAt, l.UpdatedAt
       FROM dbo.Lessons l
       INNER JOIN dbo.Courses c ON l.CourseId = c.Id
       WHERE l.Id = @id AND (c.InstructorId = @userId OR c.Id IN (
         SELECT CourseId FROM dbo.Enrollments WHERE UserId = @userId
       ))`,
      { id, userId }
    );

    if (!result.length) {
      return res.status(404).json({ error: 'Lesson not found or access denied' });
    }

    const row = result[0];
    const lesson: Lesson = {
      id: row.Id,
      courseId: row.CourseId,
      title: row.Title,
      description: row.Description,
      content: JSON.parse(row.ContentJson || '[]'),
      orderIndex: row.OrderIndex,
      duration: row.Duration,
      isRequired: row.IsRequired,
      prerequisites: JSON.parse(row.Prerequisites || '[]'),
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt
    };

    res.json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

// POST /lessons - Create new lesson
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      courseId,
      title,
      description,
      content = [],
      orderIndex,
      duration = 0,
      isRequired = true,
      prerequisites = []
    } = req.body;
    const userId = (req as any).user.userId;

    // Verify user owns the course
    const courseCheck = await db.query(
      'SELECT Id FROM dbo.Courses WHERE Id = @courseId AND InstructorId = @userId',
      { courseId, userId }
    );

    if (!courseCheck.length) {
      return res.status(403).json({ error: 'Access denied - not course instructor' });
    }

    // Get the next order index if not provided
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined) {
      const maxOrderResult = await db.query(
        'SELECT MAX(OrderIndex) as MaxOrder FROM dbo.Lessons WHERE CourseId = @courseId',
        { courseId }
      );
      finalOrderIndex = (maxOrderResult[0]?.MaxOrder || 0) + 1;
    }

    const lessonId = uuidv4();
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO dbo.Lessons 
       (Id, CourseId, Title, Description, ContentJson, OrderIndex, Duration, IsRequired, Prerequisites, CreatedAt, UpdatedAt)
       VALUES (@id, @courseId, @title, @description, @contentJson, @orderIndex, @duration, @isRequired, @prerequisites, @createdAt, @updatedAt)`,
      {
        id: lessonId,
        courseId,
        title,
        description,
        contentJson: JSON.stringify(content),
        orderIndex: finalOrderIndex,
        duration,
        isRequired,
        prerequisites: JSON.stringify(prerequisites),
        createdAt: now,
        updatedAt: now
      }
    );

    const lesson: Lesson = {
      id: lessonId,
      courseId,
      title,
      description,
      content,
      orderIndex: finalOrderIndex,
      duration,
      isRequired,
      prerequisites,
      createdAt: now,
      updatedAt: now
    };

    res.status(201).json(lesson);
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

// PUT /lessons/:id - Update lesson
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      content,
      orderIndex,
      duration,
      isRequired,
      prerequisites
    } = req.body;
    const userId = (req as any).user.userId;

    // Verify user owns the course and get current lesson data
    const lessonCheck = await db.query(
      `SELECT l.Id, l.OrderIndex, l.CourseId, l.CreatedAt FROM dbo.Lessons l
       INNER JOIN dbo.Courses c ON l.CourseId = c.Id
       WHERE l.Id = @id AND c.InstructorId = @userId`,
      { id, userId }
    );

    if (!lessonCheck.length) {
      return res.status(403).json({ error: 'Access denied - not course instructor' });
    }

    const currentLesson = lessonCheck[0];
    
    // Use provided orderIndex or keep the current one
    const finalOrderIndex = orderIndex !== undefined ? orderIndex : currentLesson.OrderIndex;
    
    const now = new Date().toISOString();

    await db.execute(
      `UPDATE dbo.Lessons 
       SET Title = @title, Description = @description, ContentJson = @contentJson, OrderIndex = @orderIndex, 
           Duration = @duration, IsRequired = @isRequired, Prerequisites = @prerequisites, UpdatedAt = @updatedAt
       WHERE Id = @id`,
      {
        title,
        description,
        contentJson: JSON.stringify(content),
        orderIndex: finalOrderIndex,
        duration,
        isRequired,
        prerequisites: JSON.stringify(prerequisites),
        updatedAt: now,
        id
      }
    );

    const lesson: Lesson = {
      id,
      courseId: currentLesson.CourseId,
      title,
      description,
      content,
      orderIndex: finalOrderIndex,
      duration,
      isRequired,
      prerequisites,
      createdAt: currentLesson.CreatedAt,
      updatedAt: now
    };

    res.json(lesson);
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// DELETE /lessons/:id - Delete lesson
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Verify user owns the course
    const courseCheck = await db.query(
      `SELECT l.Id FROM dbo.Lessons l
       INNER JOIN dbo.Courses c ON l.CourseId = c.Id
       WHERE l.Id = @id AND c.InstructorId = @userId`,
      { id, userId }
    );

    if (!courseCheck.length) {
      return res.status(403).json({ error: 'Access denied - not course instructor' });
    }

    await db.execute('DELETE FROM dbo.Lessons WHERE Id = @id', { id });

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// POST /lessons/reorder - Reorder lessons
router.post('/reorder', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courseId, lessonIds } = req.body; // Array of lesson IDs in new order
    const userId = (req as any).user.userId;

    // Verify user owns the course
    const courseCheck = await db.query(
      'SELECT Id FROM dbo.Courses WHERE Id = @courseId AND InstructorId = @userId',
      { courseId, userId }
    );

    if (!courseCheck.length) {
      return res.status(403).json({ error: 'Access denied - not course instructor' });
    }

    // Update order indices
    for (let i = 0; i < lessonIds.length; i++) {
      await db.execute(
        'UPDATE dbo.Lessons SET OrderIndex = @orderIndex, UpdatedAt = @updatedAt WHERE Id = @lessonId AND CourseId = @courseId',
        { 
          orderIndex: i + 1, 
          updatedAt: new Date().toISOString(), 
          lessonId: lessonIds[i], 
          courseId 
        }
      );
    }

    res.json({ message: 'Lessons reordered successfully' });
  } catch (error) {
    console.error('Error reordering lessons:', error);
    res.status(500).json({ error: 'Failed to reorder lessons' });
  }
});

export { router as lessonRoutes };