const sql = require('mssql');

const config = {
  server: 'localhost',
  port: 61299,
  database: 'startUp1',
  user: 'mishin_learn_user',
  password: 'MishinLearn2024!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkDatabase() {
  try {
    const pool = await sql.connect(config);
    console.log('✅ Connected to database');
    
    const result = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      ORDER BY TABLE_NAME
    `);
    
    console.log('\n📊 Tables in database:');
    result.recordset.forEach(row => console.log(`  - ${row.TABLE_NAME}`));
    console.log(`\nTotal: ${result.recordset.length} tables`);
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkDatabase();
