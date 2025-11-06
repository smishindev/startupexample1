const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'YourStrong@Passw0rd',
  server: 'localhost',
  database: 'startUp1',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function checkAndUpdateCategories() {
  try {
    await sql.connect(config);
    console.log('Connected to database');

    // Check current Category values
    const checkResult = await sql.query`
      SELECT Id, Title, Category, Level 
      FROM Courses
    `;

    console.log('\n=== Current Course Categories ===');
    checkResult.recordset.forEach(course => {
      console.log(`${course.Title}: Category="${course.Category}", Level="${course.Level}"`);
    });

    // Count courses without categories
    const nullCount = checkResult.recordset.filter(c => !c.Category).length;
    console.log(`\nCourses without Category: ${nullCount} out of ${checkResult.recordset.length}`);

    if (nullCount > 0) {
      console.log('\n=== Updating Categories ===');
      
      // Update categories based on title keywords
      const updates = [
        { keyword: 'python|programming|code|javascript|web|development|react|node', category: 'programming' },
        { keyword: 'data|analytics|sql|database', category: 'data_science' },
        { keyword: 'design|ui|ux|graphic', category: 'design' },
        { keyword: 'business|marketing|management', category: 'business' },
        { keyword: 'math|calculus|algebra', category: 'mathematics' },
        { keyword: 'language|english|spanish', category: 'language' },
      ];

      for (const course of checkResult.recordset) {
        if (!course.Category) {
          const title = course.Title.toLowerCase();
          let category = 'other'; // default
          
          for (const update of updates) {
            const keywords = update.keyword.split('|');
            if (keywords.some(kw => title.includes(kw))) {
              category = update.category;
              break;
            }
          }

          await sql.query`
            UPDATE Courses 
            SET Category = ${category}
            WHERE Id = ${course.Id}
          `;
          
          console.log(`Updated "${course.Title}" -> Category: ${category}`);
        }
      }

      // Also ensure Level is set
      await sql.query`
        UPDATE Courses 
        SET Level = 'beginner'
        WHERE Level IS NULL OR Level = ''
      `;

      console.log('\n=== Updated Course Data ===');
      const updatedResult = await sql.query`
        SELECT Id, Title, Category, Level 
        FROM Courses
      `;
      
      updatedResult.recordset.forEach(course => {
        console.log(`${course.Title}: Category="${course.Category}", Level="${course.Level}"`);
      });
    }

    console.log('\n✅ Category check complete');
    await sql.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkAndUpdateCategories();
