/**
 * Comprehensive Notification System Test Suite
 * Tests all scenarios from NOTIFICATION_TESTING_COMPLETE.md
 */

const sql = require('mssql');
require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// Test Results Storage
const testResults = [];

function logTest(testId, testName, status, details) {
  const result = {
    id: testId,
    name: testName,
    status: status, // 'PASS', 'FAIL', 'SKIP'
    details: details,
    timestamp: new Date().toISOString()
  };
  testResults.push(result);
  
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} Test ${testId}: ${testName} - ${status}`);
  if (details) console.log(`   ${details}\n`);
}

async function setupTestData(pool) {
  console.log('\n📦 Setting up test data...\n');
  
  // Get or create test student
  let studentResult = await pool.request()
    .query(`SELECT TOP 1 Id, Email FROM Users WHERE Role = 'student' ORDER BY CreatedAt DESC`);
  
  if (studentResult.recordset.length === 0) {
    console.log('❌ No student found. Please create a test student first.');
    return null;
  }
  
  const student = studentResult.recordset[0];
  console.log(`📚 Using student: ${student.Email} (ID: ${student.Id})`);
  
  // Get or create test course
  let courseResult = await pool.request()
    .query(`SELECT TOP 1 Id, Title FROM Courses ORDER BY CreatedAt DESC`);
  
  if (courseResult.recordset.length === 0) {
    console.log('❌ No active course found. Please create a test course first.');
    return null;
  }
  
  const course = courseResult.recordset[0];
  console.log(`📖 Using course: ${course.Title} (ID: ${course.Id})`);
  
  // Check enrollment
  let enrollmentResult = await pool.request()
    .input('userId', sql.NVarChar, student.Id)
    .input('courseId', sql.NVarChar, course.Id)
    .query(`SELECT Id FROM Enrollments WHERE UserId = @userId AND CourseId = @courseId`);
  
  if (enrollmentResult.recordset.length === 0) {
    console.log('📝 Creating enrollment...');
    await pool.request()
      .input('userId', sql.NVarChar, student.Id)
      .input('courseId', sql.NVarChar, course.Id)
      .query(`
        INSERT INTO Enrollments (Id, UserId, CourseId, Status, EnrolledAt)
        VALUES (NEWID(), @userId, @courseId, 'active', GETUTCDATE())
      `);
    console.log('✅ Enrollment created\n');
  } else {
    console.log('✅ Already enrolled\n');
  }
  
  return { student, course };
}

async function setNotificationPreferences(pool, userId, preferences) {
  // Check if preferences exist
  const existing = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query(`SELECT Id FROM NotificationPreferences WHERE UserId = @userId`);
  
  if (existing.recordset.length === 0) {
    // Create default preferences
    await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        INSERT INTO NotificationPreferences (
          Id, UserId, EnableInAppNotifications, EnableEmailNotifications,
          EmailDigestFrequency, EnableProgressUpdates, EnableCourseUpdates,
          EnableAssessmentUpdates, EnableCommunityUpdates, EnableSystemUpdates
        ) VALUES (
          NEWID(), @userId, 1, 1, 'realtime', 1, 1, 1, 1, 1
        )
      `);
  }
  
  // Update with test preferences
  const fields = Object.keys(preferences)
    .map(key => {
      if (preferences[key] === null) {
        return `${key} = NULL`;
      } else if (typeof preferences[key] === 'boolean') {
        return `${key} = ${preferences[key] ? 1 : 0}`;
      } else {
        return `${key} = '${preferences[key]}'`;
      }
    })
    .join(', ');
  
  await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query(`UPDATE NotificationPreferences SET ${fields} WHERE UserId = @userId`);
}

async function clearRecentNotifications(pool, userId) {
  await pool.request()
    .input('userId', sql.NVarChar, userId)
    .query(`DELETE FROM Notifications WHERE UserId = @userId AND CreatedAt > DATEADD(minute, -5, GETUTCDATE())`);
}

