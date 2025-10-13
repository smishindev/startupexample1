import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Fab,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Quiz as QuizIcon,
  Analytics as AnalyticsIcon,
  Assignment as AssignmentIcon,
  Code as CodeIcon,
  Book as BookIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { assessmentApi, Assessment } from '../../services/assessmentApi';

interface AssessmentManagerProps {
  lessonId: string;
  courseId?: string;
}

const AssessmentManager: React.FC<AssessmentManagerProps> = ({ lessonId }) => {
  const navigate = useNavigate();
  
  // State
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Helper function to map API response to expected format
  const mapAssessment = (apiAssessment: any) => ({
    id: apiAssessment.Id,
    title: apiAssessment.Title,
    type: apiAssessment.Type,
    passingScore: apiAssessment.PassingScore,
    maxAttempts: apiAssessment.MaxAttempts,
    timeLimit: apiAssessment.TimeLimit,
    isAdaptive: apiAssessment.IsAdaptive,
    questionCount: apiAssessment.QuestionCount,
    lessonId: apiAssessment.LessonId,
    createdAt: apiAssessment.CreatedAt,
    updatedAt: apiAssessment.UpdatedAt
  });

  // Load assessments
  useEffect(() => {
    loadAssessments();
  }, [lessonId]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const data = await assessmentApi.getAssessmentsByLesson(lessonId);
      const mappedAssessments = data.map(mapAssessment);
      setAssessments(mappedAssessments);
    } catch (error) {
      console.error('Error loading assessments:', error);
      setError('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssessment = () => {
    navigate(`/instructor/lessons/${lessonId}/assessments/create`);
  };

  const handleEditAssessment = (assessment: Assessment) => {
    navigate(`/instructor/assessments/${assessment.id}/edit`);
    setMenuAnchor(null);
  };

  const handlePreviewAssessment = (assessment: Assessment) => {
    // Navigate to student view for preview with preview mode
    navigate(`/assessments/${assessment.id}?preview=true`);
    setMenuAnchor(null);
  };

  const handleViewAssessmentAnalytics = (assessment: Assessment) => {
    // Navigate to analytics page
    navigate(`/instructor/assessments/${assessment.id}/view`);
    setMenuAnchor(null);
  };

  const handleDeleteClick = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setDeleteDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAssessment) return;

    try {
      setDeleting(true);
      await assessmentApi.deleteAssessment(selectedAssessment.id);
      setAssessments(prev => prev.filter(a => a.id !== selectedAssessment.id));
      setDeleteDialogOpen(false);
      setSelectedAssessment(null);
    } catch (error) {
      console.error('Error deleting assessment:', error);
      setError('Failed to delete assessment');
    } finally {
      setDeleting(false);
    }
  };

  const getAssessmentIcon = (type: Assessment['type'], keyId: string = 'icon') => {
    switch (type) {
      case 'quiz': return <QuizIcon key={keyId} />;
      case 'test': return <AssignmentIcon key={keyId} />;
      case 'assignment': return <BookIcon key={keyId} />;
      case 'project': return <CodeIcon key={keyId} />;
      case 'practical': return <AnalyticsIcon key={keyId} />;
      default: return <QuizIcon key={keyId} />;
    }
  };

  const getTypeColor = (type: Assessment['type']) => {
    switch (type) {
      case 'quiz': return 'primary';
      case 'test': return 'secondary';
      case 'assignment': return 'info';
      case 'project': return 'success';
      case 'practical': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading assessments...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Assessments ({assessments.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateAssessment}
        >
          Create Assessment
        </Button>
      </Box>

      {assessments.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <QuizIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Assessments Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first assessment to evaluate student learning
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateAssessment}
            >
              Create First Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <React.Fragment key="assessments-content">
          {/* Grid View for smaller number of assessments */}
          {assessments.length <= 6 ? (
            <Grid container spacing={3} key="assessments-grid">
              {assessments.map((assessment, index) => (
                <Grid 
                  item 
                  xs={12} 
                  md={6} 
                  lg={4} 
                  key={`assessment-${assessment.id || `temp-${index}`}`}
                >
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getAssessmentIcon(assessment.type, 'icon-grid')}
                          <Chip
                            key="type-grid"
                            label={assessment.type}
                            size="small"
                            color={getTypeColor(assessment.type) as any}
                            variant="outlined"
                          />
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setSelectedAssessment(assessment);
                            setMenuAnchor(e.currentTarget);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>

                      <Typography variant="h6" gutterBottom>
                        {assessment.title}
                      </Typography>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        <Chip
                          key="questions"
                          label={`${assessment.questionCount || 0} questions`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          key="passing"
                          label={`${assessment.passingScore}% to pass`}
                          size="small"
                          variant="outlined"
                        />
                        {assessment.isAdaptive && (
                          <Chip
                            key="adaptive"
                            label="Adaptive"
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      <Typography variant="body2" color="text.secondary">
                        Max attempts: {assessment.maxAttempts}
                      </Typography>
                      {assessment.timeLimit && (
                        <Typography variant="body2" color="text.secondary">
                          Time limit: {assessment.timeLimit} minutes
                        </Typography>
                      )}
                    </CardContent>

                    <Box sx={{ p: 2, pt: 0 }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => handlePreviewAssessment(assessment)}
                        >
                          Preview
                        </Button>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditAssessment(assessment)}
                        >
                          Edit
                        </Button>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            // Table view for larger number of assessments
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Assessment</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="center">Questions</TableCell>
                    <TableCell align="center">Passing Score</TableCell>
                    <TableCell align="center">Time Limit</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assessments.map((assessment, index) => (
                    <TableRow key={`table-assessment-${assessment.id || `temp-${index}`}`}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {assessment.title}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            {assessment.isAdaptive && (
                              <Chip key="adaptive-table" label="Adaptive" size="small" color="secondary" variant="outlined" />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getAssessmentIcon(assessment.type, 'icon-table')}
                          <Chip
                            key="type-table"
                            label={assessment.type}
                            size="small"
                            color={getTypeColor(assessment.type) as any}
                            variant="outlined"
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {assessment.questionCount || 0}
                      </TableCell>
                      <TableCell align="center">
                        {assessment.passingScore}%
                      </TableCell>
                      <TableCell align="center">
                        {assessment.timeLimit ? `${assessment.timeLimit}m` : 'None'}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setSelectedAssessment(assessment);
                            setMenuAnchor(e.currentTarget);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </React.Fragment>
      )}

      {/* Floating Action Button for quick add */}
      <Tooltip title="Create Assessment" key="fab-tooltip">
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={handleCreateAssessment}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

      {/* Context Menu */}
      <Menu
        key="context-menu"
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => selectedAssessment && handleViewAssessmentAnalytics(selectedAssessment)}>
          <ViewIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => selectedAssessment && handleEditAssessment(selectedAssessment)}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => selectedAssessment && handleDeleteClick(selectedAssessment)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog key="delete-dialog" open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Assessment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedAssessment?.title}"? 
            This action cannot be undone and will remove all associated submissions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssessmentManager;