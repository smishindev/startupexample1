import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  List,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as XIcon,
  Warning as WarningIcon,
  TrendingUp as ScoreIcon,
  Timer as TimerIcon,
  School as SchoolIcon,
  ExpandMore as ExpandMoreIcon,
  Lightbulb as LightbulbIcon,
  Refresh as RetryIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Question {
  id: string;
  type: string;
  question: string;
  correctAnswer: any;
  explanation?: string;
  difficulty: number;
  userAnswer?: any;
  isCorrect?: boolean;
}

interface AssessmentResultsProps {
  results: {
    score: number;
    maxScore: number;
    passed: boolean;
    timeSpent: number;
    attemptNumber: number;
    feedback?: any;
  };
  assessment: {
    id: string;
    title: string;
    type: string;
    passingScore: number;
    maxAttempts: number;
    isAdaptive: boolean;
  };
  questions?: Question[];
  userProgress?: {
    attemptsLeft: number;
    bestScore: number;
    canRetake: boolean;
  };
  onRetake?: () => void;
  onBackToCourse?: () => void;
}

export const EnhancedAssessmentResults: React.FC<AssessmentResultsProps> = ({
  results,
  assessment,
  questions = [],
  userProgress,
  onRetake,
  onBackToCourse
}) => {
  const navigate = useNavigate();

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getScoreColor = (score: number, passingScore: number) => {
    if (score >= passingScore) return 'success.main';
    if (score >= passingScore * 0.7) return 'warning.main';
    return 'error.main';
  };

  const getPerformanceMessage = () => {
    const scorePercentage = (results.score / results.maxScore) * 100;
    
    if (results.passed) {
      if (scorePercentage >= 95) return "Outstanding performance! 🌟";
      if (scorePercentage >= 85) return "Excellent work! 👏";
      return "Great job passing! ✅";
    } else {
      if (scorePercentage >= assessment.passingScore * 0.8) return "Very close! You're almost there! 💪";
      if (scorePercentage >= assessment.passingScore * 0.6) return "Good effort! With some review, you'll get it! 📚";
      return "Don't give up! Review the material and try again! 🎯";
    }
  };

  const correctAnswers = questions.filter(q => q.isCorrect).length;
  const incorrectAnswers = questions.length - correctAnswers;

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      {/* Main Results Card */}
      <Paper sx={{ p: 4, mb: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ mb: 2 }}>
            {results.passed ? (
              <CheckIcon sx={{ fontSize: 80, color: 'success.main' }} />
            ) : (
              <WarningIcon sx={{ fontSize: 80, color: 'warning.main' }} />
            )}
          </Box>
          
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            {results.passed ? 'Assessment Passed!' : 'Keep Trying!'}
          </Typography>
          
          <Typography variant="h4" sx={{ color: getScoreColor(results.score, assessment.passingScore), mb: 2 }}>
            {Math.round((results.score / results.maxScore) * 100)}%
          </Typography>
          
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {getPerformanceMessage()}
          </Typography>
          
          <Typography variant="body1" color="text.secondary">
            You scored {results.score} out of {results.maxScore} points
          </Typography>
        </Box>

        {/* Score Progress */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Score Progress
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(results.score / results.maxScore) * 100}
            sx={{
              height: 12,
              borderRadius: 6,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 6,
                bgcolor: getScoreColor(results.score, assessment.passingScore)
              }
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              0%
            </Typography>
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              Passing: {assessment.passingScore}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              100%
            </Typography>
          </Box>
        </Box>

        {/* Quick Stats */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <CheckIcon sx={{ color: 'success.main', mb: 1 }} />
                <Typography variant="h6" sx={{ color: 'success.main' }}>
                  {correctAnswers}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Correct
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <XIcon sx={{ color: 'error.main', mb: 1 }} />
                <Typography variant="h6" sx={{ color: 'error.main' }}>
                  {incorrectAnswers}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Incorrect
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <TimerIcon sx={{ color: 'info.main', mb: 1 }} />
                <Typography variant="h6" sx={{ color: 'info.main' }}>
                  {formatTime(results.timeSpent)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Time Spent
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <SchoolIcon sx={{ color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" sx={{ color: 'primary.main' }}>
                  #{results.attemptNumber}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Attempt
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Performance Insights */}
      {userProgress && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <ScoreIcon sx={{ mr: 1, color: 'primary.main' }} />
            Your Progress
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: 'primary.main' }}>
                  {userProgress.bestScore}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Best Score
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: 'info.main' }}>
                  {userProgress.attemptsLeft}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Attempts Left
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ 
                  color: Math.round((results.score / results.maxScore) * 100) > userProgress.bestScore ? 'success.main' : 'text.secondary' 
                }}>
                  {Math.round((results.score / results.maxScore) * 100) > userProgress.bestScore ? '+' : ''}
                  {Math.round((results.score / results.maxScore) * 100) - userProgress.bestScore}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Score Change
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Question Review */}
      {questions.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <LightbulbIcon sx={{ mr: 1, color: 'primary.main' }} />
            Question Review
          </Typography>

          <List>
            {questions.map((question, index) => (
              <Accordion key={question.id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box sx={{ mr: 2 }}>
                      {question.isCorrect ? (
                        <CheckIcon sx={{ color: 'success.main' }} />
                      ) : (
                        <XIcon sx={{ color: 'error.main' }} />
                      )}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">
                        Question {index + 1}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {question.question}
                      </Typography>
                    </Box>
                    <Chip
                      label={question.isCorrect ? 'Correct' : 'Incorrect'}
                      size="small"
                      color={question.isCorrect ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {question.question}
                    </Typography>
                    
                    {question.userAnswer && (
                      <Alert severity={question.isCorrect ? 'success' : 'error'} sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Your answer:</strong> {
                            typeof question.userAnswer === 'object' 
                              ? JSON.stringify(question.userAnswer)
                              : question.userAnswer
                          }
                        </Typography>
                      </Alert>
                    )}

                    {!question.isCorrect && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Correct answer:</strong> {
                            typeof question.correctAnswer === 'object'
                              ? JSON.stringify(question.correctAnswer)
                              : question.correctAnswer
                          }
                        </Typography>
                      </Alert>
                    )}

                    {question.explanation && (
                      <Alert severity="info" icon={<LightbulbIcon />}>
                        <Typography variant="body2">
                          <strong>Explanation:</strong> {question.explanation}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </List>
        </Paper>
      )}

      {/* Action Buttons */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {userProgress?.canRetake && onRetake && (
            <Button
              variant={results.passed ? 'outlined' : 'contained'}
              size="large"
              startIcon={<RetryIcon />}
              onClick={onRetake}
              sx={{ minWidth: 150 }}
            >
              {results.passed ? 'Retake' : 'Try Again'}
            </Button>
          )}
          
          <Button
            variant={results.passed ? 'contained' : 'outlined'}
            size="large"
            startIcon={<BackIcon />}
            onClick={onBackToCourse || (() => navigate(-1))}
            sx={{ minWidth: 150 }}
          >
            Back to Course
          </Button>
        </Box>

        {userProgress && userProgress.attemptsLeft === 0 && !userProgress.canRetake && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              You have used all available attempts for this assessment. 
              Contact your instructor if you need additional attempts.
            </Typography>
          </Alert>
        )}
      </Paper>
    </Box>
  );
};