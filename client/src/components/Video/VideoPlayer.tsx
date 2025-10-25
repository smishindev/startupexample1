import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Slider,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  VolumeUp,
  VolumeOff,
  Fullscreen,
  FullscreenExit,
  Settings,
  Forward10,
  Replay10,
  PictureInPicture,
} from '@mui/icons-material';
import { updateVideoProgress, trackVideoEvent } from '../../services/videoProgressApi';

interface VideoPlayerProps {
  src: string;
  title: string;
  videoLessonId?: string; // For progress tracking
  onProgress?: (currentTime: number, duration: number, percentWatched: number) => void;
  onComplete?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  autoPlay?: boolean;
  initialTime?: number; // Start time in seconds
  enableProgressTracking?: boolean; // Auto-save progress every 5 seconds
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  videoLessonId,
  onProgress,
  onComplete,
  onTimeUpdate,
  autoPlay = false,
  initialTime = 0,
  enableProgressTracking = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPosition = useRef<number>(0);
  
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      // Seek to initial time if provided
      if (initialTime > 0 && initialTime < video.duration) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      const progress = (video.currentTime / video.duration) * 100;
      onProgress?.(video.currentTime, video.duration, progress);
      onTimeUpdate?.(video.currentTime);

      // Auto-complete at 90%
      if (video.currentTime / video.duration >= 0.9 && !video.ended) {
        handleComplete();
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      handleComplete();
    };

    const handleComplete = () => {
      onComplete?.();
      if (videoLessonId && enableProgressTracking) {
        updateVideoProgress(videoLessonId, Math.floor(video.currentTime), video.duration)
          .catch(err => console.error('Failed to save completion:', err));
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onProgress, onComplete, onTimeUpdate, initialTime, videoLessonId, enableProgressTracking]);

  // Auto-save progress every 5 seconds
  useEffect(() => {
    if (!videoLessonId || !enableProgressTracking) return;

    progressSaveIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (video && isPlaying && !video.ended) {
        const currentPos = Math.floor(video.currentTime);
        // Only save if position changed by at least 1 second
        if (Math.abs(currentPos - lastSavedPosition.current) >= 1) {
          updateVideoProgress(videoLessonId, currentPos, video.duration)
            .then(() => {
              lastSavedPosition.current = currentPos;
            })
            .catch(err => console.error('Failed to auto-save progress:', err));
        }
      }
    }, 5000);

    return () => {
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
      }
    };
  }, [videoLessonId, enableProgressTracking, isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play();
    } else {
      video.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = playbackRate;
  }, [playbackRate]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    
    // Track play/pause events
    if (videoLessonId) {
      const video = videoRef.current;
      if (video) {
        trackVideoEvent(videoLessonId, {
          eventType: isPlaying ? 'pause' : 'play',
          timestamp: video.currentTime,
        }).catch(err => console.error('Failed to track event:', err));
      }
    }
  };

  const handleSeek = (_event: Event, newValue: number | number[]) => {
    const video = videoRef.current;
    if (!video || typeof newValue !== 'number') return;

    const time = (newValue / 100) * duration;
    video.currentTime = time;
    setCurrentTime(time);

    // Track seek event
    if (videoLessonId) {
      trackVideoEvent(videoLessonId, {
        eventType: 'seek',
        timestamp: time,
      }).catch(err => console.error('Failed to track seek:', err));
    }
  };

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    if (typeof newValue !== 'number') return;
    setVolume(newValue / 100);
    setIsMuted(newValue === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchorEl(null);
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Picture-in-Picture error:', error);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        backgroundColor: '#000',
        aspectRatio: '16/9',
        cursor: showControls ? 'default' : 'none',
        '&:hover': {
          cursor: 'default',
        },
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={src}
        title={title}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        onClick={togglePlay}
      />

      {/* Loading indicator */}
      {duration === 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
          }}
        >
          <Typography>Loading...</Typography>
        </Box>
      )}

      {/* Play/Pause overlay */}
      {!isPlaying && duration > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
          }}
        >
          <IconButton
            size="large"
            onClick={togglePlay}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
            }}
          >
            <PlayArrow sx={{ fontSize: 60 }} />
          </IconButton>
        </Box>
      )}

      {/* Controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          p: 2,
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          zIndex: 3,
        }}
      >
        {/* Progress Bar */}
        <Box sx={{ mb: 1 }}>
          <Slider
            size="small"
            value={progressPercentage}
            onChange={handleSeek}
            sx={{
              color: 'primary.main',
              height: 4,
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: '0px 0px 0px 8px rgba(255, 255, 255, 0.16)',
                },
              },
              '& .MuiSlider-rail': {
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          />
        </Box>

        {/* Control Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Previous 10s">
            <IconButton size="small" onClick={() => skip(-10)} sx={{ color: 'white' }}>
              <Replay10 />
            </IconButton>
          </Tooltip>

          <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
            <IconButton size="small" onClick={togglePlay} sx={{ color: 'white' }}>
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Next 10s">
            <IconButton size="small" onClick={() => skip(10)} sx={{ color: 'white' }}>
              <Forward10 />
            </IconButton>
          </Tooltip>

          <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
            <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
              <IconButton size="small" onClick={toggleMute} sx={{ color: 'white' }}>
                {isMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
            </Tooltip>
            <Box sx={{ width: 80, ml: 1 }}>
              <Slider
                size="small"
                value={isMuted ? 0 : volume * 100}
                onChange={handleVolumeChange}
                sx={{
                  color: 'white',
                  '& .MuiSlider-thumb': {
                    width: 8,
                    height: 8,
                  },
                }}
              />
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Typography variant="body2" sx={{ color: 'white', minWidth: '100px', textAlign: 'center' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>

          <Tooltip title="Settings">
            <IconButton size="small" onClick={handleSettingsClick} sx={{ color: 'white' }}>
              <Settings />
            </IconButton>
          </Tooltip>

          <Tooltip title="Picture in Picture">
            <IconButton size="small" onClick={togglePictureInPicture} sx={{ color: 'white' }}>
              <PictureInPicture />
            </IconButton>
          </Tooltip>

          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            <IconButton size="small" onClick={toggleFullscreen} sx={{ color: 'white' }}>
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsAnchorEl}
        open={Boolean(settingsAnchorEl)}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)', color: 'white' },
        }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
          Playback Speed
        </Typography>
        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
          <MenuItem
            key={rate}
            selected={playbackRate === rate}
            onClick={() => {
              setPlaybackRate(rate);
              handleSettingsClose();
              
              // Track speed change
              if (videoLessonId && videoRef.current) {
                trackVideoEvent(videoLessonId, {
                  eventType: 'speed_change',
                  timestamp: videoRef.current.currentTime,
                  data: { speed: rate },
                }).catch(err => console.error('Failed to track speed change:', err));
              }
            }}
          >
            {rate}x
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};