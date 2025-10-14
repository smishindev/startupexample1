const sql = require('mssql');

async function checkAssessments() {
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
    
    console.log('Checking assessments for lesson C2CCA540-3BD0-4FDA-9CF0-03071935D58A...');
    const assessments = await sql.query`
      SELECT 
        a.*,
        COUNT(q.Id) as QuestionCount
      FROM dbo.Assessments a
      LEFT JOIN dbo.Questions q ON a.Id = q.AssessmentId
      WHERE a.LessonId = 'C2CCA540-3BD0-4FDA-9CF0-03071935D58A'
      GROUP BY a.Id, a.LessonId, a.Title, a.Type, a.PassingScore, a.MaxAttempts, a.TimeLimit, a.IsAdaptive, a.CreatedAt, a.UpdatedAt
      ORDER BY a.CreatedAt
    `;
    
    console.log('Assessments found:', assessments.recordset.length);
    console.log('Assessment details:');
    assessments.recordset.forEach((assessment, index) => {
      console.log(`${index + 1}. Title: "${assessment.Title}", Type: ${assessment.Type}, PassingScore: ${assessment.PassingScore}, Questions: ${assessment.QuestionCount}, IsAdaptive: ${assessment.IsAdaptive}`);
    });
    
    if (assessments.recordset.length > 0) {
      console.log('\nFull first assessment details:', assessments.recordset[0]);
    }
    
    await sql.close();
  } catch (error) {
    console.error('Database error:', error);
  }
}

checkAssessments();