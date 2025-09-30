import { DatabaseService } from '../services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

const db = DatabaseService.getInstance();

async function seedChatRooms() {
  try {
    console.log('🌱 Seeding chat rooms...');

    // Get the first user to assign as creator
    const users = await db.query('SELECT TOP 1 Id FROM dbo.Users');
    if (users.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }

    const userId = users[0].Id;
    const now = new Date().toISOString();

    // Create general chat room
    const generalRoomId = uuidv4();
    await db.execute(`
      INSERT INTO dbo.ChatRooms (Id, Name, Description, Type, ParticipantsJson, CreatedBy, CreatedAt)
      VALUES (@id, @name, @description, @type, @participants, @createdBy, @createdAt)
    `, {
      id: generalRoomId,
      name: 'General Discussion',
      description: 'Main chat room for all platform users',
      type: 'public',
      participants: JSON.stringify([{ userId, role: 'admin', joinedAt: now }]),
      createdBy: userId,
      createdAt: now
    });

    // Create study group room
    const studyRoomId = uuidv4();
    await db.execute(`
      INSERT INTO dbo.ChatRooms (Id, Name, Description, Type, ParticipantsJson, CreatedBy, CreatedAt)
      VALUES (@id, @name, @description, @type, @participants, @createdBy, @createdAt)
    `, {
      id: studyRoomId,
      name: 'Study Group - Web Development',
      description: 'Collaborative learning space for web development students',
      type: 'study-group',
      participants: JSON.stringify([{ userId, role: 'admin', joinedAt: now }]),
      createdBy: userId,
      createdAt: now
    });

    // Create course-specific room
    const courses = await db.query('SELECT TOP 1 Id, Title FROM dbo.Courses');
    if (courses.length > 0) {
      const courseId = courses[0].Id;
      const courseTitle = courses[0].Title;
      
      const courseRoomId = uuidv4();
      await db.execute(`
        INSERT INTO dbo.ChatRooms (Id, Name, Description, Type, CourseId, ParticipantsJson, CreatedBy, CreatedAt)
        VALUES (@id, @name, @description, @type, @courseId, @participants, @createdBy, @createdAt)
      `, {
        id: courseRoomId,
        name: `Course Chat - ${courseTitle}`,
        description: `Discussion room for ${courseTitle}`,
        type: 'course',
        courseId,
        participants: JSON.stringify([{ userId, role: 'admin', joinedAt: now }]),
        createdBy: userId,
        createdAt: now
      });

      console.log(`✅ Created course room: ${courseTitle}`);
    }

    // Add some sample messages
    const messageId1 = uuidv4();
    await db.execute(`
      INSERT INTO dbo.ChatMessages (Id, RoomId, UserId, Content, Type, CreatedAt)
      VALUES (@id, @roomId, @userId, @content, @type, @createdAt)
    `, {
      id: messageId1,
      roomId: generalRoomId,
      userId,
      content: 'Welcome to the Mishin Learn platform! Feel free to ask questions and connect with other learners.',
      type: 'text',
      createdAt: now
    });

    const messageId2 = uuidv4();
    await db.execute(`
      INSERT INTO dbo.ChatMessages (Id, RoomId, UserId, Content, Type, CreatedAt)
      VALUES (@id, @roomId, @userId, @content, @type, @createdAt)
    `, {
      id: messageId2,
      roomId: studyRoomId,
      userId,
      content: 'Let\'s collaborate and help each other learn web development! Share your progress and questions here.',
      type: 'text',
      createdAt: now
    });

    console.log('✅ Chat rooms seeded successfully!');
    console.log(`- General Discussion (${generalRoomId})`);
    console.log(`- Study Group (${studyRoomId})`);
    
  } catch (error) {
    console.error('❌ Error seeding chat rooms:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedChatRooms().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { seedChatRooms };