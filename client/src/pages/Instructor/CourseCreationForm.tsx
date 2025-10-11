import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormHelperText,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Switch,
  FormControlLabel,
  InputAdornment
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  VideoLibrary as VideoIcon,
  Article as ArticleIcon,
  Quiz as QuizIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  Publish as PublishIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { instructorApi, CourseFormData } from '../../services/instructorApi';
import { FileUpload } from '../../components/Upload/FileUpload';
import { UploadedFile } from '../../services/fileUploadApi';

interface Lesson {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'text' | 'quiz';
  content?: string;
  videoUrl?: string;
  videoFile?: UploadedFile;
  useFileUpload?: boolean;
  duration?: number;
  order: number;
}

const steps = ['Basic Info', 'Course Content', 'Settings', 'Preview & Publish'];

const categories = [
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Machine Learning',
  'DevOps',
  'Design',
  'Business',
  'Marketing',
  'Photography',
  'Music'
];

const levels = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];

export const CourseCreationForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeStep, setActiveStep] = useState(0);
  const [courseData, setCourseData] = useState<CourseFormData>({
    title: '',
    subtitle: '',
    description: '',
    category: '',
    level: '',
    language: 'English',
    price: 0,
    tags: [],
    requirements: [],
    whatYouWillLearn: [],
    isPublic: true,
    allowComments: true,
    certificateEnabled: true
  });
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [newLearningPoint, setNewLearningPoint] = useState('');
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<Partial<Lesson>>({});
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field: keyof CourseFormData, value: any) => {
    setCourseData(prev => ({ ...prev, [field]: value }));
  };

  const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setThumbnailPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !courseData.tags?.includes(newTag.trim())) {
      handleInputChange('tags', [...(courseData.tags || []), newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', courseData.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  const addRequirement = () => {
    if (newRequirement.trim() && !courseData.requirements?.includes(newRequirement.trim())) {
      handleInputChange('requirements', [...(courseData.requirements || []), newRequirement.trim()]);
      setNewRequirement('');
    }
  };

  const removeRequirement = (reqToRemove: string) => {
    handleInputChange('requirements', courseData.requirements?.filter(req => req !== reqToRemove) || []);
  };

  const addLearningPoint = () => {
    if (newLearningPoint.trim() && !courseData.whatYouWillLearn?.includes(newLearningPoint.trim())) {
      handleInputChange('whatYouWillLearn', [...(courseData.whatYouWillLearn || []), newLearningPoint.trim()]);
      setNewLearningPoint('');
    }
  };

  const removeLearningPoint = (pointToRemove: string) => {
    handleInputChange('whatYouWillLearn', courseData.whatYouWillLearn?.filter(point => point !== pointToRemove) || []);
  };

  const addLesson = () => {
    setCurrentLesson({ type: 'video', order: lessons.length + 1, useFileUpload: true });
    setLessonDialogOpen(true);
  };

  const handleVideoFileUploaded = (file: UploadedFile) => {
    setCurrentLesson(prev => ({ 
      ...prev, 
      videoFile: file,
      videoUrl: file.url 
    }));
  };

  const handleVideoFileDeleted = () => {
    setCurrentLesson(prev => ({ 
      ...prev, 
      videoFile: undefined,
      videoUrl: '' 
    }));
  };

  const saveLesson = () => {
    if (currentLesson.title && currentLesson.description) {
      const lesson: Lesson = {
        id: Date.now().toString(),
        title: currentLesson.title!,
        description: currentLesson.description!,
        type: currentLesson.type || 'video',
        content: currentLesson.content,
        videoUrl: currentLesson.videoUrl,
        videoFile: currentLesson.videoFile,
        useFileUpload: currentLesson.useFileUpload,
        duration: currentLesson.duration,
        order: currentLesson.order || lessons.length + 1
      };
      setLessons([...lessons, lesson]);
      setLessonDialogOpen(false);
      setCurrentLesson({});
    }
  };

  const removeLesson = (lessonId: string) => {
    setLessons(lessons.filter(lesson => lesson.id !== lessonId));
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <VideoIcon />;
      case 'text':
        return <ArticleIcon />;
      case 'quiz':
        return <QuizIcon />;
      default:
        return <ArticleIcon />;
    }
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      // Convert frontend lesson format to API format
      const apiLessons = lessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        content: lesson.content,
        videoUrl: lesson.videoUrl,
        videoFile: lesson.videoFile ? {
          id: lesson.videoFile.id,
          url: lesson.videoFile.url,
          originalName: lesson.videoFile.originalName,
          mimeType: lesson.videoFile.mimetype
        } : undefined,
        useFileUpload: lesson.useFileUpload,
        duration: lesson.duration,
        order: lesson.order
      }));

      await instructorApi.createCourse({
        ...courseData,
        lessons: apiLessons
        // TODO: Handle thumbnail upload separately
      });
      // Navigate back to instructor dashboard
      navigate('/instructor/dashboard');
    } catch (error: any) {
      console.error('Failed to save draft:', error);
      
      // Better error handling
      if (error?.response?.status === 401) {
        alert('Authentication failed. Please log in again.');
        navigate('/login');
      } else {
        alert(`Failed to save course: ${error?.response?.data?.error || error?.message || 'Unknown error'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const publishCourse = async () => {
    setSaving(true);
    try {
      // Convert frontend lesson format to API format
      const apiLessons = lessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        content: lesson.content,
        videoUrl: lesson.videoUrl,
        videoFile: lesson.videoFile ? {
          id: lesson.videoFile.id,
          url: lesson.videoFile.url,
          originalName: lesson.videoFile.originalName,
          mimeType: lesson.videoFile.mimetype
        } : undefined,
        useFileUpload: lesson.useFileUpload,
        duration: lesson.duration,
        order: lesson.order
      }));

      const result = await instructorApi.createCourse({
        ...courseData,
        lessons: apiLessons
        // TODO: Handle thumbnail upload separately
      });
      
      // If course was created successfully, publish it
      if (result.id) {
        await instructorApi.publishCourse(result.id);
      }
      
      // Navigate back to instructor dashboard
      navigate('/instructor/dashboard');
    } catch (error: any) {
      console.error('Failed to publish course:', error);
      
      // Better error handling
      if (error?.response?.status === 401) {
        alert('Authentication failed. Please log in again.');
        navigate('/login');
      } else {
        alert(`Failed to publish course: ${error?.response?.data?.error || error?.message || 'Unknown error'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Course Information
                </Typography>
                
                <TextField
                  fullWidth
                  label="Course Title"
                  value={courseData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  margin="normal"
                  required
                />
                
                <TextField
                  fullWidth
                  label="Course Subtitle"
                  value={courseData.subtitle}
                  onChange={(e) => handleInputChange('subtitle', e.target.value)}
                  margin="normal"
                  helperText="A brief, catchy subtitle for your course"
                />
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Course Description"
                  value={courseData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  margin="normal"
                  required
                />
                
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={courseData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        label="Category"
                      >
                        {categories.map((cat) => (
                          <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Level</InputLabel>
                      <Select
                        value={courseData.level}
                        onChange={(e) => handleInputChange('level', e.target.value)}
                        label="Level"
                      >
                        {levels.map((level) => (
                          <MenuItem key={level} value={level}>{level}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={courseData.language}
                        onChange={(e) => handleInputChange('language', e.target.value)}
                        label="Language"
                      >
                        {languages.map((lang) => (
                          <MenuItem key={lang} value={lang}>{lang}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Price"
                      value={courseData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Course Thumbnail
                </Typography>
                
                <Box sx={{ textAlign: 'center' }}>
                  {thumbnailPreview ? (
                    <Card sx={{ mb: 2 }}>
                      <CardMedia
                        component="img"
                        height="140"
                        image={thumbnailPreview}
                        alt="Course thumbnail"
                      />
                    </Card>
                  ) : (
                    <Box
                      sx={{
                        border: '2px dashed',
                        borderColor: 'grey.300',
                        borderRadius: 1,
                        p: 4,
                        mb: 2
                      }}
                    >
                      <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                      <Typography color="text.secondary">
                        Upload course thumbnail
                      </Typography>
                    </Box>
                  )}
                  
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleThumbnailUpload}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => fileInputRef.current?.click()}
                    fullWidth
                  >
                    {thumbnailPreview ? 'Change Thumbnail' : 'Upload Thumbnail'}
                  </Button>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Tags
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {(courseData.tags || []).map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => removeTag(tag)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    label="Add tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} disabled={!newTag.trim()}>
                    Add
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        );
      
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Course Curriculum ({lessons.length} lessons)
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={addLesson}
                  >
                    Add Lesson
                  </Button>
                </Box>
                
                <List>
                  {lessons.map((lesson, index) => (
                    <React.Fragment key={lesson.id}>
                      <ListItem>
                        <ListItemIcon>
                          <DragIcon />
                        </ListItemIcon>
                        <ListItemIcon>
                          {getLessonIcon(lesson.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={lesson.title}
                          secondary={
                            <Box component="span">
                              <Typography variant="body2" color="text.secondary" component="span" display="block">
                                {lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)} - {lesson.description}
                              </Typography>
                              {lesson.type === 'video' && (
                                <Typography variant="caption" color="text.secondary" component="span" display="block">
                                  {lesson.useFileUpload 
                                    ? (lesson.videoFile 
                                        ? `📁 File: ${lesson.videoFile.originalName}`
                                        : '📁 File upload (no file selected)')
                                    : (lesson.videoUrl 
                                        ? `🔗 URL: ${lesson.videoUrl}`
                                        : '🔗 URL (not specified)')
                                  }
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        {lesson.duration && (
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                            {lesson.duration} min
                          </Typography>
                        )}
                        <IconButton onClick={() => removeLesson(lesson.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </ListItem>
                      {index < lessons.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
                
                {lessons.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      No lessons added yet. Click "Add Lesson" to get started.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Requirements
                </Typography>
                <List dense>
                  {(courseData.requirements || []).map((req) => (
                    <ListItem key={req} dense>
                      <ListItemText primary={req} />
                      <IconButton onClick={() => removeRequirement(req)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <TextField
                    size="small"
                    label="Add requirement"
                    value={newRequirement}
                    onChange={(e) => setNewRequirement(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addRequirement()}
                    fullWidth
                  />
                  <Button onClick={addRequirement} disabled={!newRequirement.trim()}>
                    Add
                  </Button>
                </Box>
              </Paper>
              
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  What You'll Learn
                </Typography>
                <List dense>
                  {(courseData.whatYouWillLearn || []).map((point) => (
                    <ListItem key={point} dense>
                      <ListItemText primary={point} />
                      <IconButton onClick={() => removeLearningPoint(point)} size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <TextField
                    size="small"
                    label="Add learning point"
                    value={newLearningPoint}
                    onChange={(e) => setNewLearningPoint(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addLearningPoint()}
                    fullWidth
                  />
                  <Button onClick={addLearningPoint} disabled={!newLearningPoint.trim()}>
                    Add
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        );
      
      case 2:
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Course Settings
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={courseData.isPublic}
                      onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                    />
                  }
                  label="Make course public"
                />
                <FormHelperText>
                  Public courses can be discovered by all users
                </FormHelperText>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={courseData.allowComments}
                      onChange={(e) => handleInputChange('allowComments', e.target.checked)}
                    />
                  }
                  label="Allow comments"
                />
                <FormHelperText>
                  Students can comment on lessons
                </FormHelperText>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={courseData.certificateEnabled}
                      onChange={(e) => handleInputChange('certificateEnabled', e.target.checked)}
                    />
                  }
                  label="Issue certificates"
                />
                <FormHelperText>
                  Students receive certificates upon completion
                </FormHelperText>
              </Grid>
            </Grid>
          </Paper>
        );
      
      case 3:
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Preview & Publish
            </Typography>
            
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {courseData.title || 'Course Title'}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                  {courseData.subtitle || 'Course Subtitle'}
                </Typography>
                <Typography variant="body2" paragraph>
                  {courseData.description || 'Course description will appear here...'}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {(courseData.tags || []).slice(0, 3).map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                </Box>
                
                <Typography variant="h6" color="primary">
                  ${courseData.price}
                </Typography>
              </CardContent>
            </Card>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Please review your course information before publishing. Once published, your course will be available to students.
            </Typography>
          </Paper>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Course
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {searchParams.get('type') === 'template' ? 'Starting with template' : 'Creating from scratch'}
        </Typography>
      </Box>

      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          onClick={() => navigate('/instructor/dashboard')}
          color="inherit"
        >
          Cancel
        </Button>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={saveDraft}
            disabled={saving}
          >
            Save Draft
          </Button>
          
          {activeStep > 0 && (
            <Button onClick={handleBack}>
              Back
            </Button>
          )}
          
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!courseData.title || !courseData.description}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<PublishIcon />}
              onClick={publishCourse}
              disabled={saving || !courseData.title || !courseData.description}
            >
              Publish Course
            </Button>
          )}
        </Box>
      </Box>

      {/* Add Lesson Dialog */}
      <Dialog
        open={lessonDialogOpen}
        onClose={() => setLessonDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New Lesson</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Lesson Title"
                value={currentLesson.title || ''}
                onChange={(e) => setCurrentLesson({...currentLesson, title: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Lesson Description"
                value={currentLesson.description || ''}
                onChange={(e) => setCurrentLesson({...currentLesson, description: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Lesson Type</InputLabel>
                <Select
                  value={currentLesson.type || 'video'}
                  onChange={(e) => setCurrentLesson({...currentLesson, type: e.target.value as any})}
                  label="Lesson Type"
                >
                  <MenuItem value="video">Video</MenuItem>
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="quiz">Quiz</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Duration (minutes)"
                value={currentLesson.duration || ''}
                onChange={(e) => setCurrentLesson({...currentLesson, duration: parseInt(e.target.value) || 0})}
              />
            </Grid>
            {currentLesson.type === 'video' && (
              <>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={currentLesson.useFileUpload ?? true}
                        onChange={(e) => setCurrentLesson({
                          ...currentLesson, 
                          useFileUpload: e.target.checked,
                          videoUrl: '',
                          videoFile: undefined
                        })}
                      />
                    }
                    label="Upload video file instead of using URL"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                {currentLesson.useFileUpload ? (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Upload a video file for this lesson:
                    </Typography>
                    <FileUpload
                      fileType="video"
                      // Don't pass courseId for draft uploads - it will be null in database
                      onFileUploaded={handleVideoFileUploaded}
                      onFileDeleted={handleVideoFileDeleted}
                      maxFiles={1}
                      showLibrary={false}
                      title="Lesson Video"
                      description="Upload MP4, AVI, MOV files"
                    />
                    
                    {currentLesson.videoFile && (
                      <Paper sx={{ p: 2, mt: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                        <Typography variant="body2">
                          ✓ Selected video: {currentLesson.videoFile.originalName}
                        </Typography>
                      </Paper>
                    )}
                  </Grid>
                ) : (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Video URL"
                      value={currentLesson.videoUrl || ''}
                      onChange={(e) => setCurrentLesson({...currentLesson, videoUrl: e.target.value})}
                      placeholder="https://example.com/video.mp4"
                      helperText="Enter a direct link to the video file or streaming URL"
                    />
                  </Grid>
                )}
              </>
            )}
            {currentLesson.type === 'text' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Text Content"
                  value={currentLesson.content || ''}
                  onChange={(e) => setCurrentLesson({...currentLesson, content: e.target.value})}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLessonDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveLesson} variant="contained">
            Add Lesson
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};