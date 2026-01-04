/**
 * API-Based Notification Testing
 * Tests notification system via HTTP API calls
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
let authToken = '';
let testUserId = '';
let testCourseId = '';

// Test Results
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

async function loginAsStudent() {
  console.log('🔐 Logging in as test user...');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'ser',
      password: 'ser'
    });
    
    authToken = response.data.token;
    testUserId = response.data.user.id;
    
    console.log(`✅ Logged in as: ${response.data.user.username || response.data.user.email}`);
    console.log(`   User ID: ${testUserId}\n`);
    
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getEnrolledCourse() {
  console.log('📚 Getting enrolled course...');
  
  try {
    const response = await axios.get(`${API_BASE}/enrollment`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.length > 0) {
      testCourseId = response.data[0].CourseId;
      console.log(`✅ Using course: ${response.data[0].CourseTitle}`);
      console.log(`   Course ID: ${testCourseId}\n`);
      return true;
    } else {
      console.log('❌ No enrolled courses found\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to get enrollments:', error.response?.data || error.message);
    return false;
  }
}

async function setPreferences(prefs) {
  try {
    await axios.patch(`${API_BASE}/notifications/preferences`, prefs, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return true;
  } catch (error) {
    console.error('❌ Failed to set preferences:', error.response?.data || error.message);
    return false;
  }
}

async function getNotificationCount(minutes = 1) {
  try {
    const response = await axios.get(`${API_BASE}/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const recentTime = new Date(Date.now() - minutes * 60 * 1000);
    const recent = response.data.filter(n => new Date(n.CreatedAt) > recentTime);
    
    return recent.length;
  } catch (error) {
    console.error('❌ Failed to get notifications:', error.response?.data || error.message);
    return -1;
  }
}

async function createTestNotification() {
  try {
    // Use the test endpoint to create a notification
    await axios.post(`${API_BASE}/notifications/test`, {
      type: 'progress',
      subcategory: 'LessonCompletion'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return true;
  } catch (error) {
    console.error('⚠️  Test notification failed:', error.response?.data || error.message);
    return false;
  }
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// TESTS
// ============================================================

async function runTests() {
  try {
    console.log('🧪 Starting API-Based Notification Tests\n');
    console.log('='.repeat(60));
    
    // Setup
    const loggedIn = await loginAsStudent();
    if (!loggedIn) {
      console.log('\n❌ Cannot proceed without login. Exiting.\n');
      return;
    }
    
    const hasEnrollment = await getEnrolledCourse();
    if (!hasEnrollment) {
      console.log('⚠️  No enrollment found. Some tests may fail.\n');
    }
    
    console.log('='.repeat(60));
    console.log('\n🚀 Running Critical Path Tests\n');
    
    // ============================================================
    // TEST 1.2: In-App OFF, Email ON (CRITICAL)
    // ============================================================
    console.log('📋 Test 1.2: In-App OFF, Email ON');
    console.log('Expected: Notification created (for email), check backend logs for "InApp: false, Email: true"\n');
    
    const prefs1_2 = {
      EnableInAppNotifications: false,
      EnableEmailNotifications: true,
      EmailDigestFrequency: 'realtime',
      EnableProgressUpdates: true,
      EnableLessonCompletion: null, // Inherit
      EmailLessonCompletion: null   // Inherit
    };
    
    console.log('⚙️  Setting preferences:');
    console.log('   - In-App: OFF');
    console.log('   - Email: ON (realtime)');
    console.log('   - Progress Updates: ON');
    console.log('   - Lesson Completion: NULL (inherit)\n');
    
    await setPreferences(prefs1_2);
    await wait(500);
    
    const beforeCount1_2 = await getNotificationCount(1);
    await createTestNotification();
    await wait(1000);
    const afterCount1_2 = await getNotificationCount(1);
    
    if (afterCount1_2 > beforeCount1_2) {
      logTest('1.2', 'In-App OFF, Email ON', 'PASS', 
        `✅ Notification created! Check backend logs for:\n   "✅ Notification allowed for user... InApp: false, Email: true"\n   "📧 Sending realtime email"`);
    } else {
      logTest('1.2', 'In-App OFF, Email ON', 'FAIL', 
        `❌ BUG STILL EXISTS: No notification created (should create for email tracking)`);
    }
    
    // ============================================================
    // TEST 1.1: Both Global Toggles ON
    // ============================================================
    console.log('\n📋 Test 1.1: Both Global Toggles ON');
    console.log('Expected: Notification created, both channels enabled\n');
    
    const prefs1_1 = {
      EnableInAppNotifications: true,
      EnableEmailNotifications: true,
      EmailDigestFrequency: 'realtime',
      EnableProgressUpdates: true
    };
    
    console.log('⚙️  Setting preferences:');
    console.log('   - In-App: ON');
    console.log('   - Email: ON (realtime)\n');
    
    await setPreferences(prefs1_1);
    await wait(500);
    
    const beforeCount1_1 = await getNotificationCount(1);
    await createTestNotification();
    await wait(1000);
    const afterCount1_1 = await getNotificationCount(1);
    
    if (afterCount1_1 > beforeCount1_1) {
      logTest('1.1', 'Both Global Toggles ON', 'PASS', 
        `✅ Notification created! Check logs for "InApp: true, Email: true"`);
    } else {
      logTest('1.1', 'Both Global Toggles ON', 'FAIL', 
        `❌ No notification created`);
    }
    
    // ============================================================
    // TEST 1.4: Both Global Toggles OFF
    // ============================================================
    console.log('\n📋 Test 1.4: Both Global Toggles OFF');
    console.log('Expected: No notification created\n');
    
    const prefs1_4 = {
      EnableInAppNotifications: false,
      EnableEmailNotifications: false
    };
    
    console.log('⚙️  Setting preferences:');
    console.log('   - In-App: OFF');
    console.log('   - Email: OFF\n');
    
    await setPreferences(prefs1_4);
    await wait(500);
    
    const beforeCount1_4 = await getNotificationCount(1);
    await createTestNotification();
    await wait(1000);
    const afterCount1_4 = await getNotificationCount(1);
    
    if (afterCount1_4 === beforeCount1_4) {
      logTest('1.4', 'Both Global Toggles OFF', 'PASS', 
        `✅ Correctly blocked - no notification created. Check logs for "📵 Notification completely blocked"`);
    } else {
      logTest('1.4', 'Both Global Toggles OFF', 'FAIL', 
        `❌ Notification created despite both channels disabled!`);
    }
    
    // ============================================================
    // TEST 1.3: In-App ON, Email OFF
    // ============================================================
    console.log('\n📋 Test 1.3: In-App ON, Email OFF');
    console.log('Expected: In-app notification only\n');
    
    const prefs1_3 = {
      EnableInAppNotifications: true,
      EnableEmailNotifications: false,
      EnableProgressUpdates: true
    };
    
    console.log('⚙️  Setting preferences:');
    console.log('   - In-App: ON');
    console.log('   - Email: OFF\n');
    
    await setPreferences(prefs1_3);
    await wait(500);
    
    const beforeCount1_3 = await getNotificationCount(1);
    await createTestNotification();
    await wait(1000);
    const afterCount1_3 = await getNotificationCount(1);
    
    if (afterCount1_3 > beforeCount1_3) {
      logTest('1.3', 'In-App ON, Email OFF', 'PASS', 
        `✅ Notification created! Check logs for "InApp: true, Email: false"`);
    } else {
      logTest('1.3', 'In-App ON, Email OFF', 'FAIL', 
        `❌ No notification created`);
    }
    
    // ============================================================
    // TEST 2.2: Explicit Subcategory Override
    // ============================================================
    console.log('\n📋 Test 2.2: Explicit Subcategory Override');
    console.log('Expected: Subcategory ON overrides Category OFF\n');
    
    const prefs2_2 = {
      EnableInAppNotifications: true,
      EnableProgressUpdates: false,        // Category OFF
      EnableLessonCompletion: true        // Subcategory explicitly ON
    };
    
    console.log('⚙️  Setting preferences:');
    console.log('   - In-App: ON');
    console.log('   - Progress Updates (Category): OFF');
    console.log('   - Lesson Completion (Subcategory): ON (explicit override)\n');
    
    await setPreferences(prefs2_2);
    await wait(500);
    
    const beforeCount2_2 = await getNotificationCount(1);
    await createTestNotification();
    await wait(1000);
    const afterCount2_2 = await getNotificationCount(1);
    
    if (afterCount2_2 > beforeCount2_2) {
      logTest('2.2', 'Explicit Subcategory Override', 'PASS', 
        `✅ Explicit subcategory correctly overrode category setting`);
    } else {
      logTest('2.2', 'Explicit Subcategory Override', 'FAIL', 
        `❌ Override failed - notification blocked by category`);
    }
    
    // ============================================================
    // TEST 3.2: NULL Inheritance
    // ============================================================
    console.log('\n📋 Test 3.2: NULL Inheritance (Category ON, Subcategory NULL)');
    console.log('Expected: Subcategory inherits ON from category\n');
    
    const prefs3_2 = {
      EnableInAppNotifications: true,
      EnableProgressUpdates: true,         // Category ON
      EnableLessonCompletion: null        // Subcategory NULL (inherit)
    };
    
    console.log('⚙️  Setting preferences:');
    console.log('   - In-App: ON');
    console.log('   - Progress Updates (Category): ON');
    console.log('   - Lesson Completion (Subcategory): NULL (inherit)\n');
    
    await setPreferences(prefs3_2);
    await wait(500);
    
    const beforeCount3_2 = await getNotificationCount(1);
    await createTestNotification();
    await wait(1000);
    const afterCount3_2 = await getNotificationCount(1);
    
    if (afterCount3_2 > beforeCount3_2) {
      logTest('3.2', 'NULL Inheritance', 'PASS', 
        `✅ NULL correctly inherited ON from category`);
    } else {
      logTest('3.2', 'NULL Inheritance', 'FAIL', 
        `❌ NULL inheritance failed - notification blocked`);
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
    console.log('2. Check browser DevTools console for socket.io events');
    console.log('3. Test UI: Shift+Click to reset to NULL, visual indicators');
    console.log('4. Test real scenarios: complete lessons, reach milestones\n');
    
    if (passed === total) {
      console.log('🎉 ALL CRITICAL TESTS PASSED! 🎉\n');
    } else {
      console.log('⚠️  Some tests failed. Review backend logs for details.\n');
    }
    
  } catch (error) {
    console.error('\n💥 Test suite error:', error.message);
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
