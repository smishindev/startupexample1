/**
 * Profile API Test Script
 * Test all profile endpoints with student1@gmail.com account
 * 
 * Run in browser console after logging in as student1@gmail.com
 */

// Configuration
const API_URL = 'http://localhost:3001/api';
const TEST_USER = {
  email: 'student1@gmail.com',
  password: 'Aa123456'
};

// Helper to get auth token from localStorage
function getAuthToken() {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    const { state } = JSON.parse(authStorage);
    return state?.token;
  }
  return null;
}

// Helper for API calls
async function apiCall(method, endpoint, data = null) {
  const token = getAuthToken();
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, options);
  const result = await response.json();
  
  console.log(`${method} ${endpoint}:`, response.status, result);
  return { status: response.status, data: result };
}

// Test Suite
async function runProfileTests() {
  console.log('🧪 Starting Profile API Tests...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Test 1: Get Profile
    console.log('📋 Test 1: GET /api/profile');
    const profileResult = await apiCall('GET', '/profile');
    if (profileResult.status === 200 && profileResult.data.success) {
      console.log('✅ PASS - Profile retrieved successfully');
      console.log('   User:', profileResult.data.data.firstName, profileResult.data.data.lastName);
      console.log('   Email:', profileResult.data.data.email);
      console.log('   Role:', profileResult.data.data.role);
      testsPassed++;
    } else {
      console.error('❌ FAIL - Failed to get profile');
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
      testsPassed++;
    } else {
      console.error('❌ FAIL - Failed to update personal info');
      console.error('   Error:', updatePersonalResult.data.message);
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
      testsPassed++;
    } else {
      console.error('❌ FAIL - Failed to update billing address');
      console.error('   Error:', updateBillingResult.data.message);
      testsFailed++;
    }
    console.log('');
    
    // Test 4: Update Avatar
    console.log('🖼️ Test 4: PUT /api/profile/avatar');
    const updateAvatarResult = await apiCall('PUT', '/profile/avatar', {
      avatar: 'https://example.com/avatar.jpg'
    });
    if (updateAvatarResult.status === 200 && updateAvatarResult.data.success) {
      console.log('✅ PASS - Avatar updated successfully');
      testsPassed++;
    } else {
      console.error('❌ FAIL - Failed to update avatar');
      console.error('   Error:', updateAvatarResult.data.message);
      testsFailed++;
    }
    console.log('');
    
    // Test 5: Update Preferences
    console.log('⚙️ Test 5: PUT /api/profile/preferences');
    const updatePreferencesResult = await apiCall('PUT', '/profile/preferences', {
      preferences: {
        notifications: true,
        emailUpdates: false,
        theme: 'dark'
      }
    });
    if (updatePreferencesResult.status === 200 && updatePreferencesResult.data.success) {
      console.log('✅ PASS - Preferences updated successfully');
      testsPassed++;
    } else {
      console.error('❌ FAIL - Failed to update preferences');
      console.error('   Error:', updatePreferencesResult.data.message);
      testsFailed++;
    }
    console.log('');
    
    // Test 6: Verify Updates - Get Profile Again
    console.log('🔍 Test 6: Verify Updates - GET /api/profile');
    const verifyResult = await apiCall('GET', '/profile');
    if (verifyResult.status === 200 && verifyResult.data.success) {
      const profile = verifyResult.data.data;
      const checks = [];
      
      // Check personal info
      if (profile.firstName === 'Student' && profile.lastName === 'One') {
        checks.push('✅ Name updated correctly');
      } else {
        checks.push('❌ Name not updated');
      }
      
      // Check learning style
      if (profile.learningStyle === 'visual') {
        checks.push('✅ Learning style updated correctly');
      } else {
        checks.push('❌ Learning style not updated');
      }
      
      // Check billing address
      if (profile.billingAddress.streetAddress === '123 Test Street' &&
          profile.billingAddress.city === 'Test City') {
        checks.push('✅ Billing address updated correctly');
      } else {
        checks.push('❌ Billing address not updated');
      }
      
      // Check avatar
      if (profile.avatar === 'https://example.com/avatar.jpg') {
        checks.push('✅ Avatar updated correctly');
      } else {
        checks.push('❌ Avatar not updated');
      }
      
      // Check preferences
      if (profile.preferences && profile.preferences.theme === 'dark') {
        checks.push('✅ Preferences updated correctly');
      } else {
        checks.push('❌ Preferences not updated');
      }
      
      checks.forEach(check => console.log('   ' + check));
      
      if (checks.every(c => c.startsWith('   ✅'))) {
        console.log('✅ PASS - All updates verified successfully');
        testsPassed++;
      } else {
        console.error('❌ FAIL - Some updates not verified');
        testsFailed++;
      }
    } else {
      console.error('❌ FAIL - Failed to verify updates');
      testsFailed++;
    }
    console.log('');
    
    // Test 7: Change Password (skip if you want to keep current password)
    console.log('🔐 Test 7: PUT /api/profile/password (SKIPPED for safety)');
    console.log('⚠️ Password change test skipped to avoid locking out test account');
    console.log('   To test manually: Use current password "Aa123456" and a new password');
    console.log('');
    
    // Test 8: Invalid Username (should fail - username already taken)
    console.log('❌ Test 8: Invalid Username - Should FAIL');
    const invalidUsernameResult = await apiCall('PUT', '/profile/personal-info', {
      firstName: 'Student',
      lastName: 'One',
      username: 'ins1', // Try to use instructor's username
      learningStyle: 'visual'
    });
    if (invalidUsernameResult.status === 409) {
      console.log('✅ PASS - Username conflict detected correctly');
      testsPassed++;
    } else {
      console.error('❌ FAIL - Should have rejected duplicate username');
      testsFailed++;
    }
    console.log('');
    
    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════\n');
    
    if (testsFailed === 0) {
      console.log('🎉 ALL TESTS PASSED! Profile system is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check the errors above.');
    }
    
  } catch (error) {
    console.error('💥 Test suite error:', error);
  }
}

// Instructions
console.log('═══════════════════════════════════════');
console.log('📖 PROFILE API TEST INSTRUCTIONS');
console.log('═══════════════════════════════════════');
console.log('1. Make sure backend server is running (port 3001)');
console.log('2. Login to the app as student1@gmail.com / Aa123456');
console.log('3. Open browser console (F12)');
console.log('4. Run: runProfileTests()');
console.log('═══════════════════════════════════════\n');
console.log('✨ Ready! Type runProfileTests() to start testing.');
