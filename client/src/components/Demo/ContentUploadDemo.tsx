import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Alert, Chip } from '@mui/material';
import { FileUpload } from '../Upload/FileUpload';

export const ContentUploadDemo: React.FC = () => {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h3" gutterBottom align="center">
        Content Upload System Demo
      </Typography>
      
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body1">
          This demonstrates our comprehensive file upload system with support for videos, images, and documents.
          Features include: drag & drop, progress tracking, file validation, thumbnail generation, and organized storage.
        </Typography>
      </Alert>

      <Grid container spacing={4}>
        {/* Video Upload Section */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">🎥 Video Upload</Typography>
                <Chip label="Primary Content" color="primary" sx={{ ml: 1 }} size="small" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Upload course videos with automatic thumbnail generation and progress tracking.
              </Typography>
              <FileUpload
                fileType="video"
                courseId="demo-course"
                maxFiles={3}
                showLibrary={true}
                title="Lesson Videos"
                description="Upload MP4, AVI, MOV files"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Image Upload Section */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">🖼️ Image Upload</Typography>
                <Chip label="Visual Content" color="secondary" sx={{ ml: 1 }} size="small" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Upload images for course materials, diagrams, and visual aids.
              </Typography>
              <FileUpload
                fileType="image"
                courseId="demo-course"
                maxFiles={5}
                showLibrary={true}
                title="Course Images"
                description="Upload JPG, PNG, GIF files"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Document Upload Section */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">📄 Document Upload</Typography>
                <Chip label="Resources" color="success" sx={{ ml: 1 }} size="small" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Upload PDFs, Word documents, and other educational resources.
              </Typography>
              <FileUpload
                fileType="document"
                courseId="demo-course"
                maxFiles={10}
                showLibrary={true}
                title="Course Documents"
                description="Upload PDF, DOC, TXT files"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Features Section */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            ✨ Key Features
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1, mb: 1 }}>
                <Typography variant="subtitle1" sx={{ color: 'primary.contrastText' }}>
                  📤 Drag & Drop
                </Typography>
                <Typography variant="body2" sx={{ color: 'primary.contrastText' }}>
                  Intuitive file upload interface
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 1, mb: 1 }}>
                <Typography variant="subtitle1" sx={{ color: 'secondary.contrastText' }}>
                  📊 Progress Tracking
                </Typography>
                <Typography variant="body2" sx={{ color: 'secondary.contrastText' }}>
                  Real-time upload progress
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, mb: 1 }}>
                <Typography variant="subtitle1" sx={{ color: 'success.contrastText' }}>
                  🖼️ Thumbnails
                </Typography>
                <Typography variant="body2" sx={{ color: 'success.contrastText' }}>
                  Automatic thumbnail generation
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1, mb: 1 }}>
                <Typography variant="subtitle1" sx={{ color: 'warning.contrastText' }}>
                  🔒 Validation
                </Typography>
                <Typography variant="body2" sx={{ color: 'warning.contrastText' }}>
                  File type & size validation
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};