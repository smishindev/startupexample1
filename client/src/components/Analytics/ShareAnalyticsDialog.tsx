import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { ShareAnalytics } from '../../services/shareAnalytics';

interface ShareAnalyticsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ShareAnalyticsDialog: React.FC<ShareAnalyticsDialogProps> = ({ open, onClose }) => {
  const [stats, setStats] = useState(ShareAnalytics.getShareStats());
  const [events, setEvents] = useState(ShareAnalytics.getShareEvents());

  useEffect(() => {
    if (open) {
      // Refresh data when dialog opens
      setStats(ShareAnalytics.getShareStats());
      setEvents(ShareAnalytics.getShareEvents());
    }
  }, [open]);

  const handleExportData = () => {
    const data = ShareAnalytics.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `share-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all analytics data? This action cannot be undone.')) {
      ShareAnalytics.clearEvents();
      setStats(ShareAnalytics.getShareStats());
      setEvents(ShareAnalytics.getShareEvents());
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 600 }
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          Share Analytics Dashboard
        </Typography>
      </DialogTitle>

      <DialogContent>
        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                  {stats.totalShares}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Shares
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                  {stats.sharesLastWeek}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This Week
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" color="info.main" sx={{ fontWeight: 'bold' }}>
                  {stats.mostSharedPlatform}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Top Platform
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" color="warning.main" sx={{ fontWeight: 'bold' }}>
                  {Object.keys(stats.sharesByPlatform).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Platforms Used
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Platform Distribution */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Shares by Platform
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(stats.sharesByPlatform).map(([platform, count]) => (
              <Chip
                key={platform}
                label={`${platform}: ${count}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Box>

        {/* Recent Events */}
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Share Events
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Course</TableCell>
                  <TableCell>Platform</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.slice(-20).reverse().map((event, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {event.courseTitle || event.courseId}
                      </Typography>
                      {event.courseCategory && (
                        <Typography variant="caption" color="text.secondary">
                          {event.courseCategory}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={event.platform}
                        size="small"
                        color="secondary"
                      />
                    </TableCell>
                    <TableCell>
                      {event.courseLevel && (
                        <Chip
                          label={event.courseLevel.charAt(0).toUpperCase() + event.courseLevel.slice(1).toLowerCase()}
                          size="small"
                          color={
                            event.courseLevel.toLowerCase() === 'beginner' ? 'success' :
                            event.courseLevel.toLowerCase() === 'intermediate' ? 'warning' :
                            'error'
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(event.timestamp).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">
                        No share events recorded yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button data-testid="share-analytics-export" onClick={handleExportData} variant="outlined">
          Export Data
        </Button>
        <Button data-testid="share-analytics-clear" onClick={handleClearData} color="error" variant="outlined">
          Clear Data
        </Button>
        <Button data-testid="share-analytics-close" onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};