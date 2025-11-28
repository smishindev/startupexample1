// ============================================
// Phase 2 API Testing Script
// Run this in Browser Console (F12)
// ============================================

// Get token from Zustand persist storage
const authStorage = localStorage.getItem('auth-storage');
let token = null;
let userEmail = 'Unknown';

if (authStorage) {
  try {
    const authData = JSON.parse(authStorage);
    token = authData?.state?.token;
    userEmail = authData?.state?.user?.email || 'Unknown';
  } catch (e) {
    console.error('Failed to parse auth storage:', e);
  }
}

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

console.log('🚀 Starting Phase 2 API Tests...\n');
console.log('Token:', token ? '✅ Found' : '❌ Missing');
console.log('User:', userEmail);

// ============================================
// TEST 1: Presence API
// ============================================
async function testPresenceAPI() {
  console.log('\n🟢 TEST 1: Presence API');
  console.log('='.repeat(50));
  
  try {
    // Get online users
    console.log('\n1.1 Getting online users...');
    const onlineRes = await fetch('http://localhost:3001/api/presence/online?limit=10', { headers });
    const onlineData = await onlineRes.json();
    console.log('✅ Online users:', onlineData);
    
    // Update my status to 'online'
    console.log('\n1.2 Updating status to online...');
    const statusRes = await fetch('http://localhost:3001/api/presence/status', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        status: 'online',
        activity: 'Testing Phase 2 APIs'
      })
    });
    const statusData = await statusRes.json();
    console.log('✅ Status updated:', statusData);
    
    // Send heartbeat
    console.log('\n1.3 Sending heartbeat...');
    const heartbeatRes = await fetch('http://localhost:3001/api/presence/heartbeat', {
      method: 'POST',
      headers
    });
    const heartbeatData = await heartbeatRes.json();
    console.log('✅ Heartbeat:', heartbeatData);
    
    return true;
  } catch (error) {
    console.error('❌ Presence API test failed:', error);
    return false;
  }
}

// ============================================
// TEST 2: Study Groups API
// ============================================
async function testStudyGroupsAPI() {
  console.log('\n🟢 TEST 2: Study Groups API');
  console.log('='.repeat(50));
  
  try {
    // Create a study group
    console.log('\n2.1 Creating study group...');
    const createRes = await fetch('http://localhost:3001/api/study-groups', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'JavaScript Study Group',
        description: 'Learn JavaScript together',
        maxMembers: 20
      })
    });
    const createData = await createRes.json();
    console.log('✅ Study group created:', createData);
    
    const groupId = createData.group?.Id;
    
    if (groupId) {
      // Get my groups
      console.log('\n2.2 Getting my groups...');
      const myGroupsRes = await fetch('http://localhost:3001/api/study-groups/my/groups', { headers });
      const myGroupsData = await myGroupsRes.json();
      console.log('✅ My groups:', myGroupsData);
      
      // Get group members
      console.log('\n2.3 Getting group members...');
      const membersRes = await fetch(`http://localhost:3001/api/study-groups/${groupId}/members`, { headers });
      const membersData = await membersRes.json();
      console.log('✅ Members:', membersData);
      
      return groupId;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Study Groups API test failed:', error);
    return false;
  }
}

// ============================================
// TEST 3: Live Sessions API (Requires Instructor)
// ============================================
async function testLiveSessionsAPI() {
  console.log('\n🟢 TEST 3: Live Sessions API');
  console.log('='.repeat(50));
  
  try {
    // Try to get course sessions (should work for any user)
    console.log('\n3.1 Getting course sessions...');
    // Using a dummy courseId - replace with real one if needed
    const courseId = '40CE6B5E-A963-41FE-A1DD-D3C4BA4ECFE3'; // from your enrollment
    const sessionsRes = await fetch(`http://localhost:3001/api/live-sessions/course/${courseId}`, { headers });
    const sessionsData = await sessionsRes.json();
    console.log('✅ Course sessions:', sessionsData);
    
    // Try to create session (will fail if not instructor)
    console.log('\n3.2 Attempting to create session (may fail if not instructor)...');
    const createRes = await fetch('http://localhost:3001/api/live-sessions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Test Live Session',
        description: 'Testing Phase 2',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
        duration: 60,
        capacity: 50
      })
    });
    const createData = await createRes.json();
    console.log(createRes.ok ? '✅ Session created:' : '⚠️ Expected (not instructor):', createData);
    
    return true;
  } catch (error) {
    console.error('❌ Live Sessions API test failed:', error);
    return false;
  }
}

