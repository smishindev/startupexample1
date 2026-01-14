import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardMedia,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  FormHelperText
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import { instructorApi, InstructorCourse } from '../../services/instructorApi';
import { fileUploadApi } from '../../services/fileUploadApi';

interface CourseDetailsEditorProps {
  course: InstructorCourse;
  onUpdate: (updatedCourse: InstructorCourse) => void;
}

const categories = [
  'Programming',
  'Data Science',
  'Design',
  'Business',
  'Marketing',
  'Language',
  'Mathematics',
  'Science',
  'Arts',
  'Other'
];

const levels = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' }
];

// Convert snake_case to Title Case (e.g., 'data_science' -> 'Data Science')
const formatCategoryForDisplay = (category: string): string => {
  if (!category) return '';
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Convert Title Case to snake_case (e.g., 'Data Science' -> 'data_science')
const formatCategoryForDb = (category: string): string => {
  if (!category) return '';
  return category.toLowerCase().replace(/\s+/g, '_');
};

export const CourseDetailsEditor: React.FC<CourseDetailsEditorProps> = ({ course, onUpdate }) => {
  const [formData, setFormData] = useState({
    title: course.title || '',
    description: course.description || '',
    category: formatCategoryForDisplay(course.category || '') || '',
    level: (course.level?.toLowerCase() || 'beginner'),
    price: course.price?.toString() || '0',
    thumbnail: course.thumbnail || ''
  });
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Update form if course prop changes
    setFormData({
      title: course.title || '',
      description: course.description || '',
      category: formatCategoryForDisplay(course.category || '') || '',
      level: (course.level?.toLowerCase() || 'beginner'),
      price: course.price?.toString() || '0',
      thumbnail: course.thumbnail || ''
    });
  }, [course]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();

    if (!trimmedTitle) {
      newErrors.title = 'Course title is required';
    } else if (trimmedTitle.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!trimmedDescription) {
      newErrors.description = 'Course description is required';
    } else if (trimmedDescription.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      newErrors.price = 'Price must be a valid number (0 or greater)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    try {
      setSaving(true);
      
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formatCategoryForDb(formData.category),
        level: formData.level,
        price: parseFloat(formData.price),
        thumbnail: formData.thumbnail
      };
      
      await instructorApi.updateCourse(course.id, updateData);
      
      // Create updated course object
      const updatedCourse: InstructorCourse = {
        ...course,
        ...updateData
      };
      
      onUpdate(updatedCourse);
      toast.success('Course details updated successfully!');
    } catch (error: any) {
      console.error('Error updating course:', error);
      // Extract error message properly (handle both string and object errors)
      let errorMessage = 'Failed to update course details';
      if (error.response?.data?.error) {
        const err = error.response.data.error;
        errorMessage = typeof err === 'string' ? err : (err.message || errorMessage);
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      
      const uploadedFile = await fileUploadApi.uploadFile(file, {
        fileType: 'image'
      });
      const thumbnailUrl = uploadedFile.url;
      
      setFormData(prev => ({ ...prev, thumbnail: thumbnailUrl }));
      toast.success('Thumbnail uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading thumbnail:', error);
      toast.error(error.message || 'Failed to upload thumbnail');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveThumbnail = () => {
    setFormData(prev => ({ ...prev, thumbnail: '' }));
  };

  const handleThumbnailClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight={600}>
          Course Details
        </Typography>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          data-testid="course-details-save-button"
        >
          Save Changes
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Thumbnail Section */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, flexGrow: 1 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Course Thumbnail
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Recommended: 1280x720px (16:9 ratio), max 5MB
              </Typography>
              
              {formData.thumbnail ? (
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <CardMedia
                    component="img"
                    image={formData.thumbnail}
                    alt="Course thumbnail"
                    sx={{ 
                      width: '100%', 
                      height: 200, 
                      objectFit: 'cover',
                      borderRadius: 1,
                      cursor: 'pointer'
                    }}
                    onClick={handleThumbnailClick}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                    }}
                    onClick={handleRemoveThumbnail}
                    data-testid="course-thumbnail-remove-button"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box
                  sx={{
                    height: 200,
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    mb: 2,
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={handleThumbnailClick}
                >
                  <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Click to upload thumbnail
                  </Typography>
                </Box>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleThumbnailUpload}
                data-testid="course-thumbnail-input"
              />
              
              <Button
                variant="outlined"
                startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
                onClick={handleThumbnailClick}
                disabled={uploading}
                fullWidth
                data-testid="course-thumbnail-upload-button"
              >
                {uploading ? 'Uploading...' : 'Upload New Thumbnail'}
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Form Fields */}
        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Title */}
            <TextField
              label="Course Title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              fullWidth
              required
              inputProps={{ maxLength: 200 }}
              data-testid="course-title-input"
            />

            {/* Description */}
            <TextField
              label="Course Description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              error={!!errors.description}
              helperText={errors.description || `${formData.description.length} characters`}
              multiline
              rows={6}
              fullWidth
              required
              inputProps={{ maxLength: 2000 }}
              data-testid="course-description-input"
            />

            <Grid container spacing={2}>
              {/* Category */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!errors.category} required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    label="Category"
                    data-testid="course-category-select"
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
                </FormControl>
              </Grid>

              {/* Level */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Difficulty Level</InputLabel>
                  <Select
                    value={formData.level}
                    onChange={(e) => handleChange('level', e.target.value)}
                    label="Difficulty Level"
                    data-testid="course-level-select"
                  >
                    {levels.map((level) => (
                      <MenuItem key={level.value} value={level.value}>
                        {level.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Price */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Price (USD)"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  error={!!errors.price}
                  helperText={errors.price || 'Set to 0 for free courses'}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }}
                  data-testid="course-price-input"
                />
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Tips for Creating Great Course Content:
              </Typography>
              <Typography variant="body2" component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                <li>Write a clear, descriptive title that tells students what they'll learn</li>
                <li>Include key learning outcomes in your description</li>
                <li>Choose an eye-catching thumbnail that represents your course topic</li>
                <li>Price your course competitively based on content depth and market standards</li>
              </Typography>
            </Alert>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
