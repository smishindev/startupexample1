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
  Divider,
  Paper,
  Grid
} from '@mui/material';
import {
  Quiz as QuizIcon,
  Timer as TimerIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  TrendingUp as ScoreIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentApi, Assessment, Question, AssessmentSubmission } from '../../services/assessmentApi';

interface QuizTakerProps {
  assessmentId?: string;
  onComplete?: (submission: AssessmentSubmission) => void;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ assessmentId: propAssessmentId, onComplete }) => {
  const { assessmentId: paramAssessmentId } = useParams();
  const navigate = useNavigate();
  
  const assessmentId = propAssessmentId || paramAssessmentId;

  // State management
  const [assessment, setAssessment] = useState<Assessment | null>(null);
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
      setCanTakeAssessment(data.canTakeAssessment);
      
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
      const response = await assessmentApi.startAssessment(assessmentId!);
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
      setResults(response);
      setShowResults(true);
      setConfirmSubmitOpen(false);
      
      if (onComplete) {
        const submissionDetails = await assessmentApi.getSubmissionResults(submissionId);
        onComplete(submissionDetails);
      }
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

  const renderQuestion = (question: Question, index: number) => {
    const questionId = question.id!;
    const userAnswer = answers[questionId];

    return (
      <Card key={question.id} sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Question {index + 1} of {assessment?.questions?.length}
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {question.question}
            </Typography>
            
            {question.difficulty && (
              <Chip 
                label={`Difficulty: ${question.difficulty}/10`} 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ mb: 2 }}
              />
            )}
          </Box>

          {/* Multiple Choice */}
          {question.type === 'multiple_choice' && (
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={userAnswer || ''}
                onChange={(e) => updateAnswer(questionId, e.target.value)}
              >
                {question.options?.map((option, optionIndex) => (
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
          {question.type === 'true_false' && (
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={userAnswer !== undefined ? userAnswer.toString() : ''}
                onChange={(e) => updateAnswer(questionId, e.target.value === 'true')}
              >
                <FormControlLabel value="true" control={<Radio />} label="True" />
                <FormControlLabel value="false" control={<Radio />} label="False" />
              </RadioGroup>
            </FormControl>
          )}

          {/* Short Answer */}
          {question.type === 'short_answer' && (
            <TextField
              fullWidth
              multiline
              rows={2}
              value={userAnswer || ''}
              onChange={(e) => updateAnswer(questionId, e.target.value)}
              placeholder="Enter your answer here..."
              variant="outlined"
            />
          )}

          {/* Essay */}
          {question.type === 'essay' && (
            <TextField
              fullWidth
              multiline
              rows={6}
              value={userAnswer || ''}
              onChange={(e) => updateAnswer(questionId, e.target.value)}
              placeholder="Write your essay response here..."
              variant="outlined"
            />
          )}

          {/* Code */}
          {question.type === 'code' && (
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
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <QuizIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Typography variant="h4" fontWeight="bold">
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
                Attempts remaining: {(assessment as any).attemptsLeft || 0}
              </Typography>
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {!canTakeAssessment && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              You have exceeded the maximum number of attempts for this assessment.
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={startAssessment}
              disabled={!canTakeAssessment || loading}
              size="large"
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
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ mb: 2 }}>
              {results.passed ? (
                <CheckIcon sx={{ fontSize: 60, color: 'success.main' }} />
              ) : (
                <WarningIcon sx={{ fontSize: 60, color: 'warning.main' }} />
              )}
            </Box>
            
            <Typography variant="h4" gutterBottom>
              {results.passed ? 'Congratulations!' : 'Not Passed'}
            </Typography>
            
            <Typography variant="h2" color="primary" gutterBottom>
              {results.score}%
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              You scored {results.score} out of {results.maxScore} points
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              Time spent: {assessmentApi.formatTime(results.timeSpent)}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              onClick={() => navigate(-1)}
              size="large"
            >
              Back to Course
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  // Assessment in progress
  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      {/* Header with timer and progress */}
      <Paper sx={{ p: 2, mb: 3, position: 'sticky', top: 0, zIndex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {assessment.title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
        {assessment.questions?.map((question, index) => renderQuestion(question, index))}
      </Box>

      {/* Submit confirmation dialog */}
      <Dialog open={confirmSubmitOpen} onClose={() => setConfirmSubmitOpen(false)}>
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
          <Button onClick={() => setConfirmSubmitOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => submitAssessment()} 
            variant="contained"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizTaker;