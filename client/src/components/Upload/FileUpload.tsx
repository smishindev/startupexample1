import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Paper
} from '@mui/material';
import { fileUploadApi, UploadedFile, UploadProgress, UploadOptions } from '../../services/fileUploadApi';

interface FileUploadProps {
  fileType: 'video' | 'image' | 'document';
  courseId?: string;
  lessonId?: string;
  onFileUploaded?: (file: UploadedFile) => void;
  onFileDeleted?: (fileId: string) => void;
  maxFiles?: number;
  showLibrary?: boolean;
  title?: string;
  description?: string;
}

interface UploadingFile {
  file: File;
  progress: UploadProgress;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  uploadedFile?: UploadedFile;
}

const fileTypeIcons = {
  video: '🎥',
  image: '🖼️',
  document: '📄'
};

const fileTypeColors = {
  video: '#f44336',
  image: '#2196f3',
  document: '#4caf50'
} as const;

export const FileUpload: React.FC<FileUploadProps> = ({
  fileType,
  courseId,
  lessonId,
  onFileUploaded,
  onFileDeleted,
  maxFiles = 10,
  showLibrary = true,
  title,
  description
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fileDescription, setFileDescription] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing files
  React.useEffect(() => {
    if (showLibrary) {
      loadFiles();
    }
  }, [fileType, courseId, lessonId, showLibrary]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const files = await fileUploadApi.getFiles({
        fileType,
        courseId,
        lessonId,
        limit: 50
      });
      setUploadedFiles(files);
    } catch (err: any) {
      setError('Failed to load files');
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const totalFiles = uploadedFiles.length + uploadingFiles.length + fileArray.length;

    if (totalFiles > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate files
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    fileArray.forEach(file => {
      const validation = fileUploadApi.validateFile(file, fileType);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(`${file.name}: ${validation.error}`);
      }
    });

    if (invalidFiles.length > 0) {
      setError(`Invalid files:\n${invalidFiles.join('\n')}`);
      return;
    }

    setError(null);
    startUploads(validFiles);
  };

  const startUploads = async (files: File[]) => {
    const newUploadingFiles: UploadingFile[] = files.map(file => ({
      file,
      progress: { loaded: 0, total: file.size, percentage: 0 },
      status: 'uploading' as const
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const options: UploadOptions = {
          fileType,
          courseId,
          lessonId,
          description: fileDescription,
          onProgress: (progress) => {
            setUploadingFiles(prev => prev.map((uploadingFile) => 
              uploadingFile.file === file 
                ? { ...uploadingFile, progress }
                : uploadingFile
            ));
          }
        };

        const uploadedFile = await fileUploadApi.uploadFile(file, options);

        // Update uploading file status
        setUploadingFiles(prev => prev.map(uploadingFile => 
          uploadingFile.file === file 
            ? { ...uploadingFile, status: 'completed', uploadedFile }
            : uploadingFile
        ));

        // Add to uploaded files list
        setUploadedFiles(prev => [uploadedFile, ...prev]);

        // Notify parent component
        if (onFileUploaded) {
          onFileUploaded(uploadedFile);
        }

      } catch (error: any) {
        console.error('Upload error:', error);
        setUploadingFiles(prev => prev.map(uploadingFile => 
          uploadingFile.file === file 
            ? { 
                ...uploadingFile, 
                status: 'error', 
                error: error.response?.data?.error || 'Upload failed' 
              }
            : uploadingFile
        ));
      }
    }

    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(uf => uf.status === 'uploading'));
    }, 3000);
  };

  const handleDeleteFile = async (file: UploadedFile) => {
    try {
      await fileUploadApi.deleteFile(file.id);
      setUploadedFiles(prev => prev.filter(f => f.id !== file.id));
      
      if (onFileDeleted) {
        onFileDeleted(file.id);
      }
    } catch (error: any) {
      setError('Failed to delete file');
      console.error('Delete error:', error);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [fileType, maxFiles, uploadedFiles.length, uploadingFiles.length]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openUploadDialog = () => {
    setUploadDialogOpen(true);
    setFileDescription('');
  };

  const renderUploadArea = () => (
    <Paper
      elevation={dragOver ? 8 : 2}
      sx={{
        p: 4,
        border: dragOver ? '2px dashed #2196f3' : '2px dashed #ccc',
        bgcolor: dragOver ? 'action.hover' : 'background.paper',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.3s ease',
        '&:hover': {
          bgcolor: 'action.hover',
          borderColor: fileTypeColors[fileType]
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Box sx={{ fontSize: 48, color: fileTypeColors[fileType] }}>
          {fileTypeIcons[fileType]}
        </Box>
        <Typography variant="h6" color="text.primary">
          {dragOver ? `Drop ${fileType}s here` : `Upload ${fileType}s`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Drag and drop files here, or click to browse
        </Typography>
        <Button
          variant="outlined"
          startIcon="⬆️"
          onClick={(e) => {
            e.stopPropagation();
            openUploadDialog();
          }}
        >
          Choose Files
        </Button>
      </Box>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={getAcceptString()}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
    </Paper>
  );

  const getAcceptString = () => {
    const acceptMap = {
      video: 'video/*',
      image: 'image/*',
      document: '.pdf,.doc,.docx,.txt'
    };
    return acceptMap[fileType];
  };

  const renderUploadingFiles = () => (
    <>
      {uploadingFiles.map((uploadingFile, index) => (
        <Card key={index} sx={{ mb: 1 }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ color: fileTypeColors[fileType] }}>
                {fileTypeIcons[fileType]}
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" noWrap>
                  {uploadingFile.file.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={uploadingFile.progress.percentage}
                    sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {uploadingFile.progress.percentage}%
                  </Typography>
                </Box>
                {uploadingFile.error && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                    {uploadingFile.error}
                  </Typography>
                )}
              </Box>
              <Box>
                {uploadingFile.status === 'completed' && <span style={{color: '#4caf50'}}>✓</span>}
                {uploadingFile.status === 'error' && <span style={{color: '#f44336'}}>✗</span>}
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </>
  );

  const renderUploadedFiles = () => (
    <Grid container spacing={2}>
      {uploadedFiles.map(file => (
        <Grid item xs={12} sm={6} md={4} key={file.id}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {file.thumbnailUrl && (
              <Box
                component="img"
                src={fileUploadApi.getThumbnailUrl(file)!}
                sx={{
                  width: '100%',
                  height: 120,
                  objectFit: 'cover'
                }}
                alt={file.originalName}
              />
            )}
            <CardContent sx={{ flexGrow: 1, py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                <Box sx={{ color: fileTypeColors[fileType], flexShrink: 0 }}>
                  {fileTypeIcons[fileType]}
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap title={file.originalName}>
                    {file.originalName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fileUploadApi.formatFileSize(file.size)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteFile(file)}
                >
                  🗑️
                </IconButton>
              </Box>
              
              <Chip
                label={fileType}
                size="small"
                sx={{
                  bgcolor: fileTypeColors[fileType],
                  color: 'white',
                  fontSize: '0.75rem'
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box>
      {title && (
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      )}
      
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Upload Area */}
      {renderUploadArea()}

      {/* Uploading Files Progress */}
      {uploadingFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Uploading...
          </Typography>
          {renderUploadingFiles()}
        </Box>
      )}

      {/* Uploaded Files Library */}
      {showLibrary && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Uploaded {fileType}s ({uploadedFiles.length})
            </Typography>
            <Button size="small" onClick={loadFiles} disabled={loading}>
              Refresh
            </Button>
          </Box>
          
          {loading ? (
            <LinearProgress />
          ) : uploadedFiles.length > 0 ? (
            renderUploadedFiles()
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No {fileType}s uploaded yet
            </Typography>
          )}
        </Box>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload {fileType}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Description (optional)"
            multiline
            rows={3}
            value={fileDescription}
            onChange={(e) => setFileDescription(e.target.value)}
            sx={{ mt: 2 }}
          />
          
          <Box sx={{ mt: 3 }}>
            <input
              type="file"
              multiple
              accept={getAcceptString()}
              onChange={(e) => {
                if (e.target.files) {
                  handleFileSelect(e.target.files);
                  setUploadDialogOpen(false);
                }
              }}
              style={{ width: '100%' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};