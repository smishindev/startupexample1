const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const { DatabaseService } = require('../server/dist/services/DatabaseService');
const { v4: uuidv4 } = require('uuid');

async function createTestEnrollments() {
  try {
    console.log('🚀 Creating test enrollment data...');
    
    const db = DatabaseService.getInstance();

    // First, let's get existing users and courses
    const instructors = await db.query(
      "SELECT Id, Email FROM dbo.Users WHERE Role = 'instructor'"
    );
    
    const students = await db.query(
      "SELECT Id, Email FROM dbo.Users WHERE Role = 'student'"
    );
    
    const courses = await db.query(
      "SELECT Id, Title, InstructorId FROM dbo.Courses"
    );

    console.log(`Found ${instructors.length} instructors, ${students.length} students, ${courses.length} courses`);

    // Create additional test students if needed
    if (students.length < 5) {
      console.log('Creating additional test students...');
      
      const testStudents = [
        { email: 'alice.student@example.com', firstName: 'Alice', lastName: 'Johnson' },
        { email: 'bob.student@example.com', firstName: 'Bob', lastName: 'Williams' },
        { email: 'carol.student@example.com', firstName: 'Carol', lastName: 'Brown' },
        { email: 'david.student@example.com', firstName: 'David', lastName: 'Davis' },
        { email: 'emma.student@example.com', firstName: 'Emma', lastName: 'Wilson' }
      ];

      for (const student of testStudents) {
        const existingStudent = await db.query(
          'SELECT Id FROM dbo.Users WHERE Email = @email',
          { email: student.email }
        );

        if (existingStudent.length === 0) {
          const studentId = uuidv4();
          await db.execute(`
            INSERT INTO dbo.Users (Id, Email, Username, FirstName, LastName, PasswordHash, Role, IsActive, EmailVerified, CreatedAt, UpdatedAt)
            VALUES (@id, @email, @username, @firstName, @lastName, '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LwlAR2B9VCFxCgHKK', 'student', 1, 1, GETUTCDATE(), GETUTCDATE())
          `, {
            id: studentId,
            email: student.email,
            username: student.email.split('@')[0],
            firstName: student.firstName,
            lastName: student.lastName
          });
          
          console.log(`✅ Created student: ${student.firstName} ${student.lastName}`);
        }
      }
    }

    // Refresh students list
    const allStudents = await db.query(
      "SELECT Id, Email, FirstName, LastName FROM dbo.Users WHERE Role = 'student'"
    );

    // Create test enrollments
    let enrollmentCount = 0;
    
    for (const course of courses) {
      // Enroll 2-4 random students in each course
      const studentsToEnroll = Math.floor(Math.random() * 3) + 2; // 2-4 students
      const shuffledStudents = [...allStudents].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < studentsToEnroll && i < shuffledStudents.length; i++) {
        const student = shuffledStudents[i];
        
        // Check if enrollment already exists
        const existingEnrollment = await db.query(
          'SELECT Id FROM dbo.Enrollments WHERE UserId = @userId AND CourseId = @courseId',
          { userId: student.Id, courseId: course.Id }
        );

        if (existingEnrollment.length === 0) {
          const enrollmentId = uuidv4();
          const enrolledDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date in last 30 days
          
          await db.execute(`
            INSERT INTO dbo.Enrollments (Id, UserId, CourseId, EnrolledAt, Status)
            VALUES (@id, @userId, @courseId, @enrolledAt, @status)
          `, {
            id: enrollmentId,
            userId: student.Id,
            courseId: course.Id,
            enrolledAt: enrolledDate.toISOString(),
            status: 'active'
          });

          // Create user progress entry
          const progressId = uuidv4();
          const overallProgress = Math.floor(Math.random() * 100); // Random progress 0-100%
          const timeSpent = Math.floor(Math.random() * 600); // Random time 0-600 minutes
          const lastAccessed = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random date in last 7 days

          await db.execute(`
            INSERT INTO dbo.UserProgress (Id, UserId, CourseId, OverallProgress, TimeSpent, LastAccessedAt, StartedAt)
            VALUES (@id, @userId, @courseId, @progress, @timeSpent, @lastAccessed, @startedAt)
          `, {
            id: progressId,
            userId: student.Id,
            courseId: course.Id,
            progress: overallProgress,
            timeSpent: timeSpent,
            lastAccessed: lastAccessed.toISOString(),
            startedAt: enrolledDate.toISOString()
          });

          enrollmentCount++;
          console.log(`✅ Enrolled ${student.FirstName} ${student.LastName} in "${course.Title}" (${overallProgress}% progress)`);
        }
      }
    }

    console.log(`🎉 Successfully created ${enrollmentCount} test enrollments!`);
    console.log('✅ Test data ready for Student Management system');
    
  } catch (error) {
    console.error('❌ Error creating test enrollments:', error);
  } finally {
    process.exit(0);
  }
}

createTestEnrollments();