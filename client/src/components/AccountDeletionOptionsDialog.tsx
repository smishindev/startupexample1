import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper,
  Divider
} from '@mui/material';
import {
  WarningAmber as WarningIcon,
  Archive as ArchiveIcon,
  SwapHoriz as TransferIcon,
  DeleteForever as ForceDeleteIcon
} from '@mui/icons-material';

interface InstructorStats {
  totalCourses: number;
  publishedCourses: number;
  archivedCourses?: number;
  draftCourses?: number;
  totalStudents: number;
  activeEnrollments?: number;
  activeOfficeHours?: number;
  activeLiveSessions?: number;
}

interface AccountDeletionOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectOption: (option: 'archive' | 'transfer' | 'force') => void;
  stats: InstructorStats;
  blockedReason?: string;
}

const AccountDeletionOptionsDialog: React.FC<AccountDeletionOptionsDialogProps> = ({
  open,
  onClose,
  onSelectOption,
  stats,
  blockedReason
}) => {
  const [selectedOption, setSelectedOption] = useState<'archive' | 'transfer' | 'force' | null>(null);

  const handleContinue = () => {
    if (selectedOption) {
      onSelectOption(selectedOption);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="warning" />
        Account Deletion - Action Required
      </DialogTitle>
      
      <DialogContent>
        {/* Stats Summary */}
        <Alert severity="warning" sx={{ mb: 3 }}>
          {blockedReason || `You have ${stats.totalStudents} active students in ${stats.publishedCourses} published course${stats.publishedCourses > 1 ? 's' : ''}.`}
        </Alert>

        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
          <Typography variant="subtitle2" gutterBottom color="text.secondary">
            Your Content Overview
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">Total Courses</Typography>
              <Typography variant="h6">{stats.totalCourses}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Published Courses</Typography>
              <Typography variant="h6">{stats.publishedCourses}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Active Students</Typography>
              <Typography variant="h6">{stats.totalStudents}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Office Hours</Typography>
              <Typography variant="h6">{stats.activeOfficeHours || 0}</Typography>
            </Box>
          </Box>
        </Paper>

        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Choose an action before deleting your account:
        </Typography>

        <RadioGroup
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value as 'archive' | 'transfer' | 'force')}
        >
          {/* Archive Option */}
          {stats.publishedCourses > 0 && (
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                mb: 2, 
                cursor: 'pointer',
                border: selectedOption === 'archive' ? '2px solid' : '1px solid',
                borderColor: selectedOption === 'archive' ? 'primary.main' : 'divider',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
              }}
              onClick={() => setSelectedOption('archive')}
            >
              <FormControlLabel
                value="archive"
                control={<Radio />}
                label={
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ArchiveIcon color="info" />
                      <Typography variant="subtitle2" fontWeight="bold">
                        Archive All Courses
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
                      Students keep access, no new enrollments allowed
                    </Typography>
                    <Box sx={{ ml: 4, mt: 1 }}>
                      <Typography variant="caption" color="success.main">✓ Students retain full access</Typography><br />
                      <Typography variant="caption" color="success.main">✓ Progress is preserved</Typography><br />
                      <Typography variant="caption" color="text.secondary">• No new enrollments</Typography><br />
                      <Typography variant="caption" color="text.secondary">• No further updates</Typography>
                    </Box>
                  </Box>
                }
              />
            </Paper>
          )}

          {/* Transfer Option */}
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              mb: 2, 
              cursor: 'pointer',
              border: selectedOption === 'transfer' ? '2px solid' : '1px solid',
              borderColor: selectedOption === 'transfer' ? 'primary.main' : 'divider',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
            }}
            onClick={() => setSelectedOption('transfer')}
          >
            <FormControlLabel
              value="transfer"
              control={<Radio />}
              label={
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TransferIcon color="primary" />
                    <Typography variant="subtitle2" fontWeight="bold">
                      Transfer to Another Instructor
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
                    Hand over your courses to a trusted colleague
                  </Typography>
                  <Box sx={{ ml: 4, mt: 1 }}>
                    <Typography variant="caption" color="success.main">✓ Courses continue actively</Typography><br />
                    <Typography variant="caption" color="success.main">✓ New instructor can update content</Typography><br />
                    <Typography variant="caption" color="success.main">✓ Students get continuity</Typography><br />
                    <Typography variant="caption" color="text.secondary">• Requires selecting an instructor</Typography>
                  </Box>
                </Box>
              }
            />
          </Paper>

          {/* Force Delete Option */}
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              cursor: 'pointer',
              border: selectedOption === 'force' ? '2px solid' : '1px solid',
              borderColor: selectedOption === 'force' ? 'error.main' : 'divider',
              '&:hover': { borderColor: 'error.main', bgcolor: 'action.hover' }
            }}
            onClick={() => setSelectedOption('force')}
          >
            <FormControlLabel
              value="force"
              control={<Radio />}
              label={
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ForceDeleteIcon color="error" />
                    <Typography variant="subtitle2" fontWeight="bold" color="error">
                      Force Delete (Not Recommended)
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
                    Delete account and mark all courses as deleted
                  </Typography>
                  <Box sx={{ ml: 4, mt: 1 }}>
                    <Typography variant="caption" color="error.main">⚠ Courses marked as deleted</Typography><br />
                    <Typography variant="caption" color="error.main">⚠ May disrupt student experience</Typography><br />
                    <Typography variant="caption" color="error.main">⚠ Content becomes orphaned</Typography><br />
                    <Typography variant="caption" color="text.secondary">• Requires additional confirmation</Typography>
                  </Box>
                </Box>
              }
            />
          </Paper>
        </RadioGroup>

        {selectedOption === 'force' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <strong>Warning:</strong> Force deletion should only be used as a last resort. Your students will be notified about the course status change.
          </Alert>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={handleContinue}
          variant="contained"
          disabled={!selectedOption}
          color={selectedOption === 'force' ? 'error' : 'primary'}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountDeletionOptionsDialog;