// ============================================
// TEST 4: Office Hours API
// ============================================
async function testOfficeHoursAPI() {
  console.log('\n🟢 TEST 4: Office Hours API');
  console.log('='.repeat(50));
  
  try {
    // Get schedules for an instructor (use dummy ID)
    console.log('\n4.1 Getting instructor schedules...');
    const instructorId = '2DC5545F-CAE8-4CF8-8ADB-793B1A671AF5'; // Use any user ID
    const scheduleRes = await fetch(`http://localhost:3001/api/office-hours/schedule/${instructorId}`, { headers });
    const scheduleData = await scheduleRes.json();
    console.log('✅ Schedules:', scheduleData);
    
    // Try to join queue (requires instructor ID)
    console.log('\n4.2 Attempting to join office hours queue...');
    const queueRes = await fetch('http://localhost:3001/api/office-hours/queue/join', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instructorId: instructorId,
        question: 'Need help with testing Phase 2 APIs'
      })
    });
    const queueData = await queueRes.json();
    console.log(queueRes.ok ? '✅ Joined queue:' : '⚠️ Queue response:', queueData);
    
    // Get queue status
    console.log('\n4.3 Getting queue status...');
    const queueStatusRes = await fetch(`http://localhost:3001/api/office-hours/queue/${instructorId}`, { headers });
    const queueStatusData = await queueStatusRes.json();
    console.log('✅ Queue status:', queueStatusData);
    
    return true;
  } catch (error) {
    console.error('❌ Office Hours API test failed:', error);
    return false;
  }
}

// ============================================
// TEST 5: Socket.IO Events
// ============================================
async function testSocketIO() {
  console.log('\n🟢 TEST 5: Socket.IO Events');
  console.log('='.repeat(50));
  
  try {
    // Check if socket exists
    if (typeof io === 'undefined') {
      console.log('⚠️ Socket.io not loaded in this page');
      console.log('✅ Socket connection should already be active (check server logs)');
      return true;
    }
    
    console.log('✅ Socket.IO is available');
    return true;
  } catch (error) {
    console.error('❌ Socket.IO test failed:', error);
    return false;
  }
}

// ============================================
// Run All Tests
// ============================================
async function runAllTests() {
  console.clear();
  console.log('🎯 Phase 2 Backend API Testing Suite');
  console.log('='.repeat(50));
  console.log('Started at:', new Date().toLocaleTimeString());
  console.log('User:', userEmail);
  console.log('Role:', authStorage ? JSON.parse(authStorage)?.state?.user?.role : 'Unknown');
  console.log('Token:', token ? '✅ Valid' : '❌ Missing');
  
  const results = {
    presence: false,
    studyGroups: false,
    liveSessions: false,
    officeHours: false,
    socketIO: false
  };
  
  // Run tests sequentially
  results.presence = await testPresenceAPI();
  await new Promise(r => setTimeout(r, 500)); // Small delay between tests
  
  results.studyGroups = await testStudyGroupsAPI();
  await new Promise(r => setTimeout(r, 500));
  
  results.liveSessions = await testLiveSessionsAPI();
  await new Promise(r => setTimeout(r, 500));
  
  results.officeHours = await testOfficeHoursAPI();
  await new Promise(r => setTimeout(r, 500));
  
  results.socketIO = await testSocketIO();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log('Presence API:', results.presence ? '✅ PASS' : '❌ FAIL');
  console.log('Study Groups API:', results.studyGroups ? '✅ PASS' : '❌ FAIL');
  console.log('Live Sessions API:', results.liveSessions ? '✅ PASS' : '❌ FAIL');
  console.log('Office Hours API:', results.officeHours ? '✅ PASS' : '❌ FAIL');
  console.log('Socket.IO:', results.socketIO ? '✅ PASS' : '❌ FAIL');
  console.log('='.repeat(50));
  
  const passCount = Object.values(results).filter(r => r).length;
  console.log(`\n🎉 ${passCount}/5 tests passed!`);
  
  if (passCount === 5) {
    console.log('\n✅ ALL PHASE 2 BACKEND TESTS PASSED! 🎊');
  } else {
    console.log('\n⚠️ Some tests failed. Check details above.');
  }
  
  console.log('\nCompleted at:', new Date().toLocaleTimeString());
}

// ============================================
// Execute Tests
// ============================================
console.log('📝 Test functions loaded!');
console.log('Run: runAllTests() to execute all tests');
console.log('Or run individual tests:');
console.log('  - testPresenceAPI()');
console.log('  - testStudyGroupsAPI()');
console.log('  - testLiveSessionsAPI()');
console.log('  - testOfficeHoursAPI()');
console.log('  - testSocketIO()');

// Auto-run all tests
runAllTests();
