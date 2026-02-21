import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Rating,
  Paper,
} from '@mui/material';
import { Star } from '@mui/icons-material';
import type { RatingSummary as RatingSummaryType } from '../../services/ratingApi';

interface RatingSummaryCardProps {
  summary: RatingSummaryType;
}

export const RatingSummaryCard: React.FC<RatingSummaryCardProps> = ({ summary }) => {
  // const maxCount = Math.max(...Object.values(summary.distribution), 1);

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: { xs: 2, sm: 3 }, 
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        mb: 3,
      }}
    >
      <Box sx={{ display: 'flex', gap: { xs: 2, sm: 4 }, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Average rating */}
        <Box sx={{ textAlign: 'center', minWidth: { xs: 80, sm: 120 } }}>
          <Typography variant="h2" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>
            {summary.average > 0 ? summary.average.toFixed(1) : '—'}
          </Typography>
          <Rating 
            value={summary.average} 
            precision={0.1} 
            readOnly 
            size="medium" 
            sx={{ my: 1, color: '#ffd700' }} 
          />
          <Typography variant="body2" color="text.secondary">
            {summary.count} {summary.count === 1 ? 'rating' : 'ratings'}
          </Typography>
        </Box>

        {/* Distribution bars */}
        <Box sx={{ flex: 1, minWidth: { xs: 160, sm: 200 } }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.distribution[star as keyof typeof summary.distribution];
            const percentage = summary.count > 0 ? (count / summary.count) * 100 : 0;

            return (
              <Box key={star} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 32 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 8 }}>
                    {star}
                  </Typography>
                  <Star sx={{ fontSize: 16, color: '#ffd700' }} />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={percentage}
                  sx={{
                    flex: 1,
                    height: 10,
                    borderRadius: 5,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 5,
                      bgcolor: '#ffd700',
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
                  {percentage > 0 ? `${Math.round(percentage)}%` : '0%'}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
};
