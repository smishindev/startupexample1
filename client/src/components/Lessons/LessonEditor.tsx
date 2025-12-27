import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  Tabs,
  Tab,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
  Paper
} from '@mui/material';
import { lessonApi, Lesson, LessonContent } from '../../services/lessonApi';
import { FileUpload } from '../Upload/FileUpload';
import { UploadedFile } from '../../services/fileUploadApi';

interface LessonEditorProps {
  courseId: string;
  lessonId?: string;
  onSave?: (lesson: Lesson) => void;
  onCancel?: () => void;
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
      id={`lesson-tabpanel-${index}`}
      aria-labelledby={`lesson-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const LessonEditor: React.FC<LessonEditorProps> = ({
  courseId,
  lessonId,
  onSave,
  onCancel
}) => {
  const [lesson, setLesson] = useState<Lesson>({
    id: lessonId || '',
    courseId,
    title: '',
    description: '',
    orderIndex: 0,
    content: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [useFileUpload, setUseFileUpload] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedVideoFile, setSelectedVideoFile] = useState<UploadedFile | null>(null);

  useEffect(() => {
    if (lessonId) {
      loadLesson();
    }
  }, [lessonId]);

  const loadLesson = async () => {
    if (!lessonId) return;
    
    try {
      setLoading(true);
      const loadedLesson = await lessonApi.getLesson(lessonId);
      // Ensure all fields have proper defaults
      setLesson({
        ...loadedLesson,
        orderIndex: loadedLesson.orderIndex ?? 0,
        content: loadedLesson.content ?? []
      });
      
      // Check if lesson has video content and determine if it's a file or URL
      const videoContent = loadedLesson.content.find(c => c.type === 'video');
      if (videoContent) {
        if (videoContent.fileId) {
          setUseFileUpload(true);
          // TODO: Load file details if needed
        } else if (videoContent.url) {
          setUseFileUpload(false);
          setVideoUrl(videoContent.url);
        }
      }
    } catch (err: any) {
      setError('Failed to load lesson');
      console.error('Error loading lesson:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!lesson.title.trim()) {
      setError('Lesson title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Prepare lesson data
      const lessonData = { ...lesson };
      
      // Handle video content
      const existingVideoIndex = lessonData.content.findIndex(c => c.type === 'video');
      
      if (useFileUpload && selectedVideoFile) {
        const videoContent: LessonContent = {
          id: existingVideoIndex >= 0 ? lessonData.content[existingVideoIndex].id : undefined,
          type: 'video',
          fileId: selectedVideoFile.id,
          orderIndex: existingVideoIndex >= 0 ? lessonData.content[existingVideoIndex].orderIndex : 0
        };
        
        if (existingVideoIndex >= 0) {
          lessonData.content[existingVideoIndex] = videoContent;
        } else {
          lessonData.content.push(videoContent);
        }
      } else if (!useFileUpload && videoUrl.trim()) {
        const videoContent: LessonContent = {
          id: existingVideoIndex >= 0 ? lessonData.content[existingVideoIndex].id : undefined,
          type: 'video',
          url: videoUrl.trim(),
          orderIndex: existingVideoIndex >= 0 ? lessonData.content[existingVideoIndex].orderIndex : 0
        };
        
        if (existingVideoIndex >= 0) {
          lessonData.content[existingVideoIndex] = videoContent;
        } else {
          lessonData.content.push(videoContent);
        }
      } else if (existingVideoIndex >= 0) {
        // Remove video content if neither file nor URL is provided
        lessonData.content.splice(existingVideoIndex, 1);
      }

      const savedLesson = lessonId
        ? await lessonApi.updateLesson(lessonId, lessonData)
        : await lessonApi.createLesson(lessonData);

      // Ensure all fields have proper defaults
      setLesson({
        ...savedLesson,
        orderIndex: savedLesson.orderIndex ?? 0,
        content: savedLesson.content ?? []
      });
      setSuccess(`Lesson ${lessonId ? 'updated' : 'created'} successfully`);
      
      if (onSave) {
        onSave(savedLesson);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save lesson');
      console.error('Error saving lesson:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoFileUploaded = (file: UploadedFile) => {
    setSelectedVideoFile(file);
    setSuccess('Video uploaded successfully');
  };

  const handleVideoFileDeleted = (fileId: string) => {
    if (selectedVideoFile?.id === fileId) {
      setSelectedVideoFile(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {lessonId ? 'Edit Lesson' : 'Create New Lesson'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <Tabs 
          value={currentTab} 
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Basic Info" />
          <Tab label="Video Content" />
          <Tab label="Additional Content" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Lesson Title"
                value={lesson.title}
                onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
                required
                error={!lesson.title.trim()}
                helperText={!lesson.title.trim() ? 'Title is required' : ''}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={4}
                value={lesson.description}
                onChange={(e) => setLesson({ ...lesson, description: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Order Index"
                type="number"
                value={lesson.orderIndex}
                onChange={(e) => setLesson({ ...lesson, orderIndex: parseInt(e.target.value) || 0 })}
                inputProps={{ min: 0 }}
              />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Typography variant="h6" gutterBottom>
            Video Content
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={useFileUpload}
                onChange={(e) => setUseFileUpload(e.target.checked)}
              />
            }
            label="Upload video file instead of using URL"
            sx={{ mb: 3 }}
          />

          <Divider sx={{ mb: 3 }} />

          {useFileUpload ? (
            <Box>
              <Typography variant="body1" gutterBottom>
                Upload a video file for this lesson:
              </Typography>
              <FileUpload
                fileType="video"
                courseId={courseId}
                lessonId={lessonId}
                onFileUploaded={handleVideoFileUploaded}
                onFileDeleted={handleVideoFileDeleted}
                maxFiles={1}
                showLibrary={true}
                title="Lesson Video"
                description="Upload the main video content for this lesson"
              />
              
              {selectedVideoFile && (
                <Paper sx={{ p: 2, mt: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="body2">
                    ✓ Selected video: {selectedVideoFile.originalName}
                  </Typography>
                </Paper>
              )}
            </Box>
          ) : (
            <Box>
              <TextField
                fullWidth
                label="Video URL"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://example.com/video.mp4"
                helperText="Enter a direct link to the video file or streaming URL"
              />
            </Box>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Additional Content
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload supporting materials like documents, images, or additional resources.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FileUpload
                fileType="document"
                courseId={courseId}
                lessonId={lessonId}
                maxFiles={5}
                showLibrary={true}
                title="Documents"
                description="PDF, DOC, TXT files"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FileUpload
                fileType="image"
                courseId={courseId}
                lessonId={lessonId}
                maxFiles={10}
                showLibrary={true}
                title="Images"
                description="JPG, PNG, GIF files"
              />
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        {onCancel && (
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading || !lesson.title.trim()}
        >
          {loading ? 'Saving...' : lessonId ? 'Update Lesson' : 'Create Lesson'}
        </Button>
      </Box>
    </Box>
  );
};