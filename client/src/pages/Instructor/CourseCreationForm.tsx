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
  InputAdornment,
  LinearProgress,
  Alert,
  CircularProgress,
  Fade,
  Zoom
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
  Publish as PublishIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { instructorApi, CourseFormData } from '../../services/instructorApi';
import { FileUpload, FileUploadHandle } from '../../components/Upload/FileUpload';
import { UploadedFile, fileUploadApi } from '../../services/fileUploadApi';

interface Lesson {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'text' | 'quiz';
  content?: string;
  videoUrl?: string;
  videoFile?: UploadedFile;
  transcriptFile?: UploadedFile;
  thumbnailUrl?: string;
  useFileUpload?: boolean;
  duration?: number;
  order: number;
  pendingVideoFile?: File;
  pendingTranscriptFile?: File;
}

const steps = ['Basic Info', 'Course Content', 'Settings', 'Preview & Publish'];

// Categories matching backend CourseCategory enum with display formatting
const categories = [
  { value: 'programming', label: 'Programming' },
  { value: 'data_science', label: 'Data Science' },
  { value: 'design', label: 'Design' },
  { value: 'business', label: 'Business' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'language', label: 'Language' },
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'science', label: 'Science' },
  { value: 'arts', label: 'Arts' },
  { value: 'other', label: 'Other' }
];

const levels = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];

