const sql = require('mssql');
const { v4: uuidv4 } = require('uuid');

async function enrollUserInCourse() {
  try {
    const config = {
      server: 'localhost\\SQLEXPRESS',
      database: 'startUp1',
      options: {
        trustedConnection: true,
        encrypt: false,
        enableArithAbort: true
      }
    };

    await sql.connect(config);

    // Find user 'ser'
    const userResult = await sql.query`
      SELECT Id, Username FROM dbo.Users WHERE Username = 'ser'
    `;

    if (userResult.recordset.length === 0) {
      console.log('❌ User "ser" not found');
      return;
    }

    const userId = userResult.recordset[0].Id;
    const courseId = '9564B2E7-3927-4A39-B80E-6BB30DA3DC4D';

    console.log(`👤 Found user: ${userResult.recordset[0].Username} (${userId})`);

    // Check if already enrolled
    const enrollmentCheck = await sql.query`
      SELECT Id, Status FROM dbo.Enrollments 
      WHERE UserId = ${userId} AND CourseId = ${courseId}
    `;

    if (enrollmentCheck.recordset.length > 0) {
      console.log('✅ User is already enrolled:', enrollmentCheck.recordset[0]);
      
      // Update to active if not active
      if (enrollmentCheck.recordset[0].Status !== 'active') {
        await sql.query`
          UPDATE dbo.Enrollments 
          SET Status = 'active', EnrolledAt = GETUTCDATE()
          WHERE UserId = ${userId} AND CourseId = ${courseId}
        `;
        console.log('✅ Updated enrollment status to active');
      }
    } else {
      // Create new enrollment
      const enrollmentId = uuidv4();
      await sql.query`
        INSERT INTO dbo.Enrollments (Id, UserId, CourseId, Status, EnrolledAt)
        VALUES (${enrollmentId}, ${userId}, ${courseId}, 'active', GETUTCDATE())
      `;
      console.log('✅ Successfully enrolled user in course!');
    }

    // Verify enrollment
    const verification = await sql.query`
      SELECT e.*, c.Title as CourseTitle
      FROM dbo.Enrollments e
      INNER JOIN dbo.Courses c ON e.CourseId = c.Id
      WHERE e.UserId = ${userId} AND e.CourseId = ${courseId}
    `;

    console.log('📋 Final enrollment status:', verification.recordset[0]);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.close();
  }
}

enrollUserInCourse();