import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  Fab,
  Alert,
  Chip
} from '@mui/material';
import { lessonApi, Lesson } from '../../services/lessonApi';
import { LessonEditor } from './LessonEditor';

interface LessonManagementProps {
  courseId: string;
}

export const LessonManagement: React.FC<LessonManagementProps> = ({ courseId }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadLessons();
  }, [courseId]);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const data = await lessonApi.getLessons(courseId);
      setLessons(data);
    } catch (err: any) {
      setError('Failed to load lessons');
      console.error('Error loading lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLesson = () => {
    setEditingLessonId(undefined);
    setEditorOpen(true);
  };

  const handleEditLesson = (lessonId: string) => {
    setEditingLessonId(lessonId);
    setEditorOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    try {
      await lessonApi.deleteLesson(lessonId);
      setSuccess('Lesson deleted successfully');
      loadLessons();
    } catch (err: any) {
      setError('Failed to delete lesson');
      console.error('Error deleting lesson:', err);
    }
  };

  const handleEditorSave = () => {
    setSuccess(`Lesson ${editingLessonId ? 'updated' : 'created'} successfully`);
    setEditorOpen(false);
    loadLessons();
  };

  const handleEditorCancel = () => {
    setEditorOpen(false);
  };

  const getContentTypeBadges = (lesson: Lesson) => {
    const contentTypes = new Set(lesson.content.map(c => c.type));
    return Array.from(contentTypes).map(type => (
      <Chip
        key={type}
        label={type}
        size="small"
        sx={{ mr: 0.5 }}
        color={type === 'video' ? 'primary' : type === 'quiz' ? 'secondary' : 'default'}
      />
    ));
  };

  const hasVideoContent = (lesson: Lesson) => {
    return lesson.content.some(c => c.type === 'video');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Lessons</Typography>
        <Button
          data-testid="lesson-management-create-button"
          variant="contained"
          size="large"
          onClick={handleCreateLesson}
          disabled={loading}
        >
          Create New Lesson
        </Button>
      </Box>

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

      {loading ? (
        <Typography>Loading lessons...</Typography>
      ) : lessons.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              No lessons yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Create your first lesson to get started with course content
            </Typography>
            <Button data-testid="lesson-management-create-first-button" variant="contained" size="large" onClick={handleCreateLesson}>
              Create First Lesson
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {lessons.map((lesson, index) => (
            <Card
              key={lesson.id}
              sx={{
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow: 3
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
                    <Box
                      sx={{
                        minWidth: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        borderRadius: 1,
                        fontWeight: 600
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="h6" fontWeight={600}>{lesson.title}</Typography>
                        {hasVideoContent(lesson) && (
                          <Chip label="📹 Video" color="primary" size="small" />
                        )}
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      data-testid={`lesson-management-edit-${lesson.id}`}
                      size="small"
                      variant="outlined"
                      onClick={() => handleEditLesson(lesson.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      data-testid={`lesson-management-delete-${lesson.id}`}
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleDeleteLesson(lesson.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
                
                {lesson.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, ml: 7 }}>
                    {lesson.description}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 7 }}>
                  <Typography variant="body2" color="text.secondary">
                    Order: {lesson.orderIndex}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Content: {lesson.content.length} items
                  </Typography>
                  {lesson.duration && (
                    <Typography variant="body2" color="text.secondary">
                      Duration: {lesson.duration}min
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {getContentTypeBadges(lesson)}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Floating Action Button for quick access */}
      <Fab
        data-testid="lesson-management-fab"
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleCreateLesson}
      >
        ➕
      </Fab>

      {/* Lesson Editor Dialog */}
      <Dialog
        open={editorOpen}
        onClose={handleEditorCancel}
        maxWidth="lg"
        fullWidth
        disableEnforceFocus
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          {editingLessonId ? 'Edit Lesson' : 'Create New Lesson'}
        </DialogTitle>
        <DialogContent>
          <LessonEditor
            courseId={courseId}
            lessonId={editingLessonId}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};