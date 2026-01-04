/**
 * UserPresenceBadge Component
 * Avatar with presence indicator overlay
 */

import React from 'react';
import { Avatar, Badge, styled } from '@mui/material';
import OnlineIndicator from './OnlineIndicator';
import { PresenceStatus } from '../../types/presence';

interface UserPresenceBadgeProps {
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
  status: PresenceStatus;
  lastSeenAt?: string;
  size?: number;
}

const StyledBadge = styled(Badge)(() => ({
  '& .MuiBadge-badge': {
    backgroundColor: 'transparent',
    border: 'none',
    padding: 0,
    minWidth: 'auto',
    height: 'auto',
  },
}));

const UserPresenceBadge: React.FC<UserPresenceBadgeProps> = ({
  avatarUrl,
  firstName,
  lastName,
  status,
  lastSeenAt,
  size = 40,
}) => {
  const getInitials = () => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <StyledBadge
      overlap="circular"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      badgeContent={
        <OnlineIndicator 
          status={status} 
          size={size > 50 ? 'large' : size > 30 ? 'medium' : 'small'}
          showTooltip={true}
          lastSeenAt={lastSeenAt}
        />
      }
      data-testid="user-presence-badge"
    >
      <Avatar
        src={avatarUrl || undefined}
        alt={`${firstName} ${lastName}`}
        sx={{ 
          width: size, 
          height: size,
          fontSize: size / 2.5,
        }}
      >
        {!avatarUrl && getInitials()}
      </Avatar>
    </StyledBadge>
  );
};

export default UserPresenceBadge;
