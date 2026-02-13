import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';
import { NotificationService } from '../services/NotificationService';
import { CourseEventService } from '../services/CourseEventService';
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
  // Optional course details (included when fetching single lesson)
  courseTitle?: string;
  courseDescription?: string;
  instructorName?: string;
  instructorEmail?: string;
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

    const lessons: Lesson[] = result.map((row: any) => {
      // Safe JSON parsing with fallbacks for corrupt data
      let content = [];
      let prerequisites = [];
      
      try {
        content = JSON.parse(row.ContentJson || '[]');
      } catch (e) {
        console.error(`[LESSONS] Failed to parse ContentJson for lesson ${row.Id}:`, e);
        content = []; // Fallback to empty array
      }
      
      try {
        prerequisites = JSON.parse(row.Prerequisites || '[]');
      } catch (e) {
        console.error(`[LESSONS] Failed to parse Prerequisites for lesson ${row.Id}:`, e);
        prerequisites = []; // Fallback to empty array
      }
      
      return {
        id: row.Id,
        courseId: row.CourseId,
        title: row.Title,
        description: row.Description,
        content,
        orderIndex: row.OrderIndex,
        duration: row.Duration,
        isRequired: row.IsRequired,
        prerequisites,
        createdAt: row.CreatedAt,
        updatedAt: row.UpdatedAt
      };
    });

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

    // Get lesson with course ownership check and course details
    const result = await db.query(
      `SELECT l.Id, l.CourseId, l.Title, l.Description, l.ContentJson, l.OrderIndex, 
              l.Duration, l.IsRequired, l.Prerequisites, l.CreatedAt, l.UpdatedAt,
              c.Title as CourseTitle, c.Description as CourseDescription,
              u.FirstName, u.LastName, u.Email as InstructorEmail
       FROM dbo.Lessons l
       INNER JOIN dbo.Courses c ON l.CourseId = c.Id
       INNER JOIN dbo.Users u ON c.InstructorId = u.Id
       WHERE l.Id = @id AND (c.InstructorId = @userId OR c.Id IN (
         SELECT CourseId FROM dbo.Enrollments WHERE UserId = @userId
       ))`,
      { id, userId }
    );

    if (!result.length) {
      return res.status(404).json({ error: 'Lesson not found or access denied' });
    }

    const row = result[0];
    
    // Safe JSON parsing with fallbacks for corrupt data
    let content = [];
    let prerequisites = [];
    
    try {
      content = JSON.parse(row.ContentJson || '[]');
    } catch (e) {
      console.error(`[LESSONS] Failed to parse ContentJson for lesson ${row.Id}:`, e);
      content = []; // Fallback to empty array
    }
    
    try {
      prerequisites = JSON.parse(row.Prerequisites || '[]');
    } catch (e) {
      console.error(`[LESSONS] Failed to parse Prerequisites for lesson ${row.Id}:`, e);
      prerequisites = []; // Fallback to empty array
    }
    
    const lesson: Lesson = {
      id: row.Id,
      courseId: row.CourseId,
      title: row.Title,
      description: row.Description,
      content,
      orderIndex: row.OrderIndex,
      duration: row.Duration,
      isRequired: row.IsRequired,
      prerequisites,
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt,
      // Add course details
      courseTitle: row.CourseTitle,
      courseDescription: row.CourseDescription,
      instructorName: `${row.FirstName} ${row.LastName}`,
      instructorEmail: row.InstructorEmail
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

    // Ensure all content items have stable IDs (format: {lessonId}-{type}-{uniqueId})
    // IMPORTANT: Preserve existing IDs to maintain progress tracking when content is reordered
    // For new items (empty ID or temp client-side ID), generate unique ID using UUID
    const contentWithIds = content.map((item: any) => {
      // Generate ID for new items (don't mutate original object)
      const itemId = (!item.id || item.id === '' || item.id.startsWith('temp-'))
        ? `${lessonId}-${item.type}-${uuidv4().split('-')[0]}`
        : item.id;
      
      // Validate video content has required fields
      if (item.type === 'video') {
        if (!item.data?.url && !item.data?.fileId) {
          console.warn(`[LESSONS] Video content ${itemId} missing URL and fileId in data object`);
        }
      }
      
      // Return new object to avoid mutating input
      return { ...item, id: itemId };
    });

    await db.execute(
      `INSERT INTO dbo.Lessons 
       (Id, CourseId, Title, Description, ContentJson, OrderIndex, Duration, IsRequired, Prerequisites, CreatedAt, UpdatedAt)
       VALUES (@id, @courseId, @title, @description, @contentJson, @orderIndex, @duration, @isRequired, @prerequisites, @createdAt, @updatedAt)`,
      {
        id: lessonId,
        courseId,
        title,
        description,
        contentJson: JSON.stringify(contentWithIds),
        orderIndex: finalOrderIndex,
        duration,
        isRequired,
        prerequisites: JSON.stringify(prerequisites),
        createdAt: now,
        updatedAt: now
      }
    );

    // DEPRECATED: VideoLessons table no longer used for new lessons
    // All content (videos, text, quizzes) stored in ContentJson
    console.log(`[LESSONS] Created lesson ${lessonId} with ${contentWithIds.length} content items`);
    console.log('[LESSONS] CourseId for notification query:', courseId);

    // Get course details for notifications
    const courseDetails = await db.query(
      'SELECT Title FROM dbo.Courses WHERE Id = @courseId',
      { courseId }
    );
    const courseTitle = courseDetails.length > 0 ? courseDetails[0].Title : 'Course';
    console.log('[LESSONS] Course title:', courseTitle);

    // Get all enrolled students for this course (including completed students)
    console.log('[LESSONS] About to query enrolled students for courseId:', courseId);
    const enrolledStudents = await db.query(
      `SELECT DISTINCT UserId FROM dbo.Enrollments 
       WHERE CourseId = @courseId AND Status IN ('active', 'completed')`,
      { courseId }
    );
    console.log('[LESSONS] Enrolled students query result:', enrolledStudents);
    console.log('[LESSONS] Enrolled students count:', enrolledStudents.length);

    // Only send notifications if there are enrolled students
    if (enrolledStudents.length > 0) {
      const io = req.app.get('io');
      console.log('🔍 [NEW LESSON] io instance:', io ? 'Available' : 'NOT AVAILABLE');
      if (io) {
        try {
          const notificationService = new NotificationService(io);
          console.log(`📢 [NEW LESSON] Sending notifications to ${enrolledStudents.length} students`);

          // Notify each enrolled student about the new lesson
          for (const student of enrolledStudents) {
            const notificationId = await notificationService.createNotificationWithControls(
              {
                userId: student.UserId,
                type: 'course',
                priority: 'normal',
                title: 'New Lesson Available!',
                message: `New lesson added to "${courseTitle}": ${title}`,
                actionUrl: `/courses/${courseId}`,
                actionText: 'Check it Out'
              },
              {
                category: 'course',
                subcategory: 'NewLessons'
              }
            );

            // NotificationService already emits Socket.IO event, no need to emit again
          }
        } catch (notifError) {
          console.error('⚠️ Failed to send new lesson notifications:', notifError);
          // Don't block lesson creation on notification failure
        }
      } else {
        console.warn('⚠️ Socket.IO not available, skipping real-time notifications for new lesson');
      }
    }

    const lesson: Lesson = {
      id: lessonId,
      courseId,
      title,
      description,
      content: contentWithIds,
      orderIndex: finalOrderIndex,
      duration,
      isRequired,
      prerequisites,
      createdAt: now,
      updatedAt: now
    };

    res.status(201).json(lesson);

    // Emit real-time course update event (after response sent, isolated try-catch)
    try {
      CourseEventService.getInstance().emitCourseUpdated(courseId, ['lessons']);
    } catch (emitError) {
      console.error('[Lessons] Failed to emit course update event:', emitError);
    }
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
      content = [], // Default to empty array if not provided
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

    // Ensure all content items have stable IDs (format: {lessonId}-{type}-{uniqueId})
    // IMPORTANT: Preserve existing IDs to maintain progress tracking when content is reordered
    // For new items (empty ID or temp client-side ID), generate unique ID using UUID
    const contentWithIds = content.map((item: any) => {
      // Generate ID for new items (don't mutate original object)
      const itemId = (!item.id || item.id === '' || item.id.startsWith('temp-'))
        ? `${id}-${item.type}-${uuidv4().split('-')[0]}`
        : item.id;
      
      // Validate video content has required fields
      if (item.type === 'video') {
        if (!item.data?.url && !item.data?.fileId) {
          console.warn(`[LESSONS] Video content ${itemId} missing URL and fileId in data object`);
        }
      }
      
      // Return new object to avoid mutating input
      return { ...item, id: itemId };
    });

    await db.execute(
      `UPDATE dbo.Lessons 
       SET Title = @title, Description = @description, ContentJson = @contentJson, OrderIndex = @orderIndex, 
           Duration = @duration, IsRequired = @isRequired, Prerequisites = @prerequisites, UpdatedAt = @updatedAt
       WHERE Id = @id`,
      {
        title,
        description,
        contentJson: JSON.stringify(contentWithIds),
        orderIndex: finalOrderIndex,
        duration,
        isRequired,
        prerequisites: JSON.stringify(prerequisites),
        updatedAt: now,
        id
      }
    );

    // DEPRECATED: VideoLessons table no longer maintained for updates
    // All content managed through ContentJson array
    console.log(`[LESSONS] Updated lesson ${id} with ${contentWithIds.length} content items`);

    const lesson: Lesson = {
      id,
      courseId: currentLesson.CourseId,
      title,
      description,
      content: contentWithIds,
      orderIndex: finalOrderIndex,
      duration,
      isRequired,
      prerequisites,
      createdAt: currentLesson.CreatedAt,
      updatedAt: now
    };

    res.json(lesson);

    // Emit real-time course update event (after response sent, isolated try-catch)
    try {
      CourseEventService.getInstance().emitCourseUpdated(currentLesson.CourseId, ['lessons']);
    } catch (emitError) {
      console.error('[Lessons] Failed to emit course update event:', emitError);
    }
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

    // Verify user owns the course and get courseId
    const courseCheck = await db.query(
      `SELECT l.Id, l.CourseId FROM dbo.Lessons l
       INNER JOIN dbo.Courses c ON l.CourseId = c.Id
       WHERE l.Id = @id AND c.InstructorId = @userId`,
      { id, userId }
    );

    if (!courseCheck.length) {
      return res.status(403).json({ error: 'Access denied - not course instructor' });
    }

    const lessonCourseId = courseCheck[0].CourseId;

    // Delete related records that have NO ACTION constraints (SQL Server cascade path limitations)
    // 1. Delete user progress records for this lesson
    await db.execute('DELETE FROM dbo.UserProgress WHERE LessonId = @id', { id });
    
    // 2. Delete tutoring sessions that reference this lesson
    await db.execute('DELETE FROM dbo.TutoringSessions WHERE LessonId = @id', { id });

    // 3. Finally, delete the lesson itself
    await db.execute('DELETE FROM dbo.Lessons WHERE Id = @id', { id });

    res.json({ message: 'Lesson deleted successfully' });

    // Emit real-time course update event (after response sent, isolated try-catch)
    try {
      CourseEventService.getInstance().emitCourseUpdated(lessonCourseId, ['lessons']);
    } catch (emitError) {
      console.error('[Lessons] Failed to emit course update event:', emitError);
    }
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

    // Emit real-time course update event (after response sent, isolated try-catch)
    try {
      CourseEventService.getInstance().emitCourseUpdated(courseId, ['lessons']);
    } catch (emitError) {
      console.error('[Lessons] Failed to emit course update event:', emitError);
    }
  } catch (error) {
    console.error('Error reordering lessons:', error);
    res.status(500).json({ error: 'Failed to reorder lessons' });
  }
});

export { router as lessonRoutes };