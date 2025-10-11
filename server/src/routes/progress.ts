import { Router } from 'express';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { DatabaseService } from '../services/DatabaseService';

const router = Router();
const db = DatabaseService.getInstance();

// Get user's overall progress
router.get('/my-progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Handle different logic for students vs instructors
    if (userRole === 'instructor') {
      // For instructors, show teaching statistics instead of learning progress
      const instructorStats = await db.query(`
        SELECT 
          COUNT(DISTINCT c.Id) as totalCourses,
          COUNT(DISTINCT e.UserId) as totalStudents,
          COALESCE(AVG(CAST(up.OverallProgress as FLOAT)), 0) as avgStudentProgress,
          COUNT(DISTINCT CASE WHEN up.OverallProgress = 100 THEN e.UserId END) as studentsCompleted,
          COUNT(DISTINCT CASE WHEN up.OverallProgress > 0 AND up.OverallProgress < 100 THEN e.UserId END) as studentsInProgress
        FROM dbo.Courses c
        LEFT JOIN dbo.Enrollments e ON c.Id = e.CourseId AND e.Status = 'active'
        LEFT JOIN dbo.UserProgress up ON e.UserId = up.UserId AND e.CourseId = up.CourseId
        WHERE c.InstructorId = @userId AND c.IsPublished = 1
      `, { userId });

      const recentActivity = await db.query(`
        SELECT TOP 10
          c.Id as CourseId,
          c.Title as courseTitle,
          COUNT(e.UserId) as enrolledStudents,
          COALESCE(AVG(CAST(up.OverallProgress as FLOAT)), 0) as OverallProgress,
          c.UpdatedAt as LastAccessedAt,
          'Instructor' as instructorFirstName,
          'Dashboard' as instructorLastName,
          0 as TimeSpent
        FROM dbo.Courses c
        LEFT JOIN dbo.Enrollments e ON c.Id = e.CourseId AND e.Status = 'active'
        LEFT JOIN dbo.UserProgress up ON e.UserId = up.UserId AND e.CourseId = up.CourseId
        WHERE c.InstructorId = @userId AND c.IsPublished = 1
        GROUP BY c.Id, c.Title, c.UpdatedAt
        ORDER BY c.UpdatedAt DESC
      `, { userId });

      res.json({
        overview: instructorStats[0] || {
          totalCourses: 0,
          avgStudentProgress: 0,
          totalStudents: 0,
          studentsCompleted: 0,
          studentsInProgress: 0
        },
        recentActivity
      });

    } else {
      // For students, show learning progress
      const progressOverview = await db.query(`
        SELECT 
          COUNT(DISTINCT up.CourseId) as totalCourses,
          AVG(CAST(up.OverallProgress as FLOAT)) as avgProgress,
          SUM(up.TimeSpent) as totalTimeSpent,
          COUNT(CASE WHEN up.OverallProgress = 100 THEN 1 END) as completedCourses,
          COUNT(CASE WHEN up.OverallProgress > 0 AND up.OverallProgress < 100 THEN 1 END) as inProgressCourses
        FROM dbo.UserProgress up
        INNER JOIN dbo.Enrollments e ON up.UserId = e.UserId AND up.CourseId = e.CourseId
        WHERE up.UserId = @userId AND e.Status = 'active'
      `, { userId });

      const recentActivity = await db.query(`
        SELECT TOP 10
          up.CourseId,
          c.Title as courseTitle,
          up.OverallProgress,
          up.LastAccessedAt,
          up.TimeSpent,
          u.FirstName as instructorFirstName,
          u.LastName as instructorLastName
        FROM dbo.UserProgress up
        INNER JOIN dbo.Courses c ON up.CourseId = c.Id
        INNER JOIN dbo.Users u ON c.InstructorId = u.Id
        INNER JOIN dbo.Enrollments e ON up.UserId = e.UserId AND up.CourseId = e.CourseId
        WHERE up.UserId = @userId AND e.Status = 'active'
        ORDER BY up.LastAccessedAt DESC
      `, { userId });

      res.json({
        overview: progressOverview[0] || {
          totalCourses: 0,
          avgProgress: 0,
          totalTimeSpent: 0,
          completedCourses: 0,
          inProgressCourses: 0
        },
        recentActivity
      });
    }

  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

// Get progress for a specific course
router.get('/courses/:courseId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;

    // Verify user is enrolled in the course
    const enrollment = await db.query(`
      SELECT Id FROM dbo.Enrollments
      WHERE UserId = @userId AND CourseId = @courseId AND Status = 'active'
    `, { userId, courseId });

    if (enrollment.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Get overall course progress
    const courseProgress = await db.query(`
      SELECT 
        OverallProgress,
        TimeSpent,
        LastAccessedAt,
        StartedAt,
        CompletedAt
      FROM dbo.UserProgress
      WHERE UserId = @userId AND CourseId = @courseId AND LessonId IS NULL
    `, { userId, courseId });

    // Get lesson progress
    const lessonProgress = await db.query(`
      SELECT 
        up.LessonId,
        l.Title as lessonTitle,
        l.OrderIndex,
        up.CompletedAt,
        up.TimeSpent as lessonTimeSpent,
        up.OverallProgress as ProgressPercentage,
        up.PerformanceMetrics as Notes
      FROM dbo.UserProgress up
      INNER JOIN dbo.Lessons l ON up.LessonId = l.Id
      WHERE up.UserId = @userId AND l.CourseId = @courseId AND up.LessonId IS NOT NULL
      ORDER BY l.OrderIndex
    `, { userId, courseId });

    // Get course lessons for comparison
    const allLessons = await db.query(`
      SELECT Id, Title, OrderIndex, IsRequired
      FROM dbo.Lessons
      WHERE CourseId = @courseId
      ORDER BY OrderIndex
    `, { courseId });

    res.json({
      courseProgress: courseProgress[0] || {
        OverallProgress: 0,
        TimeSpent: 0,
        LastAccessedAt: null,
        StartedAt: null,
        CompletedAt: null
      },
      lessonProgress,
      allLessons,
      stats: {
        totalLessons: allLessons.length,
        completedLessons: lessonProgress.filter(lp => lp.CompletedAt).length,
        remainingLessons: allLessons.length - lessonProgress.filter(lp => lp.CompletedAt).length
      }
    });

  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
});

// Mark lesson as completed
router.post('/lessons/:lessonId/complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { timeSpent = 0, notes = '' } = req.body;
    const userId = req.user?.userId;

    // Get lesson info
    const lesson = await db.query(`
      SELECT CourseId, Title, IsRequired FROM dbo.Lessons WHERE Id = @lessonId
    `, { lessonId });

    if (lesson.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const courseId = lesson[0].CourseId;

    // Verify user is enrolled
    const enrollment = await db.query(`
      SELECT Id FROM dbo.Enrollments
      WHERE UserId = @userId AND CourseId = @courseId AND Status = 'active'
    `, { userId, courseId });

    if (enrollment.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    const now = new Date().toISOString();

    // Check if lesson progress already exists
    const existingProgress = await db.query(`
      SELECT Id FROM dbo.UserProgress
      WHERE UserId = @userId AND LessonId = @lessonId
    `, { userId, lessonId });

    if (existingProgress.length > 0) {
      // Update existing progress
      await db.execute(`
        UPDATE dbo.UserProgress
        SET CompletedAt = @completedAt, TimeSpent = @timeSpent, 
            OverallProgress = 100, PerformanceMetrics = @notes, LastAccessedAt = @updatedAt
        WHERE UserId = @userId AND LessonId = @lessonId
      `, { userId, lessonId, completedAt: now, timeSpent, notes, updatedAt: now });
    } else {
      // Create new progress record
      await db.execute(`
        INSERT INTO dbo.UserProgress (Id, UserId, CourseId, LessonId, CompletedAt, TimeSpent, OverallProgress, PerformanceMetrics, StartedAt, LastAccessedAt)
        VALUES (@id, @userId, @courseId, @lessonId, @completedAt, @timeSpent, @progressPercentage, @notes, @startedAt, @lastAccessedAt)
      `, {
        id: uuidv4(),
        userId,
        courseId,
        lessonId,
        completedAt: now,
        timeSpent,
        progressPercentage: 100,
        notes,
        startedAt: now,
        lastAccessedAt: now
      });
    }

    // Update overall course progress
    await updateCourseProgress(userId!, courseId);

    res.json({ message: 'Lesson marked as completed', lessonId, timeSpent });

  } catch (error) {
    console.error('Error marking lesson as completed:', error);
    res.status(500).json({ error: 'Failed to mark lesson as completed' });
  }
});

// Update lesson progress (for partial completion)
router.put('/lessons/:lessonId/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { progressPercentage = 0, timeSpent = 0, notes = '' } = req.body;
    const userId = req.user?.userId;

    if (progressPercentage < 0 || progressPercentage > 100) {
      return res.status(400).json({ error: 'Progress percentage must be between 0 and 100' });
    }

    // Get lesson info
    const lesson = await db.query(`
      SELECT CourseId FROM dbo.Lessons WHERE Id = @lessonId
    `, { lessonId });

    if (lesson.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const courseId = lesson[0].CourseId;

    // Verify user is enrolled
    const enrollment = await db.query(`
      SELECT Id FROM dbo.Enrollments
      WHERE UserId = @userId AND CourseId = @courseId AND Status = 'active'
    `, { userId, courseId });

    if (enrollment.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    const now = new Date().toISOString();
    const completedAt = progressPercentage >= 100 ? now : null;

    // Check if lesson progress exists
    const existingProgress = await db.query(`
      SELECT Id FROM dbo.UserProgress
      WHERE UserId = @userId AND LessonId = @lessonId
    `, { userId, lessonId });

    if (existingProgress.length > 0) {
      // Update existing progress
      await db.execute(`
        UPDATE dbo.UserProgress
        SET OverallProgress = @progressPercentage, TimeSpent = @timeSpent, 
            CompletedAt = @completedAt, PerformanceMetrics = @notes, LastAccessedAt = @updatedAt
        WHERE UserId = @userId AND LessonId = @lessonId
      `, { userId, lessonId, progressPercentage, timeSpent, completedAt, notes, updatedAt: now });
    } else {
      // Create new progress record
      await db.execute(`
        INSERT INTO dbo.UserProgress (Id, UserId, CourseId, LessonId, OverallProgress, TimeSpent, CompletedAt, PerformanceMetrics, StartedAt, LastAccessedAt)
        VALUES (@id, @userId, @courseId, @lessonId, @progressPercentage, @timeSpent, @completedAt, @notes, @startedAt, @lastAccessedAt)
      `, {
        id: uuidv4(),
        userId,
        courseId,
        lessonId,
        progressPercentage,
        timeSpent,
        completedAt,
        notes,
        startedAt: now,
        lastAccessedAt: now
      });
    }

    // Update overall course progress
    await updateCourseProgress(userId!, courseId);

    res.json({ message: 'Lesson progress updated', lessonId, progressPercentage, timeSpent });

  } catch (error) {
    console.error('Error updating lesson progress:', error);
    res.status(500).json({ error: 'Failed to update lesson progress' });
  }
});

// Helper function to recalculate course progress
async function updateCourseProgress(userId: string, courseId: string) {
  try {
    // Get all lessons in the course
    const allLessons = await db.query(`
      SELECT Id, IsRequired FROM dbo.Lessons WHERE CourseId = @courseId
    `, { courseId });

    // Get completed lessons
    const completedLessons = await db.query(`
      SELECT LessonId, OverallProgress as ProgressPercentage, TimeSpent
      FROM dbo.UserProgress
      WHERE UserId = @userId AND LessonId IS NOT NULL AND CourseId = @courseId
    `, { userId, courseId });

    const totalLessons = allLessons.length;
    const totalTimeSpent = completedLessons.reduce((sum, lesson) => sum + (lesson.TimeSpent || 0), 0);
    
    // Calculate progress based on lesson completion percentage
    const avgProgress = totalLessons > 0 
      ? completedLessons.reduce((sum, lesson) => sum + (lesson.ProgressPercentage || 0), 0) / totalLessons
      : 0;

    const now = new Date().toISOString();

    // Update or create user progress record
    const existingProgress = await db.query(`
      SELECT Id FROM dbo.UserProgress
      WHERE UserId = @userId AND CourseId = @courseId AND LessonId IS NULL
    `, { userId, courseId });

    if (existingProgress.length > 0) {
      await db.execute(`
        UPDATE dbo.UserProgress
        SET OverallProgress = @progress, TimeSpent = @timeSpent, LastAccessedAt = @lastAccessed
        WHERE UserId = @userId AND CourseId = @courseId AND LessonId IS NULL
      `, { userId, courseId, progress: Math.round(avgProgress), timeSpent: totalTimeSpent, lastAccessed: now });
    } else {
      await db.execute(`
        INSERT INTO dbo.UserProgress (Id, UserId, CourseId, LessonId, OverallProgress, TimeSpent, LastAccessedAt, StartedAt)
        VALUES (@id, @userId, @courseId, NULL, @progress, @timeSpent, @lastAccessed, @startedAt)
      `, { 
        id: uuidv4(),
        userId, 
        courseId, 
        progress: Math.round(avgProgress), 
        timeSpent: totalTimeSpent, 
        lastAccessed: now, 
        startedAt: now 
      });
    }

    // Check if course is completed and update enrollment status
    if (avgProgress >= 100) {
      await db.execute(`
        UPDATE dbo.Enrollments
        SET Status = 'completed', CompletedAt = @completedAt
        WHERE UserId = @userId AND CourseId = @courseId
      `, { userId, courseId, completedAt: now });
    }

  } catch (error) {
    console.error('Error updating course progress:', error);
  }
}

// Get learning streaks and achievements
router.get('/achievements', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (userRole === 'instructor') {
      // For instructors, show teaching achievements
      const instructorStats = await db.query(`
        SELECT 
          COUNT(DISTINCT c.Id) as coursesCreated,
          COUNT(DISTINCT e.UserId) as totalStudents,
          COUNT(DISTINCT CASE WHEN up.OverallProgress = 100 THEN e.UserId END) as studentsCompleted,
          COALESCE(SUM(up.TimeSpent), 0) as totalTeachingTime,
          MAX(c.UpdatedAt) as lastActivity
        FROM dbo.Courses c
        LEFT JOIN dbo.Enrollments e ON c.Id = e.CourseId AND e.Status = 'active'
        LEFT JOIN dbo.UserProgress up ON e.UserId = up.UserId AND e.CourseId = up.CourseId
        WHERE c.InstructorId = @userId AND c.IsPublished = 1
      `, { userId });

      const stats = instructorStats[0] || {};

      // Generate instructor achievement badges
      const badges = [];
      
      if (stats.coursesCreated >= 1) badges.push({ name: 'First Course', icon: '🎯', description: 'Created your first course' });
      if (stats.coursesCreated >= 5) badges.push({ name: 'Course Creator', icon: '🏆', description: 'Created 5 courses' });
      if (stats.coursesCreated >= 10) badges.push({ name: 'Teaching Master', icon: '👑', description: 'Created 10 courses' });
      if (stats.totalStudents >= 10) badges.push({ name: 'Popular Teacher', icon: '🔥', description: '10+ students enrolled' });
      if (stats.totalStudents >= 50) badges.push({ name: 'Teaching Champion', icon: '💪', description: '50+ students enrolled' });
      if (stats.studentsCompleted >= 5) badges.push({ name: 'Success Mentor', icon: '⭐', description: '5+ students completed courses' });
      if (stats.studentsCompleted >= 20) badges.push({ name: 'Impact Teacher', icon: '📚', description: '20+ students completed courses' });

      res.json({
        currentStreak: 0, // Could implement teaching streak later
        stats: {
          coursesCreated: stats.coursesCreated || 0,
          totalStudents: stats.totalStudents || 0,
          studentsCompleted: stats.studentsCompleted || 0,
          totalTeachingTime: stats.totalTeachingTime || 0,
          lastActivity: stats.lastActivity
        },
        badges
      });

    } else {
      // For students, show learning achievements
      // Calculate current streak
      const streakData = await db.query(`
        WITH DailyActivity AS (
          SELECT DISTINCT CAST(LastAccessedAt as DATE) as ActivityDate
          FROM dbo.UserProgress
          WHERE UserId = @userId AND LastAccessedAt IS NOT NULL
        ),
        DateSequence AS (
          SELECT ActivityDate,
                 LAG(ActivityDate) OVER (ORDER BY ActivityDate) as PrevDate,
                 ROW_NUMBER() OVER (ORDER BY ActivityDate DESC) as RowNum
          FROM DailyActivity
        )
        SELECT COUNT(*) as CurrentStreak
        FROM DateSequence
        WHERE RowNum <= (
          SELECT COALESCE(MIN(RowNum), 0)
          FROM DateSequence
          WHERE DATEDIFF(day, PrevDate, ActivityDate) > 1
        )
      `, { userId });

      // Get achievement stats
      const achievements = await db.query(`
        SELECT 
          COUNT(DISTINCT up.CourseId) as coursesStarted,
          COUNT(DISTINCT CASE WHEN up.OverallProgress = 100 THEN up.CourseId END) as coursesCompleted,
          COALESCE(SUM(up.TimeSpent), 0) as totalTimeSpent,
          COUNT(DISTINCT CASE WHEN up.LessonId IS NOT NULL THEN up.LessonId END) as lessonsCompleted,
          MAX(up.LastAccessedAt) as lastActivity
        FROM dbo.UserProgress up
        WHERE up.UserId = @userId
      `, { userId });

      const currentStreak = streakData[0]?.CurrentStreak || 0;
      const stats = achievements[0] || {};

      // Generate achievement badges
      const badges = [];
      
      if (stats.coursesCompleted >= 1) badges.push({ name: 'First Course', icon: '🎯', description: 'Completed your first course' });
      if (stats.coursesCompleted >= 5) badges.push({ name: 'Course Master', icon: '🏆', description: 'Completed 5 courses' });
      if (stats.coursesCompleted >= 10) badges.push({ name: 'Learning Champion', icon: '👑', description: 'Completed 10 courses' });
      if (currentStreak >= 7) badges.push({ name: 'Week Warrior', icon: '🔥', description: '7-day learning streak' });
      if (currentStreak >= 30) badges.push({ name: 'Month Master', icon: '💪', description: '30-day learning streak' });
      if (stats.totalTimeSpent >= 3600) badges.push({ name: 'Time Keeper', icon: '⏰', description: '1+ hours of learning' });
      if (stats.totalTimeSpent >= 36000) badges.push({ name: 'Dedicated Learner', icon: '📚', description: '10+ hours of learning' });
      if (stats.lessonsCompleted >= 50) badges.push({ name: 'Lesson Legend', icon: '⭐', description: 'Completed 50 lessons' });

      res.json({
        currentStreak,
        stats: {
          coursesStarted: stats.coursesStarted || 0,
          coursesCompleted: stats.coursesCompleted || 0,
          totalTimeSpent: stats.totalTimeSpent || 0,
          lessonsCompleted: stats.lessonsCompleted || 0,
          lastActivity: stats.lastActivity
        },
        badges
      });
    }

  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Temporary endpoint to create test data for instructors
router.post('/create-test-data', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (userRole !== 'instructor') {
      return res.status(403).json({ error: 'Only instructors can create test data' });
    }

    console.log('Creating test data for instructor:', userId);
    
    // Create some test courses for the instructor
    const courseData = [
      { title: 'JavaScript Fundamentals', description: 'Learn the basics of JavaScript programming', category: 'Programming' },
      { title: 'React Development', description: 'Build modern web applications with React', category: 'Web Development' },
      { title: 'Node.js Backend', description: 'Create backend APIs with Node.js', category: 'Backend Development' }
    ];
    
    const courseIds = [];
    
    for (const course of courseData) {
      // Check if course already exists
      const existingCourse = await db.query(`
        SELECT Id FROM dbo.Courses WHERE Title = @title AND InstructorId = @instructorId
      `, { title: course.title, instructorId: userId });
      
      if (existingCourse.length === 0) {
        const courseId = uuidv4();
        courseIds.push(courseId);
        
        await db.query(`
          INSERT INTO dbo.Courses (Id, Title, Description, InstructorId, Category, IsPublished, CreatedAt, UpdatedAt)
          VALUES (@courseId, @title, @description, @instructorId, @category, 1, GETDATE(), GETDATE())
        `, {
          courseId,
          title: course.title,
          description: course.description,
          instructorId: userId,
          category: course.category
        });
        
        console.log(`✅ Created course: ${course.title}`);
      } else {
        courseIds.push(existingCourse[0].Id);
        console.log(`Course already exists: ${course.title}`);
      }
    }
    
    // Create some test students
    const studentData = [
      { email: 'student1@test.com', firstName: 'Alice', lastName: 'Johnson' },
      { email: 'student2@test.com', firstName: 'Bob', lastName: 'Smith' },
      { email: 'student3@test.com', firstName: 'Carol', lastName: 'Williams' }
    ];
    
    const studentIds = [];
    
    for (const student of studentData) {
      // Check if student exists
      const existingStudent = await db.query(`
        SELECT Id FROM dbo.Users WHERE Email = @email
      `, { email: student.email });
      
      if (existingStudent.length === 0) {
        const studentId = uuidv4();
        studentIds.push(studentId);
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        await db.query(`
          INSERT INTO dbo.Users (Id, Email, Username, FirstName, LastName, PasswordHash, Role, IsEmailVerified, IsActive, CreatedAt)
          VALUES (@userId, @email, @username, @firstName, @lastName, @passwordHash, @role, 1, 1, GETDATE())
        `, {
          userId: studentId,
          email: student.email,
          username: student.email.split('@')[0],
          firstName: student.firstName,
          lastName: student.lastName,
          passwordHash: hashedPassword,
          role: 'student'
        });
        
        console.log(`✅ Created student: ${student.firstName} ${student.lastName}`);
      } else {
        studentIds.push(existingStudent[0].Id);
        console.log(`Student already exists: ${student.firstName} ${student.lastName}`);
      }
    }
    
    // Create enrollments and progress for the instructor's courses
    const instructorCourses = await db.query(`
      SELECT Id FROM dbo.Courses WHERE InstructorId = @instructorId
    `, { instructorId: userId });
    
    for (const course of instructorCourses) {
      for (const studentId of studentIds) {
        // Check if enrollment exists
        const existingEnrollment = await db.query(`
          SELECT Id FROM dbo.Enrollments WHERE UserId = @studentId AND CourseId = @courseId
        `, { studentId, courseId: course.Id });
        
        if (existingEnrollment.length === 0) {
          const enrollmentId = uuidv4();
          
          await db.query(`
            INSERT INTO dbo.Enrollments (Id, UserId, CourseId, Status, EnrolledAt)
            VALUES (@enrollmentId, @userId, @courseId, 'active', GETDATE())
          `, {
            enrollmentId,
            userId: studentId,
            courseId: course.Id
          });
          
          // Create progress record
          const progressId = uuidv4();
          const progress = Math.floor(Math.random() * 100); // Random progress 0-100
          const timeSpent = Math.floor(Math.random() * 180) + 30; // Random time 30-210 minutes
          
          await db.query(`
            INSERT INTO dbo.UserProgress (Id, UserId, CourseId, OverallProgress, TimeSpent, LastAccessedAt, CreatedAt)
            VALUES (@progressId, @userId, @courseId, @progress, @timeSpent, GETDATE(), GETDATE())
          `, {
            progressId,
            userId: studentId,
            courseId: course.Id,
            progress,
            timeSpent
          });
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Test data created successfully',
      data: {
        coursesCreated: courseIds.length,
        studentsCreated: studentIds.length
      }
    });
    
  } catch (error) {
    console.error('Error creating test data:', error);
    res.status(500).json({ error: 'Failed to create test data' });
  }
});

export { router as progressRoutes };