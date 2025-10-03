import { DatabaseService } from '../services/DatabaseService';

async function createVideoLesson() {
  const db = DatabaseService.getInstance();
  await db.initialize();
  
  try {
    // Create a test lesson with video content
    const videoContent = JSON.stringify([
      {
        id: 'video-1',
        type: 'video',
        title: 'Introduction to the Topic',
        videoUrl: '/uploads/videos/89cd9e8d-a553-448f-8904-cb095b298ac1_Recording_2025-09-29_205021.mp4',
        duration: '5:30'
      },
      {
        id: 'text-1',
        type: 'text',
        title: 'Key Concepts',
        content: '<p>This lesson covers the fundamental concepts you need to understand...</p>'
      }
    ]);

    const result = await db.query(`
      INSERT INTO lessons (course_id, title, description, content, duration, video_url, order_index, created_at, updated_at)
      OUTPUT INSERTED.*
      VALUES (@courseId, @title, @description, @content, @duration, @videoUrl, @orderIndex, GETDATE(), GETDATE())
    `, {
      courseId: 1, // assuming course_id 1 exists
      title: 'Video Lesson: Getting Started',
      description: 'A comprehensive video lesson covering the basics',
      content: videoContent,
      duration: 330, // 5:30 in seconds
      videoUrl: '/uploads/videos/89cd9e8d-a553-448f-8904-cb095b298ac1_Recording_2025-09-29_205021.mp4',
      orderIndex: 1
    });

    console.log('Created video lesson:', result[0]);
    
    // Also check existing lessons
    const existingLessons = await db.query('SELECT TOP 5 id, title, course_id, video_url FROM lessons ORDER BY created_at DESC');
    console.log('\nExisting lessons:');
    existingLessons.forEach((lesson: any) => {
      console.log(`- ID: ${lesson.id}, Title: ${lesson.title}, Course: ${lesson.course_id}, Video: ${lesson.video_url ? 'Yes' : 'No'}`);
    });
    
  } catch (error) {
    console.error('Error creating video lesson:', (error as Error).message);
  }
}

createVideoLesson();