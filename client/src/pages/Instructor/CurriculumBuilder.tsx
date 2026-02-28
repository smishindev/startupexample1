import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Chip,
  List,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  DragIndicator as DragIcon,
  VideoLibrary as VideoIcon,
  Article as TextIcon,
  Quiz as QuizIcon,
  MoreVert as MoreVertIcon,
  AccessTime as TimeIcon,
  CheckCircle as RequiredIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';
import { Lesson, lessonApi } from '../../services/lessonApi';
import { LessonEditor } from './LessonEditor';

interface CurriculumBuilderProps {
  courseId: string;
  onLessonCountChange?: (count: number) => void;
}

const contentTypeIcons = {
  video: <VideoIcon color="error" />,
  text: <TextIcon color="primary" />,
  quiz: <QuizIcon color="warning" />
};

export const CurriculumBuilder: React.FC<CurriculumBuilderProps> = ({
  courseId,
  onLessonCountChange
}) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [menuLessonId, setMenuLessonId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);

  useEffect(() => {
    loadLessons();
  }, [courseId]);

  useEffect(() => {
    if (onLessonCountChange) {
      onLessonCountChange(lessons.length);
    }
  }, [lessons.length, onLessonCountChange]);

  const loadLessons = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedLessons = await lessonApi.getLessons(courseId);
      setLessons(fetchedLessons);
    } catch (err: any) {
      console.error('Error loading lessons:', err);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to load lessons');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddLesson = () => {
    setSelectedLesson(null);
    setEditorOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setEditorOpen(true);
    handleMenuClose();
  };

  const handleDeleteLesson = (lesson: Lesson) => {
    setLessonToDelete(lesson);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  const confirmDeleteLesson = async () => {
    if (!lessonToDelete) return;

    try {
      await lessonApi.deleteLesson(lessonToDelete.id);
      setLessons(prev => prev.filter(l => l.id !== lessonToDelete.id));
      setDeleteConfirmOpen(false);
      setLessonToDelete(null);
    } catch (err: any) {
      console.error('Error deleting lesson:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to delete lesson');
      }
    }
  };

  const handleLessonSave = (savedLesson: Lesson) => {
    if (selectedLesson) {
      // Update existing lesson
      setLessons(prev => prev.map(l => l.id === savedLesson.id ? savedLesson : l));
    } else {
      // Add new lesson
      setLessons(prev => [...prev, savedLesson].sort((a, b) => a.orderIndex - b.orderIndex));
    }
    setEditorOpen(false);
    setSelectedLesson(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, lessonId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuLessonId(lessonId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuLessonId(null);
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return; // Already at top
    
    try {
      // Swap lessons in local array
      const newLessons = [...lessons];
      [newLessons[index - 1], newLessons[index]] = [newLessons[index], newLessons[index - 1]];
      
      // Update order indices and create lesson IDs array
      const lessonIds = newLessons.map(lesson => lesson.id);
      
      // Call reorder API
      await lessonApi.reorderLessons({
        courseId,
        lessonIds
      });
      
      // Update local state
      setLessons(newLessons);
    } catch (err: any) {
      console.error('Error moving lesson up:', err);
      setError('Failed to reorder lessons');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === lessons.length - 1) return; // Already at bottom
    
    try {
      // Swap lessons in local array
      const newLessons = [...lessons];
      [newLessons[index], newLessons[index + 1]] = [newLessons[index + 1], newLessons[index]];
      
      // Update order indices and create lesson IDs array
      const lessonIds = newLessons.map(lesson => lesson.id);
      
      // Call reorder API
      await lessonApi.reorderLessons({
        courseId,
        lessonIds
      });
      
      // Update local state
      setLessons(newLessons);
    } catch (err: any) {
      console.error('Error moving lesson down:', err);
      setError('Failed to reorder lessons');
    }
  };

  const getTotalDuration = () => {
    return lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getContentTypeCounts = (lesson: Lesson) => {
    const counts = { video: 0, text: 0, quiz: 0 };
    lesson.content.forEach(item => {
      counts[item.type]++;
    });
    return counts;
  };

  if (loading && lessons.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>Course Curriculum</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddLesson}
          size="medium"
          data-testid="curriculum-builder-add-lesson-button"
        >
          Add Lesson
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {lessons.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
              Course Overview
            </Typography>
            <Box sx={{ display: 'flex', gap: { xs: 2, sm: 4 }, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PlayIcon fontSize="small" />
                <Typography variant="body2" fontWeight={500}>
                  {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimeIcon fontSize="small" />
                <Typography variant="body2" fontWeight={500}>
                  {formatDuration(getTotalDuration())} total
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {lessons.length === 0 ? (
        <Alert severity="info" sx={{ py: 3 }}>
          No lessons created yet. Click "Add Lesson" to start building your course curriculum.
        </Alert>
      ) : (
        <List sx={{ p: 0 }}>
          {lessons.map((lesson, index) => {
            const contentCounts = getContentTypeCounts(lesson);
            return (
              <Card 
                key={lesson.id} 
                sx={{ 
                  mb: 2,
                  transition: 'box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
              >
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, sm: 2 } }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        minWidth: { xs: 40, sm: 50 },
                        px: { xs: 1, sm: 1.5 },
                        py: 0.5,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        borderRadius: 1
                      }}
                    >
                      <DragIcon sx={{ mr: 0.5, fontSize: 18, display: { xs: 'none', sm: 'block' } }} />
                      <Typography variant="h6" fontWeight={600}>
                        {index + 1}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                          {lesson.title}
                        </Typography>
                        {lesson.isRequired && (
                          <Tooltip title="Required Lesson">
                            <RequiredIcon color="primary" fontSize="small" />
                          </Tooltip>
                        )}
                        
                        {/* Reorder buttons */}
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Tooltip title="Move up">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleMoveUp(index)}
                                disabled={index === 0}
                                sx={{ p: 0.5 }}
                                data-testid="curriculum-builder-move-up-button"
                              >
                                <ArrowUpIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Move down">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleMoveDown(index)}
                                disabled={index === lessons.length - 1}
                                sx={{ p: 0.5 }}
                                data-testid="curriculum-builder-move-down-button"
                              >
                                <ArrowDownIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                        
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, lesson.id)}
                          data-testid={`curriculum-builder-edit-menu-${lesson.id}-button`}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>
                      
                      {lesson.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                          {lesson.description}
                        </Typography>
                      )}
                      
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: lesson.description ? 0 : 2 }}>
                        {contentCounts.video > 0 && (
                          <Chip
                            icon={contentTypeIcons.video}
                            label={`${contentCounts.video} video${contentCounts.video > 1 ? 's' : ''}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {contentCounts.text > 0 && (
                          <Chip
                            icon={contentTypeIcons.text}
                            label={`${contentCounts.text} text${contentCounts.text > 1 ? 's' : ''}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {contentCounts.quiz > 0 && (
                          <Chip
                            icon={contentTypeIcons.quiz}
                            label={`${contentCounts.quiz} quiz${contentCounts.quiz > 1 ? 'zes' : ''}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {(lesson.duration || 0) > 0 && (
                          <Chip
                            icon={<TimeIcon />}
                            label={formatDuration(lesson.duration || 0)}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </List>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const lesson = lessons.find(l => l.id === menuLessonId);
          if (lesson) handleEditLesson(lesson);
        }} data-testid="curriculum-builder-menu-edit">
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          const lesson = lessons.find(l => l.id === menuLessonId);
          if (lesson) handleDeleteLesson(lesson);
        }} data-testid="curriculum-builder-menu-delete">
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        data-testid="curriculum-builder-delete-dialog"
      >
        <DialogTitle>Delete Lesson</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{lessonToDelete?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} data-testid="curriculum-builder-delete-cancel-button">Cancel</Button>
          <Button onClick={confirmDeleteLesson} color="error" variant="contained" data-testid="curriculum-builder-delete-confirm-button">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <LessonEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setSelectedLesson(null);
        }}
        courseId={courseId}
        lesson={selectedLesson}
        onSave={handleLessonSave}
      />
    </Box>
  );
};