import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  IconButton,
  Typography,
  Box,
  Snackbar,
  Alert,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  Twitter as TwitterIcon,
  Facebook as FacebookIcon,
  LinkedIn as LinkedInIcon,
  WhatsApp as WhatsAppIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { Course } from '../Course/CourseCard';
import { ShareService } from '../../services/shareService';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  course: Course;
}

interface SharePlatform {
  id: string;
  name: string;
  icon: React.ReactElement;
  color: string;
  action: () => Promise<void> | void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ open, onClose, course }) => {
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const shareData = ShareService.generateCourseShareData(course);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleShare = async (platform: string) => {
    try {
      const success = await ShareService.share({
        platform: platform as any,
        data: shareData,
      });

      if (success) {
        ShareService.trackShare(course.id, platform, course);
        
        if (platform === 'copy') {
          showSnackbar('Link copied to clipboard!');
        } else if (platform === 'native') {
          showSnackbar('Shared successfully!');
        } else {
          showSnackbar(`Shared on ${ShareService.getPlatformInfo(platform).name}!`);
        }
      } else {
        showSnackbar(`Failed to share on ${platform}`, 'error');
      }
    } catch (error) {
      console.error('Share failed:', error);
      showSnackbar('Sharing failed. Please try again.', 'error');
    }
  };

  const platforms: SharePlatform[] = [
    {
      id: 'copy',
      name: 'Copy Link',
      icon: <CopyIcon />,
      color: '#666',
      action: () => handleShare('copy'),
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: <TwitterIcon />,
      color: '#1DA1F2',
      action: () => handleShare('twitter'),
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: <FacebookIcon />,
      color: '#1877F2',
      action: () => handleShare('facebook'),
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: <LinkedInIcon />,
      color: '#0A66C2',
      action: () => handleShare('linkedin'),
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: <WhatsAppIcon />,
      color: '#25D366',
      action: () => handleShare('whatsapp'),
    },
    {
      id: 'email',
      name: 'Email',
      icon: <EmailIcon />,
      color: '#666',
      action: () => handleShare('email'),
    },
  ];

  // Add native share if supported (typically on mobile)
  if (ShareService.isNativeShareSupported()) {
    platforms.unshift({
      id: 'native',
      name: 'Share',
      icon: <ShareIcon />,
      color: '#666',
      action: () => handleShare('native'),
    });
  }

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        data-testid="share-dialog"
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: 400,
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              Share Course
            </Typography>
            <IconButton onClick={onClose} size="small" data-testid="share-dialog-close-button">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Course Preview */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {course.thumbnail && (
                <Box
                  component="img"
                  src={course.thumbnail}
                  alt={course.title}
                  sx={{
                    width: 80,
                    height: 60,
                    borderRadius: 1,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  {course.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  by {course.instructor.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {course.level} • {course.duration} • ${course.price === 0 ? 'Free' : course.price}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Sharing Options */}
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
            Choose how to share:
          </Typography>

          <Grid container spacing={2}>
            {platforms.map((platform) => (
              <Grid item xs={6} sm={4} key={platform.id}>
                <Tooltip title={`Share on ${platform.name}`}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={platform.action}
                    data-testid={`share-dialog-${platform.id}-button`}
                    sx={{
                      height: 64,
                      flexDirection: 'column',
                      gap: 0.5,
                      borderColor: 'grey.300',
                      color: platform.color,
                      '&:hover': {
                        borderColor: platform.color,
                        bgcolor: `${platform.color}10`,
                      },
                    }}
                  >
                    <Box sx={{ color: platform.color }}>{platform.icon}</Box>
                    <Typography variant="caption" sx={{ color: 'text.primary' }}>
                      {platform.name}
                    </Typography>
                  </Button>
                </Tooltip>
              </Grid>
            ))}
          </Grid>

          {/* Share URL Display */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              Course URL:
            </Typography>
            <Box
              data-testid="share-dialog-url-box"
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.300',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all',
                cursor: 'pointer',
              }}
              onClick={() => handleShare('copy')}
            >
              {shareData.url}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Click to copy to clipboard
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} variant="outlined" data-testid="share-dialog-close-action">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};