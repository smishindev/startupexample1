import React from 'react';
import { Paper, Typography } from '@mui/material';
import type { Achievement } from '../../services/dashboardApi';

export type { Achievement };

export const AchievementBadge: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  const getColor = () => {
    switch (achievement.type) {
      case 'gold': return '#ffc107';
      case 'silver': return '#9e9e9e';
      case 'bronze': return '#8d6e63';
      default: return '#9e9e9e';
    }
  };

  return (
    <Paper
      sx={{
        p: 2,
        textAlign: 'center',
        background: `linear-gradient(135deg, ${getColor()}20, ${getColor()}10)`,
        border: `2px solid ${getColor()}40`,
        borderRadius: 2,
      }}
    >
      <Typography variant="h4" sx={{ mb: 1 }}>
        {achievement.icon}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
        {achievement.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
        {achievement.description}
      </Typography>
    </Paper>
  );
};