async function getRecentNotifications(pool, userId, minutes = 1) {
  const result = await pool.request()
    .input('userId', sql.NVarChar, userId)
    .input('minutes', sql.Int, minutes)
    .query(`
      SELECT Id, Type, Title, Message, Priority, CreatedAt
      FROM Notifications
      WHERE UserId = @userId 
        AND CreatedAt > DATEADD(minute, -@minutes, GETUTCDATE())
      ORDER BY CreatedAt DESC
    `);
  
  return result.recordset;
}

async function triggerLessonCompletion(pool, userId, courseId) {
  // This simulates the backend logic - in real test, would call API
  const NotificationService = require('../server/src/services/NotificationService').NotificationService;
  const notifService = new NotificationService(null); // No socket.io for testing
  
  try {
    await notifService.createNotificationWithControls(
      userId,
      'progress',
      'Lesson Completed!',
      'Great work! You completed Test Lesson...',
      'normal',
      'LessonCompletion',
      { courseId }
    );
    return true;
  } catch (error) {
    console.error('Error triggering notification:', error.message);
    return false;
  }
}

// ============================================================
// TEST SUITE
// ============================================================

async function runTests() {
  let pool;
  
  try {
    console.log('🧪 Starting Comprehensive Notification System Tests\n');
    console.log('='.repeat(60));
    
    pool = await sql.connect(config);
    
    const testData = await setupTestData(pool);
    if (!testData) {
      console.log('\n❌ Cannot proceed without test data. Exiting.\n');
      process.exit(1);
    }
    
    const { student, course } = testData;
    
    console.log('='.repeat(60));
    console.log('\n🚀 Running Critical Path Tests\n');
    
    // ============================================================
    // TEST 1.2: In-App OFF, Email ON (CRITICAL BUG FIX)
    // ============================================================
    console.log('📋 Test 1.2: In-App OFF, Email ON');
    console.log('Expected: Notification created in DB (for email tracking), NO socket event\n');
    
    await clearRecentNotifications(pool, student.Id);
    
    await setNotificationPreferences(pool, student.Id, {
      EnableInAppNotifications: false,
      EnableEmailNotifications: true,
      EmailDigestFrequency: 'realtime',
      EnableProgressUpdates: true,
      EnableLessonCompletion: null, // Inherit
      EmailLessonCompletion: null   // Inherit
    });
    
    console.log('⚙️  Preferences set:');
    console.log('   - In-App: OFF');
    console.log('   - Email: ON (realtime)');
    console.log('   - Progress Updates: ON');
    console.log('   - Lesson Completion: NULL (inherit)\n');
    
    const triggered1_2 = await triggerLessonCompletion(pool, student.Id, course.Id);
    
    if (!triggered1_2) {
      logTest('1.2', 'In-App OFF, Email ON', 'FAIL', 'Failed to trigger notification');
    } else {
      // Wait a bit for notification to be created
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const notifications1_2 = await getRecentNotifications(pool, student.Id, 1);
      
      if (notifications1_2.length === 0) {
        logTest('1.2', 'In-App OFF, Email ON', 'FAIL', 
          '❌ BUG STILL EXISTS: No notification created (email should still create DB record)');
      } else {
        logTest('1.2', 'In-App OFF, Email ON', 'PASS', 
          `✅ Notification created for email tracking. Check backend logs for "InApp: false, Email: true" and verify email was queued/sent.`);
      }
    }
    
    // ============================================================
    // TEST 1.1: Both Global Toggles ON
    // ============================================================
    console.log('\n📋 Test 1.1: Both Global Toggles ON');
    console.log('Expected: Notification appears in-app AND email sent\n');
    
    await clearRecentNotifications(pool, student.Id);
    
    await setNotificationPreferences(pool, student.Id, {
      EnableInAppNotifications: true,
      EnableEmailNotifications: true,
      EmailDigestFrequency: 'realtime',
      EnableProgressUpdates: true
    });
    
    console.log('⚙️  Preferences set:');
    console.log('   - In-App: ON');
    console.log('   - Email: ON (realtime)\n');
    
    const triggered1_1 = await triggerLessonCompletion(pool, student.Id, course.Id);
    
    if (!triggered1_1) {
      logTest('1.1', 'Both Global Toggles ON', 'FAIL', 'Failed to trigger notification');
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const notifications1_1 = await getRecentNotifications(pool, student.Id, 1);
      
      if (notifications1_1.length > 0) {
        logTest('1.1', 'Both Global Toggles ON', 'PASS', 
          `✅ Notification created. Check backend logs for "InApp: true, Email: true"`);
      } else {
        logTest('1.1', 'Both Global Toggles ON', 'FAIL', 
          '❌ No notification created');
      }
    }
    
    // ============================================================
    // TEST 1.4: Both Global Toggles OFF
    // ============================================================
    console.log('\n📋 Test 1.4: Both Global Toggles OFF');
    console.log('Expected: No notification created at all\n');
    
    await clearRecentNotifications(pool, student.Id);
    
    await setNotificationPreferences(pool, student.Id, {
      EnableInAppNotifications: false,
      EnableEmailNotifications: false
    });
    
    console.log('⚙️  Preferences set:');
    console.log('   - In-App: OFF');
    console.log('   - Email: OFF\n');
    
    const triggered1_4 = await triggerLessonCompletion(pool, student.Id, course.Id);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const notifications1_4 = await getRecentNotifications(pool, student.Id, 1);
    
    if (notifications1_4.length === 0) {
      logTest('1.4', 'Both Global Toggles OFF', 'PASS', 
        `✅ Correctly blocked - no notification created`);
    } else {
      logTest('1.4', 'Both Global Toggles OFF', 'FAIL', 
        `❌ Notification created despite both channels disabled!`);
    }
    
    // ============================================================
    // TEST 1.3: In-App ON, Email OFF
    // ============================================================
    console.log('\n📋 Test 1.3: In-App ON, Email OFF');
    console.log('Expected: In-app notification, NO email\n');
    
    await clearRecentNotifications(pool, student.Id);
    
    await setNotificationPreferences(pool, student.Id, {
      EnableInAppNotifications: true,
      EnableEmailNotifications: false,
      EnableProgressUpdates: true
    });
    
    console.log('⚙️  Preferences set:');
    console.log('   - In-App: ON');
    console.log('   - Email: OFF\n');
    
    const triggered1_3 = await triggerLessonCompletion(pool, student.Id, course.Id);
    
    if (!triggered1_3) {
      logTest('1.3', 'In-App ON, Email OFF', 'FAIL', 'Failed to trigger notification');
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const notifications1_3 = await getRecentNotifications(pool, student.Id, 1);
      
      if (notifications1_3.length > 0) {
        logTest('1.3', 'In-App ON, Email OFF', 'PASS', 
          `✅ Notification created. Check backend logs for "InApp: true, Email: false"`);
      } else {
        logTest('1.3', 'In-App ON, Email OFF', 'FAIL', 
          '❌ No notification created');
      }
    }
    
    // ============================================================
    // TEST 2.2: Explicit Subcategory Override
    // ============================================================
    console.log('\n📋 Test 2.2: Explicit Subcategory Override');
    console.log('Expected: Subcategory ON overrides Category OFF\n');
    
    await clearRecentNotifications(pool, student.Id);
    
    await setNotificationPreferences(pool, student.Id, {
      EnableInAppNotifications: true,
      EnableProgressUpdates: false,        // Category OFF
      EnableLessonCompletion: true        // Subcategory explicitly ON
    });
    
    console.log('⚙️  Preferences set:');
    console.log('   - In-App: ON');
    console.log('   - Progress Updates (Category): OFF');
    console.log('   - Lesson Completion (Subcategory): ON (explicit override)\n');
    
    const triggered2_2 = await triggerLessonCompletion(pool, student.Id, course.Id);
    
    if (!triggered2_2) {
      logTest('2.2', 'Explicit Subcategory Override', 'FAIL', 'Failed to trigger notification');
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const notifications2_2 = await getRecentNotifications(pool, student.Id, 1);
      
      if (notifications2_2.length > 0) {
        logTest('2.2', 'Explicit Subcategory Override', 'PASS', 
          `✅ Explicit subcategory correctly overrode category setting`);
      } else {
        logTest('2.2', 'Explicit Subcategory Override', 'FAIL', 
          '❌ Subcategory override failed - notification blocked by category');
      }
    }
    
    // ============================================================
    // TEST 3.2: NULL Inheritance
    // ============================================================
    console.log('\n📋 Test 3.2: NULL Inheritance (Category ON, Subcategory NULL)');
    console.log('Expected: Subcategory inherits ON from category\n');
    
    await clearRecentNotifications(pool, student.Id);
    
    await setNotificationPreferences(pool, student.Id, {
      EnableInAppNotifications: true,
      EnableProgressUpdates: true,         // Category ON
      EnableLessonCompletion: null        // Subcategory NULL (inherit)
    });
    
    console.log('⚙️  Preferences set:');
    console.log('   - In-App: ON');
    console.log('   - Progress Updates (Category): ON');
    console.log('   - Lesson Completion (Subcategory): NULL (inherit)\n');
    
    const triggered3_2 = await triggerLessonCompletion(pool, student.Id, course.Id);
    
    if (!triggered3_2) {
      logTest('3.2', 'NULL Inheritance', 'FAIL', 'Failed to trigger notification');
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const notifications3_2 = await getRecentNotifications(pool, student.Id, 1);
      
      if (notifications3_2.length > 0) {
        logTest('3.2', 'NULL Inheritance', 'PASS', 
          `✅ NULL correctly inherited ON from category`);
      } else {
        logTest('3.2', 'NULL Inheritance', 'FAIL', 
          '❌ NULL inheritance failed - notification blocked');
      }
    }
    
    // ============================================================
    // TEST 7.1: NULL Persistence
    // ============================================================
    console.log('\n📋 Test 7.1: NULL Persistence After Save');
    console.log('Expected: NULL values persist in database\n');
    
    await setNotificationPreferences(pool, student.Id, {
      EnableLessonCompletion: null,
      EmailLessonCompletion: null,
      EnableVideoCompletion: null
    });
    
    const persistenceCheck = await pool.request()
      .input('userId', sql.NVarChar, student.Id)
      .query(`
        SELECT EnableLessonCompletion, EmailLessonCompletion, EnableVideoCompletion
        FROM NotificationPreferences
        WHERE UserId = @userId
      `);
    
    const prefs = persistenceCheck.recordset[0];
    
    const allNull = 
      prefs.EnableLessonCompletion === null &&
      prefs.EmailLessonCompletion === null &&
      prefs.EnableVideoCompletion === null;
    
    if (allNull) {
      logTest('7.1', 'NULL Persistence', 'PASS', 
        `✅ NULL values correctly persisted in database`);
    } else {
      logTest('7.1', 'NULL Persistence', 'FAIL', 
        `❌ NULL values were converted to: ${JSON.stringify(prefs)}`);
    }
    
    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60) + '\n');
    
    const passed = testResults.filter(t => t.status === 'PASS').length;
    const failed = testResults.filter(t => t.status === 'FAIL').length;
    const skipped = testResults.filter(t => t.status === 'SKIP').length;
    const total = testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`\nSuccess Rate: ${((passed/total) * 100).toFixed(1)}%\n`);
    
    if (failed > 0) {
      console.log('❌ FAILED TESTS:\n');
      testResults.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(`   ${t.id}: ${t.name}`);
        console.log(`      ${t.details}\n`);
      });
    }
    
    console.log('='.repeat(60));
    console.log('\n💡 Next Steps:\n');
    console.log('1. Check backend console logs for debug messages:');
    console.log('   - "✅ InApp: true/false, Email: true/false"');
    console.log('   - "📵 Notification completely blocked"');
    console.log('   - "📧 Sending realtime email"\n');
    console.log('2. Verify emails were sent/queued (check email logs)');
    console.log('3. Test UI interactions (Shift+Click, visual indicators)');
    console.log('4. Test remaining notification types (live sessions, office hours, etc.)\n');
    
    if (passed === total) {
      console.log('🎉 ALL CRITICAL TESTS PASSED! 🎉\n');
    }
    
  } catch (error) {
    console.error('\n💥 Test suite error:', error);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run the test suite
runTests().then(() => {
  console.log('✅ Test suite completed\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
