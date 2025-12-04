/**
 * Comprehensive Presence System Test
 * Tests ALL scenarios including edge cases and race conditions
 */

const axios = require('axios');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'green' : 'red';
  log(`${status}: ${testName}`, color);
  if (details) {
    log(`  ${details}`, 'blue');
  }
  
  testResults.tests.push({ testName, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test users
const instructor = {
  email: 'ins1@gmail.com',
  password: 'Aa123456',
  token: null,
  userId: null
};

const student = {
  email: 'student1@gmail.com',
  password: 'Aa123456',
  token: null,
  userId: null
};

async function login(user) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: user.email,
      password: user.password
    });
    
    // Handle both response formats
    if (response.data.success) {
      user.token = response.data.data.token;
      user.userId = response.data.data.user.id;
    } else {
      user.token = response.data.token;
      user.userId = response.data.user.id || response.data.user.Id;
    }
    
    return true;
  } catch (error) {
    log(`Login failed for ${user.email}: ${error.response?.data?.error?.message || error.message}`, 'red');
    return false;
  }
}

function createSocket(user) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, {
      auth: { token: user.token },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      log(`Socket connected for ${user.email}`, 'green');
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      reject(error);
    });

    setTimeout(() => reject(new Error('Socket connection timeout')), 5000);
  });
}

async function apiRequest(method, endpoint, data = null, token = null) {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  };
  
  if (data) {
    config.data = data;
  }
  
  return axios(config);
}

// ====================
// TEST SCENARIOS
// ====================

async function test1_InitialLogin() {
  log('\n📝 Test 1: Initial Login & Auto-Online Status', 'magenta');
  
  const loginSuccess = await login(instructor);
  logTest('Instructor login', loginSuccess);
  
  if (!loginSuccess) return false;
  
  // Create socket connection to trigger setUserOnline
  log('  Creating socket connection...', 'blue');
  const socket = await createSocket(instructor);
  await wait(1500); // Wait for presence to be set
  
  try {
    const response = await apiRequest('GET', '/presence/online?limit=50', null, instructor.token);
    const onlineUsers = response.data.users;
    const instructorOnline = onlineUsers.find(u => u.UserId === instructor.userId);
    
    logTest('Instructor automatically set online', !!instructorOnline, 
      `Status: ${instructorOnline?.Status || 'NOT FOUND'}`);
    
    socket.disconnect();
    return !!instructorOnline;
  } catch (error) {
    logTest('Get online users failed', false, error.message);
    return false;
  }
}

async function test2_StatusChange() {
  log('\n📝 Test 2: Manual Status Change', 'magenta');
  
  try {
    // Change to away
    await apiRequest('PUT', '/presence/status', { status: 'away' }, instructor.token);
    await wait(300);
    
    const response = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const status = response.data.presence.Status;
    
    logTest('Status changed to away', status === 'away', `Status: ${status}`);
    
    // Change to busy
    await apiRequest('PUT', '/presence/status', { status: 'busy' }, instructor.token);
    await wait(300);
    
    const response2 = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const status2 = response2.data.presence.Status;
    
    logTest('Status changed to busy', status2 === 'busy', `Status: ${status2}`);
    
    return status === 'away' && status2 === 'busy';
  } catch (error) {
    logTest('Status change failed', false, error.message);
    return false;
  }
}

async function test3_StatusPersistenceNoRefresh() {
  log('\n📝 Test 3: Status Persistence (Without Page Refresh)', 'magenta');
  
  try {
    // Set to away
    await apiRequest('PUT', '/presence/status', { status: 'away' }, instructor.token);
    await wait(500);
    
    // Check status immediately
    const response1 = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const status1 = response1.data.presence.Status;
    
    logTest('Status is away immediately after change', status1 === 'away', `Status: ${status1}`);
    
    // Wait 2 seconds and check again
    await wait(2000);
    const response2 = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const status2 = response2.data.presence.Status;
    
    logTest('Status still away after 2 seconds', status2 === 'away', `Status: ${status2}`);
    
    return status1 === 'away' && status2 === 'away';
  } catch (error) {
    logTest('Status persistence check failed', false, error.message);
    return false;
  }
}

async function test4_SocketDisconnectReconnect() {
  log('\n📝 Test 4: Socket Disconnect/Reconnect (Simulated Page Refresh)', 'magenta');
  
  try {
    // Set status to busy
    await apiRequest('PUT', '/presence/status', { status: 'busy' }, instructor.token);
    await wait(500);
    
    log('  Creating first socket connection...', 'blue');
    const socket1 = await createSocket(instructor);
    await wait(1000);
    
    // Verify status is busy
    const response1 = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const statusBefore = response1.data.presence.Status;
    log(`  Status before disconnect: ${statusBefore}`, 'blue');
    
    // Disconnect (simulates page close/refresh)
    log('  Disconnecting socket (simulating page refresh)...', 'blue');
    socket1.disconnect();
    await wait(1000);
    
    // Check status after disconnect
    const response2 = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const statusAfterDisconnect = response2.data.presence.Status;
    log(`  Status after disconnect: ${statusAfterDisconnect}`, 'blue');
    
    // Reconnect (simulates page load)
    log('  Reconnecting socket (simulating page load)...', 'blue');
    const socket2 = await createSocket(instructor);
    await wait(1500);
    
    // Check status after reconnect
    const response3 = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const statusAfterReconnect = response3.data.presence.Status;
    log(`  Status after reconnect: ${statusAfterReconnect}`, 'blue');
    
    // Cleanup
    socket2.disconnect();
    
    const passed = statusBefore === 'busy' && statusAfterReconnect === 'busy';
    logTest('Status persists through socket disconnect/reconnect', passed,
      `Before: ${statusBefore}, After disconnect: ${statusAfterDisconnect}, After reconnect: ${statusAfterReconnect}`);
    
    return passed;
  } catch (error) {
    logTest('Socket disconnect/reconnect test failed', false, error.message);
    return false;
  }
}

