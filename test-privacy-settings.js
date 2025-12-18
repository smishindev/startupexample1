const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test users
const INSTRUCTOR = { email: 'ins1@gmail.com', password: 'Aa123456' };
const STUDENT1 = { email: 'student1@gmail.com', password: 'Aa123456' };
const STUDENT2 = { email: 'student2@gmail.com', password: 'Aa123456' };

let student1Id = null;
let student2Id = null;
let sharedCourseId = null;

// Helper function to login
async function login(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, { email, password });
    return response.data.data.token;
  } catch (error) {
    console.error(`❌ Login failed for ${email}:`, error.response?.data || error.message);
    throw error;
  }
}

// Helper function to get user profile
async function getUserProfile(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data.user;
  } catch (error) {
    console.error('❌ Failed to get user profile:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to update settings
async function updateSettings(token, settings) {
  try {
    const response = await axios.patch(`${BASE_URL}/api/settings`, settings, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to update settings:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to get settings
async function getSettings(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get settings:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to find a shared course
async function findSharedCourse(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/courses/enrolled`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.courses?.[0]?.Id || null;
  } catch (error) {
    console.error('❌ Failed to get enrolled courses:', error.response?.data || error.message);
    return null;
  }
}

// Test 1: Show Email Privacy
async function testShowEmail() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: SHOW EMAIL PRIVACY');
  console.log('='.repeat(60));

  const student1Token = await login(STUDENT1.email, STUDENT1.password);
  const student2Token = await login(STUDENT2.email, STUDENT2.password);
  const instructorToken = await login(INSTRUCTOR.email, INSTRUCTOR.password);

  const student1Profile = await getUserProfile(student1Token);
  student1Id = student1Profile.id || student1Profile.Id;
  
  console.log(`✅ Student1 ID: ${student1Id}`);

  // Test 1A: Set ShowEmail to OFF for student1
  console.log('\n📝 Test 1A: Student1 sets ShowEmail to OFF');
  await updateSettings(student1Token, { showEmail: false });
  console.log('✅ Student1 ShowEmail set to OFF');

  // Test 1B: Student2 can access list but won't see student1 (different instructor)
  console.log('\n📝 Test 1B: Student2 checks student list (should see empty or own instructor students)');
  try {
    const response = await axios.get(`${BASE_URL}/api/students`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    console.log('✅ PASS: Student2 can access endpoint (returns students from their perspective)');
  } catch (error) {
    console.log('❌ FAIL: Unexpected error:', error.response?.data || error.message);
  }

  // Test 1C: Instructor checks student list (should see email)
  console.log('\n📝 Test 1C: Instructor checks student list (should see email)');
  try {
    const response = await axios.get(`${BASE_URL}/api/students`, {
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    const student1InList = response.data.find(s => s.id === student1Id);
    if (student1InList && student1InList.email === STUDENT1.email) {
      console.log('✅ PASS: Instructor can see student1 email (instructor override works)');
    } else if (student1InList && !student1InList.email) {
      console.log('❌ FAIL: Instructor cannot see student1 email');
    } else {
      console.log('⚠️  Student1 not found in instructor student list');
    }
  } catch (error) {
    console.log('❌ FAIL: Error checking instructor student list:', error.response?.data || error.message);
  }

  // Test 1D: Set ShowEmail to ON for student1
  console.log('\n📝 Test 1D: Student1 sets ShowEmail to ON');
  await updateSettings(student1Token, { showEmail: true });
  console.log('✅ Student1 ShowEmail set to ON');

  // Test 1E: Student2 checks again
  console.log('\n📝 Test 1E: Student2 accesses student list again');
  try {
    const response = await axios.get(`${BASE_URL}/api/students`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    console.log('✅ PASS: Student2 can access endpoint');
  } catch (error) {
    console.log('❌ FAIL: Unexpected error:', error.response?.data || error.message);
  }
}

// Test 2: Show Learning Progress Privacy
async function testShowProgress() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: SHOW LEARNING PROGRESS PRIVACY');
  console.log('='.repeat(60));

  const student1Token = await login(STUDENT1.email, STUDENT1.password);
  const student2Token = await login(STUDENT2.email, STUDENT2.password);
  const instructorToken = await login(INSTRUCTOR.email, INSTRUCTOR.password);

  if (!student1Id) {
    const student1Profile = await getUserProfile(student1Token);
    student1Id = student1Profile.id || student1Profile.Id;
  }

  // Test 2A: Set ShowProgress to OFF for student1
  console.log('\n📝 Test 2A: Student1 sets ShowProgress to OFF');
  await updateSettings(student1Token, { showProgress: false });
  console.log('✅ Student1 ShowProgress set to OFF');

  // Test 2B: Student2 tries to view student1's progress
  console.log('\n📝 Test 2B: Student2 tries to view student1 progress');
  try {
    const response = await axios.get(`${BASE_URL}/api/profile/user/${student1Id}/progress`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    console.log('❌ FAIL: Student2 can see student1 progress (should be blocked)');
  } catch (error) {
    if (error.response?.data?.error?.code === 'PROGRESS_PRIVATE') {
      console.log('✅ PASS: Student1 progress is hidden from student2');
    } else {
      console.log('❌ FAIL: Unexpected error:', error.response?.data || error.message);
    }
  }

  // Test 2C: Instructor tries to view student1's progress (should work)
  console.log('\n📝 Test 2C: Instructor tries to view student1 progress (should work)');
  try {
    const response = await axios.get(`${BASE_URL}/api/profile/user/${student1Id}/progress`, {
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    console.log('✅ PASS: Instructor can see student1 progress (instructor override works)');
  } catch (error) {
    if (error.response?.data?.error?.code === 'PROGRESS_PRIVATE') {
      console.log('❌ FAIL: Instructor cannot see student1 progress (override not working)');
    } else {
      console.log('❌ FAIL: Unexpected error:', error.response?.data || error.message);
    }
  }

  // Test 2D: Set ShowProgress to ON for student1
  console.log('\n📝 Test 2D: Student1 sets ShowProgress to ON');
  await updateSettings(student1Token, { showProgress: true });
  console.log('✅ Student1 ShowProgress set to ON');

  // Test 2E: Student2 tries again (should work now)
  console.log('\n📝 Test 2E: Student2 tries to view student1 progress again');
  try {
    const response = await axios.get(`${BASE_URL}/api/profile/user/${student1Id}/progress`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    console.log('✅ PASS: Student2 can now see student1 progress');
  } catch (error) {
    if (error.response?.data?.error?.code === 'PROGRESS_PRIVATE') {
      console.log('❌ FAIL: Student1 progress still hidden after setting to ON');
    } else {
      console.log('❌ FAIL: Unexpected error:', error.response?.data || error.message);
    }
  }
}

// Test 3: Profile Visibility
async function testProfileVisibility() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: PROFILE VISIBILITY');
  console.log('='.repeat(60));

  const student1Token = await login(STUDENT1.email, STUDENT1.password);
  const student2Token = await login(STUDENT2.email, STUDENT2.password);
  const instructorToken = await login(INSTRUCTOR.email, INSTRUCTOR.password);

  if (!student1Id) {
    const student1Profile = await getUserProfile(student1Token);
    student1Id = student1Profile.id || student1Profile.Id;
  }

  // Test 3A: Set ProfileVisibility to private for student1
  console.log('\n📝 Test 3A: Student1 sets ProfileVisibility to PRIVATE');
  await updateSettings(student1Token, { profileVisibility: 'private' });
  console.log('✅ Student1 ProfileVisibility set to PRIVATE');

  // Test 3B: Student2 tries to view student1's profile
  console.log('\n📝 Test 3B: Student2 tries to view student1 profile');
  try {
    const response = await axios.get(`${BASE_URL}/api/profile/user/${student1Id}`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    console.log('❌ FAIL: Student2 can see student1 profile (should be blocked)');
  } catch (error) {
    if (error.response?.data?.error?.code === 'PROFILE_PRIVATE') {
      console.log('✅ PASS: Student1 profile is hidden from student2');
    } else {
      console.log('❌ FAIL: Unexpected error:', error.response?.data || error.message);
    }
  }

  // Test 3C: Instructor tries to view student1's profile (should work)
  console.log('\n📝 Test 3C: Instructor tries to view student1 profile (should work)');
  try {
    const response = await axios.get(`${BASE_URL}/api/profile/user/${student1Id}`, {
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    console.log('✅ PASS: Instructor can see student1 profile (instructor override works)');
  } catch (error) {
    console.log('❌ FAIL: Instructor cannot see student1 profile:', error.response?.data || error.message);
  }

  // Test 3D: Set ProfileVisibility to students for student1
  console.log('\n📝 Test 3D: Student1 sets ProfileVisibility to STUDENTS');
  await updateSettings(student1Token, { profileVisibility: 'students' });
  console.log('✅ Student1 ProfileVisibility set to STUDENTS');

  // Test 3E: Student2 tries again (should work if they share a course)
  console.log('\n📝 Test 3E: Student2 tries to view student1 profile again');
  try {
    const response = await axios.get(`${BASE_URL}/api/profile/user/${student1Id}`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    console.log('✅ PASS: Student2 can now see student1 profile (students mode)');
  } catch (error) {
    if (error.response?.data?.error?.code === 'PROFILE_PRIVATE') {
      console.log('⚠️  Student2 cannot see profile - likely not enrolled in same course');
    } else {
      console.log('❌ FAIL: Unexpected error:', error.response?.data || error.message);
    }
  }

  // Test 3F: Set ProfileVisibility to public for student1
  console.log('\n📝 Test 3F: Student1 sets ProfileVisibility to PUBLIC');
  await updateSettings(student1Token, { profileVisibility: 'public' });
  console.log('✅ Student1 ProfileVisibility set to PUBLIC');

  // Test 3G: Student2 tries again (should definitely work now)
  console.log('\n📝 Test 3G: Student2 tries to view student1 profile again');
  try {
    const response = await axios.get(`${BASE_URL}/api/profile/user/${student1Id}`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    console.log('✅ PASS: Student2 can see student1 profile (public mode)');
  } catch (error) {
    console.log('❌ FAIL: Student2 still cannot see profile:', error.response?.data || error.message);
  }
}

// Test 4: Instructor Student Management Page
async function testInstructorPages() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: INSTRUCTOR PAGES (Email Filtering)');
  console.log('='.repeat(60));

  const student1Token = await login(STUDENT1.email, STUDENT1.password);
  const instructorToken = await login(INSTRUCTOR.email, INSTRUCTOR.password);

  if (!student1Id) {
    const student1Profile = await getUserProfile(student1Token);
    student1Id = student1Profile.id || student1Profile.Id;
  }

  // Test 4A: Student1 hides email
  console.log('\n📝 Test 4A: Student1 sets ShowEmail to OFF');
  await updateSettings(student1Token, { showEmail: false });

  // Test 4B: Check /api/students endpoint
  console.log('\n📝 Test 4B: Instructor checks /api/students');
  try {
    const response = await axios.get(`${BASE_URL}/api/students`, {
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    const student1InList = response.data.find(s => s.id === student1Id);
    if (student1InList && student1InList.email === STUDENT1.email) {
      console.log('✅ PASS: Instructor can see student1 email despite ShowEmail OFF (instructor override)');
    } else if (student1InList) {
      console.log(`❌ FAIL: Instructor cannot see student1 email: ${student1InList.email}`);
    } else {
      console.log('⚠️  Student1 not found in list');
    }
  } catch (error) {
    console.log('❌ FAIL: Error:', error.response?.data || error.message);
  }

  // Test 4C: Check /api/instructor/at-risk-students endpoint
  console.log('\n📝 Test 4C: Instructor checks at-risk students dashboard');
  try {
    const response = await axios.get(`${BASE_URL}/api/instructor/at-risk-students`, {
      headers: { Authorization: `Bearer ${instructorToken}` }
    });
    console.log('✅ PASS: At-risk students dashboard accessible');
  } catch (error) {
    console.log('❌ FAIL: Error:', error.response?.data || error.message);
  }

  // Reset email visibility
  await updateSettings(student1Token, { showEmail: true });
}

// Test 5: Other Endpoints
async function testOtherEndpoints() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: OTHER FILTERED ENDPOINTS');
  console.log('='.repeat(60));

  const student1Token = await login(STUDENT1.email, STUDENT1.password);
  const student2Token = await login(STUDENT2.email, STUDENT2.password);

  // Test 5A: Set email to hidden
  console.log('\n📝 Test 5A: Student1 hides email');
  await updateSettings(student1Token, { showEmail: false });

  // Test 5B: Check /api/users/instructors
  console.log('\n📝 Test 5B: Check instructors list endpoint');
  try {
    const response = await axios.get(`${BASE_URL}/api/users/instructors`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    console.log('✅ PASS: Instructors list accessible');
  } catch (error) {
    console.log('❌ FAIL: Error:', error.response?.data || error.message);
  }

  // Test 5C: Check /api/presence/online
  console.log('\n📝 Test 5C: Check online users endpoint');
  try {
    const response = await axios.get(`${BASE_URL}/api/presence/online`, {
      headers: { Authorization: `Bearer ${student2Token}` }
    });
    const student1Online = response.data.onlineUsers?.find(u => u.userId === student1Id);
    if (student1Online && !student1Online.email) {
      console.log('✅ PASS: Student1 email hidden in online users');
    } else if (student1Online && student1Online.email) {
      console.log('❌ FAIL: Student1 email visible in online users');
    } else {
      console.log('⚠️  Student1 not online');
    }
  } catch (error) {
    console.log('⚠️  Endpoint might not exist or error:', error.response?.data || error.message);
  }

  // Reset
  await updateSettings(student1Token, { showEmail: true, showProgress: true, profileVisibility: 'public' });
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '█'.repeat(60));
  console.log('█' + ' '.repeat(58) + '█');
  console.log('█' + '  PRIVACY SETTINGS COMPREHENSIVE TEST SUITE'.padEnd(58) + '█');
  console.log('█' + ' '.repeat(58) + '█');
  console.log('█'.repeat(60));

  try {
    await testShowEmail();
    await testShowProgress();
    await testProfileVisibility();
    await testInstructorPages();
    await testOtherEndpoints();

    console.log('\n' + '█'.repeat(60));
    console.log('█' + ' '.repeat(58) + '█');
    console.log('█' + '  ALL TESTS COMPLETED'.padEnd(58) + '█');
    console.log('█' + ' '.repeat(58) + '█');
    console.log('█'.repeat(60));
    console.log('\n✅ Test suite finished. Review results above.\n');

  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests();
