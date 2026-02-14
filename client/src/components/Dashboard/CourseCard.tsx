import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Schedule,
  PlayCircleOutline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatCategory, getCategoryGradient, getLevelColor } from '../../utils/courseHelpers';

export interface RecentCourse {
  id: string;
  title: string;
  instructor: string;
  progress: number;
  thumbnail: string;
  lastAccessed: string;
  duration: string;
  category?: string;
  level?: string;
}

export const CourseCard: React.FC<{ course: RecentCourse }> = ({ course }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/courses/${course.id}`)}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
        },
        '&:hover::after': {
          opacity: 1,
        },
      }}
      data-testid={`dashboard-course-card-${course.id}`}
    >
      <Box
        sx={{
          height: 160,
          backgroundImage: course.thumbnail
            ? `url(${course.thumbnail})`
            : getCategoryGradient(course.category),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: course.thumbnail
              ? 'rgba(0, 0, 0, 0.3)'
              : 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)',
            opacity: course.thumbnail ? 1 : 0,
            transition: 'opacity 0.3s ease',
          },
          '.MuiCard-root:hover &::before': {
            opacity: 1,
          },
        }}
      >
        <PlayCircleOutline
          sx={{
            fontSize: 56,
            color: 'white',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            transition: 'all 0.3s ease',
            '.MuiCard-root:hover &': {
              transform: 'scale(1.2)',
            },
          }}
        />
        {course.category && (
          <Chip
            label={formatCategory(course.category)}
            size="small"
            sx={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              bgcolor: 'rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.7rem',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          />
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.3 }}>
          {course.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
          {course.instructor}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
          {course.level && (
            <Chip
              label={course.level}
              size="small"
              sx={{
                backgroundColor: alpha(getLevelColor(course.level, theme), 0.15),
                color: getLevelColor(course.level, theme),
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 24,
                border: `1.5px solid ${alpha(getLevelColor(course.level, theme), 0.4)}`,
              }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Schedule sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {course.duration}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Your Progress</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{course.progress}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={course.progress}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(0,0,0,0.08)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 2px 4px rgba(102, 126, 234, 0.4)',
              },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 1 }}>
          <Chip
            label={course.lastAccessed}
            size="small"
            sx={{
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: 'action.hover',
              borderColor: 'divider',
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
