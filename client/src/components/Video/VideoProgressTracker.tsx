import React, { useCallback, useRef, useEffect } from 'react';
import { progressApi } from '../../services/progressApi';

interface VideoProgressTrackerProps {
  lessonId: string;
  onProgress?: (percentage: number, timeSpent: number) => void;
  onComplete?: () => void;
  children: (trackingProps: {
    onVideoProgress: (currentTime: number, duration: number, percentWatched: number) => void;
    onVideoComplete: () => void;
    onTimeUpdate: (currentTime: number) => void;
  }) => React.ReactElement;
}

export const VideoProgressTracker: React.FC<VideoProgressTrackerProps> = ({
  lessonId,
  onProgress,
  onComplete,
  children,
}) => {
  const progressRef = useRef({
    lastSavedProgress: 0,
    totalTimeSpent: 0,
    sessionStartTime: Date.now(),
    lastUpdateTime: Date.now(),
    maxProgressReached: 0,
    currentPosition: 0, // Current time position in video
  });

  const saveProgressThrottled = useRef<NodeJS.Timeout | null>(null);

  // Save progress to backend (throttled)
  const saveProgress = useCallback(async (progressPercentage: number, timeSpent: number, currentPosition: number = 0) => {
    try {
      await progressApi.updateLessonProgress(lessonId, {
        progressPercentage: Math.round(progressPercentage),
        timeSpent: Math.round(timeSpent),
        notes: `position:${Math.round(currentPosition)}`, // Store current position in notes
      });
      
      progressRef.current.lastSavedProgress = progressPercentage;
      
      if (onProgress) {
        onProgress(progressPercentage, timeSpent);
      }
      
      console.log(`Progress saved: ${progressPercentage.toFixed(1)}%, ${timeSpent}s, position: ${currentPosition.toFixed(1)}s`);
    } catch (error) {
      console.error('Failed to save video progress:', error);
    }
  }, [lessonId, onProgress]);

  // Mark lesson as complete
  const markComplete = useCallback(async () => {
    try {
      const totalTime = progressRef.current.totalTimeSpent;
      await progressApi.markLessonComplete(lessonId, {
        timeSpent: Math.round(totalTime),
        notes: 'Video lesson completed',
      });
      
      if (onComplete) {
        onComplete();
      }
      
      console.log(`Lesson ${lessonId} marked as complete`);
    } catch (error) {
      console.error('Failed to mark lesson complete:', error);
    }
  }, [lessonId, onComplete]);

  // Handle video progress updates
  const handleVideoProgress = useCallback((currentTime: number, _duration: number, percentWatched: number) => {
    const now = Date.now();
    const timeDelta = (now - progressRef.current.lastUpdateTime) / 1000; // Convert to seconds
    
    // Update current position
    progressRef.current.currentPosition = currentTime;
    
    // Update total time spent (only if video is actually playing)
    if (timeDelta < 5) { // Reasonable threshold to avoid counting paused time
      progressRef.current.totalTimeSpent += timeDelta;
    }
    
    progressRef.current.lastUpdateTime = now;
    progressRef.current.maxProgressReached = Math.max(progressRef.current.maxProgressReached, percentWatched);

    // Only save progress if there's significant change (at least 5% or 30 seconds)
    const progressDifference = Math.abs(percentWatched - progressRef.current.lastSavedProgress);
    const timeDifference = progressRef.current.totalTimeSpent - progressRef.current.lastSavedProgress;
    
    if (progressDifference >= 5 || timeDifference >= 30) {
      // Throttle progress saving to avoid too many API calls
      if (saveProgressThrottled.current) {
        clearTimeout(saveProgressThrottled.current);
      }
      
      saveProgressThrottled.current = setTimeout(() => {
        saveProgress(progressRef.current.maxProgressReached, progressRef.current.totalTimeSpent, progressRef.current.currentPosition);
      }, 2000); // 2 second delay
    }
  }, [saveProgress]);

  // Handle video completion
  const handleVideoComplete = useCallback(() => {
    // Save final progress
    saveProgress(100, progressRef.current.totalTimeSpent, progressRef.current.currentPosition);
    
    // Mark lesson as complete after a short delay
    setTimeout(() => {
      markComplete();
    }, 1000);
  }, [saveProgress, markComplete]);

  // Handle time updates (for tracking watch time)
  const handleTimeUpdate = useCallback((_currentTime: number) => {
    const now = Date.now();
    const timeDelta = (now - progressRef.current.lastUpdateTime) / 1000;
    
    // Only count time if reasonable delta (video is playing)
    if (timeDelta > 0 && timeDelta < 5) {
      progressRef.current.totalTimeSpent += timeDelta;
    }
    
    progressRef.current.lastUpdateTime = now;
  }, []);

  // Save progress when component unmounts
  useEffect(() => {
    return () => {
      // Save final progress on unmount
      if (progressRef.current.maxProgressReached > progressRef.current.lastSavedProgress) {
        saveProgress(progressRef.current.maxProgressReached, progressRef.current.totalTimeSpent, progressRef.current.currentPosition);
      }
      
      // Clear timeout
      if (saveProgressThrottled.current) {
        clearTimeout(saveProgressThrottled.current);
      }
    };
  }, [saveProgress]);

  // Periodically save progress (backup mechanism)
  useEffect(() => {
    const interval = setInterval(() => {
      const progressDiff = progressRef.current.maxProgressReached - progressRef.current.lastSavedProgress;
      if (progressDiff > 0) {
        saveProgress(progressRef.current.maxProgressReached, progressRef.current.totalTimeSpent, progressRef.current.currentPosition);
      }
    }, 60000); // Save every minute as backup

    return () => clearInterval(interval);
  }, [saveProgress]);

  return children({
    onVideoProgress: handleVideoProgress,
    onVideoComplete: handleVideoComplete,
    onTimeUpdate: handleTimeUpdate,
  });
};

export default VideoProgressTracker;