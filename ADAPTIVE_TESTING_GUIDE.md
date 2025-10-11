# Adaptive Assessment Testing Guide

## Test Setup Instructions

### 1. Create Test Adaptive Assessment

Follow these steps to create a test adaptive assessment:

1. **Navigate to Course Management**
   - Go to http://localhost:5173/instructor
   - Click on one of your courses
   - Click on a lesson where you want to add the assessment

2. **Create New Adaptive Assessment**
   - Click "Add Assessment" 
   - Fill in the details:
     - Title: "Adaptive Math Test"
     - Type: "quiz"
     - Passing Score: 70
     - Max Attempts: 3
     - Time Limit: 30 minutes
     - **✅ CHECK "Adaptive Assessment" checkbox**

3. **Add Questions with Different Difficulty Levels**

   Add these test questions with specific difficulty levels:

   **Easy Questions (Difficulty 2-3):**
   ```
   Question 1: What is 2 + 2?
   Type: Multiple Choice
   Options: A) 3, B) 4, C) 5, D) 6
   Correct Answer: B) 4
   Difficulty: 2
   Adaptive Weight: 1
   Tags: ["basic_math", "addition"]
   ```

   ```
   Question 2: Is 5 greater than 3?
   Type: True/False
   Correct Answer: True
   Difficulty: 2
   Adaptive Weight: 1
   Tags: ["basic_math", "comparison"]
   ```

   **Medium Questions (Difficulty 5-6):**
   ```
   Question 3: What is 15 × 7?
   Type: Multiple Choice
   Options: A) 95, B) 105, C) 115, D) 125
   Correct Answer: B) 105
   Difficulty: 5
   Adaptive Weight: 1.5
   Tags: ["multiplication", "intermediate"]
   ```

   ```
   Question 4: Solve for x: 2x + 5 = 13
   Type: Short Answer
   Correct Answer: 4
   Difficulty: 6
   Adaptive Weight: 2
   Tags: ["algebra", "equations"]
   ```

   **Hard Questions (Difficulty 8-9):**
   ```
   Question 5: What is the derivative of x² + 3x?
   Type: Short Answer
   Correct Answer: 2x + 3
   Difficulty: 8
   Adaptive Weight: 3
   Tags: ["calculus", "derivatives"]
   ```

   ```
   Question 6: If f(x) = x³ - 2x² + x - 1, what is f(2)?
   Type: Multiple Choice
   Options: A) 1, B) 3, C) 5, D) 7
   Correct Answer: A) 1
   Difficulty: 9
   Adaptive Weight: 3
   Tags: ["functions", "advanced"]
   ```

### 2. Test the Adaptive Flow

#### **Test Case 1: High Performer**
1. Take the assessment and answer the first few questions correctly
2. **Expected Behavior:**
   - Should get progressively harder questions
   - Difficulty indicator should increase
   - Questions should come from higher difficulty pools

#### **Test Case 2: Struggling Student**
1. Refresh and start again (or use a different account)
2. Answer the first few questions incorrectly
3. **Expected Behavior:**
   - Should get easier questions
   - Difficulty should decrease
   - More basic questions should appear

#### **Test Case 3: Mixed Performance**
1. Answer alternating correct/incorrect
2. **Expected Behavior:**
   - Difficulty should stabilize around medium level
   - Questions should be selected from appropriate difficulty range

### 3. What to Look For

#### **Frontend Features to Test:**
- ✅ One question at a time (not all questions shown)
- ✅ Difficulty indicator showing current question difficulty
- ✅ Progress tracking showing answered questions
- ✅ Adaptive completion (assessment ends automatically)
- ✅ Adaptive scoring with difficulty bonuses
- ✅ Learning recommendations based on performance

#### **Backend Features to Verify:**
- ✅ Question selection based on performance
- ✅ Real-time difficulty adjustment
- ✅ Immediate answer scoring
- ✅ Adaptive final scoring
- ✅ Skill updates and recommendations

### 4. Testing Scenarios

#### **Scenario A: Perfect Score Path**
```
Step 1: Answer first question (easy) correctly → Get medium question
Step 2: Answer medium question correctly → Get hard question
Step 3: Answer hard question correctly → Get very hard question
Step 4: Continue until assessment completion
Expected Result: High final score with difficulty bonuses
```

#### **Scenario B: Struggling Student Path**
```
Step 1: Answer first question (easy) incorrectly → Get easier question
Step 2: Answer easy question incorrectly → Get very easy question
Step 3: Answer very easy question correctly → Get easy question
Step 4: Gradual improvement path
Expected Result: Appropriate score with learning recommendations
```

#### **Scenario C: Inconsistent Performance**
```
Step 1: Correct → harder
Step 2: Incorrect → easier
Step 3: Correct → medium
Step 4: Pattern stabilizes around medium difficulty
Expected Result: Balanced assessment at appropriate level
```

### 5. Debug and Monitor

#### **Browser Console:**
- Check for any JavaScript errors
- Monitor network requests to adaptive endpoints
- Verify API responses contain expected data

#### **Server Logs:**
- Watch for adaptive algorithm decisions
- Monitor question selection reasoning
- Check scoring calculations

#### **Database Verification:**
- Check AssessmentSubmissions table for adaptive data
- Verify Questions table has proper difficulty values
- Look at Feedback JSON for adaptive scoring details

### 6. Expected API Endpoints

Test these endpoints manually if needed:
- `POST /api/assessments/:id/adaptive/next-question`
- `POST /api/assessments/:id/adaptive/submit-answer`
- `GET /api/assessments/:id/analytics` (should show adaptive data)

### 7. Comparison Testing

Create both adaptive and traditional assessments with the same questions to compare:
- Traditional: Shows all questions at once
- Adaptive: Shows one question at a time with difficulty adjustment

## Success Criteria

The adaptive assessment is working correctly if:
1. ✅ Questions appear one at a time
2. ✅ Difficulty adjusts based on performance
3. ✅ Assessment completes automatically
4. ✅ Final score includes difficulty bonuses
5. ✅ Learning recommendations are provided
6. ✅ Progress tracking shows adaptive flow
7. ✅ No errors in console or server logs

## Troubleshooting

If something doesn't work:
1. Check server logs for errors
2. Verify database has the IsAdaptive field set to 1
3. Ensure questions have proper Difficulty and AdaptiveWeight values
4. Check browser console for JavaScript errors
5. Verify API endpoints are responding correctly