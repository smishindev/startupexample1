import { DatabaseService } from '../services/DatabaseService';

async function checkProgressData() {
  const db = DatabaseService.getInstance();
  
  try {
    console.log('🔍 Checking UserProgress table...');
    
    // Check if table exists and has data
    const progressCount = await db.query(`
      SELECT COUNT(*) as count FROM dbo.UserProgress
    `);
    
    console.log(`Found ${progressCount[0].count} progress records`);
    
    // Check sample data
    if (progressCount[0].count > 0) {
      const sampleProgress = await db.query(`
        SELECT TOP 5 
          up.UserId, 
          up.CourseId, 
          up.OverallProgress, 
          up.TimeSpent,
          up.LastAccessedAt,
          c.Title as CourseTitle,
          u.FirstName + ' ' + u.LastName as UserName
        FROM dbo.UserProgress up
        LEFT JOIN dbo.Courses c ON up.CourseId = c.Id
        LEFT JOIN dbo.Users usr ON up.UserId = usr.Id
      `);
      
      console.log('Sample progress data:', sampleProgress);
    }
    
    // Check enrollment data
    const enrollmentCount = await db.query(`
      SELECT COUNT(*) as count FROM dbo.Enrollments WHERE Status = 'active'
    `);
    
    console.log(`Found ${enrollmentCount[0].count} active enrollments`);
    
    // Check users
    const userCount = await db.query(`
      SELECT COUNT(*) as count FROM dbo.Users
    `);
    
    console.log(`Found ${userCount[0].count} users`);
    
    // Check courses
    const courseCount = await db.query(`
      SELECT COUNT(*) as count FROM dbo.Courses
    `);
    
    console.log(`Found ${courseCount[0].count} courses`);
    
  } catch (error) {
    console.error('Error checking progress data:', error);
  }
  
  process.exit(0);
}

checkProgressData();