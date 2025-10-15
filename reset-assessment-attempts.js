const sql = require('mssql');

async function resetAssessmentAttempts() {
  try {
    const config = {
      server: 'localhost',
      port: 61299,
      database: 'startUp1',
      user: 'mishin_learn_user',
      password: 'MishinLearn2024!',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        useUTC: false,
      },
    };
    
    await sql.connect(config);
    
    // Get user ID for ser@gmail.com
    const userResult = await sql.query`
      SELECT Id FROM dbo.Users WHERE Email = 'ser@gmail.com'
    `;
    
    if (userResult.recordset.length === 0) {
      console.log('User ser@gmail.com not found');
      return;
    }
    
    const userId = userResult.recordset[0].Id;
    console.log('Found user ID:', userId);
    
    // Delete all assessment submissions for this user
    const deleteResult = await sql.query`
      DELETE FROM dbo.AssessmentSubmissions 
      WHERE UserId = ${userId}
    `;
    
    console.log('Deleted assessment submissions:', deleteResult.rowsAffected[0]);
    
    // Show remaining attempts for assessments
    const assessments = await sql.query`
      SELECT 
        a.Id,
        a.Title,
        a.MaxAttempts,
        COUNT(sub.Id) as CurrentAttempts
      FROM dbo.Assessments a
      LEFT JOIN dbo.AssessmentSubmissions sub ON a.Id = sub.AssessmentId AND sub.UserId = ${userId}
      GROUP BY a.Id, a.Title, a.MaxAttempts
    `;
    
    console.log('\nAssessment attempts status:');
    assessments.recordset.forEach(assessment => {
      console.log(`${assessment.Title}: ${assessment.CurrentAttempts}/${assessment.MaxAttempts} attempts used`);
    });
    
    await sql.close();
    console.log('\n✅ Assessment attempts reset successfully!');
    
  } catch (error) {
    console.error('Database error:', error);
  }
}

resetAssessmentAttempts();