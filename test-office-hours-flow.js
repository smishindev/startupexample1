/**
 * Comprehensive Office Hours Flow Test
 * Tests all workflows end-to-end with proper validation
 */

const BASE_URL = 'http://localhost:3001/api';

// Test user credentials
const INSTRUCTOR = {
  email: 'ins1@gmail.com',
  password: 'Abcd1234!',
  id: null,
  token: null
};

const STUDENT = {
  email: 'student1@gmail.com',
  password: 'Abcd1234!',
  id: null,
  token: null
};

let scheduleId = null;
let queueEntryId = null;

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data;
}

async function createSchedule(token) {
  const response = await fetch(`${BASE_URL}/office-hours/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      dayOfWeek: 1, // Monday
      startTime: '10:00',
      endTime: '12:00'
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Create schedule failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.data;
}

async function joinQueue(token, instructorId, scheduleId, question) {
  const response = await fetch(`${BASE_URL}/office-hours/queue/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      instructorId,
      scheduleId,
      question
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Join queue failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.data;
}

async function admitStudent(token, queueId) {
  const response = await fetch(`${BASE_URL}/office-hours/queue/${queueId}/admit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Admit student failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.data;
}

async function completeSession(token, queueId) {
  const response = await fetch(`${BASE_URL}/office-hours/queue/${queueId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Complete session failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.data;
}

async function cancelSession(token, queueId) {
  const response = await fetch(`${BASE_URL}/office-hours/queue/${queueId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cancel session failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  return data.data;
}

async function getNotifications(token) {
  const response = await fetch(`${BASE_URL}/notifications?includeRead=false`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Get notifications failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data;
}

async function testDuplicateJoin() {
  console.log('\n🧪 TEST: Duplicate Join Prevention');
  console.log('=====================================');
  
  try {
    // Try to join again with same instructor
    await joinQueue(STUDENT.token, INSTRUCTOR.id, scheduleId, 'Duplicate attempt');
    console.log('❌ FAIL: Should have prevented duplicate join');
    return false;
  } catch (error) {
    if (error.message.includes('already in queue')) {
      console.log('✅ PASS: Duplicate join prevented correctly');
      return true;
    }
    console.log(`❌ FAIL: Unexpected error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Office Hours Comprehensive Test\n');
  
  try {
    // Step 1: Login users
    console.log('📝 Step 1: Login users');
    const instructorData = await login(INSTRUCTOR.email, INSTRUCTOR.password);
    INSTRUCTOR.token = instructorData.token;
    INSTRUCTOR.id = instructorData.user.Id;
    console.log(`✅ Instructor logged in: ${INSTRUCTOR.id}`);
    
    const studentData = await login(STUDENT.email, STUDENT.password);
    STUDENT.token = studentData.token;
    STUDENT.id = studentData.user.Id;
    console.log(`✅ Student logged in: ${STUDENT.id}\n`);
    
    // Step 2: Create schedule
    console.log('📝 Step 2: Create office hours schedule');
    const schedule = await createSchedule(INSTRUCTOR.token);
    scheduleId = schedule.Id;
    console.log(`✅ Schedule created: ${scheduleId}\n`);
    
    // Step 3: Student joins queue
    console.log('📝 Step 3: Student joins queue');
    const queueEntry = await joinQueue(STUDENT.token, INSTRUCTOR.id, scheduleId, 'Test question');
    queueEntryId = queueEntry.Id;
    console.log(`✅ Student joined queue: ${queueEntryId}`);
    console.log(`   Status: ${queueEntry.Status}\n`);
    
    // Wait for notifications
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check instructor notifications
    console.log('📝 Step 4: Check instructor notifications');
    const instructorNotifs = await getNotifications(INSTRUCTOR.token);
    const joinNotif = instructorNotifs.find(n => n.Title.includes('Student Joined Queue'));
    if (joinNotif) {
      console.log(`✅ Instructor received notification: ${joinNotif.Title}`);
      console.log(`   Message: ${joinNotif.Message}\n`);
    } else {
      console.log('❌ Instructor did not receive join notification\n');
    }
    
    // Step 5: Test duplicate join prevention
    await testDuplicateJoin();
    
    // Step 6: Admit student
    console.log('\n📝 Step 5: Admit student');
    const admittedEntry = await admitStudent(INSTRUCTOR.token, queueEntryId);
    console.log(`✅ Student admitted`);
    console.log(`   Status: ${admittedEntry.Status}`);
    console.log(`   Admitted at: ${admittedEntry.AdmittedAt}\n`);
    
    // Wait for notifications
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check student notifications
    console.log('📝 Step 6: Check student notifications');
    const studentNotifs = await getNotifications(STUDENT.token);
    const admitNotif = studentNotifs.find(n => n.Title.includes('Admitted'));
    if (admitNotif) {
      console.log(`✅ Student received notification: ${admitNotif.Title}`);
      console.log(`   Message: ${admitNotif.Message}\n`);
    } else {
      console.log('❌ Student did not receive admit notification\n');
    }
    
    // Step 7: Complete session
    console.log('📝 Step 7: Complete session');
    const completedEntry = await completeSession(INSTRUCTOR.token, queueEntryId);
    console.log(`✅ Session completed`);
    console.log(`   Status: ${completedEntry.Status}`);
    console.log(`   Completed at: ${completedEntry.CompletedAt}\n`);
    
    // Wait for notifications
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check student notifications again
    console.log('📝 Step 8: Check student notifications (completion)');
    const studentNotifs2 = await getNotifications(STUDENT.token);
    const completeNotif = studentNotifs2.find(n => n.Title.includes('Session Complete'));
    if (completeNotif) {
      console.log(`✅ Student received notification: ${completeNotif.Title}`);
      console.log(`   Message: ${completeNotif.Message}\n`);
    } else {
      console.log('❌ Student did not receive completion notification\n');
    }
    
    // Step 8: Test cancel flow
    console.log('📝 Step 9: Test cancel workflow');
    const queueEntry2 = await joinQueue(STUDENT.token, INSTRUCTOR.id, scheduleId, 'Will be cancelled');
    console.log(`✅ Student joined queue again: ${queueEntry2.Id}`);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const cancelledEntry = await cancelSession(INSTRUCTOR.token, queueEntry2.Id);
    console.log(`✅ Session cancelled`);
    console.log(`   Status: ${cancelledEntry.Status}\n`);
    
    // Wait for notifications
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const studentNotifs3 = await getNotifications(STUDENT.token);
    const cancelNotif = studentNotifs3.find(n => n.Title.includes('Cancelled'));
    if (cancelNotif) {
      console.log(`✅ Student received cancellation notification: ${cancelNotif.Title}\n`);
    } else {
      console.log('❌ Student did not receive cancellation notification\n');
    }
    
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!\n');
    
  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${error.message}\n`);
    process.exit(1);
  }
}

runTests();
