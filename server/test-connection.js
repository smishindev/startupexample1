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
    enableArithAbort: true,
    useUTC: false,
  },
};

async function testConnection() {
  try {
    console.log('🔄 Attempting to connect to SQL Server...');
    const pool = await sql.connect(config);
    console.log('✅ Connected successfully!');
    
    const result = await pool.request().query('SELECT @@VERSION as version, DB_NAME() as currentDatabase');
    console.log('📊 Database info:', result.recordset[0]);
    
    await pool.close();
    console.log('🔐 Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();