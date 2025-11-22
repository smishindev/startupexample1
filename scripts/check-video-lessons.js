const sql = require('mssql');

const config = {
  server: 'localhost',
  database: 'MishinLearn',
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  authentication: {
    type: 'ntlm',
    options: {
      domain: '',
      userName: '',
      password: '',
    }
  }
};

async function checkVideoLessons() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    const courseId = 'A4E5D57E-5092-4069-BBA9-DD9C1D9A51D2';
    const result = await sql.query`
      SELECT 
        L.Id as LessonId, 
        L.Title, 
        L.Type,
        VL.Id as VideoLessonId, 
        VL.VideoURL,
        VL.Duration
      FROM dbo.Lessons L 
      LEFT JOIN dbo.VideoLessons VL ON L.Id = VL.LessonId 
      WHERE L.CourseId = ${courseId}
      ORDER BY L.OrderIndex
    `;

    console.log('\n=== Lessons for Course ===');
    console.log('Course ID:', courseId);
    console.log('Total Lessons:', result.recordset.length);
    console.log('\n');

    result.recordset.forEach((row, index) => {
      console.log(`${index + 1}. ${row.Title}`);
      console.log(`   Lesson ID: ${row.LessonId}`);
      console.log(`   Type: ${row.Type}`);
      console.log(`   Has Video: ${row.VideoLessonId ? 'YES' : 'NO'}`);
      if (row.VideoLessonId) {
        console.log(`   Video ID: ${row.VideoLessonId}`);
        console.log(`   Video URL: ${row.VideoURL}`);
        console.log(`   Duration: ${row.Duration} min`);
      }
      console.log('');
    });

    await sql.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkVideoLessons();
