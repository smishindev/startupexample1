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
import { FileUpload } from '../../components/Upload/FileUpload';
import { UploadedFile, fileUploadApi } from '../../services/fileUploadApi';
import { HeaderV5 as Header } from '../../components/Navigation/HeaderV5';
import { PageContainer, PageTitle, useResponsive } from '../../components/Responsive';

interface ContentItem {
  id: string;
  type: 'video' | 'text' | 'quiz';
  data: {
    title?: string;
    html?: string;
    content?: string;
    url?: string;
    fileId?: string;
    fileName?: string;
    mimeType?: string;
  };
  videoFile?: UploadedFile;
  transcriptFile?: UploadedFile;
  pendingVideoFile?: File;
  pendingTranscriptFile?: File;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  contentItems: ContentItem[]; // Changed to support multiple content items
  duration?: number;
  order: number;
  isRequired?: boolean;
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

const levels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' }
];
const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];

export const CourseCreationForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useResponsive();
  
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
  const [currentLesson, setCurrentLesson] = useState<Partial<Lesson>>({ contentItems: [] });
  const [currentContentItem, setCurrentContentItem] = useState<Partial<ContentItem>>({});
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [lessonErrors, setLessonErrors] = useState<{title?: string; description?: string; content?: string}>({});
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
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
    setCurrentLesson({ title: '', description: '', contentItems: [], order: lessons.length + 1, isRequired: true });
    setLessonDialogOpen(true);
  };

  const addContentToLesson = (type: 'video' | 'text' | 'quiz') => {
    setCurrentContentItem({ type, data: {} });
    setContentDialogOpen(true);
  };

  const saveContentItem = () => {
    const item: ContentItem = {
      id: `temp-${Date.now()}`,
      type: currentContentItem.type!,
      data: currentContentItem.data || {},
      videoFile: currentContentItem.videoFile,
      transcriptFile: currentContentItem.transcriptFile,
      pendingVideoFile: currentContentItem.pendingVideoFile,
      pendingTranscriptFile: currentContentItem.pendingTranscriptFile
    };
    
    setCurrentLesson(prev => ({
      ...prev,
      contentItems: [...(prev.contentItems || []), item]
    }));
    
    setContentDialogOpen(false);
    setCurrentContentItem({});
  };

  const removeContentItem = (itemId: string) => {
    setCurrentLesson(prev => ({
      ...prev,
      contentItems: prev.contentItems?.filter(item => item.id !== itemId) || []
    }));
  };

  const closeLessonDialog = () => {
    setLessonDialogOpen(false);
    setCurrentLesson({ contentItems: [] });
    setLessonErrors({});
  };

  const saveLesson = () => {
    // Validate required fields
    const errors: {title?: string; description?: string; content?: string} = {};
    
    if (!currentLesson.title?.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!currentLesson.description?.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!currentLesson.contentItems || currentLesson.contentItems.length === 0) {
      errors.content = 'Please add at least one content item (video, text, or quiz)';
    }
    
    // Show errors if validation failed
    if (Object.keys(errors).length > 0) {
      setLessonErrors(errors);
      return;
    }
    
    // Clear errors and save lesson
    setLessonErrors({});
    const lesson: Lesson = {
      id: Date.now().toString(),
      title: currentLesson.title!,
      description: currentLesson.description!,
      contentItems: currentLesson.contentItems || [],
      duration: currentLesson.duration,
      order: currentLesson.order || lessons.length + 1,
      isRequired: currentLesson.isRequired !== false
    };
    setLessons([...lessons, lesson]);
    setLessonDialogOpen(false);
    setCurrentLesson({ contentItems: [] });
  };

  const removeLesson = (lessonId: string) => {
    setLessons(lessons.filter(lesson => lesson.id !== lessonId));
  };

  const handleContentVideoFileSelected = (file: File | null) => {
    setCurrentContentItem(prev => ({
      ...prev,
      pendingVideoFile: file || undefined
    }));
  };

  const handleContentVideoFileUploaded = (file: UploadedFile) => {
    setCurrentContentItem(prev => ({
      ...prev,
      videoFile: file,
      data: {
        ...prev.data,
        url: file.url,
        fileName: file.originalName,
        fileId: file.id,
        mimeType: file.mimetype
      }
    }));
  };

  const handleContentVideoFileDeleted = () => {
    setCurrentContentItem(prev => ({
      ...prev,
      videoFile: undefined,
      pendingVideoFile: undefined,
      data: {
        ...prev.data,
        url: undefined,
        fileName: undefined,
        fileId: undefined
      }
    }));
  };

  const getLessonIcon = (contentType: string) => {
    switch (contentType) {
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

  const getLessonContentSummary = (lesson: Lesson) => {
    const counts = {
      video: 0,
      text: 0,
      quiz: 0
    };
    
    lesson.contentItems?.forEach(item => {
      counts[item.type]++;
    });
    
    const parts = [];
    if (counts.video > 0) parts.push(`${counts.video} video${counts.video > 1 ? 's' : ''}`);
    if (counts.text > 0) parts.push(`${counts.text} text${counts.text > 1 ? 's' : ''}`);
    if (counts.quiz > 0) parts.push(`${counts.quiz} quiz${counts.quiz > 1 ? 'zes' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : 'No content';
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
      // Count total files to upload across all content items
      const totalFilesToUpload = lessons.reduce((count, lesson) => {
        return count + (lesson.contentItems?.reduce((itemCount, item) => {
          if (item.pendingVideoFile) itemCount++;
          if (item.pendingTranscriptFile) itemCount++;
          return itemCount;
        }, 0) || 0);
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

      // Upload files and process lessons
      const processedLessons: Lesson[] = [];
      let uploadedCount = 0;

      for (let i = 0; i < lessons.length; i++) {
        if (cancelUpload) {
          throw new Error('Upload cancelled by user');
        }

        const lesson = lessons[i];
        const processedContentItems: ContentItem[] = [];

        // Process each content item
        for (const item of lesson.contentItems || []) {
          let processedItem = { ...item };

          // Upload pending video file if exists
          if (item.pendingVideoFile) {
            uploadedCount++;
            setUploadProgress(prev => ({
              ...prev,
              current: uploadedCount,
              currentFileName: item.pendingVideoFile?.name || 'Video',
              currentFileProgress: 0
            }));

            try {
              const result = await fileUploadApi.uploadFile(item.pendingVideoFile, {
                fileType: 'video',
                description: `Video for lesson: ${lesson.title}`,
                onProgress: (progress) => {
                  setUploadProgress(prev => ({
                    ...prev,
                    currentFileProgress: progress.percentage
                  }));
                }
              });
              processedItem.videoFile = result;
              processedItem.data = {
                ...processedItem.data,
                url: result.url,
                fileName: result.originalName,
                fileId: result.id,
                mimeType: result.mimetype
              };
              
              setUploadProgress(prev => ({
                ...prev,
                currentFileProgress: 100
              }));
            } catch (error) {
              console.error('Failed to upload video:', error);
              throw new Error(`Failed to upload video for lesson "${lesson.title}"`);
            }
          }

          // Upload pending transcript file if exists
          if (item.pendingTranscriptFile) {
            if (cancelUpload) {
              throw new Error('Upload cancelled by user');
            }

            uploadedCount++;
            setUploadProgress(prev => ({
              ...prev,
              current: uploadedCount,
              currentFileName: item.pendingTranscriptFile?.name || 'Transcript',
              currentFileProgress: 0
            }));

            try {
              const result = await fileUploadApi.uploadFile(item.pendingTranscriptFile, {
                fileType: 'document',
                description: `Transcript for lesson: ${lesson.title}`,
                onProgress: (progress) => {
                  setUploadProgress(prev => ({
                    ...prev,
                    currentFileProgress: progress.percentage
                  }));
                }
              });
              processedItem.transcriptFile = result;
              
              setUploadProgress(prev => ({
                ...prev,
                currentFileProgress: 100
              }));
            } catch (error) {
              console.error('Failed to upload transcript:', error);
              // Transcript is optional, continue without it
            }
          }

          processedContentItems.push(processedItem);
        }

        processedLessons.push({
          ...lesson,
          contentItems: processedContentItems
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
      const apiLessons = processedLessons.map(lesson => ({
        title: lesson.title,
        description: lesson.description,
        content: lesson.contentItems.map(item => ({
          type: item.type,
          data: item.data
        })),
        duration: lesson.duration,
        order: lesson.order,
        isRequired: lesson.isRequired
      })) as any; // Temporarily bypass type checking - backend accepts this format

      await instructorApi.createCourse({
        ...courseData,
        lessons: apiLessons
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
        } catch (error) {
          console.error('Thumbnail upload failed:', error);
          alert('Failed to upload thumbnail. Course will be created without thumbnail.');
        }
      }
      
      // Count total files to upload across all content items
      const totalFilesToUpload = lessons.reduce((count, lesson) => {
        return count + (lesson.contentItems?.reduce((itemCount, item) => {
          if (item.pendingVideoFile) itemCount++;
          if (item.pendingTranscriptFile) itemCount++;
          return itemCount;
        }, 0) || 0);
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

      // Upload files and process lessons
      const processedLessons: Lesson[] = [];
      let uploadedCount = 0;
      const failedUploads: Array<{ lessonTitle: string; fileName: string; error: string; lessonIndex: number }> = [];

      for (let i = 0; i < lessons.length; i++) {
        if (cancelUpload) {
          throw new Error('Upload cancelled by user');
        }

        const lesson = lessons[i];
        const processedContentItems: ContentItem[] = [];

        // Process each content item
        for (const item of lesson.contentItems || []) {
          let processedItem = { ...item };

          // Upload pending video file if exists
          if (item.pendingVideoFile) {
            uploadedCount++;
            setUploadProgress(prev => ({
              ...prev,
              current: uploadedCount,
              currentFileName: item.pendingVideoFile?.name || 'Video',
              currentFileProgress: 0
            }));

            try {
              const result = await fileUploadApi.uploadFile(item.pendingVideoFile, {
                fileType: 'video',
                description: `Video for lesson: ${lesson.title}`,
                onProgress: (progress) => {
                  setUploadProgress(prev => ({
                    ...prev,
                    currentFileProgress: progress.percentage
                  }));
                }
              });
              processedItem.videoFile = result;
              processedItem.data = {
                ...processedItem.data,
                url: result.url,
                fileName: result.originalName,
                fileId: result.id,
                mimeType: result.mimetype
              };
              
              setUploadProgress(prev => ({
                ...prev,
                currentFileProgress: 100
              }));
            } catch (error: any) {
              console.error('Failed to upload video:', error);
              failedUploads.push({
                lessonTitle: lesson.title,
                fileName: item.pendingVideoFile.name,
                error: error.message || 'Upload failed',
                lessonIndex: i
              });
            }
          }

          // Upload pending transcript file if exists
          if (item.pendingTranscriptFile) {
            if (cancelUpload) {
              throw new Error('Upload cancelled by user');
            }

            uploadedCount++;
            setUploadProgress(prev => ({
              ...prev,
              current: uploadedCount,
              currentFileName: item.pendingTranscriptFile?.name || 'Transcript',
              currentFileProgress: 0
            }));

            try {
              const result = await fileUploadApi.uploadFile(item.pendingTranscriptFile, {
                fileType: 'document',
                description: `Transcript for lesson: ${lesson.title}`,
                onProgress: (progress) => {
                  setUploadProgress(prev => ({
                    ...prev,
                    currentFileProgress: progress.percentage
                  }));
                }
              });
              processedItem.transcriptFile = result;
              
              setUploadProgress(prev => ({
                ...prev,
                currentFileProgress: 100
              }));
            } catch (error: any) {
              console.error('Failed to upload transcript:', error);
              // Transcript is optional, log but continue
              failedUploads.push({
                lessonTitle: lesson.title,
                fileName: item.pendingTranscriptFile.name,
                error: error.message || 'Upload failed',
                lessonIndex: i
              });
            }
          }

          processedContentItems.push(processedItem);
        }

        processedLessons.push({
          ...lesson,
          contentItems: processedContentItems
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
      const apiLessons = processedLessons.map(lesson => ({
        title: lesson.title,
        description: lesson.description,
        content: lesson.contentItems.map(item => ({
          type: item.type,
          data: item.data
        })),
        duration: lesson.duration,
        order: lesson.order,
        isRequired: lesson.isRequired
      })) as any; // Temporarily bypass type checking - backend accepts this format

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
              <Paper sx={{ p: { xs: 2, sm: 3 } }}>
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
                  data-testid="course-creation-title-input"
                />
                
                <TextField
                  fullWidth
                  label="Course Subtitle"
                  value={courseData.subtitle}
                  onChange={(e) => handleInputChange('subtitle', e.target.value)}
                  margin="normal"
                  helperText="A brief, catchy subtitle for your course"
                  data-testid="course-creation-subtitle-input"
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
                  data-testid="course-creation-description-input"
                />
                
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={courseData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        label="Category"
                        data-testid="course-creation-category-select"
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
                        data-testid="course-creation-level-select"
                      >
                        {levels.map((level) => (
                          <MenuItem key={level.value} value={level.value}>{level.label}</MenuItem>
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
                      value={courseData.price || ''}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      data-testid="course-creation-price-input"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      inputProps={{
                        min: 0,
                        step: 0.01
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: { xs: 2, sm: 3 } }}>
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
                    data-testid="course-creation-thumbnail-upload-button"
                  >
                    {thumbnailPreview ? 'Change Thumbnail' : 'Upload Thumbnail'}
                  </Button>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Paper sx={{ p: { xs: 2, sm: 3 } }}>
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
                  <Button onClick={addTag} disabled={!newTag.trim()} data-testid="course-creation-add-tag-button">
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
              <Paper sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Course Curriculum ({lessons.length} lessons)
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={addLesson}
                    data-testid="course-creation-add-lesson-button"
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
                          {lesson.contentItems && lesson.contentItems.length > 0 
                            ? getLessonIcon(lesson.contentItems[0].type) 
                            : <ArticleIcon />}
                        </ListItemIcon>
                        <ListItemText
                          primary={lesson.title}
                          secondary={
                            <Box component="span">
                              <Typography variant="body2" color="text.secondary" component="span" display="block">
                                {lesson.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" component="span" display="block">
                                Content: {getLessonContentSummary(lesson)}
                              </Typography>
                            </Box>
                          }
                        />
                        {lesson.duration && (
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                            {lesson.duration} min
                          </Typography>
                        )}
                        <IconButton onClick={() => removeLesson(lesson.id)} color="error" data-testid={`course-creation-remove-lesson-${lesson.id}-button`}>
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
              <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Requirements
                </Typography>
                <List dense>
                  {(courseData.requirements || []).map((req) => (
                    <ListItem key={req} dense>
                      <ListItemText primary={req} />
                      <IconButton onClick={() => removeRequirement(req)} size="small" data-testid={`course-creation-remove-requirement-button`}>
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
                  <Button onClick={addRequirement} disabled={!newRequirement.trim()} data-testid="course-creation-add-requirement-button">
                    Add
                  </Button>
                </Box>
              </Paper>
              
              <Paper sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  What You'll Learn
                </Typography>
                <List dense>
                  {(courseData.whatYouWillLearn || []).map((point) => (
                    <ListItem key={point} dense>
                      <ListItemText primary={point} />
                      <IconButton onClick={() => removeLearningPoint(point)} size="small" data-testid={`course-creation-remove-learning-point-button`}>
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
                  <Button onClick={addLearningPoint} disabled={!newLearningPoint.trim()} data-testid="course-creation-add-learning-point-button">
                    Add
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        );
      
      case 2:
        return (
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
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
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
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
    <>
      <Header />
      <PageContainer>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <PageTitle subtitle={searchParams.get('type') === 'template' ? 'Starting with template' : 'Creating from scratch'}>
          Create New Course
        </PageTitle>
      </Box>

      {/* Stepper */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel={!isMobile} orientation={isMobile ? 'vertical' : 'horizontal'}>
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
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', mt: 3, gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/instructor/dashboard')}
          color="inherit"
          sx={{ borderRadius: 2 }}
          data-testid="course-creation-cancel-button"
        >
          Cancel
        </Button>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={saveDraft}
            disabled={saving}
            data-testid="course-creation-save-draft-button"
          >
            Save Draft
          </Button>
          
          {activeStep > 0 && (
            <Button onClick={handleBack} data-testid="course-creation-back-button">
              Back
            </Button>
          )}
          
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!courseData.title || !courseData.description}
              data-testid="course-creation-next-button"
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<PublishIcon />}
              onClick={publishCourse}
              disabled={saving || !courseData.title || !courseData.description}
              data-testid="course-creation-publish-button"
            >
              Publish Course
            </Button>
          )}
        </Box>
      </Box>

      {/* Add Lesson Dialog */}
      <Dialog
        open={lessonDialogOpen}
        onClose={closeLessonDialog}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
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
                onChange={(e) => {
                  setCurrentLesson({...currentLesson, title: e.target.value});
                  if (lessonErrors.title) setLessonErrors(prev => ({...prev, title: undefined}));
                }}
                error={!!lessonErrors.title}
                helperText={lessonErrors.title}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Lesson Description"
                value={currentLesson.description || ''}
                onChange={(e) => {
                  setCurrentLesson({...currentLesson, description: e.target.value});
                  if (lessonErrors.description) setLessonErrors(prev => ({...prev, description: undefined}));
                }}
                error={!!lessonErrors.description}
                helperText={lessonErrors.description}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Duration (minutes)"
                value={currentLesson.duration || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setCurrentLesson({...currentLesson, duration: value === '' ? 0 : parseInt(value) || 0});
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentLesson.isRequired !== false}
                    onChange={(e) => setCurrentLesson({...currentLesson, isRequired: e.target.checked})}
                  />
                }
                label="Required"
              />
            </Grid>
            
            {/* Content Items Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Lesson Content ({currentLesson.contentItems?.length || 0} items)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<VideoIcon />}
                    onClick={() => addContentToLesson('video')}
                  >
                    Add Video
                  </Button>
                  <Button
                    size="small"
                    startIcon={<ArticleIcon />}
                    onClick={() => addContentToLesson('text')}
                  >
                    Add Text
                  </Button>
                  <Button
                    size="small"
                    startIcon={<QuizIcon />}
                    onClick={() => addContentToLesson('quiz')}
                  >
                    Add Quiz
                  </Button>
                </Box>
              </Box>
              
              {lessonErrors.content && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {lessonErrors.content}
                </Alert>
              )}
              
              {currentLesson.contentItems && currentLesson.contentItems.length > 0 ? (
                <List>
                  {currentLesson.contentItems.map((item, index) => (
                    <ListItem
                      key={item.id}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => removeContentItem(item.id)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        {getLessonIcon(item.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Content #${index + 1}`}
                        secondary={
                          item.type === 'video' 
                            ? (item.data.fileName || item.data.url || 'Not configured')
                            : item.type === 'text'
                            ? (item.data.content ? `${item.data.content.substring(0, 50)}...` : 'Not configured')
                            : 'Quiz'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  No content added yet. Click the buttons above to add videos, text, or quizzes.
                </Alert>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLessonDialog} data-testid="course-creation-lesson-dialog-cancel-button">Cancel</Button>
          <Button onClick={saveLesson} variant="contained" data-testid="course-creation-lesson-dialog-add-button">
            Add Lesson
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Content Item Dialog */}
      <Dialog
        open={contentDialogOpen}
        onClose={() => setContentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        disableEnforceFocus
      >
        <DialogTitle>
          Add {currentContentItem.type && currentContentItem.type.charAt(0).toUpperCase() + currentContentItem.type.slice(1)} Content
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {currentContentItem.type === 'video' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="body2" gutterBottom>
                    Upload a video file:
                  </Typography>
                  <FileUpload
                    fileType="video"
                    deferUpload={true}
                    onFileSelected={handleContentVideoFileSelected}
                    onFileUploaded={handleContentVideoFileUploaded}
                    onFileDeleted={handleContentVideoFileDeleted}
                    maxFiles={1}
                    showLibrary={false}
                    title="Video"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" gutterBottom>
                    Or enter video URL:
                  </Typography>
                  <TextField
                    fullWidth
                    label="Video URL"
                    value={currentContentItem.data?.url || ''}
                    onChange={(e) => setCurrentContentItem(prev => ({
                      ...prev,
                      data: { ...prev.data, url: e.target.value }
                    }))}
                    placeholder="https://example.com/video.mp4"
                  />
                </Grid>
              </>
            )}
            {currentContentItem.type === 'text' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  label="Text Content"
                  value={currentContentItem.data?.content || ''}
                  onChange={(e) => setCurrentContentItem(prev => ({
                    ...prev,
                    data: { ...prev.data, content: e.target.value, html: e.target.value }
                  }))}
                  placeholder="Enter your text content here..."
                />
              </Grid>
            )}
            {currentContentItem.type === 'quiz' && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Quiz content configuration coming soon. For now, this will create a placeholder quiz.
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContentDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={saveContentItem} 
            variant="contained"
            disabled={
              currentContentItem.type === 'video' 
                ? !currentContentItem.pendingVideoFile && !currentContentItem.data?.url
                : currentContentItem.type === 'text'
                ? !currentContentItem.data?.content
                : false
            }
          >
            Add Content
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Progress Dialog */}
      <Dialog 
        open={uploadProgress.isOpen} 
        onClose={() => uploadProgress.status !== 'uploading' && setUploadProgress(prev => ({ ...prev, isOpen: false }))}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
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
              <Button onClick={() => setUploadProgress(prev => ({ ...prev, isOpen: false }))} data-testid="course-creation-upload-close-button">
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
      </PageContainer>
    </>
  );
};