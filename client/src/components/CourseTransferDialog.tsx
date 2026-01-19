import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  TextField,
  Chip
} from '@mui/material';
import {
  SwapHoriz as TransferIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import axiosInstance from '../utils/axiosConfig';

interface EligibleInstructor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  totalCourses: number;
  isActive: boolean;
}

interface CourseTransferDialogProps {
  open: boolean;
  onClose: () => void;
  onTransfer: (instructorId: string) => void;
  courseCount: number;
}

const CourseTransferDialog: React.FC<CourseTransferDialogProps> = ({
  open,
  onClose,
  onTransfer,
  courseCount
}) => {
  const [instructors, setInstructors] = useState<EligibleInstructor[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch eligible instructors when dialog opens
  useEffect(() => {
    if (open) {
      fetchEligibleInstructors();
    }
  }, [open]);

  const fetchEligibleInstructors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/api/settings/eligible-instructors');
      setInstructors(response.data);
    } catch (err) {
      console.error('Error fetching eligible instructors:', err);
      setError('Failed to load eligible instructors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = () => {
    if (selectedInstructorId) {
      onTransfer(selectedInstructorId);
    }
  };

  const filteredInstructors = instructors.filter(instructor =>
    searchQuery === '' ||
    `${instructor.firstName} ${instructor.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    instructor.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedInstructor = instructors.find(i => i.id === selectedInstructorId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TransferIcon color="primary" />
        Transfer Courses to Another Instructor
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Select an instructor to transfer all {courseCount} of your course{courseCount > 1 ? 's' : ''} to. 
          The new instructor will have full control over the course{courseCount > 1 ? 's' : ''}.
        </Alert>

        {/* Search Box */}
        <TextField
          fullWidth
          label="Search Instructors"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Instructor List */}
        {!loading && !error && (
          <>
            {filteredInstructors.length === 0 ? (
              <Alert severity="warning">
                {searchQuery 
                  ? 'No instructors found matching your search.'
                  : 'No eligible instructors found. There must be at least one other active instructor in the system.'}
              </Alert>
            ) : (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {filteredInstructors.map((instructor) => (
                  <ListItem key={instructor.id} disablePadding sx={{ mb: 1 }}>
                    <ListItemButton
                      selected={selectedInstructorId === instructor.id}
                      onClick={() => setSelectedInstructorId(instructor.id)}
                      sx={{
                        border: '1px solid',
                        borderColor: selectedInstructorId === instructor.id ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {selectedInstructorId === instructor.id ? (
                            <CheckIcon />
                          ) : (
                            <PersonIcon />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {instructor.firstName} {instructor.lastName}
                            </Typography>
                            {instructor.totalCourses > 0 && (
                              <Chip 
                                label={`${instructor.totalCourses} course${instructor.totalCourses > 1 ? 's' : ''}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        }
                        secondary={instructor.email}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}

        {/* Selected Instructor Summary */}
        {selectedInstructor && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Selected:</strong> {selectedInstructor.firstName} {selectedInstructor.lastName}
            <br />
            <Typography variant="caption">
              They will be notified via email and in-app notification about the course transfer.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={handleTransfer}
          variant="contained"
          disabled={!selectedInstructorId}
          startIcon={<TransferIcon />}
        >
          Transfer Courses
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CourseTransferDialog;
