// Simple test file to verify bookmark API endpoints
// Run this with: node test-bookmark-api.js

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
let authToken = '';

// Test data
const testUser = {
  email: 'test@test.com',
  password: 'password123'
};

async function testBookmarkAPI() {
  try {
    console.log('🧪 Testing Bookmark API...\n');

    // Step 1: Login to get auth token
    console.log('1. Logging in...');
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser);
      authToken = loginResponse.data.token;
      console.log('✅ Login successful');
    } catch (error) {
      console.log('⚠️  Login failed, continuing without auth token');
    }

    // Create axios instance with auth
    const api = axios.create({
      baseURL: `${API_BASE}/bookmarks`,
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });

    // Step 2: Get all courses to find a test course ID
    console.log('\n2. Getting courses...');
    const coursesResponse = await axios.get(`${API_BASE}/courses`);
    const testCourseId = coursesResponse.data.courses[0]?.Id;
    
    if (!testCourseId) {
      console.log('❌ No courses found to test with');
      return;
    }
    console.log(`✅ Found test course: ${testCourseId}`);

    // Step 3: Check initial bookmark status
    console.log('\n3. Checking bookmark status...');
    const statusResponse = await api.get(`/check/${testCourseId}`);
    console.log('✅ Bookmark status:', statusResponse.data);

    // Step 4: Add bookmark
    console.log('\n4. Adding bookmark...');
    try {
      const addResponse = await api.post(`/${testCourseId}`, {
        notes: 'Test bookmark note'
      });
      console.log('✅ Bookmark added:', addResponse.data);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('⚠️  Bookmark already exists');
      } else {
        throw error;
      }
    }

    // Step 5: Get user bookmarks
    console.log('\n5. Getting user bookmarks...');
    const bookmarksResponse = await api.get('/');
    console.log('✅ User bookmarks:', bookmarksResponse.data);

    // Step 6: Update bookmark notes
    console.log('\n6. Updating bookmark notes...');
    const updateResponse = await api.patch(`/${testCourseId}`, {
      notes: 'Updated test note'
    });
    console.log('✅ Bookmark updated:', updateResponse.data);

    // Step 7: Remove bookmark
    console.log('\n7. Removing bookmark...');
    const removeResponse = await api.delete(`/${testCourseId}`);
    console.log('✅ Bookmark removed:', removeResponse.data);

    console.log('\n🎉 All bookmark API tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
    }
  }
}

// Run the test
testBookmarkAPI();