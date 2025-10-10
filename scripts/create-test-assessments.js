// Create a simple database service for the script
const sql = require('mssql');

const config = {
  server: 'localhost',
  port: 61299,
  database: 'startUp1',
  user: 'mishin_learn_user',
  password: 'MishinLearn2024!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    useUTC: false,
  },
};

class DatabaseService {
  constructor() {
    this.pool = null;
  }

  async query(sqlQuery, params = {}) {
    if (!this.pool) {
      this.pool = await sql.connect(config);
    }
    
    const request = this.pool.request();
    
    // Add parameters
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
    
    const result = await request.query(sqlQuery);
    return result.recordset;
  }
}
const { v4: uuidv4 } = require('uuid');

async function createTestAssessments() {
  const db = new DatabaseService();

  try {
    console.log('🧪 Creating test assessment data...');

    // Get a test lesson
    const lessons = await db.query(`
      SELECT TOP 1 Id, CourseId, Title FROM dbo.Lessons
    `);

    if (lessons.length === 0) {
      console.log('❌ No lessons found. Please create a lesson first.');
      return;
    }

    const lesson = lessons[0];
    console.log(`✅ Using lesson: ${lesson.Title} (${lesson.Id})`);

    // Create a comprehensive quiz
    const quizId = uuidv4();
    await db.query(`
      INSERT INTO dbo.Assessments (Id, LessonId, Title, Type, PassingScore, MaxAttempts, TimeLimit, IsAdaptive)
      VALUES (@id, @lessonId, @title, @type, @passingScore, @maxAttempts, @timeLimit, @isAdaptive)
    `, {
      id: quizId,
      lessonId: lesson.Id,
      title: 'JavaScript Fundamentals Quiz',
      type: 'quiz',
      passingScore: 70,
      maxAttempts: 3,
      timeLimit: 30,
      isAdaptive: false
    });

    console.log('✅ Created basic quiz assessment');

    // Create questions for the quiz
    const questions = [
      {
        type: 'multiple_choice',
        question: 'What is the correct way to declare a variable in JavaScript?',
        options: ['var myVar = 5;', 'variable myVar = 5;', 'v myVar = 5;', 'declare myVar = 5;'],
        correctAnswer: 'var myVar = 5;',
        explanation: 'The "var" keyword is used to declare variables in JavaScript.',
        difficulty: 3,
        tags: ['variables', 'syntax']
      },
      {
        type: 'true_false',
        question: 'JavaScript is a statically typed language.',
        options: ['True', 'False'],
        correctAnswer: false,
        explanation: 'JavaScript is a dynamically typed language, not statically typed.',
        difficulty: 4,
        tags: ['types', 'fundamentals']
      },
      {
        type: 'short_answer',
        question: 'What method is used to add an element to the end of an array?',
        correctAnswer: 'push',
        explanation: 'The push() method adds one or more elements to the end of an array.',
        difficulty: 2,
        tags: ['arrays', 'methods']
      },
      {
        type: 'multiple_choice',
        question: 'Which of the following is NOT a JavaScript data type?',
        options: ['undefined', 'boolean', 'float', 'string'],
        correctAnswer: 'float',
        explanation: 'JavaScript has number type for all numeric values, not separate integer and float types.',
        difficulty: 5,
        tags: ['data-types', 'fundamentals']
      },
      {
        type: 'code',
        question: 'Write a function that returns the sum of two numbers:',
        correctAnswer: 'function sum(a, b) {\n  return a + b;\n}',
        explanation: 'This function takes two parameters and returns their sum.',
        difficulty: 3,
        tags: ['functions', 'syntax']
      }
    ];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const questionId = uuidv4();

      await db.query(`
        INSERT INTO dbo.Questions (
          Id, AssessmentId, Type, Question, Options, CorrectAnswer, 
          Explanation, Difficulty, Tags, OrderIndex
        )
        VALUES (
          @id, @assessmentId, @type, @question, @options, @correctAnswer,
          @explanation, @difficulty, @tags, @orderIndex
        )
      `, {
        id: questionId,
        assessmentId: quizId,
        type: q.type,
        question: q.question,
        options: q.options ? JSON.stringify(q.options) : null,
        correctAnswer: JSON.stringify(q.correctAnswer),
        explanation: q.explanation,
        difficulty: q.difficulty,
        tags: JSON.stringify(q.tags),
        orderIndex: i
      });
    }

    console.log(`✅ Created ${questions.length} questions for the quiz`);

    // Create an adaptive test
    const adaptiveTestId = uuidv4();
    await db.query(`
      INSERT INTO dbo.Assessments (Id, LessonId, Title, Type, PassingScore, MaxAttempts, TimeLimit, IsAdaptive)
      VALUES (@id, @lessonId, @title, @type, @passingScore, @maxAttempts, @timeLimit, @isAdaptive)
    `, {
      id: adaptiveTestId,
      lessonId: lesson.Id,
      title: 'Adaptive JavaScript Assessment',
      type: 'test',
      passingScore: 75,
      maxAttempts: 2,
      timeLimit: 45,
      isAdaptive: true
    });

    console.log('✅ Created adaptive test assessment');

    // Create questions with varying difficulties for adaptive test
    const adaptiveQuestions = [
      {
        type: 'multiple_choice',
        question: 'What does "==" operator do in JavaScript?',
        options: ['Strict equality', 'Loose equality', 'Assignment', 'Comparison'],
        correctAnswer: 'Loose equality',
        explanation: 'The == operator performs type coercion and checks for loose equality.',
        difficulty: 2,
        adaptiveWeight: 1.0,
        tags: ['operators', 'comparison']
      },
      {
        type: 'multiple_choice',
        question: 'What is the difference between let and const?',
        options: ['No difference', 'let is block-scoped, const is function-scoped', 'const cannot be reassigned', 'let is immutable'],
        correctAnswer: 'const cannot be reassigned',
        explanation: 'const variables cannot be reassigned after declaration, while let variables can be.',
        difficulty: 4,
        adaptiveWeight: 1.2,
        tags: ['variables', 'scope']
      },
      {
        type: 'short_answer',
        question: 'What is closure in JavaScript?',
        correctAnswer: 'A function that has access to variables in its outer scope',
        explanation: 'A closure gives you access to an outer function\'s scope from an inner function.',
        difficulty: 7,
        adaptiveWeight: 2.0,
        tags: ['closures', 'advanced']
      },
      {
        type: 'multiple_choice',
        question: 'What does the spread operator (...) do?',
        options: ['Creates arrays', 'Expands iterables', 'Declares variables', 'Defines functions'],
        correctAnswer: 'Expands iterables',
        explanation: 'The spread operator expands an iterable into individual elements.',
        difficulty: 6,
        adaptiveWeight: 1.5,
        tags: ['es6', 'operators']
      },
      {
        type: 'code',
        question: 'Write a function that uses destructuring to get the first two elements of an array:',
        correctAnswer: 'function getFirstTwo(arr) {\n  const [first, second] = arr;\n  return { first, second };\n}',
        explanation: 'Destructuring assignment allows unpacking values from arrays into distinct variables.',
        difficulty: 8,
        adaptiveWeight: 2.5,
        tags: ['destructuring', 'es6', 'advanced']
      }
    ];

    for (let i = 0; i < adaptiveQuestions.length; i++) {
      const q = adaptiveQuestions[i];
      const questionId = uuidv4();

      await db.query(`
        INSERT INTO dbo.Questions (
          Id, AssessmentId, Type, Question, Options, CorrectAnswer, 
          Explanation, Difficulty, Tags, AdaptiveWeight, OrderIndex
        )
        VALUES (
          @id, @assessmentId, @type, @question, @options, @correctAnswer,
          @explanation, @difficulty, @tags, @adaptiveWeight, @orderIndex
        )
      `, {
        id: questionId,
        assessmentId: adaptiveTestId,
        type: q.type,
        question: q.question,
        options: q.options ? JSON.stringify(q.options) : null,
        correctAnswer: JSON.stringify(q.correctAnswer),
        explanation: q.explanation,
        difficulty: q.difficulty,
        tags: JSON.stringify(q.tags),
        adaptiveWeight: q.adaptiveWeight,
        orderIndex: i
      });
    }

    console.log(`✅ Created ${adaptiveQuestions.length} questions for the adaptive test`);

    // Create a programming assignment
    const assignmentId = uuidv4();
    await db.query(`
      INSERT INTO dbo.Assessments (Id, LessonId, Title, Type, PassingScore, MaxAttempts, TimeLimit, IsAdaptive)
      VALUES (@id, @lessonId, @title, @type, @passingScore, @maxAttempts, @timeLimit, @isAdaptive)
    `, {
      id: assignmentId,
      lessonId: lesson.Id,
      title: 'JavaScript Programming Assignment',
      type: 'assignment',
      passingScore: 80,
      maxAttempts: 1,
      timeLimit: null, // No time limit
      isAdaptive: false
    });

    console.log('✅ Created programming assignment');

    // Create assignment questions
    const assignmentQuestions = [
      {
        type: 'code',
        question: 'Create a function that calculates the factorial of a number using recursion:',
        correctAnswer: 'function factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}',
        explanation: 'A recursive factorial function calls itself with decreasing values until reaching the base case.',
        difficulty: 6,
        tags: ['recursion', 'algorithms']
      },
      {
        type: 'essay',
        question: 'Explain the concept of event bubbling in JavaScript and provide an example of how to stop it.',
        correctAnswer: 'Event bubbling is when an event triggered on a child element propagates up through its parent elements. Use event.stopPropagation() to prevent it.',
        explanation: 'Understanding event propagation is crucial for effective DOM manipulation.',
        difficulty: 7,
        tags: ['dom', 'events']
      },
      {
        type: 'code',
        question: 'Write a function that removes duplicate values from an array:',
        correctAnswer: 'function removeDuplicates(arr) {\n  return [...new Set(arr)];\n}',
        explanation: 'Using Set automatically removes duplicates, then spread operator converts back to array.',
        difficulty: 5,
        tags: ['arrays', 'es6']
      }
    ];

    for (let i = 0; i < assignmentQuestions.length; i++) {
      const q = assignmentQuestions[i];
      const questionId = uuidv4();

      await db.query(`
        INSERT INTO dbo.Questions (
          Id, AssessmentId, Type, Question, CorrectAnswer, 
          Explanation, Difficulty, Tags, OrderIndex
        )
        VALUES (
          @id, @assessmentId, @type, @question, @correctAnswer,
          @explanation, @difficulty, @tags, @orderIndex
        )
      `, {
        id: questionId,
        assessmentId: assignmentId,
        type: q.type,
        question: q.question,
        correctAnswer: JSON.stringify(q.correctAnswer),
        explanation: q.explanation,
        difficulty: q.difficulty,
        tags: JSON.stringify(q.tags),
        orderIndex: i
      });
    }

    console.log(`✅ Created ${assignmentQuestions.length} questions for the assignment`);

    // Summary
    console.log('\n🎉 Test assessment data created successfully!');
    console.log('📊 Summary:');
    console.log(`   • Basic Quiz: ${questions.length} questions (30min, 70% pass, 3 attempts)`);
    console.log(`   • Adaptive Test: ${adaptiveQuestions.length} questions (45min, 75% pass, 2 attempts)`);
    console.log(`   • Programming Assignment: ${assignmentQuestions.length} questions (No time limit, 80% pass, 1 attempt)`);
    console.log(`\n🔗 Access assessments at: http://localhost:5173/instructor/lessons/${lesson.Id}`);

  } catch (error) {
    console.error('❌ Error creating test assessments:', error);
  } finally {
    process.exit(0);
  }
}

createTestAssessments();