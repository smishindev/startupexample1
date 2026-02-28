import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  gradient,
}) => (
  <Paper
    sx={{
      p: 3,
      height: '100%',
      background: gradient,
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        width: '100px',
        height: '100px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        transform: 'translate(30px, -30px)',
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      {icon}
      <Typography variant="h6" sx={{ ml: 1, fontWeight: 'medium' }}>
        {title}
      </Typography>
    </Box>
    <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1, fontSize: { xs: '1.75rem', sm: '3rem' } }}>
      {value}
    </Typography>
    <Typography variant="body2" sx={{ opacity: 0.8 }}>
      {subtitle}
    </Typography>
  </Paper>
);
