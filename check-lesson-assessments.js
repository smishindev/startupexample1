const sql = require('mssql');

async function checkLessonAssessments() {
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
    
    // Check lesson details
    const lessonResult = await sql.query`
      SELECT * FROM dbo.Lessons WHERE Id = '2513624D-983D-4B58-9BC7-47324D13E6F6'
    `;
    console.log('Lesson:', lessonResult.recordset);
    
    // Check assessments for this lesson
    const assessmentResult = await sql.query`
      SELECT 
        a.*,
        COUNT(q.Id) as QuestionCount
      FROM dbo.Assessments a
      LEFT JOIN dbo.Questions q ON a.Id = q.AssessmentId
      WHERE a.LessonId = '2513624D-983D-4B58-9BC7-47324D13E6F6'
      GROUP BY a.Id, a.LessonId, a.Title, a.Type, a.PassingScore, a.MaxAttempts, a.TimeLimit, a.IsAdaptive, a.CreatedAt, a.UpdatedAt
      ORDER BY a.CreatedAt
    `;
    console.log('Assessments:', assessmentResult.recordset);
    
    await sql.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLessonAssessments();