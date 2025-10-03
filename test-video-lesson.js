const { DatabaseService } = require('./server/src/services/DatabaseService');

async function createTestVideoLesson() {
  const db = new DatabaseService();
  
  try {
    // First, let's create a test course if it doesn't exist
    const courseResult = await db.query(`
      IF NOT EXISTS (SELECT 1 FROM courses WHERE title = 'Video Test Course')
      BEGIN
        INSERT INTO courses (title, description, instructor_id, thumbnail_url, created_at)
        VALUES ('Video Test Course', 'Course for testing video functionality', 1, '/api/images/test-course.jpg', GETDATE())
      END
      
      SELECT id FROM courses WHERE title = 'Video Test Course'
    `);
    
    const courseId = courseResult[0]?.id || 1;
    console.log('Course ID:', courseId);
    
    // Now create a lesson with video content
    const lessonResult = await db.query(`
      IF NOT EXISTS (SELECT 1 FROM lessons WHERE title = 'Test Video Lesson')
      BEGIN
        INSERT INTO lessons (course_id, title, description, video_url, duration, lesson_order, created_at)
        VALUES (?, 'Test Video Lesson', 'A lesson to test our video player functionality', '/uploads/videos/89cd9e8d-a553-448f-8904-cb095b298ac1_Recording_2025-09-29_205021.mp4', 300, 1, GETDATE())
      END
      
      SELECT id FROM lessons WHERE title = 'Test Video Lesson'
    `, [courseId]);
    
    const lessonId = lessonResult[0]?.id;
    console.log('Lesson ID:', lessonId);
    
    // Add video content to the lesson
    await db.query(`
      IF NOT EXISTS (SELECT 1 FROM lesson_content WHERE lesson_id = ? AND type = 'video')
      BEGIN
        INSERT INTO lesson_content (lesson_id, type, title, content, order_index, created_at)
        VALUES (?, 'video', 'Main Video Content', 'Test video content', 1, GETDATE())
      END
    `, [lessonId, lessonId]);
    
    console.log('✅ Test video lesson created successfully!');
    console.log(`🎬 Navigate to: http://localhost:5173/courses/${courseId}/lessons/${lessonId}`);
    
  } catch (error) {
    console.error('❌ Error creating test lesson:', error);
  }
}

createTestVideoLesson();