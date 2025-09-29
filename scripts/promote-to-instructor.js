const { DatabaseService } = require('../server/dist/services/DatabaseService');

async function promoteUserToInstructor(email) {
  try {
    const db = DatabaseService.getInstance();
    
    // Check if user exists
    const users = await db.query('SELECT Id, Email, Role FROM dbo.Users WHERE Email = @email', { email });
    
    if (users.length === 0) {
      console.log('❌ User not found:', email);
      return;
    }
    
    const user = users[0];
    console.log('📋 Current user:', { 
      id: user.Id, 
      email: user.Email, 
      role: user.Role 
    });
    
    if (user.Role === 'instructor') {
      console.log('✅ User is already an instructor!');
      return;
    }
    
    // Promote to instructor
    await db.execute('UPDATE dbo.Users SET Role = @role WHERE Id = @id', { 
      role: 'instructor', 
      id: user.Id 
    });
    
    console.log('🎉 Successfully promoted user to instructor!');
    
    // Verify the change
    const updatedUsers = await db.query('SELECT Id, Email, Role FROM dbo.Users WHERE Id = @id', { id: user.Id });
    console.log('📋 Updated user:', { 
      id: updatedUsers[0].Id, 
      email: updatedUsers[0].Email, 
      role: updatedUsers[0].Role 
    });
    
  } catch (error) {
    console.error('❌ Error promoting user:', error);
  } finally {
    process.exit(0);
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.log('Usage: node promote-to-instructor.js <email>');
  process.exit(1);
}

promoteUserToInstructor(email);