import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  DragIndicator as DragIcon,
  VideoLibrary as VideoIcon,
  Article as TextIcon,
  Quiz as QuizIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';
import { Lesson, LessonContent, lessonApi, createVideoContent, createTextContent } from '../../services/lessonApi';
import { FileUpload } from '../../components/Upload/FileUpload';
import { UploadedFile } from '../../services/fileUploadApi';
import { useResponsive } from '../../components/Responsive';

interface LessonEditorProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  lesson?: Lesson | null;
  onSave: (lesson: Lesson) => void;
}

const contentTypeLabels = {
  video: 'Video',
  text: 'Text/Article',
  quiz: 'Quiz'
};

const contentTypeIcons = {
  video: <VideoIcon />,
  text: <TextIcon />,
  quiz: <QuizIcon />
};

export const LessonEditor: React.FC<LessonEditorProps> = ({
  open,
  onClose,
  courseId,
  lesson,
  onSave
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isMobile } = useResponsive();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(0);
  const [isRequired, setIsRequired] = useState(true);
  const [content, setContent] = useState<LessonContent[]>([]);
  
  // File upload state for each content item
  const [useFileUpload, setUseFileUpload] = useState<{ [key: number]: boolean }>({});

  const steps = ['Basic Information', 'Content', 'Settings'];

  useEffect(() => {
    if (open && lesson) {
      // Editing existing lesson - fetch full details including content
      const loadLessonDetails = async () => {
        try {
          setLoading(true);
          console.log('[LESSON EDITOR] Loading lesson details for ID:', lesson.id);
          const fullLesson = await lessonApi.getLesson(lesson.id);
          console.log('[LESSON EDITOR] Received full lesson:', fullLesson);
          console.log('[LESSON EDITOR] Content array:', fullLesson.content);
          console.log('[LESSON EDITOR] Content length:', fullLesson.content?.length);
          setTitle(fullLesson.title);
          setDescription(fullLesson.description);
          setDuration(fullLesson.duration || 0);
          setIsRequired(fullLesson.isRequired || true);
          setContent(fullLesson.content || []);
        } catch (err) {
          console.error('Error loading lesson details:', err);
          // Fallback to prop data if API fails
          setTitle(lesson.title);
          setDescription(lesson.description);
          setDuration(lesson.duration || 0);
          setIsRequired(lesson.isRequired || true);
          setContent(lesson.content || []);
          setError('Failed to load lesson content. Some data may be missing.');
        } finally {
          setLoading(false);
        }
      };
      loadLessonDetails();
    } else if (open) {
      // Creating new lesson
      setTitle('');
      setDescription('');
      setDuration(0);
      setIsRequired(true);
      setContent([]);
    }
    setActiveStep(0);
    if (!lesson) setError(null); // Only clear error for new lessons
  }, [open, lesson]);

  const handleNext = () => {
    if (activeStep === 0) {
      // Validate basic info
      if (!title.trim()) {
        setError('Title is required');
        return;
      }
      if (!description.trim()) {
        setError('Description is required');
        return;
      }
    }
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      if (lesson) {
        // Update existing lesson
        const updatedLesson = await lessonApi.updateLesson(lesson.id, {
          title,
          description,
          content,
          duration,
          isRequired
        });
        onSave(updatedLesson);
      } else {
        // Create new lesson
        const newLesson = await lessonApi.createLesson({
          courseId,
          title,
          description,
          content,
          duration,
          isRequired
        });
        onSave(newLesson);
      }

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save lesson');
    } finally {
      setLoading(false);
    }
  };

  const addContent = (type: 'video' | 'text' | 'quiz') => {
    let newContent: LessonContent;
    
    // Generate temporary client-side ID for React keys (will be replaced by backend)
    const tempId = `temp-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    switch (type) {
      case 'video':
        newContent = { ...createVideoContent(''), id: tempId };
        break;
      case 'text':
        newContent = { ...createTextContent('<p>Enter your content here...</p>'), id: tempId };
        break;
      case 'quiz':
        newContent = {
          id: tempId,
          type: 'quiz',
          data: {
            questions: [],
            passingScore: 70,
            allowRetries: true,
            maxAttempts: 3
          }
        };
        break;
      default:
        return;
    }

    setContent(prev => [...prev, newContent]);
  };

  const updateContent = (index: number, newData: any) => {
    setContent(prev => prev.map((item, i) => 
      i === index ? { ...item, data: { ...item.data, ...newData } } : item
    ));
  };

  const removeContent = (index: number) => {
    setContent(prev => prev.filter((_, i) => i !== index));
  };

  const moveContent = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === content.length - 1)
    ) {
      return;
    }

    setContent(prev => {
      const newContent = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newContent[index], newContent[targetIndex]] = [newContent[targetIndex], newContent[index]];
      return newContent;
    });
  };

  const handleFileUploaded = (index: number, file: UploadedFile) => {
    // Store complete file information in data object
    // Do NOT set fileId at top level - it causes confusion
    setContent(prev => prev.map((item, i) => 
      i === index 
        ? { 
            ...item,
            data: { 
              ...item.data, 
              url: file.url,
              fileName: file.originalName,
              fileId: file.id, // Store fileId in data for reference
              mimeType: file.mimetype,
              fileSize: file.size
            } 
          } 
        : item
    ));
  };

  const toggleUploadMode = (index: number) => {
    setUseFileUpload(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const renderBasicInfo = () => (
    <Box sx={{ mt: 2 }}>
      <TextField
        fullWidth
        label="Lesson Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        sx={{ mb: 2 }}
        required
        data-testid="lesson-editor-title-input"
      />
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        sx={{ mb: 2 }}
        required
        data-testid="lesson-editor-description-input"
      />
      <TextField
        fullWidth
        type="number"
        label="Duration (minutes)"
        value={duration || ''}
        onChange={(e) => {
          const value = e.target.value;
          setDuration(value === '' ? 0 : parseInt(value) || 0);
        }}
        helperText="Estimated time to complete this lesson"
      />
    </Box>
  );

  const renderContentEditor = () => (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          startIcon={<VideoIcon />}
          variant="outlined"
          size="small"
          onClick={() => addContent('video')}
          data-testid="lesson-editor-add-video-button"
        >
          Add Video
        </Button>
        <Button
          startIcon={<TextIcon />}
          variant="outlined"
          size="small"
          onClick={() => addContent('text')}
          data-testid="lesson-editor-add-text-button"
        >
          Add Text
        </Button>
        <Button
          startIcon={<QuizIcon />}
          variant="outlined"
          size="small"
          onClick={() => addContent('quiz')}
          data-testid="lesson-editor-add-quiz-button"
        >
          Add Quiz
        </Button>
      </Box>

      {content.length === 0 ? (
        <Alert severity="info">
          No content added yet. Use the buttons above to add video, text, or quiz content.
        </Alert>
      ) : (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Content will be displayed to students in this order. Use the arrow buttons to reorder.
          </Typography>
          {content.map((item, index) => (
            <Accordion key={item.id || `fallback-${index}`} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, flexWrap: 'wrap', gap: 0.5 }}>
                  <DragIcon sx={{ mr: 1, color: 'text.secondary', display: { xs: 'none', sm: 'block' } }} />
                  {contentTypeIcons[item.type]}
                  <Box sx={{ ml: 1, flexGrow: 1, minWidth: 0 }}>
                    <Typography component="span" fontWeight={500} noWrap sx={{ display: 'block' }}>
                      {contentTypeLabels[item.type]} #{index + 1}
                    </Typography>
                    {item.type === 'video' && item.data.fileName && (
                      <Typography component="span" variant="body2" color="text.secondary" noWrap sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
                        - {item.data.fileName}
                      </Typography>
                    )}
                    {item.type === 'video' && !item.data.fileName && item.data.url && (
                      <Typography component="span" variant="body2" color="text.secondary" noWrap sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
                        - {item.data.url.length > 40 ? item.data.url.substring(0, 40) + '...' : item.data.url}
                      </Typography>
                    )}
                    {item.type === 'text' && item.data.html && (
                      <Typography component="span" variant="body2" color="text.secondary" noWrap sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
                        - {item.data.html.substring(0, 50).replace(/<[^>]*>/g, '')}...
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveContent(index, 'up');
                      }}
                      disabled={index === 0}
                      title="Move up"
                      data-testid={`lesson-editor-content-move-up-${index}`}
                    >
                      <ArrowUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveContent(index, 'down');
                      }}
                      disabled={index === content.length - 1}
                      title="Move down"
                      data-testid={`lesson-editor-content-move-down-${index}`}
                    >
                      <ArrowDownIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeContent(index);
                      }}
                      title="Delete"
                      data-testid={`lesson-editor-content-delete-${index}`}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {item.type === 'video' && (
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={useFileUpload[index] || false}
                          onChange={() => toggleUploadMode(index)}
                        />
                      }
                      label="Upload video file instead of using URL"
                      sx={{ mb: 2 }}
                    />
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    {useFileUpload[index] ? (
                      <FileUpload
                        key={`video-upload-${index}-${item.data.fileId || 'new'}`}
                        fileType="video"
                        courseId={courseId}
                        onFileUploaded={(file) => handleFileUploaded(index, file)}
                        maxFiles={1}
                        showLibrary={false}
                        title="Upload Video"
                        description="Upload a video file for this lesson content"
                      />
                    ) : (
                      <TextField
                        fullWidth
                        label="Video URL"
                        value={item.data.url || ''}
                        onChange={(e) => updateContent(index, { url: e.target.value })}
                        placeholder="https://example.com/video.mp4 or YouTube URL"
                      />
                    )}
                  </Box>
                )}
                {item.type === 'text' && (
                  <TextField
                    fullWidth
                    multiline
                    rows={8}
                    label="Content (HTML supported)"
                    value={item.data.html}
                    onChange={(e) => updateContent(index, { html: e.target.value })}
                  />
                )}
                {item.type === 'quiz' && (
                  <Alert severity="info">
                    Quiz editor coming soon! For now, quiz data will be stored as JSON.
                  </Alert>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );

  const renderSettings = () => (
    <Box sx={{ mt: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
          />
        }
        label="Required Lesson"
        sx={{ mb: 2 }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Required lessons must be completed before students can access subsequent lessons.
      </Typography>
      
      <Alert severity="info">
        Prerequisites and advanced settings will be available in a future update.
      </Alert>
    </Box>
  );

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderContentEditor();
      case 2:
        return renderSettings();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile} disableEnforceFocus>
      <DialogTitle>
        {lesson ? 'Edit Lesson' : 'Create New Lesson'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {renderStepContent(index)}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <div>
                    {index === steps.length - 1 ? (
                      <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={loading}
                        startIcon={loading && <CircularProgress size={16} />}
                        data-testid="lesson-editor-save-button"
                      >
                        {lesson ? 'Update Lesson' : 'Create Lesson'}
                      </Button>
                    ) : (
                      <Button variant="contained" onClick={handleNext} data-testid="lesson-editor-step-continue-button">
                        Continue
                      </Button>
                    )}
                    <Button disabled={index === 0} onClick={handleBack} sx={{ ml: 1 }} data-testid="lesson-editor-step-back-button">
                      Back
                    </Button>
                  </div>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading} data-testid="lesson-editor-dialog-cancel-button">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};