async function test5_HeartbeatKeepsAlive() {
  log('\n📝 Test 5: Heartbeat Prevents Inactivity Timeout', 'magenta');
  
  try {
    log(`  Testing with userId: ${instructor.userId}`, 'blue');
    
    // Set to online
    log('  Setting status to online...', 'blue');
    const statusResponse = await apiRequest('PUT', '/presence/status', { status: 'online' }, instructor.token);
    await wait(500);
    
    // Check initial LastSeenAt
    const response1 = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const lastSeen1 = new Date(response1.data.presence.LastSeenAt);
    const now1 = Date.now(); // Get timestamp in milliseconds
    const secondsAgo1 = Math.floor((now1 - lastSeen1.getTime()) / 1000);
    log(`  LastSeenAt after status change: ${secondsAgo1} seconds ago`, 'blue');
    
    // Send heartbeat
    log('  Sending heartbeat...', 'blue');
    const heartbeatResponse = await apiRequest('POST', '/presence/heartbeat', null, instructor.token);
    await wait(500);
    
    // Check LastSeenAt after heartbeat
    const response2 = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const lastSeen2 = new Date(response2.data.presence.LastSeenAt);
    const now2 = Date.now();
    const secondsAgo2 = Math.floor((now2 - lastSeen2.getTime()) / 1000);
    log(`  LastSeenAt after heartbeat: ${secondsAgo2} seconds ago`, 'blue');
    
    const passed = secondsAgo2 < 5; // Should be within 5 seconds
    logTest('Heartbeat updates LastSeenAt', passed, `Last seen ${secondsAgo2} seconds ago`);
    
    return passed;
  } catch (error) {
    logTest('Heartbeat test failed', false, error.message);
    return false;
  }
}

async function test6_MultipleUsers() {
  log('\n📝 Test 6: Multiple Users Online Simultaneously', 'magenta');
  
  try {
    // Login student
    const studentLoginSuccess = await login(student);
    if (!studentLoginSuccess) {
      logTest('Student login failed', false);
      return false;
    }
    
    // Create socket connection for student
    log('  Creating socket connection for student...', 'blue');
    const studentSocket = await createSocket(student);
    await wait(1500); // Wait for presence to be set
    
    // Both users should be online
    const response = await apiRequest('GET', '/presence/online?limit=50', null, instructor.token);
    const onlineUsers = response.data.users;
    
    const instructorOnline = onlineUsers.find(u => u.UserId === instructor.userId);
    const studentOnline = onlineUsers.find(u => u.UserId === student.userId);
    
    logTest('Both users visible in online list', 
      !!instructorOnline && !!studentOnline,
      `Instructor: ${instructorOnline?.Status || 'NOT FOUND'}, Student: ${studentOnline?.Status || 'NOT FOUND'}`);
    
    studentSocket.disconnect();
    return !!instructorOnline && !!studentOnline;
  } catch (error) {
    logTest('Multiple users test failed', false, error.message);
    return false;
  }
}

async function test7_BulkPresenceQuery() {
  log('\n📝 Test 7: Bulk Presence Query', 'magenta');
  
  try {
    const userIds = [instructor.userId, student.userId];
    const response = await apiRequest('POST', '/presence/bulk', { userIds }, instructor.token);
    const presences = response.data.presences;
    
    const passed = presences.length === 2;
    logTest('Bulk query returns both users', passed, 
      `Returned ${presences.length} presences`);
    
    return passed;
  } catch (error) {
    logTest('Bulk presence query failed', false, error.message);
    return false;
  }
}

async function test8_ActivityUpdate() {
  log('\n📝 Test 8: Activity Update', 'magenta');
  
  try {
    const activity = 'Viewing Course: JavaScript Fundamentals';
    await apiRequest('PUT', '/presence/activity', { activity }, instructor.token);
    await wait(500);
    
    const response = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const savedActivity = response.data.presence.Activity;
    
    const passed = savedActivity === activity;
    logTest('Activity updated correctly', passed, `Activity: ${savedActivity}`);
    
    return passed;
  } catch (error) {
    logTest('Activity update failed', false, error.message);
    return false;
  }
}

async function test9_RealTimeSocketEvents() {
  log('\n📝 Test 9: Real-time Socket Events', 'magenta');
  
  try {
    const socket = await createSocket(instructor);
    
    let eventReceived = false;
    socket.on('presence-changed', (data) => {
      log(`  Received presence-changed event: ${JSON.stringify(data)}`, 'blue');
      eventReceived = true;
    });
    
    await wait(1000);
    
    // Change status via API
    await apiRequest('PUT', '/presence/status', { status: 'away' }, instructor.token);
    
    // Wait for socket event
    await wait(2000);
    
    socket.disconnect();
    
    logTest('Socket receives presence-changed event', eventReceived);
    
    return eventReceived;
  } catch (error) {
    logTest('Real-time socket events test failed', false, error.message);
    return false;
  }
}

async function test10_StatusChangeRaceCondition() {
  log('\n📝 Test 10: Status Change Race Condition', 'magenta');
  
  try {
    // Rapidly change status multiple times
    const promises = [
      apiRequest('PUT', '/presence/status', { status: 'away' }, instructor.token),
      wait(100).then(() => apiRequest('PUT', '/presence/status', { status: 'busy' }, instructor.token)),
      wait(200).then(() => apiRequest('PUT', '/presence/status', { status: 'online' }, instructor.token)),
    ];
    
    await Promise.all(promises);
    await wait(500);
    
    // Final status should be 'online' (last request)
    const response = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const finalStatus = response.data.presence.Status;
    
    const passed = finalStatus === 'online';
    logTest('Race condition handled correctly', passed, `Final status: ${finalStatus}`);
    
    return passed;
  } catch (error) {
    logTest('Race condition test failed', false, error.message);
    return false;
  }
}

async function test11_OfflineStatusFilter() {
  log('\n📝 Test 11: Offline Status Filter', 'magenta');
  
  try {
    // Set instructor to offline
    await apiRequest('PUT', '/presence/status', { status: 'offline' }, instructor.token);
    await wait(500);
    
    // Get online users (should not include offline users)
    const response = await apiRequest('GET', '/presence/online?limit=50', null, student.token);
    const onlineUsers = response.data.users;
    const instructorInList = onlineUsers.find(u => u.UserId === instructor.userId);
    
    const passed = !instructorInList; // Instructor should NOT be in online list
    logTest('Offline users excluded from online list', passed,
      `Instructor found in list: ${!!instructorInList}`);
    
    return passed;
  } catch (error) {
    logTest('Offline status filter test failed', false, error.message);
    return false;
  }
}

async function test12_StatusPersistenceAcrossMultipleSockets() {
  log('\n📝 Test 12: Status Persistence Across Multiple Socket Connections', 'magenta');
  
  try {
    // Set to away
    await apiRequest('PUT', '/presence/status', { status: 'away' }, instructor.token);
    await wait(500);
    
    // Create first socket
    const socket1 = await createSocket(instructor);
    await wait(1000);
    
    // Check status
    const response1 = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const status1 = response1.data.presence.Status;
    
    // Create second socket (without disconnecting first - simulates multiple tabs)
    const socket2 = await createSocket(instructor);
    await wait(1000);
    
    // Check status again
    const response2 = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const status2 = response2.data.presence.Status;
    
    // Disconnect first socket
    socket1.disconnect();
    await wait(1000);
    
    // Status should still be away (second socket still connected)
    const response3 = await apiRequest('GET', `/presence/user/${instructor.userId}`, null, instructor.token);
    const status3 = response3.data.presence.Status;
    
    socket2.disconnect();
    
    const passed = status1 === 'away' && status2 === 'away' && status3 === 'away';
    logTest('Status persists with multiple socket connections', passed,
      `Status: ${status1} -> ${status2} -> ${status3}`);
    
    return passed;
  } catch (error) {
    logTest('Multiple sockets test failed', false, error.message);
    return false;
  }
}

// ====================
// RUN ALL TESTS
// ====================

async function runAllTests() {
  log('\n🚀 Starting Comprehensive Presence System Tests\n', 'magenta');
  log('='.repeat(60), 'blue');
  
  try {
    await test1_InitialLogin();
    await test2_StatusChange();
    await test3_StatusPersistenceNoRefresh();
    await test4_SocketDisconnectReconnect(); // CRITICAL TEST
    await test5_HeartbeatKeepsAlive();
    await test6_MultipleUsers();
    await test7_BulkPresenceQuery();
    await test8_ActivityUpdate();
    await test9_RealTimeSocketEvents();
    await test10_StatusChangeRaceCondition();
    await test11_OfflineStatusFilter();
    await test12_StatusPersistenceAcrossMultipleSockets();
    
  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
  }
  
  // Print summary
  log('\n' + '='.repeat(60), 'blue');
  log('\n📊 TEST SUMMARY', 'magenta');
  log('='.repeat(60), 'blue');
  log(`Total Tests: ${testResults.passed + testResults.failed}`, 'blue');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, 'red');
  log(`Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%\n`, 'yellow');
  
  if (testResults.failed > 0) {
    log('❌ FAILED TESTS:', 'red');
    testResults.tests.filter(t => !t.passed).forEach(t => {
      log(`  - ${t.testName}`, 'red');
      if (t.details) log(`    ${t.details}`, 'blue');
    });
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

runAllTests();