export const CourseCreationForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileUploadRef = useRef<FileUploadHandle>(null);
  const transcriptFileUploadRef = useRef<FileUploadHandle>(null);
  
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
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<{
    isOpen: boolean;
    current: number;
    total: number;
    currentFileName: string;
    currentFileProgress: number;
    status: 'uploading' | 'processing' | 'completed' | 'error';
    errorMessage?: string;
    failedUploads: Array<{ lessonTitle: string; fileName: string; error: string; lessonIndex: number }>;
    onComplete?: () => void;
  }>({
    isOpen: false,
    current: 0,
    total: 0,
    currentFileName: '',
    currentFileProgress: 0,
    status: 'uploading',
    failedUploads: []
  });
  
  const [cancelUpload, setCancelUpload] = useState(false);

  const handleInputChange = (field: keyof CourseFormData, value: any) => {
    setCourseData(prev => ({ ...prev, [field]: value }));
  };

  const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }
      
      setThumbnailFile(file);
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

  const handleVideoFileSelected = (file: File | null) => {
    setCurrentLesson(prev => ({ 
      ...prev, 
      pendingVideoFile: file || undefined
    }));
  };

  const handleVideoFileDeleted = () => {
    setCurrentLesson(prev => ({ 
      ...prev, 
      videoFile: undefined,
      videoUrl: '',
      pendingVideoFile: undefined
    }));
  };

  const handleTranscriptFileUploaded = (file: UploadedFile) => {
    setCurrentLesson(prev => ({ 
      ...prev, 
      transcriptFile: file
    }));
  };

  const handleTranscriptFileSelected = (file: File | null) => {
    setCurrentLesson(prev => ({ 
      ...prev, 
      pendingTranscriptFile: file || undefined
    }));
  };

  const handleTranscriptFileDeleted = () => {
    setCurrentLesson(prev => ({ 
      ...prev, 
      transcriptFile: undefined,
      pendingTranscriptFile: undefined
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
        transcriptFile: currentLesson.transcriptFile,
        thumbnailUrl: currentLesson.thumbnailUrl,
        useFileUpload: currentLesson.useFileUpload,
        duration: currentLesson.duration,
        order: currentLesson.order || lessons.length + 1,
        pendingVideoFile: currentLesson.pendingVideoFile,
        pendingTranscriptFile: currentLesson.pendingTranscriptFile
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
    setCancelUpload(false);
    
    try {
      // Count total files to upload
      const totalFilesToUpload = lessons.reduce((count, lesson) => {
        if (lesson.pendingVideoFile) count++;
        if (lesson.pendingTranscriptFile) count++;
        return count;
      }, 0);

      if (totalFilesToUpload > 0) {
        // Show upload progress dialog
        setUploadProgress({
          isOpen: true,
          current: 0,
          total: totalFilesToUpload,
          currentFileName: '',
          currentFileProgress: 0,
          status: 'uploading',
          failedUploads: []
        });
      }

      // Upload files sequentially with progress tracking
      const uploadedLessons: Lesson[] = [];
      let uploadedCount = 0;

      for (let i = 0; i < lessons.length; i++) {
        if (cancelUpload) {
          throw new Error('Upload cancelled by user');
        }

        const lesson = lessons[i];
        let uploadedVideoFile = lesson.videoFile;
        let uploadedTranscriptFile = lesson.transcriptFile;

        // Upload pending video file if exists
        if (lesson.pendingVideoFile) {
          uploadedCount++;
          setUploadProgress(prev => ({
            ...prev,
            current: uploadedCount,
            currentFileName: lesson.pendingVideoFile?.name || 'Video',
            currentFileProgress: 0
          }));

          try {
            const result = await fileUploadApi.uploadFile(lesson.pendingVideoFile, {
              fileType: 'video',
              description: `Video for lesson: ${lesson.title}`,
              onProgress: (progress) => {
                setUploadProgress(prev => ({
                  ...prev,
                  currentFileProgress: progress.percentage
                }));
              }
            });
            uploadedVideoFile = result;
            
            setUploadProgress(prev => ({
              ...prev,
              currentFileProgress: 100
            }));
          } catch (error) {
            console.error('Failed to upload video for lesson:', lesson.title, error);
            throw new Error(`Failed to upload video for lesson "${lesson.title}"`);
          }
        }

        // Upload pending transcript file if exists
        if (lesson.pendingTranscriptFile) {
          if (cancelUpload) {
            throw new Error('Upload cancelled by user');
          }

          uploadedCount++;
          setUploadProgress(prev => ({
            ...prev,
            current: uploadedCount,
            currentFileName: lesson.pendingTranscriptFile?.name || 'Transcript',
            currentFileProgress: 0
          }));

          try {
            const result = await fileUploadApi.uploadFile(lesson.pendingTranscriptFile, {
              fileType: 'document',
              description: `Transcript for lesson: ${lesson.title}`,
              onProgress: (progress) => {
                setUploadProgress(prev => ({
                  ...prev,
                  currentFileProgress: progress.percentage
                }));
              }
            });
            uploadedTranscriptFile = result;
            
            setUploadProgress(prev => ({
              ...prev,
              currentFileProgress: 100
            }));
          } catch (error) {
            console.error('Failed to upload transcript for lesson:', lesson.title, error);
            // Transcript is optional, so we don't throw here
          }
        }

        uploadedLessons.push({
          ...lesson,
          videoFile: uploadedVideoFile,
          transcriptFile: uploadedTranscriptFile
        });
      }

      // Show upload success
      if (totalFilesToUpload > 0) {
        setUploadProgress(prev => ({
          ...prev,
          status: 'completed',
          currentFileName: 'All files uploaded successfully!',
          currentFileProgress: 100
        }));
        
        // Wait a moment to show success
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Show processing state
        setUploadProgress(prev => ({
          ...prev,
          status: 'processing'
        }));
      }

      // Convert frontend lesson format to API format
      const apiLessons = uploadedLessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        content: lesson.content,
        videoUrl: lesson.videoFile?.url || lesson.videoUrl,
        videoFile: lesson.videoFile ? {
          id: lesson.videoFile.id,
          url: lesson.videoFile.url,
          originalName: lesson.videoFile.originalName,
          mimeType: lesson.videoFile.mimetype
        } : undefined,
        transcriptFile: lesson.transcriptFile ? {
          id: lesson.transcriptFile.id,
          url: lesson.transcriptFile.url,
          originalName: lesson.transcriptFile.originalName,
          mimeType: lesson.transcriptFile.mimetype
        } : undefined,
        thumbnailUrl: lesson.thumbnailUrl,
        useFileUpload: lesson.useFileUpload,
        duration: lesson.duration,
        order: lesson.order
      }));

      await instructorApi.createCourse({
        ...courseData,
        lessons: apiLessons
        // TODO: Handle thumbnail upload separately
      });
      
      // Close dialog and navigate
      if (totalFilesToUpload > 0) {
        setUploadProgress(prev => ({ ...prev, isOpen: false }));
      }
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
    setCancelUpload(false);
    
    try {
      // Upload thumbnail first if selected
      let thumbnailUrl = '';
      if (thumbnailFile) {
        try {
          const uploadedFile = await fileUploadApi.uploadFile(thumbnailFile, { fileType: 'image' });
          thumbnailUrl = uploadedFile.url;
          setUploadedThumbnailUrl(thumbnailUrl);
        } catch (error) {
          console.error('Thumbnail upload failed:', error);
          alert('Failed to upload thumbnail. Course will be created without thumbnail.');
        }
      }
      
      // Count total files to upload
      const totalFilesToUpload = lessons.reduce((count, lesson) => {
        if (lesson.pendingVideoFile) count++;
        if (lesson.pendingTranscriptFile) count++;
        return count;
      }, 0);

      if (totalFilesToUpload > 0) {
        // Show upload progress dialog
        setUploadProgress({
          isOpen: true,
          current: 0,
          total: totalFilesToUpload,
          currentFileName: '',
          currentFileProgress: 0,
          status: 'uploading',
          failedUploads: []
        });
      }

      // Upload files sequentially with progress tracking
      const uploadedLessons: Lesson[] = [];
      let uploadedCount = 0;
      const failedUploads: Array<{ lessonTitle: string; fileName: string; error: string; lessonIndex: number }> = [];

      for (let i = 0; i < lessons.length; i++) {
        if (cancelUpload) {
          throw new Error('Upload cancelled by user');
        }

        const lesson = lessons[i];
        let uploadedVideoFile = lesson.videoFile;
        let uploadedTranscriptFile = lesson.transcriptFile;

        // Upload pending video file if exists
        if (lesson.pendingVideoFile) {
          uploadedCount++;
          setUploadProgress(prev => ({
            ...prev,
            current: uploadedCount,
            currentFileName: lesson.pendingVideoFile?.name || 'Video',
            currentFileProgress: 0
          }));

          try {
            const result = await fileUploadApi.uploadFile(lesson.pendingVideoFile, {
              fileType: 'video',
              description: `Video for lesson: ${lesson.title}`,
              onProgress: (progress) => {
                setUploadProgress(prev => ({
                  ...prev,
                  currentFileProgress: progress.percentage
                }));
              }
            });
            uploadedVideoFile = result;
            
            setUploadProgress(prev => ({
              ...prev,
              currentFileProgress: 100
            }));
          } catch (error: any) {
            console.error('Failed to upload video for lesson:', lesson.title, error);
            failedUploads.push({
              lessonTitle: lesson.title,
              fileName: lesson.pendingVideoFile.name,
              error: error.message || 'Upload failed',
              lessonIndex: i
            });
          }
        }

        // Upload pending transcript file if exists
        if (lesson.pendingTranscriptFile) {
          if (cancelUpload) {
            throw new Error('Upload cancelled by user');
          }

          uploadedCount++;
          setUploadProgress(prev => ({
            ...prev,
            current: uploadedCount,
            currentFileName: lesson.pendingTranscriptFile?.name || 'Transcript',
            currentFileProgress: 0
          }));

          try {
            const result = await fileUploadApi.uploadFile(lesson.pendingTranscriptFile, {
              fileType: 'document',
              description: `Transcript for lesson: ${lesson.title}`,
              onProgress: (progress) => {
                setUploadProgress(prev => ({
                  ...prev,
                  currentFileProgress: progress.percentage
                }));
              }
            });
            uploadedTranscriptFile = result;
            
            setUploadProgress(prev => ({
              ...prev,
              currentFileProgress: 100
            }));
          } catch (error: any) {
            console.error('Failed to upload transcript for lesson:', lesson.title, error);
            // Transcript is optional, log but continue
            failedUploads.push({
              lessonTitle: lesson.title,
              fileName: lesson.pendingTranscriptFile.name,
              error: error.message || 'Upload failed',
              lessonIndex: i
            });
          }
        }

        uploadedLessons.push({
          ...lesson,
          videoFile: uploadedVideoFile,
          transcriptFile: uploadedTranscriptFile
        });
      }

      // Check for failed video uploads (critical)
      const failedVideoUploads = failedUploads.filter(f => f.fileName.match(/\.(mp4|avi|mov|webm)$/i));
      
      if (failedVideoUploads.length > 0) {
        setUploadProgress(prev => ({
          ...prev,
          status: 'error',
          failedUploads: failedUploads,
          errorMessage: `${failedVideoUploads.length} video upload(s) failed. Please retry.`
        }));
        return; // Don't proceed with course creation
      }

      // Show upload success
      if (totalFilesToUpload > 0) {
        setUploadProgress(prev => ({
          ...prev,
          status: 'completed',
          currentFileName: 'All files uploaded successfully!',
          currentFileProgress: 100
        }));
        
        // Wait a moment to show success
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Show processing state
        setUploadProgress(prev => ({
          ...prev,
          status: 'processing'
        }));
      }

      // Convert frontend lesson format to API format
      const apiLessons = uploadedLessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        content: lesson.content,
        videoUrl: lesson.videoFile?.url || lesson.videoUrl,
        videoFile: lesson.videoFile ? {
          id: lesson.videoFile.id,
          url: lesson.videoFile.url,
          originalName: lesson.videoFile.originalName,
          mimeType: lesson.videoFile.mimetype
        } : undefined,
        transcriptFile: lesson.transcriptFile ? {
          id: lesson.transcriptFile.id,
          url: lesson.transcriptFile.url,
          originalName: lesson.transcriptFile.originalName,
          mimeType: lesson.transcriptFile.mimetype
        } : undefined,
        thumbnailUrl: lesson.thumbnailUrl,
        useFileUpload: lesson.useFileUpload,
        duration: lesson.duration,
        order: lesson.order
      }));

      const result = await instructorApi.createCourse({
        ...courseData,
        thumbnail: thumbnailUrl || undefined,
        lessons: apiLessons
      });
      
      // If course was created successfully, publish it
      if (result.id) {
        await instructorApi.publishCourse(result.id);
      }
      
      // Close dialog and navigate
      if (totalFilesToUpload > 0) {
        setUploadProgress(prev => ({ ...prev, isOpen: false }));
      }
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
                          <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
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
                                <>
                                  <Typography variant="caption" color="text.secondary" component="span" display="block">
                                    {lesson.useFileUpload 
                                      ? (lesson.videoFile 
                                          ? `📁 Video: ${lesson.videoFile.originalName}`
                                          : '📁 File upload (no file selected)')
                                      : (lesson.videoUrl 
                                          ? `🔗 URL: ${lesson.videoUrl}`
                                          : '🔗 URL (not specified)')
                                    }
                                  </Typography>
                                  {lesson.transcriptFile && (
                                    <Chip 
                                      label={`📝 Transcript: ${lesson.transcriptFile.originalName}`}
                                      size="small" 
                                      color="info" 
                                      variant="outlined"
                                      sx={{ mt: 0.5 }}
                                    />
                                  )}
                                </>
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
        disableEnforceFocus
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
                  <>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Upload a video file for this lesson:
                      </Typography>
                      <FileUpload
                        ref={videoFileUploadRef}
                        fileType="video"
                        deferUpload={true}
                        onFileSelected={handleVideoFileSelected}
                        onFileUploaded={handleVideoFileUploaded}
                        onFileDeleted={handleVideoFileDeleted}
                        maxFiles={1}
                        showLibrary={false}
                        title="Lesson Video"
                        description="Upload MP4, AVI, MOV files (max 500MB)"
                      />
                      
                      {currentLesson.videoFile && (
                        <Paper sx={{ p: 2, mt: 2, bgcolor: 'success.light' }}>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <VideoIcon />
                            ✓ Selected video: {currentLesson.videoFile.originalName}
                          </Typography>
                          {currentLesson.videoFile.url && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" gutterBottom>Video Preview:</Typography>
                              <Box sx={{ mt: 1, borderRadius: 1, overflow: 'hidden' }}>
                                <video
                                  src={currentLesson.videoFile.url}
                                  controls
                                  style={{ width: '100%', maxHeight: '300px' }}
                                />
                              </Box>
                            </Box>
                          )}
                        </Paper>
                      )}
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                        Upload transcript file (optional):
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Transcripts improve accessibility and allow students to search video content. Accepted formats: VTT, SRT
                      </Typography>
                      <FileUpload
                        ref={transcriptFileUploadRef}
                        fileType="document"
                        deferUpload={true}
                        onFileSelected={handleTranscriptFileSelected}
                        onFileUploaded={handleTranscriptFileUploaded}
                        onFileDeleted={handleTranscriptFileDeleted}
                        maxFiles={1}
                        showLibrary={false}
                        title="Video Transcript"
                        description="Upload VTT or SRT subtitle files"
                      />
                      
                      {currentLesson.transcriptFile && (
                        <Paper sx={{ p: 2, mt: 2, bgcolor: 'info.light' }}>
                          <Typography variant="body2">
                            ✓ Transcript: {currentLesson.transcriptFile.originalName}
                          </Typography>
                        </Paper>
                      )}
                    </Grid>
                  </>
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

      {/* Upload Progress Dialog */}
      <Dialog 
        open={uploadProgress.isOpen} 
        onClose={() => uploadProgress.status !== 'uploading' && setUploadProgress(prev => ({ ...prev, isOpen: false }))}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>
          {uploadProgress.status === 'uploading' && '📤 Uploading Files'}
          {uploadProgress.status === 'completed' && '✓ Upload Complete'}
          {uploadProgress.status === 'processing' && '⚙️ Creating Course'}
          {uploadProgress.status === 'error' && '⚠ Upload Errors'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            {uploadProgress.status === 'uploading' && (
              <>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Uploading {uploadProgress.current} of {uploadProgress.total} files
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                  {uploadProgress.currentFileName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={uploadProgress.currentFileProgress} 
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 45 }}>
                    {uploadProgress.currentFileProgress}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Please don't close this window while files are uploading
                </Typography>
              </>
            )}

            {uploadProgress.status === 'completed' && (
              <Zoom in={true}>
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CheckCircleIcon 
                    sx={{ 
                      fontSize: 80, 
                      color: 'success.main',
                      mb: 2
                    }} 
                  />
                  <Typography variant="h6" color="success.main" gutterBottom sx={{ fontWeight: 600 }}>
                    All Files Uploaded Successfully!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {uploadProgress.total} {uploadProgress.total === 1 ? 'file' : 'files'} uploaded
                  </Typography>
                </Box>
              </Zoom>
            )}

            {uploadProgress.status === 'processing' && (
              <Fade in={true}>
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Creating Your Course
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Setting up lessons and publishing...
                  </Typography>
                </Box>
              </Fade>
            )}

            {uploadProgress.status === 'error' && (
              <>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {uploadProgress.errorMessage}
                </Alert>
                <Typography variant="subtitle2" gutterBottom>
                  Failed Uploads:
                </Typography>
                <List dense>
                  {uploadProgress.failedUploads.map((failed, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`${failed.lessonTitle}: ${failed.fileName}`}
                        secondary={failed.error}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          {uploadProgress.status === 'uploading' && (
            <Button 
              onClick={() => {
                setCancelUpload(true);
                setUploadProgress(prev => ({ ...prev, isOpen: false }));
                setSaving(false);
              }}
              color="error"
            >
              Cancel Upload
            </Button>
          )}
          {uploadProgress.status === 'error' && (
            <>
              <Button onClick={() => setUploadProgress(prev => ({ ...prev, isOpen: false }))}>
                Close
              </Button>
              <Button 
                onClick={() => {
                  // Retry failed uploads
                  const failedLessons = uploadProgress.failedUploads.map(f => f.lessonIndex);
                  console.log('Retrying lessons:', failedLessons);
                  setUploadProgress(prev => ({ ...prev, isOpen: false, failedUploads: [] }));
                  publishCourse();
                }}
                variant="contained"
                color="primary"
              >
                Retry Failed Uploads
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};