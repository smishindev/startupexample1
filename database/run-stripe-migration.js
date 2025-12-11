const sql = require('mssql');
require('dotenv').config({ path: '../server/.env' });

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '61299'),
  database: process.env.DB_DATABASE || 'startUp1',
  user: process.env.DB_USER || 'mishin_learn_user',
  password: process.env.DB_PASSWORD || 'MishinLearn2024!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function runMigration() {
  try {
    console.log('🔄 Connecting to database...');
    await sql.connect(config);
    console.log('✅ Connected to database');

    // Check if column exists
    const checkResult = await sql.query`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Users' 
      AND COLUMN_NAME = 'StripeCustomerId'
    `;

    if (checkResult.recordset[0].count > 0) {
      console.log('⚠️  StripeCustomerId column already exists');
      return;
    }

    // Add column
    console.log('🔄 Adding StripeCustomerId column...');
    await sql.query`
      ALTER TABLE dbo.Users
      ADD StripeCustomerId NVARCHAR(255) NULL
    `;
    console.log('✅ Added StripeCustomerId column');

    // Create index
    console.log('🔄 Creating index...');
    await sql.query`
      CREATE NONCLUSTERED INDEX IX_Users_StripeCustomerId
      ON dbo.Users(StripeCustomerId)
    `;
    console.log('✅ Created index');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.close();
  }
}

runMigration();
