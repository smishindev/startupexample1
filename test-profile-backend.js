/**
 * Profile API Backend Test Script
 * Tests all profile endpoints using Node.js
 * 
 * Run: node test-profile-backend.js
 */

const https = require('https');
const http = require('http');

const API_URL = 'http://localhost:3001/api';
const TEST_USER = {
  email: 'student1@gmail.com',
  password: 'Aa123456'
};

let authToken = '';

// Helper for API calls
function apiCall(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    // endpoint already includes /api prefix
    const url = endpoint.startsWith('/api') 
      ? `${API_URL.replace('/api', '')}${endpoint}`
      : `${API_URL}${endpoint}`;
    const urlObj = new URL(url);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test Suite
async function runProfileTests() {
  console.log('🧪 Starting Profile API Backend Tests...\n');
  console.log('═══════════════════════════════════════\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Step 0: Login
    console.log('🔐 Step 0: Login as student1@gmail.com');
    const loginResult = await apiCall('POST', '/api/auth/login', TEST_USER);
    if (loginResult.status === 200 && loginResult.data.success) {
      authToken = loginResult.data.data.token;
      console.log('✅ Login successful');
      console.log('   Token:', authToken.substring(0, 20) + '...');
      testsPassed++;
    } else {
      console.error('❌ Login failed:', loginResult.data);
      testsFailed++;
      return;
    }
    console.log('');

    // Test 1: Get Profile
    console.log('📋 Test 1: GET /api/profile');
    const profileResult = await apiCall('GET', '/profile');
    if (profileResult.status === 200 && profileResult.data.success) {
      console.log('✅ PASS - Profile retrieved successfully');
      console.log('   User:', profileResult.data.data.firstName, profileResult.data.data.lastName);
      console.log('   Email:', profileResult.data.data.email);
      console.log('   Role:', profileResult.data.data.role);
      console.log('   Username:', profileResult.data.data.username);
      testsPassed++;
    } else {
      console.error('❌ FAIL - Failed to get profile');
      console.error('   Error:', profileResult.data);
      testsFailed++;
    }
    console.log('');
    
    // Test 2: Update Personal Info
    console.log('📝 Test 2: PUT /api/profile/personal-info');
    const updatePersonalResult = await apiCall('PUT', '/profile/personal-info', {
      firstName: 'Student',
      lastName: 'One',
      username: 'student1',
      learningStyle: 'visual'
    });
    if (updatePersonalResult.status === 200 && updatePersonalResult.data.success) {
      console.log('✅ PASS - Personal info updated successfully');
      console.log('   Message:', updatePersonalResult.data.message);
      testsPassed++;
    } else {
      console.error('❌ FAIL - Failed to update personal info');
      console.error('   Error:', updatePersonalResult.data);
      testsFailed++;
    }
    console.log('');
    
    // Test 3: Update Billing Address
    console.log('🏠 Test 3: PUT /api/profile/billing-address');
    const updateBillingResult = await apiCall('PUT', '/profile/billing-address', {
      streetAddress: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      postalCode: '12345',
      country: 'Test Country'
    });
    if (updateBillingResult.status === 200 && updateBillingResult.data.success) {
      console.log('✅ PASS - Billing address updated successfully');
      console.log('   Message:', updateBillingResult.data.message);
      testsPassed++;
    } else {
      console.error('❌ FAIL - Failed to update billing address');
      console.error('   Error:', updateBillingResult.data);
      testsFailed++;
    }
    console.log('');
    
    // Test 4: Update Avatar
    console.log('🖼️ Test 4: PUT /api/profile/avatar');
    const updateAvatarResult = await apiCall('PUT', '/profile/avatar', {
      avatar: 'https://i.pravatar.cc/150?img=1'
    });
    if (updateAvatarResult.status === 200 && updateAvatarResult.data.success) {
      console.log('✅ PASS - Avatar updated successfully');
      console.log('   New Avatar:', updateAvatarResult.data.data.avatar);
      testsPassed++;
    } else {
      console.error('❌ FAIL - Failed to update avatar');
      console.error('   Error:', updateAvatarResult.data);
      testsFailed++;
    }
    console.log('');
    
    // Test 5: Update Preferences
    console.log('⚙️ Test 5: PUT /api/profile/preferences');
    const updatePreferencesResult = await apiCall('PUT', '/profile/preferences', {
      preferences: {
        notifications: true,
        emailUpdates: false,
        theme: 'dark',
        language: 'en'
      }
    });
    if (updatePreferencesResult.status === 200 && updatePreferencesResult.data.success) {
      console.log('✅ PASS - Preferences updated successfully');
      console.log('   Message:', updatePreferencesResult.data.message);
      testsPassed++;
    } else {
      console.error('❌ FAIL - Failed to update preferences');
      console.error('   Error:', updatePreferencesResult.data);
      testsFailed++;
    }
    console.log('');
    
    // Test 6: Verify Updates - Get Profile Again
    console.log('🔍 Test 6: Verify Updates - GET /api/profile');
    const verifyResult = await apiCall('GET', '/profile');
    if (verifyResult.status === 200 && verifyResult.data.success) {
      const profile = verifyResult.data.data;
      let allChecksPass = true;
      
      // Check personal info
      if (profile.firstName === 'Student' && profile.lastName === 'One') {
        console.log('   ✅ Name: Student One');
      } else {
        console.log('   ❌ Name not updated correctly');
        allChecksPass = false;
      }
      
      // Check learning style
      if (profile.learningStyle === 'visual') {
        console.log('   ✅ Learning Style: visual');
      } else {
        console.log('   ❌ Learning style not updated');
        allChecksPass = false;
      }
      
      // Check billing address
      if (profile.billingAddress.streetAddress === '123 Test Street' &&
          profile.billingAddress.city === 'Test City') {
        console.log('   ✅ Billing Address: 123 Test Street, Test City');
      } else {
        console.log('   ❌ Billing address not updated');
        allChecksPass = false;
      }
      
      // Check avatar
      if (profile.avatar === 'https://i.pravatar.cc/150?img=1') {
        console.log('   ✅ Avatar: https://i.pravatar.cc/150?img=1');
      } else {
        console.log('   ❌ Avatar not updated');
        allChecksPass = false;
      }
      
      // Check preferences
      if (profile.preferences && profile.preferences.theme === 'dark') {
        console.log('   ✅ Preferences: theme=dark');
      } else {
        console.log('   ❌ Preferences not updated');
        allChecksPass = false;
      }
      
      if (allChecksPass) {
        console.log('✅ PASS - All updates verified successfully');
        testsPassed++;
      } else {
        console.error('❌ FAIL - Some updates not verified');
        testsFailed++;
      }
    } else {
      console.error('❌ FAIL - Failed to verify updates');
      console.error('   Error:', verifyResult.data);
      testsFailed++;
    }
    console.log('');
    
    // Test 7: Invalid Username (should fail - conflict)
    console.log('❌ Test 7: Invalid Username - Should FAIL (409 Conflict)');
    const invalidUsernameResult = await apiCall('PUT', '/profile/personal-info', {
      firstName: 'Student',
      lastName: 'One',
      username: 'ins1', // Try to use instructor's username
      learningStyle: 'visual'
    });
    if (invalidUsernameResult.status === 409) {
      console.log('✅ PASS - Username conflict detected correctly');
      console.log('   Error Message:', invalidUsernameResult.data.message);
      testsPassed++;
    } else {
      console.error('❌ FAIL - Should have rejected duplicate username');
      console.error('   Got status:', invalidUsernameResult.status);
      testsFailed++;
    }
    console.log('');
    
    // Test 8: Missing Required Fields (should fail)
    console.log('❌ Test 8: Missing Required Fields - Should FAIL (400 Bad Request)');
    const missingFieldsResult = await apiCall('PUT', '/profile/personal-info', {
      firstName: 'Student'
      // Missing lastName and username
    });
    if (missingFieldsResult.status === 400) {
      console.log('✅ PASS - Missing fields validation working');
      console.log('   Error Message:', missingFieldsResult.data.message);
      testsPassed++;
    } else {
      console.error('❌ FAIL - Should have rejected missing required fields');
      console.error('   Got status:', missingFieldsResult.status);
      testsFailed++;
    }
    console.log('');
    
    // Test 9: Change Password with Wrong Current Password (should fail)
    console.log('❌ Test 9: Wrong Current Password - Should FAIL (401 Unauthorized)');
    const wrongPasswordResult = await apiCall('PUT', '/profile/password', {
      currentPassword: 'WrongPassword123',
      newPassword: 'NewPassword123'
    });
    if (wrongPasswordResult.status === 401) {
      console.log('✅ PASS - Wrong password rejected correctly');
      console.log('   Error Message:', wrongPasswordResult.data.message);
      testsPassed++;
    } else {
      console.error('❌ FAIL - Should have rejected wrong current password');
      console.error('   Got status:', wrongPasswordResult.status);
      testsFailed++;
    }
    console.log('');
    
    // Test 10: Weak New Password (should fail)
    console.log('❌ Test 10: Weak Password - Should FAIL (400 Bad Request)');
    const weakPasswordResult = await apiCall('PUT', '/profile/password', {
      currentPassword: 'Aa123456',
      newPassword: 'weak'
    });
    if (weakPasswordResult.status === 400) {
      console.log('✅ PASS - Weak password rejected correctly');
      console.log('   Error Message:', weakPasswordResult.data.message);
      testsPassed++;
    } else {
      console.error('❌ FAIL - Should have rejected weak password');
      console.error('   Got status:', weakPasswordResult.status);
      testsFailed++;
    }
    console.log('');
    
    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Tests Passed: ${testsPassed}/${testsPassed + testsFailed}`);
    console.log(`❌ Tests Failed: ${testsFailed}/${testsPassed + testsFailed}`);
    console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════\n');
    
    if (testsFailed === 0) {
      console.log('🎉 ALL TESTS PASSED! Profile API is working correctly.\n');
      console.log('✨ Next Steps:');
      console.log('   1. Login to the app at http://localhost:5173');
      console.log('   2. Navigate to Profile page');
      console.log('   3. Test the UI functionality');
      console.log('   4. Verify all changes are reflected\n');
    } else {
      console.log('⚠️ Some tests failed. Check the errors above.\n');
    }
    
  } catch (error) {
    console.error('💥 Test suite error:', error);
    testsFailed++;
  }
}

// Run tests
console.log('═══════════════════════════════════════');
console.log('🚀 PROFILE API BACKEND TEST SUITE');
console.log('═══════════════════════════════════════');
console.log('📍 API URL:', API_URL);
console.log('👤 Test User:', TEST_USER.email);
console.log('═══════════════════════════════════════\n');

runProfileTests().catch(console.error);
