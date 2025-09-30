import { DatabaseService } from '../services/DatabaseService';

async function createSampleData() {
  const db = DatabaseService.getInstance();
  
  try {
    console.log('🔍 Creating sample progress data...');
    
    // First, let's check if we have any users
    const users = await db.query(`SELECT TOP 5 Id, Email, FirstName, LastName FROM dbo.Users`);
    console.log('Available users:', users);
    
    if (users.length === 0) {
      console.log('No users found. Creating a test user...');
      
      const testUserId = 'test-user-' + Date.now();
      await db.query(`
        INSERT INTO dbo.Users (Id, Email, FirstName, LastName, PasswordHash, Role, IsEmailVerified, CreatedAt)
        VALUES (@userId, @email, @firstName, @lastName, @passwordHash, @role, 1, GETDATE())
      `, {
        userId: testUserId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: '$2b$10$hash', // placeholder hash
        role: 'student'
      });
      
      console.log('✅ Created test user:', testUserId);
    }
    
    // Check if we have courses
    const courses = await db.query(`SELECT TOP 5 Id, Title, InstructorId FROM dbo.Courses`);
    console.log('Available courses:', courses);
    
    if (courses.length === 0) {
      console.log('No courses found. Creating a test course...');
      
      const instructorId = users.length > 0 ? users[0].Id : 'test-instructor-' + Date.now();
      const courseId = 'test-course-' + Date.now();
      
      // Create instructor user if needed
      if (users.length === 0) {
        await db.query(`
          INSERT INTO dbo.Users (Id, Email, FirstName, LastName, PasswordHash, Role, IsEmailVerified, CreatedAt)
          VALUES (@userId, @email, @firstName, @lastName, @passwordHash, @role, 1, GETDATE())
        `, {
          userId: instructorId,
          email: 'instructor@example.com',
          firstName: 'Test',
          lastName: 'Instructor',
          passwordHash: '$2b$10$hash',
          role: 'instructor'
        });
      }
      
      await db.query(`
        INSERT INTO dbo.Courses (Id, Title, Description, InstructorId, Category, IsPublished, CreatedAt)
        VALUES (@courseId, @title, @description, @instructorId, @category, 1, GETDATE())
      `, {
        courseId: courseId,
        title: 'Sample Course',
        description: 'A sample course for testing',
        instructorId: instructorId,
        category: 'Technology'
      });
      
      console.log('✅ Created test course:', courseId);
    }
    
    // Get updated data
    const updatedUsers = await db.query(`SELECT TOP 1 Id FROM dbo.Users WHERE Role = 'student'`);
    const updatedCourses = await db.query(`SELECT TOP 1 Id FROM dbo.Courses`);
    
    if (updatedUsers.length > 0 && updatedCourses.length > 0) {
      const userId = updatedUsers[0].Id;
      const courseId = updatedCourses[0].Id;
      
      // Check if enrollment exists
      const enrollment = await db.query(`
        SELECT Id FROM dbo.Enrollments WHERE UserId = @userId AND CourseId = @courseId
      `, { userId, courseId });
      
      if (enrollment.length === 0) {
        console.log('Creating enrollment...');
        await db.query(`
          INSERT INTO dbo.Enrollments (Id, UserId, CourseId, Status, EnrolledAt)
          VALUES (@enrollmentId, @userId, @courseId, 'active', GETDATE())
        `, {
          enrollmentId: 'enrollment-' + Date.now(),
          userId,
          courseId
        });
      }
      
      // Check if progress exists
      const progress = await db.query(`
        SELECT Id FROM dbo.UserProgress WHERE UserId = @userId AND CourseId = @courseId
      `, { userId, courseId });
      
      if (progress.length === 0) {
        console.log('Creating progress record...');
        await db.query(`
          INSERT INTO dbo.UserProgress (Id, UserId, CourseId, OverallProgress, TimeSpent, LastAccessedAt, CreatedAt)
          VALUES (@progressId, @userId, @courseId, @progress, @timeSpent, GETDATE(), GETDATE())
        `, {
          progressId: 'progress-' + Date.now(),
          userId,
          courseId,
          progress: 35,
          timeSpent: 120
        });
        
        console.log('✅ Created progress record');
      }
    }
    
    // Final check
    const finalCount = await db.query(`SELECT COUNT(*) as count FROM dbo.UserProgress`);
    console.log(`✅ Total progress records: ${finalCount[0].count}`);
    
  } catch (error) {
    console.error('Error creating sample data:', error);
  }
  
  process.exit(0);
}

createSampleData();