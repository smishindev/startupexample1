/**
 * OnlineIndicator Component
 * Small badge showing online/offline/away/busy status
 */

import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { PresenceStatus } from '../../types/presence';

interface OnlineIndicatorProps {
  status: PresenceStatus;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  lastSeenAt?: string;
}

const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({ 
  status, 
  size = 'medium',
  showTooltip = true,
  lastSeenAt
}) => {
  const getColor = () => {
    switch (status) {
      case 'online': return '#44b700'; // Green
      case 'away': return '#ffa500'; // Orange
      case 'busy': return '#ff0000'; // Red
      case 'offline': return '#9e9e9e'; // Gray
      default: return '#9e9e9e';
    }
  };

  const getSize = () => {
    switch (size) {
      case 'small': return 8;
      case 'medium': return 10;
      case 'large': return 12;
      default: return 10;
    }
  };

  const getLabel = () => {
    if (status === 'offline' && lastSeenAt) {
      const lastSeen = new Date(lastSeenAt);
      const now = new Date();
      const diffMs = now.getTime() - lastSeen.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Last seen just now';
      if (diffMins < 60) return `Last seen ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `Last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const indicator = (
    <Box
      sx={{
        width: getSize(),
        height: getSize(),
        borderRadius: '50%',
        backgroundColor: getColor(),
        border: '2px solid white',
        boxShadow: status === 'online' ? '0 0 4px rgba(68, 183, 0, 0.6)' : 'none',
        animation: status === 'online' ? 'pulse 2s infinite' : 'none',
        '@keyframes pulse': {
          '0%': { boxShadow: '0 0 4px rgba(68, 183, 0, 0.6)' },
          '50%': { boxShadow: '0 0 8px rgba(68, 183, 0, 0.8)' },
          '100%': { boxShadow: '0 0 4px rgba(68, 183, 0, 0.6)' },
        },
      }}
    />
  );

  if (showTooltip) {
    return <Tooltip title={getLabel()}>{indicator}</Tooltip>;
  }

  return indicator;
};

export default OnlineIndicator;
