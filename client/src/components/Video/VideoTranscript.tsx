import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemButton,
  Divider,
  IconButton,
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';

export interface TranscriptSegment {
  startTime: number; // in seconds
  endTime: number;
  text: string;
}

interface VideoTranscriptProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onSeek: (time: number) => void;
  height?: string | number;
}

export const VideoTranscript: React.FC<VideoTranscriptProps> = ({
  segments,
  currentTime,
  onSeek,
  height = 500,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const activeSegmentRef = useRef<HTMLLIElement>(null);

  // Find the currently active segment based on video time
  const activeSegmentIndex = segments.findIndex(
    (segment) => currentTime >= segment.startTime && currentTime < segment.endTime
  );

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentIndex >= 0 && activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSegmentIndex]);

  // Filter segments based on search
  const filteredSegments = segments.filter((segment) =>
    segment.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSegmentClick = (segment: TranscriptSegment, index: number) => {
    onSeek(segment.startTime);
    setHighlightedIndex(index);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const highlightSearchTerm = (text: string): React.ReactNode => {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          style={{
            backgroundColor: '#FFD54F',
            color: '#000',
            padding: '0 2px',
            borderRadius: 2,
          }}
        >
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  if (segments.length === 0) {
    return (
      <Paper
        elevation={2}
        sx={{
          height,
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No transcript available for this video
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Header with Search */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Transcript
        </Typography>
        <TextField
          data-testid="video-transcript-search"
          fullWidth
          size="small"
          placeholder="Search transcript..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton data-testid="video-transcript-clear-search" size="small" onClick={handleClearSearch}>
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {searchTerm && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {filteredSegments.length} result{filteredSegments.length !== 1 ? 's' : ''}
          </Typography>
        )}
      </Box>

      {/* Transcript List */}
      <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {filteredSegments.length > 0 ? (
          filteredSegments.map((segment, index) => {
            const originalIndex = segments.indexOf(segment);
            const isActive = originalIndex === activeSegmentIndex;
            const isHighlighted = originalIndex === highlightedIndex;

            return (
              <React.Fragment key={originalIndex}>
                <ListItem
                  disablePadding
                  ref={isActive ? activeSegmentRef : null}
                  sx={{
                    backgroundColor: isActive
                      ? 'action.selected'
                      : isHighlighted
                      ? 'action.hover'
                      : 'transparent',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <ListItemButton
                    data-testid={`video-transcript-segment-${originalIndex}`}
                    onClick={() => handleSegmentClick(segment, originalIndex)}
                    sx={{ py: 2 }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Typography
                        variant="caption"
                        color={isActive ? 'primary' : 'text.secondary'}
                        sx={{ fontWeight: isActive ? 'bold' : 'normal', mb: 0.5 }}
                      >
                        {formatTime(segment.startTime)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: isActive ? 'text.primary' : 'text.secondary',
                          fontWeight: isActive ? 500 : 400,
                        }}
                      >
                        {highlightSearchTerm(segment.text)}
                      </Typography>
                    </Box>
                  </ListItemButton>
                </ListItem>
                {index < filteredSegments.length - 1 && <Divider />}
              </React.Fragment>
            );
          })
        ) : (
          <Box
            sx={{
              p: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No matches found for "{searchTerm}"
            </Typography>
          </Box>
        )}
      </List>
    </Paper>
  );
};
