import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  Paper,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  Quiz as QuizIcon,
  Timer as TimerIcon,
  Check as CheckIcon,
  TrendingUp as ScoreIcon,
  Psychology as AdaptiveIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { assessmentApi, Assessment, AssessmentSubmission } from '../../services/assessmentApi';

interface AdaptiveQuizTakerProps {
  assessmentId?: string;
  onComplete?: (submission: AssessmentSubmission) => void;
}

interface AdaptiveQuestion {
  id: string;
  question: string;
  type: string;
  options?: string[];
  difficulty: number;
  adaptiveWeight: number;
  tags: string[];
}

interface AnsweredQuestion {
  questionId: string;
  correct: boolean;
  difficulty: number;
  answer: any;
  timeSpent: number;
}

const AdaptiveQuizTaker: React.FC<AdaptiveQuizTakerProps> = ({ assessmentId: propAssessmentId, onComplete }) => {
  const { assessmentId: paramAssessmentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreviewMode = searchParams.get('preview') === 'true';
  
  const assessmentId = propAssessmentId || paramAssessmentId;

  // State management
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<AdaptiveQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<any>('');
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [canTakeAssessment, setCanTakeAssessment] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [adaptiveInfo, setAdaptiveInfo] = useState<{difficulty: number, reason: string} | null>(null);

  // Timer effect
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && assessmentStarted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, assessmentStarted]);

  // Load assessment data
  useEffect(() => {
    if (assessmentId) {
      loadAssessment();
    }
  }, [assessmentId]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      const data = await assessmentApi.getAssessmentWithProgress(assessmentId!);
      setAssessment(data);
      setCanTakeAssessment(isPreviewMode || data.canTakeAssessment);
      
      if (data.timeLimit) {
        setTimeRemaining(data.timeLimit * 60); // Convert minutes to seconds
      }
    } catch (error) {
      console.error('Error loading assessment:', error);
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = async () => {
    try {
      setSubmitting(true);
      const submission = await assessmentApi.startAssessment(assessmentId!, isPreviewMode);
      setSubmissionId(submission.submissionId);
      setAssessmentStarted(true);
      setQuestionStartTime(Date.now());
      
      // Get first adaptive question
      await getNextQuestion();
    } catch (error) {
      console.error('Error starting assessment:', error);
      setError('Failed to start assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const getNextQuestion = async () => {
    try {
      setQuestionLoading(true);
      
      // Calculate recent performance
      const recentAnswers = answeredQuestions.slice(-5); // Last 5 questions
      const recentPerformance = {
        correct: recentAnswers.filter(q => q.correct).length,
        total: recentAnswers.length,
        avgDifficulty: recentAnswers.length > 0 
          ? recentAnswers.reduce((sum, q) => sum + q.difficulty, 0) / recentAnswers.length 
          : 5
      };

      const response = await assessmentApi.getNextAdaptiveQuestion(
        assessmentId!,
        submissionId!,
        answeredQuestions,
        recentPerformance
      );

      if (response.completed || !response.question) {
        // Assessment completed
        setIsCompleted(true);
        await finishAssessment();
      } else {
        setCurrentQuestion(response.question);
        setAdaptiveInfo(response.adaptiveInfo);
        setCurrentAnswer(''); // Reset answer
        setQuestionStartTime(Date.now());
      }
    } catch (error) {
      console.error('Error getting next question:', error);
      setError('Failed to get next question');
    } finally {
      setQuestionLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentQuestion || !submissionId) return;

    try {
      setSubmitting(true);
      const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
      
      const response = await assessmentApi.submitAdaptiveAnswer(
        assessmentId!,
        submissionId,
        currentQuestion.id,
        currentAnswer,
        timeSpent
      );

      // Track the answered question
      const answeredQuestion: AnsweredQuestion = {
        questionId: currentQuestion.id,
        correct: response.correct,
        difficulty: response.difficulty,
        answer: currentAnswer,
        timeSpent
      };

      setAnsweredQuestions(prev => [...prev, answeredQuestion]);

      // Get next question
      await getNextQuestion();
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const finishAssessment = async () => {
    try {
      setSubmitting(true);
      
      // Build answers object for final submission
      const finalAnswers: Record<string, any> = {};
      answeredQuestions.forEach(q => {
        finalAnswers[q.questionId] = q.answer;
      });

      const totalTimeSpent = answeredQuestions.reduce((sum, q) => sum + q.timeSpent, 0);

      const result = await assessmentApi.submitAssessment(
        submissionId!,
        { answers: finalAnswers }
      );

      setResults(result);
      setShowResults(true);

      if (onComplete) {
        // Create a proper AssessmentSubmission object for the callback
        const submissionResult: AssessmentSubmission = {
          id: submissionId!,
          userId: '', // Will be filled by backend
          assessmentId: assessmentId!,
          answers: finalAnswers,
          score: result.score,
          maxScore: result.maxScore,
          timeSpent: totalTimeSpent,
          attemptNumber: 1,
          status: 'completed',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          feedback: result.feedback
        };
        onComplete(submissionResult);
      }
    } catch (error) {
      console.error('Error finishing assessment:', error);
      setError('Failed to finish assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    if (!isCompleted) {
      finishAssessment();
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestion = (question: AdaptiveQuestion) => {
    switch (question.type) {
      case 'multiple_choice':
        return (
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
            >
              {question.options?.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'true_false':
        return (
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value === 'true')}
            >
              <FormControlLabel value="true" control={<Radio />} label="True" />
              <FormControlLabel value="false" control={<Radio />} label="False" />
            </RadioGroup>
          </FormControl>
        );

      case 'short_answer':
        return (
          <TextField
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            placeholder="Enter your answer..."
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
          />
        );

      default:
        return (
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Enter your answer..."
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
          />
        );
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!assessment) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Assessment not found
      </Alert>
    );
  }

  if (!canTakeAssessment && !isPreviewMode) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        You cannot take this assessment at this time. Please check the requirements or contact your instructor.
      </Alert>
    );
  }

  if (showResults && results) {
    return (
      <Card sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <CheckIcon color="success" sx={{ mr: 2, fontSize: 32 }} />
            <Typography variant="h4" color="success.main">
              Assessment Complete!
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <ScoreIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h3" color="primary">
                  {results.score}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Final Score
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h3" color={results.passed ? 'success.main' : 'error.main'}>
                  {results.passed ? 'PASSED' : 'FAILED'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status (Required: {assessment.passingScore}%)
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {results.adaptiveInfo && (
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                Adaptive Assessment Details
              </Typography>
              <Paper sx={{ p: 2 }}>
                <Typography variant="body2">
                  <strong>Questions Answered:</strong> {answeredQuestions.length}
                </Typography>
                <Typography variant="body2">
                  <strong>Average Difficulty:</strong> {(answeredQuestions.reduce((sum, q) => sum + q.difficulty, 0) / answeredQuestions.length).toFixed(1)}/10
                </Typography>
                <Typography variant="body2">
                  <strong>Accuracy:</strong> {((answeredQuestions.filter(q => q.correct).length / answeredQuestions.length) * 100).toFixed(1)}%
                </Typography>
              </Paper>
            </Box>
          )}

          <Box mt={3}>
            <Button
              variant="contained"
              onClick={() => {
                // For now, navigate to My Learning page which is more reliable
                // TODO: Could be enhanced to return to specific lesson page
                navigate('/my-learning');
              }}
              fullWidth
            >
              Continue Learning
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!assessmentStarted) {
    return (
      <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <AdaptiveIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
            <Typography variant="h4">
              {assessment.title}
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            This is an adaptive assessment that will adjust question difficulty based on your performance.
          </Alert>

          {isPreviewMode && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <strong>Preview Mode:</strong> You are viewing this assessment as an instructor. Results will not be recorded.
            </Alert>
          )}

          <Box mb={3}>
            <Typography variant="body1" paragraph>
              <strong>Type:</strong> {assessment.type}
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Passing Score:</strong> {assessment.passingScore}%
            </Typography>
            {assessment.timeLimit && (
              <Typography variant="body1" paragraph>
                <strong>Time Limit:</strong> {assessment.timeLimit} minutes
              </Typography>
            )}
            <Typography variant="body1" paragraph>
              <strong>Max Attempts:</strong> {assessment.maxAttempts}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            How Adaptive Assessments Work:
          </Typography>
          <Typography variant="body2" paragraph>
            • Questions are presented one at a time
          </Typography>
          <Typography variant="body2" paragraph>
            • Difficulty adjusts based on your answers
          </Typography>
          <Typography variant="body2" paragraph>
            • Your final score considers question difficulty
          </Typography>
          <Typography variant="body2" paragraph>
            • Assessment ends when sufficient data is collected
          </Typography>

          <Box mt={4}>
            <Button
              variant="contained"
              size="large"
              onClick={startAssessment}
              disabled={submitting}
              fullWidth
              startIcon={submitting ? <CircularProgress size={20} /> : <QuizIcon />}
            >
              {submitting ? 'Starting...' : 'Start Adaptive Assessment'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (questionLoading || !currentQuestion) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="400px">
        <CircularProgress sx={{ mb: 2 }} />
        <Typography>Loading next question...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with progress and timer */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center">
              <AdaptiveIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                {assessment.title} - Question {answeredQuestions.length + 1}
              </Typography>
            </Box>
            {adaptiveInfo && (
              <Typography variant="body2" color="text.secondary">
                Difficulty: {adaptiveInfo.difficulty}/10 • {adaptiveInfo.reason}
              </Typography>
            )}
          </Grid>
          {timeRemaining !== null && (
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" justifyContent="flex-end">
                <TimerIcon sx={{ mr: 1 }} />
                <Typography variant="h6" color={timeRemaining < 300 ? 'error' : 'inherit'}>
                  {formatTime(timeRemaining)}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Progress indicator */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="body2" gutterBottom>
          Progress: {answeredQuestions.length} questions answered
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {answeredQuestions.map((q, index) => (
            <Chip
              key={index}
              size="small"
              label={index + 1}
              color={q.correct ? 'success' : 'error'}
              variant="filled"
            />
          ))}
          <Chip
            size="small"
            label={answeredQuestions.length + 1}
            color="primary"
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Current question */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {currentQuestion.question}
          </Typography>

          <Box mt={3}>
            {renderQuestion(currentQuestion)}
          </Box>

          <Box mt={4} display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Chip
                label={`Difficulty: ${currentQuestion.difficulty}/10`}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>
            <Button
              variant="contained"
              onClick={submitAnswer}
              disabled={submitting || !currentAnswer}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? 'Submitting...' : 'Submit Answer'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Confirmation dialogs */}
      <Dialog open={confirmSubmitOpen} onClose={() => setConfirmSubmitOpen(false)}>
        <DialogTitle>Submit Assessment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit your assessment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSubmitOpen(false)}>Cancel</Button>
          <Button onClick={finishAssessment} color="primary" variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdaptiveQuizTaker;