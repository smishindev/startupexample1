import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Archive as ArchiveIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';

interface ArchiveCoursesDialogProps {
  open: boolean;
  onClose: () => void;
  onArchiveComplete: () => void;
  publishedCoursesCount: number;
  totalStudents: number;
}

const ArchiveCoursesDialog: React.FC<ArchiveCoursesDialogProps> = ({
  open,
  onClose,
  onArchiveComplete,
  publishedCoursesCount,
  totalStudents
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleArchive = () => {
    // Just confirm the selection and close - actual archive happens during account deletion
    onArchiveComplete();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ArchiveIcon color="info" />
        Archive All Published Courses
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          You are about to archive {publishedCoursesCount} published course{publishedCoursesCount > 1 ? 's' : ''} 
          affecting {totalStudents} student{totalStudents > 1 ? 's' : ''}.
        </Alert>

        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          What happens when courses are archived:
        </Typography>

        <List dense>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Students Keep Full Access"
              secondary="All enrolled students retain complete access to course materials"
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Progress is Preserved"
              secondary="All student progress, grades, and certificates remain intact"
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Content Remains Available"
              secondary="Students can still view lessons, download materials, and complete assessments"
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CancelIcon color="warning" />
            </ListItemIcon>
            <ListItemText 
              primary="No New Enrollments"
              secondary="Courses won't appear in search and new students can't enroll"
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CancelIcon color="warning" />
            </ListItemIcon>
            <ListItemText 
              primary="No Further Updates"
              secondary="Content will no longer receive updates or new lessons"
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <InfoIcon color="info" />
            </ListItemIcon>
            <ListItemText 
              primary="Students Will Be Notified"
              secondary="All affected students will receive an email explaining the archive"
            />
          </ListItem>
        </List>

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Important:</strong> The archiving will be executed when you confirm account deletion with your password.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
        >
          Cancel
        </Button>
        <Button 
          onClick={handleArchive}
          variant="contained"
          color="info"
          startIcon={<ArchiveIcon />}
        >
          Confirm Archive & Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ArchiveCoursesDialog;
