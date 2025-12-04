/**
 * Presence System Test Script
 * Tests all presence features and reports errors
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';
let authToken = null;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(message, 'blue');
  log('='.repeat(60), 'blue');
}

// Login and get token
async function login() {
  logSection('Step 1: Authentication');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'ins1@gmail.com',
      password: 'Aa123456'
    });

    if (response.data.success && response.data.data && response.data.data.token) {
      authToken = response.data.data.token;
      const user = response.data.data.user;
      logSuccess(`Logged in as: ${user.firstName} ${user.lastName}`);
      logInfo(`User ID: ${user.id}`);
      logInfo(`Role: ${user.role}`);
      return user;
    } else {
      throw new Error('No token received');
    }
  } catch (error) {
    logError(`Login failed: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

// Create axios instance with auth
function getAuthAxios() {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
}

// Test 1: Get online users
async function testGetOnlineUsers() {
  logSection('Step 2: Get Online Users');
  try {
    const api = getAuthAxios();
    const response = await api.get('/presence/online?limit=50');
    
    logSuccess(`API call successful`);
    logInfo(`Total online users: ${response.data.count}`);
    logInfo(`Users returned: ${response.data.users.length}`);
    
    if (response.data.users.length > 0) {
      log('\nOnline users:', 'cyan');
      response.data.users.forEach(user => {
        log(`  - ${user.FirstName || 'N/A'} ${user.LastName || 'N/A'} (${user.Status})`, 'yellow');
        if (!user.FirstName || !user.LastName) {
          logWarning(`    Missing name fields for user ${user.UserId}`);
        }
        if (!user.Email) {
          logWarning(`    Missing Email for user ${user.UserId}`);
        }
        if (!user.Role) {
          logWarning(`    Missing Role for user ${user.UserId}`);
        }
      });
    } else {
      logWarning('No users currently online');
    }
    
    return response.data;
  } catch (error) {
    logError(`Get online users failed: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

// Test 2: Update presence status
async function testUpdateStatus() {
  logSection('Step 3: Update Presence Status');
  try {
    const api = getAuthAxios();
    
    // Test changing to different statuses
    const statuses = ['online', 'away', 'busy', 'offline'];
    
    for (const status of statuses) {
      try {
        const response = await api.put('/presence/status', {
          status: status,
          activity: `Testing ${status} status`
        });
        
        logSuccess(`Changed status to: ${status}`);
        logInfo(`Activity: Testing ${status} status`);
        
        if (response.data.presence) {
          logInfo(`Confirmed status: ${response.data.presence.Status}`);
        }
        
        // Wait a bit between status changes
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logError(`Failed to set status to ${status}: ${error.message}`);
        if (error.response) {
          logError(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
      }
    }
    
    logSuccess('Status update tests completed');
  } catch (error) {
    logError(`Update status test failed: ${error.message}`);
    throw error;
  }
}

// Test 3: Update activity
async function testUpdateActivity() {
  logSection('Step 4: Update Activity');
  try {
    const api = getAuthAxios();
    const response = await api.put('/presence/activity', {
      activity: 'Testing presence system'
    });
    
    logSuccess('Activity updated successfully');
    logInfo('Activity: Testing presence system');
  } catch (error) {
    logError(`Update activity failed: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

// Test 4: Send heartbeat
async function testHeartbeat() {
  logSection('Step 5: Send Heartbeat');
  try {
    const api = getAuthAxios();
    const response = await api.post('/presence/heartbeat');
    
    logSuccess('Heartbeat sent successfully');
    logInfo(`Response: ${response.data.message}`);
  } catch (error) {
    logError(`Heartbeat failed: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

// Test 5: Get specific user presence
async function testGetUserPresence(userId) {
  logSection('Step 6: Get Specific User Presence');
  try {
    const api = getAuthAxios();
    const response = await api.get(`/presence/user/${userId}`);
    
    logSuccess('User presence retrieved');
    const presence = response.data.presence;
    log('\nUser Presence Data:', 'cyan');
    log(`  User ID: ${presence.UserId}`, 'yellow');
    log(`  Status: ${presence.Status}`, 'yellow');
    log(`  Activity: ${presence.Activity || 'None'}`, 'yellow');
    log(`  Last Seen: ${presence.LastSeenAt}`, 'yellow');
    log(`  Updated: ${presence.UpdatedAt}`, 'yellow');
    
    return presence;
  } catch (error) {
    logError(`Get user presence failed: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

// Test 6: Bulk presence query
async function testBulkPresence(userIds) {
  logSection('Step 7: Bulk Presence Query');
  try {
    const api = getAuthAxios();
    const response = await api.post('/presence/bulk', {
      userIds: userIds
    });
    
    logSuccess(`Bulk presence retrieved for ${response.data.count} users`);
    response.data.presences.forEach(presence => {
      log(`  - User ${presence.UserId}: ${presence.Status}`, 'yellow');
    });
    
    return response.data;
  } catch (error) {
    logError(`Bulk presence query failed: ${error.message}`);
    if (error.response) {
      logError(`Status: ${error.response.status}`);
      logError(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }
}

// Test 7: Get online users count
async function testGetOnlineUsersCount() {
  logSection('Step 8: Get Online Users Count');
  try {
    const api = getAuthAxios();
    const response = await api.get('/presence/online?limit=100');
    
    logSuccess(`Online users count: ${response.data.count}`);
    return response.data.count;
  } catch (error) {
    logError(`Get online users count failed: ${error.message}`);
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'magenta');
  log('║          PRESENCE SYSTEM TEST SUITE                       ║', 'magenta');
  log('╚════════════════════════════════════════════════════════════╝', 'magenta');
  
  let user = null;
  let testsPassed = 0;
  let testsFailed = 0;
  const totalTests = 8;
  
  try {
    // Test 1: Login
    user = await login();
    testsPassed++;
    
    // Test 2: Get online users
    try {
      await testGetOnlineUsers();
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }
    
    // Test 3: Update status
    try {
      await testUpdateStatus();
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }
    
    // Test 4: Update activity
    try {
      await testUpdateActivity();
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }
    
    // Test 5: Send heartbeat
    try {
      await testHeartbeat();
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }
    
    // Test 6: Get user presence
    if (user) {
      try {
        await testGetUserPresence(user.id);
        testsPassed++;
      } catch (error) {
        testsFailed++;
      }
    }
    
    // Test 7: Bulk presence
    if (user) {
      try {
        await testBulkPresence([user.id]);
        testsPassed++;
      } catch (error) {
        testsFailed++;
      }
    }
    
    // Test 8: Get online users count
    try {
      await testGetOnlineUsersCount();
      testsPassed++;
    } catch (error) {
      testsFailed++;
    }
    
  } catch (error) {
    logError(`\nTest suite failed to complete: ${error.message}`);
  }
  
  // Final report
  logSection('Test Results Summary');
  log(`Total Tests: ${totalTests}`, 'cyan');
  log(`Passed: ${testsPassed}`, 'green');
  log(`Failed: ${testsFailed}`, 'red');
  log(`Success Rate: ${((testsPassed / totalTests) * 100).toFixed(1)}%`, testsPassed === totalTests ? 'green' : 'yellow');
  
  if (testsPassed === totalTests) {
    log('\n🎉 All tests passed! Presence system is working correctly.', 'green');
  } else {
    log('\n⚠️ Some tests failed. Please review the errors above.', 'red');
  }
  
  log('\n');
}

// Run tests
runAllTests().catch(error => {
  logError(`\nUnexpected error: ${error.message}`);
  process.exit(1);
});
