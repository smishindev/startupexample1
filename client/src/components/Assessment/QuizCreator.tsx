import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Quiz as QuizIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  DragIndicator as DragIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentApi, Assessment, Question, CreateAssessmentRequest } from '../../services/assessmentApi';
import { useResponsive } from '../../components/Responsive';

interface QuizCreatorProps {
  lessonId?: string;
  assessmentId?: string;
  onSave?: (assessment: Assessment) => void;
  onCancel?: () => void;
}

const QuizCreator: React.FC<QuizCreatorProps> = ({
  lessonId: propLessonId,
  assessmentId: propAssessmentId,
  onSave
}) => {
  const { lessonId: paramLessonId, assessmentId: paramAssessmentId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  
  const initialLessonId = propLessonId || paramLessonId;
  const assessmentId = propAssessmentId || paramAssessmentId;
  const isEditing = Boolean(assessmentId);

  // State management
  const [lessonId, setLessonId] = useState(initialLessonId || '');
  const [assessment, setAssessment] = useState<Partial<Assessment>>({
    lessonId: initialLessonId || '',
    title: '',
    type: 'quiz',
    passingScore: 70,
    maxAttempts: 3,
    timeLimit: undefined,
    isAdaptive: false
  });

  const [questions, setQuestions] = useState<Partial<Question>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<number | false>(0);

  // Load existing assessment if editing
  useEffect(() => {
    if (isEditing && assessmentId) {
      loadAssessment();
    }
  }, [assessmentId, isEditing]);

  // Helper function to map API response to expected format
  const mapAssessment = (apiAssessment: any) => ({
    id: apiAssessment.id,
    title: apiAssessment.title,
    type: apiAssessment.type,
    passingScore: apiAssessment.passingScore,
    maxAttempts: apiAssessment.maxAttempts,
    timeLimit: apiAssessment.timeLimit,
    isAdaptive: apiAssessment.isAdaptive,
    questionCount: apiAssessment.questionCount,
    lessonId: apiAssessment.lessonId,
    createdAt: apiAssessment.createdAt,
    updatedAt: apiAssessment.updatedAt,
    questions: (apiAssessment.questions || []).map(mapQuestion)
  });

  // Helper function to map question API response
  const mapQuestion = (apiQuestion: any) => {
    // Helper to safely get correct answer (handle both parsed and raw values)
    const getCorrectAnswer = (apiQuestion: any) => {
      if (apiQuestion.correctAnswer !== undefined) {
        return apiQuestion.correctAnswer; // Already parsed by backend
      }
      if (apiQuestion.CorrectAnswer) {
        try {
          // Try to parse if it's a JSON string
          return JSON.parse(apiQuestion.CorrectAnswer);
        } catch {
          // If parsing fails, return as-is
          return apiQuestion.CorrectAnswer;
        }
      }
      return '';
    };

    return {
      id: apiQuestion.Id,
      type: apiQuestion.Type,
      question: apiQuestion.Question,
      options: apiQuestion.options || (apiQuestion.Options ? JSON.parse(apiQuestion.Options) : []),
      correctAnswer: getCorrectAnswer(apiQuestion),
      explanation: apiQuestion.Explanation,
      difficulty: apiQuestion.Difficulty || 5,
      tags: apiQuestion.tags || (apiQuestion.Tags ? JSON.parse(apiQuestion.Tags) : []),
      adaptiveWeight: apiQuestion.AdaptiveWeight,
      orderIndex: apiQuestion.OrderIndex
    };
  };

  const loadAssessment = async () => {
    try {
      setLoading(true);
      const data = await assessmentApi.getAssessment(assessmentId!);
      const mappedAssessment = mapAssessment(data);
      setAssessment(mappedAssessment);
      setQuestions(mappedAssessment.questions || []);
      
      // Update lessonId from the loaded assessment
      if (mappedAssessment.lessonId) {
        setLessonId(mappedAssessment.lessonId);
      }
    } catch (error) {
      console.error('Error loading assessment:', error);
      setError('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  // Add new question
  const addQuestion = (type: Question['type'] = 'multiple_choice') => {
    const template = assessmentApi.getQuestionTemplate(type);
    const newQuestion: Partial<Question> = {
      ...template,
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate temporary unique ID
      orderIndex: questions.length
    };
    setQuestions([...questions, newQuestion]);
    setExpandedQuestion(questions.length);
  };

  // Update question
  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates };
    setQuestions(updatedQuestions);
  };

  // Delete question
  const deleteQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    // Update order indices
    updatedQuestions.forEach((q, i) => {
      q.orderIndex = i;
    });
    setQuestions(updatedQuestions);
    
    // Adjust expanded panel
    if (expandedQuestion === index) {
      setExpandedQuestion(false);
    } else if (typeof expandedQuestion === 'number' && expandedQuestion > index) {
      setExpandedQuestion(expandedQuestion - 1);
    }
  };

  // Move question up/down
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedQuestions = [...questions];
    const [movedQuestion] = updatedQuestions.splice(index, 1);
    updatedQuestions.splice(newIndex, 0, movedQuestion);

    // Update order indices
    updatedQuestions.forEach((q, i) => {
      q.orderIndex = i;
    });

    setQuestions(updatedQuestions);
    setExpandedQuestion(newIndex);
  };

  // Validate assessment
  const validateAssessment = (): string[] => {
    const errors: string[] = [];

    if (!assessment.title?.trim()) {
      errors.push('Assessment title is required');
    }

    if (!lessonId) {
      errors.push('Lesson ID is required');
    }

    if (questions.length === 0) {
      errors.push('At least one question is required');
    }

    questions.forEach((question, index) => {
      if (!question.question?.trim()) {
        errors.push(`Question ${index + 1}: Question text is required`);
      }

      if (question.type === 'multiple_choice' && (!question.options || question.options.length < 2)) {
        errors.push(`Question ${index + 1}: Multiple choice questions need at least 2 options`);
      }

      if (question.correctAnswer === null || question.correctAnswer === undefined) {
        errors.push(`Question ${index + 1}: Correct answer is required`);
      }
    });

    return errors;
  };

  // Save assessment
  const saveAssessment = async () => {
    try {
      setSaving(true);
      setError(null);

      const validationErrors = validateAssessment();
      if (validationErrors.length > 0) {
        setError(validationErrors.join(', '));
        return;
      }

      // Prepare questions for API - preserve real IDs, remove temporary ones
      const questionsForApi = questions.map(q => {
        const questionData: any = {
          type: q.type,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          tags: q.tags,
          adaptiveWeight: q.adaptiveWeight
        };

        // Include ID only if it's a real database ID (not temporary)
        if (q.id && !q.id.startsWith('temp-')) {
          questionData.id = q.id;
        }

        return questionData;
      });

      const assessmentData: CreateAssessmentRequest = {
        lessonId: lessonId!,
        title: assessment.title!,
        type: assessment.type!,
        passingScore: assessment.passingScore,
        maxAttempts: assessment.maxAttempts,
        timeLimit: assessment.timeLimit,
        isAdaptive: assessment.isAdaptive,
        questions: questionsForApi
      };

      let savedAssessment: Assessment;
      if (isEditing) {
        savedAssessment = await assessmentApi.updateAssessment(assessmentId!, assessmentData);
      } else {
        savedAssessment = await assessmentApi.createAssessment(assessmentData);
      }

      if (onSave) {
        onSave(savedAssessment);
      } else {
        // Navigate back to assessment management page
        navigate(`/instructor/lessons/${lessonId}/assessments`);
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      setError('Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  // Question type options
  const questionTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice', icon: '⭕' },
    { value: 'true_false', label: 'True/False', icon: '✓✗' },
    { value: 'short_answer', label: 'Short Answer', icon: '📝' },
    { value: 'essay', label: 'Essay', icon: '📄' },
    { value: 'code', label: 'Code', icon: '💻' },
    { value: 'drag_drop', label: 'Drag & Drop', icon: '🔀' },
    { value: 'fill_blank', label: 'Fill in Blanks', icon: '___' }
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading assessment...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: { xs: 1.5, sm: 0 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          <QuizIcon sx={{ fontSize: { xs: 24, sm: 32 }, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '2.125rem' } }}>
            {isEditing ? 'Edit Assessment' : 'Create New Assessment'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            data-testid="quiz-creator-settings-button"
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsOpen(true)}
            size={isMobile ? 'small' : 'medium'}
          >
            {isMobile ? '' : 'Settings'}
          </Button>
          <Button
            data-testid="quiz-creator-preview-button"
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={() => setPreviewOpen(true)}
            disabled={questions.length === 0}
            size={isMobile ? 'small' : 'medium'}
          >
            {isMobile ? '' : 'Preview'}
          </Button>
          <Button
            data-testid="quiz-creator-save-button"
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveAssessment}
            disabled={saving}
            size={isMobile ? 'small' : 'medium'}
          >
            {saving ? 'Saving...' : isMobile ? 'Save' : `${isEditing ? 'Update' : 'Create'} Assessment`}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Basic Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    data-testid="quiz-creator-title-input"
                    fullWidth
                    label="Assessment Title"
                    value={assessment.title || ''}
                    onChange={(e) => setAssessment({ ...assessment, title: e.target.value })}
                    placeholder="e.g., Introduction to React Quiz"
                    required
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Assessment Type</InputLabel>
                    <Select
                      data-testid="quiz-creator-type-select"
                      value={assessment.type || 'quiz'}
                      label="Assessment Type"
                      onChange={(e) => setAssessment({ ...assessment, type: e.target.value as Assessment['type'] })}
                    >
                      <MenuItem value="quiz">Quiz</MenuItem>
                      <MenuItem value="test">Test</MenuItem>
                      <MenuItem value="assignment">Assignment</MenuItem>
                      <MenuItem value="project">Project</MenuItem>
                      <MenuItem value="practical">Practical</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    data-testid="quiz-creator-passing-score-input"
                    fullWidth
                    label="Passing Score (%)"
                    type="number"
                    value={assessment.passingScore || ''}
                    onChange={(e) => setAssessment({ ...assessment, passingScore: parseInt(e.target.value) || 0 })}
                    inputProps={{ min: 0, max: 100 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Questions Section */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6">
                  Questions ({questions.length})
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {!isMobile && questionTypes.slice(0, 4).map((type) => (
                    <Tooltip key={type.value} title={`Add ${type.label}`}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => addQuestion(type.value as Question['type'])}
                        sx={{ minWidth: 40 }}
                      >
                        {type.icon}
                      </Button>
                    </Tooltip>
                  ))}
                  <Button
                    data-testid="quiz-creator-add-question-button"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => addQuestion()}
                    size={isMobile ? 'small' : 'medium'}
                  >
                    Add Question
                  </Button>
                </Box>
              </Box>

              {questions.length === 0 ? (
                <Alert severity="info">
                  No questions added yet. Click "Add Question" to get started.
                </Alert>
              ) : (
                <Box>
                  {questions.map((question, index) => (
                    <Accordion
                      key={question.id || `question-${index}`}
                      expanded={expandedQuestion === index}
                      onChange={(_, isExpanded) => setExpandedQuestion(isExpanded ? index : false)}
                      sx={{ mb: 1 }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, width: '100%', minWidth: 0 }}>
                          {!isMobile && <DragIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />}
                          <Typography noWrap sx={{ flexGrow: 1, minWidth: 0, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                            Q{index + 1}: {question.question?.slice(0, isMobile ? 30 : 60) || 'Untitled question'}
                            {question.question && question.question.length > (isMobile ? 30 : 60) && '...'}
                          </Typography>
                          <Chip
                            label={questionTypes.find(t => t.value === question.type)?.label || question.type}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ flexShrink: 0 }}
                          />
                          {!isMobile && (
                            <Chip
                              label={`Difficulty: ${question.difficulty || 5}`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </AccordionSummary>
                      
                      <AccordionDetails>
                        {/* Simplified inline question editor */}
                        <Box sx={{ p: 2 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <TextField
                                data-testid={`quiz-creator-question-text-${index}`}
                                fullWidth
                                label="Question"
                                multiline
                                rows={3}
                                value={question.question || ''}
                                onChange={(e) => updateQuestion(index, { question: e.target.value })}
                                placeholder="Enter your question here..."
                              />
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth>
                                <InputLabel>Question Type</InputLabel>
                                <Select
                                  data-testid={`quiz-creator-question-type-${index}`}
                                  value={question.type || 'multiple_choice'}
                                  label="Question Type"
                                  onChange={(e) => updateQuestion(index, { 
                                    type: e.target.value as Question['type'],
                                    ...assessmentApi.getQuestionTemplate(e.target.value as Question['type'])
                                  })}
                                >
                                  {questionTypes.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>
                                      {type.icon} {type.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            
                            <Grid item xs={12} sm={6}>
                              <TextField
                                data-testid={`quiz-creator-question-difficulty-${index}`}
                                fullWidth
                                label="Difficulty (1-10)"
                                type="number"
                                value={question.difficulty || 5}
                                onChange={(e) => updateQuestion(index, { difficulty: parseInt(e.target.value) })}
                                inputProps={{ min: 1, max: 10 }}
                              />
                            </Grid>

                            {/* Multiple Choice Options */}
                            {question.type === 'multiple_choice' && (
                              <Grid item xs={12}>
                                <Typography variant="subtitle2" gutterBottom>Options</Typography>
                                {(question.options || []).map((option, optionIndex) => (
                                  <Box key={optionIndex} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                    <TextField
                                      fullWidth
                                      label={`Option ${optionIndex + 1}`}
                                      value={option}
                                      onChange={(e) => {
                                        const newOptions = [...(question.options || [])];
                                        newOptions[optionIndex] = e.target.value;
                                        updateQuestion(index, { options: newOptions });
                                      }}
                                    />
                                    <Button
                                      variant={question.correctAnswer === option ? 'contained' : 'outlined'}
                                      color="success"
                                      onClick={() => updateQuestion(index, { correctAnswer: option })}
                                    >
                                      ✓
                                    </Button>
                                    <Button
                                      color="error"
                                      onClick={() => {
                                        const newOptions = question.options?.filter((_, i) => i !== optionIndex) || [];
                                        updateQuestion(index, { options: newOptions });
                                      }}
                                    >
                                      ✗
                                    </Button>
                                  </Box>
                                ))}
                                <Button
                                  size="small"
                                  onClick={() => {
                                    const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
                                    updateQuestion(index, { options: newOptions });
                                  }}
                                >
                                  Add Option
                                </Button>
                              </Grid>
                            )}

                            {/* True/False */}
                            {question.type === 'true_false' && (
                              <Grid item xs={12}>
                                <Typography variant="subtitle2" gutterBottom>Correct Answer</Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    variant={question.correctAnswer === true ? 'contained' : 'outlined'}
                                    color="success"
                                    onClick={() => updateQuestion(index, { correctAnswer: true })}
                                  >
                                    True
                                  </Button>
                                  <Button
                                    variant={question.correctAnswer === false ? 'contained' : 'outlined'}
                                    color="success"
                                    onClick={() => updateQuestion(index, { correctAnswer: false })}
                                  >
                                    False
                                  </Button>
                                </Box>
                              </Grid>
                            )}

                            {/* Short Answer / Essay */}
                            {(question.type === 'short_answer' || question.type === 'essay') && (
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  label="Correct Answer / Sample Answer"
                                  multiline
                                  rows={question.type === 'essay' ? 4 : 2}
                                  value={question.correctAnswer || ''}
                                  onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
                                  placeholder="Enter the correct answer or a sample answer for reference"
                                />
                              </Grid>
                            )}

                            <Grid item xs={12}>
                              <TextField
                                data-testid={`quiz-creator-question-explanation-${index}`}
                                fullWidth
                                label="Explanation (Optional)"
                                multiline
                                rows={2}
                                value={question.explanation || ''}
                                onChange={(e) => updateQuestion(index, { explanation: e.target.value })}
                                placeholder="Provide an explanation for the correct answer"
                              />
                            </Grid>

                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  {index > 0 && (
                                    <Button 
                                      data-testid={`quiz-creator-question-move-up-${index}`}
                                      size="small" 
                                      onClick={() => moveQuestion(index, 'up')}
                                    >
                                      Move Up
                                    </Button>
                                  )}
                                  {index < questions.length - 1 && (
                                    <Button 
                                      data-testid={`quiz-creator-question-move-down-${index}`}
                                      size="small" 
                                      onClick={() => moveQuestion(index, 'down')}
                                    >
                                      Move Down
                                    </Button>
                                  )}
                                </Box>
                                <Button
                                  data-testid={`quiz-creator-question-delete-${index}`}
                                  color="error"
                                  size="small"
                                  onClick={() => deleteQuestion(index)}
                                >
                                  Delete Question
                                </Button>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2, position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {questionTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant="outlined"
                    size="small"
                    startIcon={<span>{type.icon}</span>}
                    onClick={() => addQuestion(type.value as Question['type'])}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    Add {type.label}
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assessment Summary
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Questions:</strong> {questions.length}
                </Typography>
                <Typography variant="body2">
                  <strong>Passing Score:</strong> {assessment.passingScore || 70}%
                </Typography>
                <Typography variant="body2">
                  <strong>Max Attempts:</strong> {assessment.maxAttempts || 3}
                </Typography>
                <Typography variant="body2">
                  <strong>Time Limit:</strong> {assessment.timeLimit ? `${assessment.timeLimit} minutes` : 'None'}
                </Typography>
                <Typography variant="body2">
                  <strong>Adaptive:</strong> {assessment.isAdaptive ? 'Yes' : 'No'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Assessment Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  data-testid="quiz-creator-settings-max-attempts"
                  fullWidth
                  label="Maximum Attempts"
                  type="number"
                  value={assessment.maxAttempts ?? ''}
                  onChange={(e) => setAssessment({ ...assessment, maxAttempts: e.target.value ? parseInt(e.target.value) : undefined })}
                  inputProps={{ min: 1, max: 10 }}
                  helperText="How many times can students attempt this assessment?"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  data-testid="quiz-creator-settings-time-limit"
                  fullWidth
                  label="Time Limit (minutes)"
                  type="number"
                  value={assessment.timeLimit || ''}
                  onChange={(e) => setAssessment({ ...assessment, timeLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                  inputProps={{ min: 1 }}
                  helperText="Leave empty for no time limit"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      data-testid="quiz-creator-settings-adaptive-toggle"
                      checked={assessment.isAdaptive || false}
                      onChange={(e) => setAssessment({ ...assessment, isAdaptive: e.target.checked })}
                    />
                  }
                  label="Adaptive Assessment"
                />
                <Typography variant="body2" color="text.secondary">
                  Adaptive assessments adjust question difficulty based on student performance
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button data-testid="quiz-creator-settings-close" onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Assessment Preview</DialogTitle>
        <DialogContent>
          {/* Simplified preview */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {assessment.title || 'Untitled Assessment'}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {questions.length} questions • Passing score: {assessment.passingScore || 70}%
            </Typography>
            
            {questions.map((question, index) => (
              <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {index + 1}. {question.question || 'Untitled question'}
                </Typography>
                
                {question.type === 'multiple_choice' && question.options && (
                  <Box sx={{ ml: 2 }}>
                    {question.options.map((option, optIndex) => (
                      <Typography 
                        key={optIndex} 
                        variant="body2" 
                        sx={{ 
                          color: option === question.correctAnswer ? 'success.main' : 'text.primary',
                          fontWeight: option === question.correctAnswer ? 'bold' : 'normal'
                        }}
                      >
                        {String.fromCharCode(65 + optIndex)}. {option}
                      </Typography>
                    ))}
                  </Box>
                )}
                
                {question.type === 'true_false' && (
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="body2">
                      Correct answer: {question.correctAnswer ? 'True' : 'False'}
                    </Typography>
                  </Box>
                )}
                
                {question.explanation && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                    Explanation: {question.explanation}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button data-testid="quiz-creator-preview-close" onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizCreator;