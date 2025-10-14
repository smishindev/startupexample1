const sql = require('mssql');

async function findAdaptiveMathTest() {
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
    
    console.log('Searching for "Adaptive Math Test" in all assessments...');
    const assessments = await sql.query`
      SELECT 
        a.*,
        l.Title as LessonTitle,
        c.Title as CourseTitle
      FROM dbo.Assessments a
      LEFT JOIN dbo.Lessons l ON a.LessonId = l.Id
      LEFT JOIN dbo.Courses c ON l.CourseId = c.Id
      WHERE a.Title LIKE '%Math%' OR a.Title LIKE '%Adaptive%'
      ORDER BY a.CreatedAt DESC
    `;
    
    console.log('Found assessments with "Math" or "Adaptive" in title:', assessments.recordset.length);
    assessments.recordset.forEach((assessment, index) => {
      console.log(`${index + 1}. "${assessment.Title}" in lesson "${assessment.LessonTitle}" (${assessment.LessonId}) of course "${assessment.CourseTitle}"`);
    });
    
    if (assessments.recordset.length === 0) {
      console.log('\nNo "Adaptive Math Test" found. It may have been replaced by the test data script.');
    }
    
    await sql.close();
  } catch (error) {
    console.error('Database error:', error);
  }
}

findAdaptiveMathTest();