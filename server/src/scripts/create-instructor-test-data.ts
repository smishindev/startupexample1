import { DatabaseService } from '../services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

async function createInstructorTestData() {
  const db = DatabaseService.getInstance();
  
  try {
    console.log('🔍 Creating instructor test data...');
    
    // Check if we have the current logged-in instructor
    const instructors = await db.query(`
      SELECT Id, Email, FirstName, LastName FROM dbo.Users WHERE Role = 'instructor'
    `);
    
    console.log('Found instructors:', instructors);
    
    if (instructors.length === 0) {
      console.log('Creating test instructor...');
      const instructorId = uuidv4();
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      await db.query(`
        INSERT INTO dbo.Users (Id, Email, Username, FirstName, LastName, PasswordHash, Role, IsEmailVerified, IsActive, CreatedAt)
        VALUES (@userId, @email, @username, @firstName, @lastName, @passwordHash, @role, 1, 1, GETDATE())
      `, {
        userId: instructorId,
        email: 'instructor@test.com',
        username: 'testinstructor',
        firstName: 'Test',
        lastName: 'Instructor',
        passwordHash: hashedPassword,
        role: 'instructor'
      });
      
      console.log('✅ Created test instructor:', instructorId);
    }
    
    const instructor = instructors.length > 0 ? instructors[0] : await db.query(`
      SELECT Id, Email, FirstName, LastName FROM dbo.Users WHERE Role = 'instructor' ORDER BY CreatedAt DESC
    `).then(results => results[0]);
    
    // Create some test courses for the instructor
    const courseData = [
      { title: 'JavaScript Fundamentals', description: 'Learn the basics of JavaScript programming', category: 'Programming' },
      { title: 'React Development', description: 'Build modern web applications with React', category: 'Web Development' },
      { title: 'Node.js Backend', description: 'Create backend APIs with Node.js', category: 'Backend Development' }
    ];
    
    const courseIds = [];
    
    for (const course of courseData) {
      const courseId = uuidv4();
      courseIds.push(courseId);
      
      // Check if course already exists
      const existingCourse = await db.query(`
        SELECT Id FROM dbo.Courses WHERE Title = @title AND InstructorId = @instructorId
      `, { title: course.title, instructorId: instructor.Id });
      
      if (existingCourse.length === 0) {
        await db.query(`
          INSERT INTO dbo.Courses (Id, Title, Description, InstructorId, Category, IsPublished, CreatedAt, UpdatedAt)
          VALUES (@courseId, @title, @description, @instructorId, @category, 1, GETDATE(), GETDATE())
        `, {
          courseId,
          title: course.title,
          description: course.description,
          instructorId: instructor.Id,
          category: course.category
        });
        
        console.log(`✅ Created course: ${course.title}`);
      } else {
        courseIds[courseIds.length - 1] = existingCourse[0].Id;
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
    
    // Create enrollments and progress
    const courses = await db.query(`
      SELECT Id FROM dbo.Courses WHERE InstructorId = @instructorId
    `, { instructorId: instructor.Id });
    
    for (const course of courses) {
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
          
          console.log(`✅ Created enrollment and progress for course ${course.Id}`);
        }
      }
    }
    
    console.log('✅ Test data creation completed!');
    console.log(`Instructor ID: ${instructor.Id}`);
    console.log(`Created ${courseIds.length} courses and ${studentIds.length} students with progress data`);
    
  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

export { createInstructorTestData };