// Test script for Adaptive Assessment API endpoints
// Run this in browser console or as a Node.js script

const API_BASE = 'http://localhost:3001';

// You'll need to replace these with actual values from your system
const TEST_CONFIG = {
  assessmentId: 'YOUR_ASSESSMENT_ID_HERE', // Replace with actual assessment ID
  submissionId: 'YOUR_SUBMISSION_ID_HERE', // Will be generated when starting assessment
  authToken: 'YOUR_AUTH_TOKEN_HERE' // Get from localStorage.getItem('token') in browser
};

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_CONFIG.authToken}`
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const result = await response.json();
  
  console.log(`${method} ${endpoint}:`, result);
  return result;
}

// Test 1: Start an assessment
async function testStartAssessment() {
  console.log('🧪 Testing: Start Assessment');
  try {
    const result = await apiCall(`/api/assessments/${TEST_CONFIG.assessmentId}/start`, 'POST');
    TEST_CONFIG.submissionId = result.submissionId;
    console.log('✅ Assessment started successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to start assessment:', error);
  }
}

// Test 2: Get first adaptive question
async function testGetFirstQuestion() {
  console.log('🧪 Testing: Get First Adaptive Question');
  try {
    const result = await apiCall(`/api/assessments/${TEST_CONFIG.assessmentId}/adaptive/next-question`, 'POST', {
      submissionId: TEST_CONFIG.submissionId,
      answeredQuestions: [],
      recentPerformance: { correct: 0, total: 0, avgDifficulty: 5 }
    });
    console.log('✅ First question retrieved');
    return result;
  } catch (error) {
    console.error('❌ Failed to get first question:', error);
  }
}

// Test 3: Submit an answer (correct)
async function testSubmitCorrectAnswer(questionId, answer) {
  console.log('🧪 Testing: Submit Correct Answer');
  try {
    const result = await apiCall(`/api/assessments/${TEST_CONFIG.assessmentId}/adaptive/submit-answer`, 'POST', {
      submissionId: TEST_CONFIG.submissionId,
      questionId,
      answer,
      timeSpent: 30
    });
    console.log('✅ Correct answer submitted');
    return result;
  } catch (error) {
    console.error('❌ Failed to submit answer:', error);
  }
}

// Test 4: Get next question after correct answer
async function testGetNextQuestionAfterCorrect(answeredQuestions) {
  console.log('🧪 Testing: Get Next Question (After Correct Answer)');
  try {
    const result = await apiCall(`/api/assessments/${TEST_CONFIG.assessmentId}/adaptive/next-question`, 'POST', {
      submissionId: TEST_CONFIG.submissionId,
      answeredQuestions,
      recentPerformance: { correct: 1, total: 1, avgDifficulty: 5 }
    });
    console.log('✅ Next question retrieved (should be harder)');
    return result;
  } catch (error) {
    console.error('❌ Failed to get next question:', error);
  }
}

// Test 5: Submit incorrect answer
async function testSubmitIncorrectAnswer(questionId, wrongAnswer) {
  console.log('🧪 Testing: Submit Incorrect Answer');
  try {
    const result = await apiCall(`/api/assessments/${TEST_CONFIG.assessmentId}/adaptive/submit-answer`, 'POST', {
      submissionId: TEST_CONFIG.submissionId,
      questionId,
      answer: wrongAnswer,
      timeSpent: 45
    });
    console.log('✅ Incorrect answer submitted');
    return result;
  } catch (error) {
    console.error('❌ Failed to submit incorrect answer:', error);
  }
}

// Test 6: Get next question after incorrect answer
async function testGetNextQuestionAfterIncorrect(answeredQuestions) {
  console.log('🧪 Testing: Get Next Question (After Incorrect Answer)');
  try {
    const result = await apiCall(`/api/assessments/${TEST_CONFIG.assessmentId}/adaptive/next-question`, 'POST', {
      submissionId: TEST_CONFIG.submissionId,
      answeredQuestions,
      recentPerformance: { correct: 1, total: 2, avgDifficulty: 6 }
    });
    console.log('✅ Next question retrieved (should be easier)');
    return result;
  } catch (error) {
    console.error('❌ Failed to get next question:', error);
  }
}

// Test 7: Complete assessment
async function testCompleteAssessment(answers) {
  console.log('🧪 Testing: Complete Assessment');
  try {
    const result = await apiCall(`/api/assessments/submissions/${TEST_CONFIG.submissionId}/submit`, 'POST', {
      answers
    });
    console.log('✅ Assessment completed with adaptive scoring');
    return result;
  } catch (error) {
    console.error('❌ Failed to complete assessment:', error);
  }
}

// Run full test sequence
async function runFullAdaptiveTest() {
  console.log('🚀 Starting Full Adaptive Assessment Test');
  
  // Step 1: Start assessment
  await testStartAssessment();
  
  if (!TEST_CONFIG.submissionId) {
    console.error('❌ Cannot continue without submission ID');
    return;
  }
  
  // Step 2: Get first question
  const firstQuestion = await testGetFirstQuestion();
  if (!firstQuestion || !firstQuestion.question) {
    console.error('❌ No first question received');
    return;
  }
  
  const answeredQuestions = [];
  const answers = {};
  
  // Step 3: Answer first question correctly
  const correctAnswer = firstQuestion.question.type === 'multiple_choice' ? 
    firstQuestion.question.options[0] : 'correct_answer';
  
  const firstResult = await testSubmitCorrectAnswer(firstQuestion.question.id, correctAnswer);
  answeredQuestions.push({
    questionId: firstQuestion.question.id,
    correct: firstResult.correct,
    difficulty: firstResult.difficulty
  });
  answers[firstQuestion.question.id] = correctAnswer;
  
  // Step 4: Get next question (should be harder)
  const secondQuestion = await testGetNextQuestionAfterCorrect(answeredQuestions);
  
  if (secondQuestion && secondQuestion.question) {
    // Step 5: Answer second question incorrectly
    const wrongAnswer = 'wrong_answer';
    const secondResult = await testSubmitIncorrectAnswer(secondQuestion.question.id, wrongAnswer);
    answeredQuestions.push({
      questionId: secondQuestion.question.id,
      correct: secondResult.correct,
      difficulty: secondResult.difficulty
    });
    answers[secondQuestion.question.id] = wrongAnswer;
    
    // Step 6: Get next question (should be easier)
    await testGetNextQuestionAfterIncorrect(answeredQuestions);
  }
  
  // Step 7: Complete assessment
  await testCompleteAssessment(answers);
  
  console.log('🎉 Full adaptive test completed!');
}

// Instructions for use:
console.log(`
📋 Adaptive Assessment Testing Instructions:

1. First, update the TEST_CONFIG object with your actual values:
   - assessmentId: ID of your adaptive assessment
   - authToken: Your authentication token (get from localStorage.getItem('token'))

2. Run individual tests:
   - testStartAssessment()
   - testGetFirstQuestion()
   - etc.

3. Or run the full test sequence:
   - runFullAdaptiveTest()

4. Watch the console for test results and check server logs for adaptive algorithm decisions.
`);

// Export functions for manual testing
if (typeof module !== 'undefined') {
  module.exports = {
    testStartAssessment,
    testGetFirstQuestion,
    testSubmitCorrectAnswer,
    testSubmitIncorrectAnswer,
    runFullAdaptiveTest,
    TEST_CONFIG
  };
}