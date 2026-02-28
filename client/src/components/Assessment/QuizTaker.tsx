import React, { useState, useEffect, useCallback } from 'react';
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
  LinearProgress,
  Chip,
  Paper,
  Grid
} from '@mui/material';
import {
  Quiz as QuizIcon,
  Timer as TimerIcon,
  TrendingUp as ScoreIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { assessmentApi, Assessment, AssessmentSubmission } from '../../services/assessmentApi';
import AdaptiveQuizTaker from './AdaptiveQuizTaker';
import { AIEnhancedAssessmentResults } from './AIEnhancedAssessmentResults';

interface QuizTakerProps {
  assessmentId?: string;
  onComplete?: (submission: AssessmentSubmission) => void;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ assessmentId: propAssessmentId, onComplete }) => {
  const { assessmentId: paramAssessmentId } = useParams();
  
  const assessmentId = propAssessmentId || paramAssessmentId;

  // State management
  const [assessment, setAssessment] = useState<Assessment & { canTakeAssessment?: boolean; attemptsLeft?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load assessment data to check if it's adaptive
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
    } catch (error) {
      console.error('Error loading assessment:', error);
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <div>Loading assessment...</div>
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

  // Route to adaptive component if assessment is adaptive
  if (assessment.isAdaptive) {
    return <AdaptiveQuizTaker assessmentId={assessmentId!} onComplete={onComplete} />;
  }

  // Continue with traditional quiz taker for non-adaptive assessments
  return <TraditionalQuizTaker assessmentId={assessmentId!} assessment={assessment} onComplete={onComplete} />;
};

// Traditional Quiz Taker Component (existing logic)
interface TraditionalQuizTakerProps {
  assessmentId: string;
  assessment: Assessment;
  onComplete?: (submission: AssessmentSubmission) => void;
}

const TraditionalQuizTaker: React.FC<TraditionalQuizTakerProps> = ({ assessmentId, onComplete }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreviewMode = searchParams.get('preview') === 'true';

  // State management
  const [assessment, setAssessment] = useState<Assessment & { canTakeAssessment?: boolean; attemptsLeft?: number } | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [canTakeAssessment, setCanTakeAssessment] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);

  // Load assessment data
  useEffect(() => {
    if (assessmentId) {
      loadAssessment();
    }
  }, [assessmentId]);

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

  const loadAssessment = async () => {
    try {
      setLoading(true);
      const data = await assessmentApi.getAssessmentWithProgress(assessmentId!);

      setAssessment(data);
      // In preview mode, always allow taking the assessment
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
      setLoading(true);
      const response = await assessmentApi.startAssessment(assessmentId!, isPreviewMode);
      setSubmissionId(response.submissionId);
      setAssessmentStarted(true);
      setError(null);
    } catch (error) {
      console.error('Error starting assessment:', error);
      setError('Failed to start assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUp = useCallback(() => {
    if (submissionId) {
      submitAssessment(true); // Auto-submit when time is up
    }
  }, [submissionId]);

  const updateAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const validateAnswers = () => {
    if (!assessment) return { isValid: false, missingCount: 0 };
    
    const validation = assessmentApi.validateAnswers(assessment.questions || [], answers);
    return {
      isValid: validation.isValid,
      missingCount: validation.missingAnswers.length
    };
  };

  const submitAssessment = async (autoSubmit = false) => {
    if (!submissionId) return;

    try {
      setSubmitting(true);
      const response = await assessmentApi.submitAssessment(submissionId, { answers });
      
      // Get complete submission details including attempt number
      const submissionDetails = await assessmentApi.getSubmissionResults(submissionId);
      
      // Combine submission results with response data
      console.log('Before merge - response timeSpent:', response.timeSpent);
      console.log('Before merge - submissionDetails TimeSpent:', (submissionDetails as any).TimeSpent);
      
      const completeResults = {
        ...response,
        attemptNumber: (submissionDetails as any).AttemptNumber || submissionDetails.attemptNumber || 1,
        submissionId: submissionId
      };
      
      console.log('Assessment submission results:', {
        response,
        submissionDetails,
        completeResults,
        timeSpent: completeResults.timeSpent,
        attemptNumber: completeResults.attemptNumber
      });

      setResults(completeResults);
      setShowResults(true);
      setConfirmSubmitOpen(false);
      
      // Don't call onComplete immediately - let the results page handle navigation
    } catch (error) {
      console.error('Error submitting assessment:', error);
      setError(autoSubmit ? 'Time expired - assessment auto-submitted' : 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    const validation = validateAnswers();
    if (!validation.isValid && validation.missingCount > 0) {
      setError(`Please answer all questions. ${validation.missingCount} questions remaining.`);
      return;
    }
    setConfirmSubmitOpen(true);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderQuestion = (question: any, index: number) => {
    const questionId = question.Id || question.id;
    const userAnswer = answers[questionId];
    
    // Handle both uppercase (from backend) and lowercase (from interface) property names
    const questionText = question.Question || question.question;
    const questionType = question.Type || question.type;
    const questionOptions = question.options || (question.Options ? JSON.parse(question.Options) : []);
    const questionDifficulty = question.Difficulty || question.difficulty;

    return (
      <Card sx={{ mb: 3 }} data-testid={`assessment-question-card-${index + 1}`}>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Question {index + 1} of {assessment?.questions?.length}
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {questionText}
            </Typography>
            
            {questionDifficulty && (
              <Chip 
                label={`Difficulty: ${questionDifficulty}/10`} 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ mb: 2 }}
              />
            )}
          </Box>

          {/* Multiple Choice */}
          {questionType === 'multiple_choice' && (
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={userAnswer || ''}
                onChange={(e) => updateAnswer(questionId, e.target.value)}
                data-testid={`assessment-multiple-choice-${index + 1}`}
              >
                {questionOptions?.map((option: string, optionIndex: number) => (
                  <FormControlLabel
                    key={optionIndex}
                    value={option}
                    control={<Radio />}
                    label={option}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          )}

          {/* True/False */}
          {questionType === 'true_false' && (
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={userAnswer !== undefined ? userAnswer.toString() : ''}
                onChange={(e) => updateAnswer(questionId, e.target.value === 'true')}
                data-testid={`assessment-true-false-${index + 1}`}
              >
                <FormControlLabel value="true" control={<Radio />} label="True" />
                <FormControlLabel value="false" control={<Radio />} label="False" />
              </RadioGroup>
            </FormControl>
          )}

          {/* Short Answer */}
          {questionType === 'short_answer' && (
            <TextField
              fullWidth
              multiline
              rows={2}
              value={userAnswer || ''}
              onChange={(e) => updateAnswer(questionId, e.target.value)}
              placeholder="Enter your answer here..."
              variant="outlined"
              data-testid={`assessment-short-answer-${index + 1}`}
            />
          )}

          {/* Essay */}
          {questionType === 'essay' && (
            <TextField
              fullWidth
              multiline
              rows={6}
              value={userAnswer || ''}
              onChange={(e) => updateAnswer(questionId, e.target.value)}
              placeholder="Write your essay response here..."
              variant="outlined"
              data-testid={`assessment-essay-${index + 1}`}
            />
          )}

          {/* Code */}
          {questionType === 'code' && (
            <TextField
              fullWidth
              multiline
              rows={8}
              value={userAnswer || ''}
              onChange={(e) => updateAnswer(questionId, e.target.value)}
              placeholder="Write your code here..."
              variant="outlined"
              sx={{ 
                '& .MuiInputBase-input': { 
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }
              }}
            />
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading assessment...</Typography>
      </Box>
    );
  }

  if (!assessment) {
    return (
      <Alert severity="error">
        Assessment not found
      </Alert>
    );
  }

  // Assessment not started yet
  if (!assessmentStarted) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 800, mx: 'auto' }}>
        <Paper sx={{ p: { xs: 2, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <QuizIcon sx={{ fontSize: { xs: 30, sm: 40 }, color: 'primary.main', mr: { xs: 1, sm: 2 } }} />
            <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '2.125rem' } }}>
              {assessment.title}
            </Typography>
          </Box>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <QuizIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography>
                  <strong>{assessment.questions?.length || 0}</strong> questions
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScoreIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography>
                  Passing score: <strong>{assessment.passingScore}%</strong>
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimerIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography>
                  Time limit: <strong>{assessment.timeLimit ? `${assessment.timeLimit} minutes` : 'No time limit'}</strong>
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Attempt Information
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Attempts allowed: {assessment.maxAttempts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Attempts remaining: {assessment.attemptsLeft || 0}
              </Typography>
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {isPreviewMode && (
            <Alert severity="info" sx={{ mb: 3 }}>
              📝 Preview Mode - You are viewing this assessment as an instructor. This will not affect student records or attempt counts.
            </Alert>
          )}

          {!canTakeAssessment && !isPreviewMode && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              You have exceeded the maximum number of attempts for this assessment.
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              data-testid="assessment-cancel-button"
              fullWidth
              sx={{ maxWidth: { sm: 'fit-content' } }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={startAssessment}
              disabled={!canTakeAssessment || loading}
              size="large"
              data-testid="assessment-start-button"
              fullWidth
              sx={{ maxWidth: { sm: 'fit-content' } }}
            >
              Start Assessment
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // Show results
  if (showResults && results) {
    return (
      <AIEnhancedAssessmentResults
        results={{
          score: results.score,
          maxScore: results.maxScore || 100,
          passed: results.passed,
          timeSpent: results.timeSpent,
          attemptNumber: results.attemptNumber || 1,
          feedback: results.feedback,
          submissionId: submissionId || undefined // Pass submission ID for AI feedback
        }}
        assessment={{
          id: assessmentId,
          title: assessment?.title || 'Assessment',
          type: assessment?.type || 'quiz',
          passingScore: assessment?.passingScore || 70,
          maxAttempts: assessment?.maxAttempts || 3,
          isAdaptive: assessment?.isAdaptive || false
        }}
        questions={assessment?.questions?.map((q: any) => ({
          id: q.Id || q.id,
          type: q.Type || q.type,
          question: q.Question || q.question,
          correctAnswer: q.CorrectAnswer || q.correctAnswer,
          explanation: q.Explanation || q.explanation,
          difficulty: q.Difficulty || q.difficulty || 1,
          userAnswer: answers[q.Id || q.id],
          isCorrect: results.feedback?.[q.Id || q.id]?.isCorrect
        })) || []}
        userProgress={(() => {
          // Calculate attempts left using the actual completed attempts count
          const completedAttempts = assessment?.userSubmissions?.filter((sub: any) => sub.status === 'completed').length || 0;
          const maxAttempts = assessment?.maxAttempts || 3;
          const attemptsLeft = Math.max(0, maxAttempts - completedAttempts);
          
          const bestScore = Math.max(
            results.score,
            ...(assessment?.userSubmissions?.map((sub: any) => sub.score || 0) || [])
          );
          
          console.log('User progress calculation:', {
            maxAttempts,
            totalSubmissions: assessment?.userSubmissions?.length || 0,
            completedAttempts,
            attemptsLeft,
            bestScore,
            fallbackCalculation: Math.max(0, (assessment?.maxAttempts || 3) - (results.attemptNumber || 1)),
            currentAttemptNumber: results.attemptNumber
          });
          
          return {
            attemptsLeft,
            bestScore,
            canRetake: !results.passed && ((results.attemptNumber || 1) < (assessment?.maxAttempts || 3))
          };
        })()}
        onRetake={() => {
          // Reset state for retake
          setShowResults(false);
          setResults(null);
          setAnswers({});
          setAssessmentStarted(false);
          setSubmissionId(null);
          loadAssessment();
        }}
        onBackToCourse={async () => {
          // Call the original onComplete callback with submission details before navigating
          if (onComplete && submissionId) {
            try {
              const submissionDetails = await assessmentApi.getSubmissionResults(submissionId);
              onComplete(submissionDetails);
            } catch (error) {
              console.error('Error getting submission details:', error);
              // Still navigate even if we can't get details
              navigate(-1);
            }
          } else {
            navigate(-1);
          }
        }}
      />
    );
  }

  // Assessment in progress
  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, maxWidth: 900, mx: 'auto' }}>
      {/* Header with timer and progress */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 }, position: 'sticky', top: 0, zIndex: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1 }}>
          <Typography variant="h6" noWrap sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' } }}>
            {assessment.title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
            {timeRemaining !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimerIcon sx={{ mr: 1, color: timeRemaining < 300 ? 'error.main' : 'text.secondary' }} />
                <Typography 
                  variant="h6" 
                  color={timeRemaining < 300 ? 'error.main' : 'text.primary'}
                >
                  {formatTime(timeRemaining)}
                </Typography>
              </Box>
            )}
            
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting}
              data-testid="assessment-submit-button"
            >
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </Button>
          </Box>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={(Object.keys(answers).length / (assessment.questions?.length || 1)) * 100}
          sx={{ mt: 1 }}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Questions */}
      <Box>
        {assessment.questions?.map((question, index) => {
          const questionId = (question as any).Id || question.id || index;
          return (
            <div key={questionId}>
              {renderQuestion(question, index)}
            </div>
          );
        })}
      </Box>

      {/* Submit confirmation dialog */}
      <Dialog open={confirmSubmitOpen} onClose={() => setConfirmSubmitOpen(false)} data-testid="assessment-submit-dialog">
        <DialogTitle>Submit Assessment?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to submit your assessment? You won't be able to make changes after submission.
          </Typography>
          {(() => {
            const validation = validateAnswers();
            return !validation.isValid && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                You have {validation.missingCount} unanswered question(s).
              </Alert>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSubmitOpen(false)} data-testid="assessment-submit-dialog-cancel">
            Cancel
          </Button>
          <Button 
            onClick={() => submitAssessment()} 
            variant="contained"
            disabled={submitting}
            data-testid="assessment-submit-dialog-confirm"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizTaker;