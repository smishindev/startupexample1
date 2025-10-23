const sql = require('mssql');

async function findCourseForLesson() {
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
    
    console.log('Finding course and lesson information for lesson C2CCA540-3BD0-4FDA-9CF0-03071935D58A...');
    const result = await sql.query`
      SELECT 
        c.Title as CourseTitle,
        c.Id as CourseId,
        l.Title as LessonTitle,
        l.Id as LessonId
      FROM dbo.Lessons l
      INNER JOIN dbo.Courses c ON l.CourseId = c.Id
      WHERE l.Id = 'C2CCA540-3BD0-4FDA-9CF0-03071935D58A'
    `;
    
    if (result.recordset.length > 0) {
      const info = result.recordset[0];
      console.log('\n📚 Course & Lesson Information:');
      console.log(`Course: "${info.CourseTitle}" (ID: ${info.CourseId})`);
      console.log(`Lesson: "${info.LessonTitle}" (ID: ${info.LessonId})`);
      
      // Also check assessments for this lesson
      console.log('\n🧪 Checking assessments for this lesson...');
      const assessments = await sql.query`
        SELECT 
          a.Title,
          a.Type,
          a.IsAdaptive,
          COUNT(q.Id) as QuestionCount
        FROM dbo.Assessments a
        LEFT JOIN dbo.Questions q ON a.Id = q.AssessmentId
        WHERE a.LessonId = 'C2CCA540-3BD0-4FDA-9CF0-03071935D58A'
        GROUP BY a.Id, a.Title, a.Type, a.IsAdaptive, a.CreatedAt
        ORDER BY a.CreatedAt
      `;
      
      console.log(`\n✅ Found ${assessments.recordset.length} assessments:`);
      assessments.recordset.forEach((assessment, index) => {
        console.log(`${index + 1}. "${assessment.Title}" (${assessment.Type}, ${assessment.QuestionCount} questions, Adaptive: ${assessment.IsAdaptive})`);
      });
    } else {
      console.log('❌ Lesson not found!');
    }
    
    await sql.close();
  } catch (error) {
    console.error('Database error:', error);
  }
}

findCourseForLesson();