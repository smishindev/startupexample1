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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Fab,
  Alert,
  Chip,
  Divider
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Lesson Management</Typography>
        <Button
          variant="contained"
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
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No lessons yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first lesson to get started
            </Typography>
            <Button variant="contained" onClick={handleCreateLesson}>
              Create First Lesson
            </Button>
          </CardContent>
        </Card>
      ) : (
        <List>
          {lessons.map((lesson, index) => (
            <React.Fragment key={lesson.id}>
              <ListItem
                sx={{
                  bgcolor: 'background.paper',
                  mb: 1,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{lesson.title}</Typography>
                      {lesson.isPublished && (
                        <Chip label="Published" color="success" size="small" />
                      )}
                      {hasVideoContent(lesson) && (
                        <Chip label="📹 Video" color="primary" size="small" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary" component="span">
                        {lesson.description || 'No description'}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" component="span">
                          Order: {lesson.orderIndex}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="span">
                          • Content: {lesson.content.length} items
                        </Typography>
                        {lesson.duration && (
                          <Typography variant="caption" color="text.secondary" component="span">
                            • Duration: {lesson.duration}min
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        {getContentTypeBadges(lesson)}
                      </Box>
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleEditLesson(lesson.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleDeleteLesson(lesson.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
              {index < lessons.length - 1 && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Floating Action Button for quick access */}
      <Fab
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