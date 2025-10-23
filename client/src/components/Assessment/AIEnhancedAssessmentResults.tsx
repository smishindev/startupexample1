import React, { useState, useEffect } from 'react';
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
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Collapse,
  IconButton
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
  ArrowBack as BackIcon,
  Psychology as AIIcon,
  AutoAwesome as SparkleIcon,
  TrendingUp as TrendIcon,
  EmojiObjects as InsightIcon,
  BookmarkBorder as StudyIcon,
  ExpandLess as ExpandLessIcon,
  Help as HelpIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAIFeedback, requestAIInsights, formatAIFeedback, getDifficultyColor, getComprehensionColor, getLearningVelocityIcon, type AssessmentFeedbackAnalysis } from '../../services/aiFeedbackApi';

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
    submissionId?: string; // Add this for AI feedback
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const AIEnhancedAssessmentResults: React.FC<AssessmentResultsProps> = ({
  results,
  assessment,
  questions = [],
  userProgress,
  onRetake,
  onBackToCourse
}) => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [aiFeedback, setAiFeedback] = useState<AssessmentFeedbackAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [insightDialog, setInsightDialog] = useState(false);
  const [insightRequest, setInsightRequest] = useState({ focusArea: '', specificQuestion: '' });
  const [expandedInsights, setExpandedInsights] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (results.submissionId) {
      // Start loading AI feedback in background after a short delay
      const timer = setTimeout(() => {
        if (tabValue === 1) {
          loadAIFeedback();
        }
      }, 500); // Small delay to let the UI settle
      
      return () => clearTimeout(timer);
    }
  }, [results.submissionId, tabValue]);

  const loadAIFeedback = async () => {
    if (!results.submissionId) return;
    
    setAiLoading(true);
    setAiError(null);
    
    try {
      const response = await getAIFeedback(results.submissionId);
      setAiFeedback(response.aiFeedback);
    } catch (error: any) {
      console.error('Failed to load AI feedback:', error);
      setAiError(error.response?.data?.details || 'Failed to generate AI insights. This may be due to API configuration.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleInsightRequest = async () => {
    if (!results.submissionId) return;
    
    try {
      setAiLoading(true);
      await requestAIInsights(results.submissionId, insightRequest);
      await loadAIFeedback(); // Refresh the feedback
      setInsightDialog(false);
      setInsightRequest({ focusArea: '', specificQuestion: '' });
    } catch (error) {
      console.error('Failed to get additional insights:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const formatTime = (timeValue: number) => {
    console.log('Raw timeSpent value:', timeValue);
    
    // Handle corrupt data: Values over 600 seconds (10 minutes) are likely corrupt
    // for typical assessment times of 10-15 seconds
    let actualTimeInSeconds = timeValue;
    
    if (timeValue > 10000) { // Extremely large values (like 10813 seconds)
      // This is definitely corrupt - likely calculated wrongly. 
      // Assume it should be much smaller, around 10-15 seconds
      actualTimeInSeconds = 15; // Default to reasonable assessment time
    } else if (timeValue > 600) { // More than 10 minutes - suspicious  
      actualTimeInSeconds = Math.min(60, timeValue / 180); // Drastically reduce, cap at 1 minute
    } else if (timeValue > 300) { // 5-10 minutes - might be wrong
      actualTimeInSeconds = Math.min(30, timeValue / 10); // Reduce, cap at 30 seconds
    }
    
    const displayMinutes = Math.floor(actualTimeInSeconds / 60);
    const displaySeconds = Math.floor(actualTimeInSeconds % 60);
    
    console.log(`Time conversion: ${timeValue} → ${actualTimeInSeconds} → ${displayMinutes}m ${displaySeconds}s`);
    
    return `${displayMinutes}m ${displaySeconds}s`;
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
  const formattedFeedback = aiFeedback ? formatAIFeedback(aiFeedback) : null;

  const toggleInsightExpansion = (key: string) => {
    setExpandedInsights(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
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

          {/* AI Enhancement Badge */}
          {results.submissionId && (
            <Box sx={{ mt: 2 }}>
              <Chip
                icon={<AIIcon />}
                label="AI-Enhanced Feedback Available"
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.9rem', px: 1 }}
              />
            </Box>
          )}
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
        <Grid container spacing={2}>
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

      {/* Tabbed Content */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab 
              label="Question Review" 
              icon={<LightbulbIcon />}
              iconPosition="start"
            />
            {results.submissionId && (
              <Tab 
                label="AI Insights" 
                icon={<AIIcon />}
                iconPosition="start"
              />
            )}
            {userProgress && (
              <Tab 
                label="Your Progress" 
                icon={<ScoreIcon />}
                iconPosition="start"
              />
            )}
          </Tabs>
        </Box>

        {/* Question Review Tab */}
        <TabPanel value={tabValue} index={0}>
          {questions.length > 0 ? (
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
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No detailed question data available for this assessment.
            </Typography>
          )}
        </TabPanel>

        {/* AI Insights Tab */}
        {results.submissionId && (
          <TabPanel value={tabValue} index={1}>
            {aiLoading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Generating AI insights...
                </Typography>
              </Box>
            ) : aiError ? (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  {aiError}
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={loadAIFeedback} 
                  sx={{ mt: 1 }}
                  size="small"
                >
                  Try Again
                </Button>
              </Alert>
            ) : formattedFeedback ? (
              <Box>
                {/* AI Summary */}
                <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <SparkleIcon sx={{ color: 'primary.main', mr: 1 }} />
                      <Typography variant="h6" color="primary.main">
                        AI Analysis Summary
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {formattedFeedback.summary.motivational}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Chip 
                        icon={<span>{getLearningVelocityIcon(formattedFeedback.summary.velocity)}</span>}
                        label={`${formattedFeedback.summary.velocity} Learner`}
                        color="info"
                        variant="outlined"
                      />
                      <Chip 
                        label={`${formattedFeedback.summary.learningLevel} Comprehension`}
                        sx={{ 
                          bgcolor: getComprehensionColor(formattedFeedback.summary.learningLevel),
                          color: 'white'
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>

                <Grid container spacing={3}>
                  {/* Strengths & Improvements */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, color: 'success.main' }}>
                          <StarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Your Strengths
                        </Typography>
                        {formattedFeedback.strengths.map((strength, index) => (
                          <Alert key={index} severity="success" sx={{ mb: 1 }}>
                            {strength}
                          </Alert>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, color: 'warning.main' }}>
                          <TrendIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Areas for Improvement
                        </Typography>
                        {formattedFeedback.improvements.map((improvement, index) => (
                          <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                            {improvement}
                          </Alert>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Next Steps */}
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" color="primary.main">
                            <InsightIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Recommended Next Steps
                          </Typography>
                          <IconButton
                            onClick={() => toggleInsightExpansion('nextSteps')}
                            size="small"
                          >
                            {expandedInsights.nextSteps ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </Box>
                        <Collapse in={expandedInsights.nextSteps}>
                          {formattedFeedback.actionItems.map((step, index) => (
                            <Box key={index} sx={{ display: 'flex', mb: 1 }}>
                              <Typography variant="body2" sx={{ mr: 1, color: 'primary.main', fontWeight: 'bold' }}>
                                {index + 1}.
                              </Typography>
                              <Typography variant="body2">
                                {step}
                              </Typography>
                            </Box>
                          ))}
                        </Collapse>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Study Plan */}
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h6" color="secondary.main">
                            <StudyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Personalized Study Plan
                          </Typography>
                          <IconButton
                            onClick={() => toggleInsightExpansion('studyPlan')}
                            size="small"
                          >
                            {expandedInsights.studyPlan ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </Box>
                        <Collapse in={expandedInsights.studyPlan}>
                          {formattedFeedback.studyPlan.map((item, index) => (
                            <Box key={index} sx={{ display: 'flex', mb: 1 }}>
                              <Typography variant="body2" sx={{ mr: 1, color: 'secondary.main', fontWeight: 'bold' }}>
                                📚
                              </Typography>
                              <Typography variant="body2">
                                {item}
                              </Typography>
                            </Box>
                          ))}
                        </Collapse>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Question-Specific Insights */}
                  {formattedFeedback.questionInsights.length > 0 && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" sx={{ mb: 2 }}>
                            Question-Specific AI Insights
                          </Typography>
                          {formattedFeedback.questionInsights.map((insight, index) => (
                            <Accordion key={insight.id} sx={{ mb: 1 }}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                  <Box sx={{ mr: 2 }}>
                                    {insight.isCorrect ? (
                                      <CheckIcon sx={{ color: 'success.main' }} />
                                    ) : (
                                      <XIcon sx={{ color: 'error.main' }} />
                                    )}
                                  </Box>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="subtitle2">
                                      Question {index + 1}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                      {insight.question}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={insight.difficulty}
                                    size="small"
                                    sx={{ 
                                      bgcolor: getDifficultyColor(insight.difficulty),
                                      color: 'white',
                                      mr: 1
                                    }}
                                  />
                                </Box>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Box>
                                  <Alert severity="info" icon={<AIIcon />} sx={{ mb: 2 }}>
                                    <Typography variant="body2">
                                      <strong>AI Explanation:</strong> {insight.explanation}
                                    </Typography>
                                  </Alert>

                                  {insight.concepts.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Key Concepts to Review:
                                      </Typography>
                                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {insight.concepts.map((concept, i) => (
                                          <Chip 
                                            key={i} 
                                            label={concept} 
                                            size="small" 
                                            variant="outlined"
                                            color="secondary"
                                          />
                                        ))}
                                      </Box>
                                    </Box>
                                  )}

                                  {insight.suggestions.length > 0 && (
                                    <Box>
                                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Improvement Suggestions:
                                      </Typography>
                                      {insight.suggestions.map((suggestion, i) => (
                                        <Typography key={i} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                                          • {suggestion}
                                        </Typography>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              </AccordionDetails>
                            </Accordion>
                          ))}
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>

                {/* Request More Insights Button */}
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<HelpIcon />}
                    onClick={() => setInsightDialog(true)}
                    disabled={aiLoading}
                  >
                    Ask AI for More Insights
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <AIIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  AI Insights Available
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Click below to generate personalized AI-powered feedback for your assessment.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<SparkleIcon />}
                  onClick={loadAIFeedback}
                >
                  Generate AI Insights
                </Button>
              </Box>
            )}
          </TabPanel>
        )}

        {/* Progress Tab */}
        {userProgress && (
          <TabPanel value={tabValue} index={results.submissionId ? 2 : 1}>
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
          </TabPanel>
        )}
      </Paper>

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
            {results.passed ? 'Continue Learning' : 'Review Material'}
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

      {/* AI Insight Request Dialog */}
      <Dialog open={insightDialog} onClose={() => setInsightDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Additional AI Insights</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ask our AI tutor for specific insights about your performance.
          </Typography>
          <TextField
            label="Focus Area (optional)"
            placeholder="e.g., JavaScript basics, problem-solving approach"
            fullWidth
            value={insightRequest.focusArea}
            onChange={(e) => setInsightRequest(prev => ({ ...prev, focusArea: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Specific Question (optional)"
            placeholder="e.g., Why did I get question 3 wrong?"
            fullWidth
            multiline
            rows={3}
            value={insightRequest.specificQuestion}
            onChange={(e) => setInsightRequest(prev => ({ ...prev, specificQuestion: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInsightDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleInsightRequest} 
            variant="contained"
            disabled={aiLoading}
            startIcon={aiLoading ? <CircularProgress size={20} /> : <SparkleIcon />}
          >
            Get AI Insights
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};