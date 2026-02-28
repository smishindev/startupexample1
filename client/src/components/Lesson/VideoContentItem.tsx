import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Chip, CircularProgress, Alert } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { VideoPlayer } from '../Video/VideoPlayer';
import { VideoTranscript, TranscriptSegment } from '../Video/VideoTranscript';
import { VideoErrorBoundary } from '../Video/VideoErrorBoundary';
import { getVideoProgress } from '../../services/videoProgressApi';
import { parseVTTTranscript } from '../../utils/transcriptParser';
import { LessonContent } from '../../services/lessonApi';

interface VideoContentItemProps {
  content: LessonContent;
  index: number;
  total: number;
  lessonId: string;
  courseId: string;
  isInstructorPreview: boolean;
  onComplete: () => void;
  isCompleted: boolean;
  progressData?: any;
}

export const VideoContentItem: React.FC<VideoContentItemProps> = ({
  content,
  index,
  total: _total,
  lessonId: _lessonId,
  courseId: _courseId,
  isInstructorPreview,
  onComplete,
  isCompleted,
  progressData: _progressData
}) => {
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoProgress, setVideoProgress] = useState<any>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true; // Track if component is still mounted

    const loadVideoData = async () => {
      try {
        // Load video progress using contentItemId
        if (!isInstructorPreview && content.id) {
          const progress = await getVideoProgress(content.id);
          if (isMounted) {
            setVideoProgress(progress);
          }
        }

        // Resolve video URL - Priority order:
        // 1. content.data.url (full URL from upload)
        // 2. content.url (legacy direct URL)
        // 3. content.data.fileId (UUID that needs database lookup)
        // 4. content.fileId (legacy top-level UUID)
        const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
        let videoUrl: string;

        const directUrl = content.data?.url || content.url;
        if (directUrl && directUrl.trim() !== '') {
          // Best case: We have the full URL
          videoUrl = directUrl;
          console.log('[VideoContentItem] Using direct URL:', videoUrl);
        } else {
          // We need to resolve a fileId (UUID) to get the full URL
          const fileIdToResolve = content.data?.fileId || content.fileId;
          
          if (!fileIdToResolve) {
            console.error('[VideoContentItem] No URL or fileId found in content:', content);
            videoUrl = 'ERROR'; // Signal error - nothing to load
          } else if (fileIdToResolve.includes('/') || fileIdToResolve.includes('\\')) {
            // fileId is actually a path
            videoUrl = `${API_URL}/uploads/${fileIdToResolve}`;
            console.log('[VideoContentItem] Using fileId as path:', videoUrl);
          } else {
            // fileId is a UUID - fetch the full URL from API
            console.log('[VideoContentItem] Resolving UUID fileId:', fileIdToResolve);
            try {
              const token = localStorage.getItem('token');
              const response = await fetch(`${API_URL}/api/upload/${fileIdToResolve}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (response.ok) {
                const fileData = await response.json();
                videoUrl = fileData.url;
                console.log('[VideoContentItem] Resolved URL:', videoUrl);
              } else {
                console.error('[VideoContentItem] Failed to resolve fileId:', response.status);
                videoUrl = 'ERROR'; // Signal error state
              }
            } catch (error) {
              console.error('[VideoContentItem] Error resolving fileId:', error);
              videoUrl = 'ERROR'; // Signal error state
            }
          }
        }

        if (isMounted) {
          setResolvedVideoUrl(videoUrl);
        }

        // Load transcript if available
        if (content.data?.transcriptUrl) {
          const segments = await parseVTTTranscript(content.data.transcriptUrl);
          if (isMounted) {
            setTranscript(segments);
          }
        }
      } catch (error) {
        console.error('Error loading video data:', error);
      }
    };

    loadVideoData();

    return () => {
      isMounted = false; // Cleanup flag
    };
    // Note: content.data is an object, so comparing by reference. If content structure changes,
    // this will re-run. For nested property changes, parent component should pass new content object.
  }, [content.id, content.fileId, content.url, content.data?.url, content.data?.fileId, isInstructorPreview]);

  const handleVideoComplete = async () => {
    if (isInstructorPreview || isCompleted) return;
    onComplete();
  };

  const fileName = content.data?.fileName || content.data?.originalName || `Video ${index + 1}`;
  const videoDurationMinutes = content.data?.duration 
    ? Math.floor(content.data.duration / 60) 
    : 0;

  // Show loading state while resolving URL
  if (!resolvedVideoUrl) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography color="text.secondary">Loading video...</Typography>
      </Paper>
    );
  }

  // Show error if URL couldn't be resolved
  if (resolvedVideoUrl === 'ERROR') {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>Video unavailable</Typography>
          <Typography variant="body2">
            This video could not be loaded. The file may have been deleted or the URL is invalid.
          </Typography>
          {content.data?.fileId && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              File ID: {content.data.fileId}
            </Typography>
          )}
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ overflow: 'hidden', borderRadius: 2 }}>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {content.data?.title
                ? `${content.data.title}${content.data?.fileName || content.data?.originalName ? `: ${content.data.fileName || content.data.originalName}` : ''}`
                : `Video #${index + 1}: ${fileName}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {videoDurationMinutes > 0 ? `${videoDurationMinutes} minutes` : 'Video content'}
              {!isInstructorPreview && videoProgress?.watchedPercentage && (
                <> • {Math.round(videoProgress.watchedPercentage)}% watched</>
              )}
            </Typography>
          </Box>
          {isCompleted && (
            <Chip
              icon={<CheckCircle />}
              label="Completed"
              color="success"
              size="small"
            />
          )}
        </Box>
      </Box>

      {/* Video Player */}
      <Box sx={{ bgcolor: '#000' }}>
        <VideoErrorBoundary onRetry={() => window.location.reload()}>
          <VideoPlayer
            src={resolvedVideoUrl}
            title={fileName}
            videoLessonId={content.id} // Using contentItemId
            poster={content.data?.thumbnail}
            initialTime={videoProgress?.currentPosition || 0}
            enableProgressTracking={!isInstructorPreview}
            onProgress={(currentTime) => {
              setCurrentTime(currentTime);
            }}
            onComplete={handleVideoComplete}
          />
        </VideoErrorBoundary>
      </Box>

      {/* Transcript */}
      {transcript.length > 0 && (
        <Box sx={{ p: 2 }}>
          <VideoTranscript
            segments={transcript}
            currentTime={currentTime}
            onSeek={() => {
              // Seek functionality handled by VideoPlayer
            }}
          />
        </Box>
      )}
    </Paper>
  );
};
