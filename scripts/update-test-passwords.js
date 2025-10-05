const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const { DatabaseService } = require('../server/dist/services/DatabaseService');
const bcrypt = require('bcryptjs');

async function updateTestPasswords() {
  try {
    console.log('🔐 Updating test account passwords...');
    
    const db = DatabaseService.getInstance();
    
    // Ensure database connection
    console.log('🔄 Connecting to database...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for connection

    // New secure password: Contains uppercase, lowercase, number, special char
    const newPassword = 'Student123!';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    console.log(`New password will be: ${newPassword}`);
    console.log(`Hashed as: ${hashedPassword.substring(0, 20)}...`);

    // Update all test student accounts
    const testStudentEmails = [
      'alice.student@example.com',
      'bob.student@example.com',
      'carol.student@example.com',
      'david.student@example.com',
      'emma.student@example.com'
    ];

    let updatedCount = 0;

    for (const email of testStudentEmails) {
      const result = await db.execute(`
        UPDATE dbo.Users 
        SET PasswordHash = @passwordHash, UpdatedAt = GETUTCDATE()
        WHERE Email = @email AND Role = 'student'
      `, {
        email: email,
        passwordHash: hashedPassword
      });

      if (result.rowsAffected && result.rowsAffected[0] > 0) {
        console.log(`✅ Updated password for: ${email}`);
        updatedCount++;
      } else {
        console.log(`⚠️  User not found: ${email}`);
      }
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} test account passwords!`);
    console.log('\n📋 Updated Test Accounts:');
    console.log('┌─────────────────────────────────┬─────────────────┐');
    console.log('│ Email                           │ Password        │');
    console.log('├─────────────────────────────────┼─────────────────┤');
    
    for (const email of testStudentEmails) {
      console.log(`│ ${email.padEnd(31)} │ ${newPassword.padEnd(15)} │`);
    }
    
    console.log('└─────────────────────────────────┴─────────────────┘');
    console.log('\n🔐 Password Requirements Met:');
    console.log('✅ Uppercase letter (S)');
    console.log('✅ Lowercase letters (tudent)');
    console.log('✅ Number (123)');
    console.log('✅ Special character (!)');
    console.log('✅ Minimum 8 characters');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
    process.exit(1);
  }
}

// Run the script
updateTestPasswords();