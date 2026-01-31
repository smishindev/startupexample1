/**
 * MobileBottomNav Component
 * Fixed bottom navigation bar for mobile devices
 */

import React from 'react';
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { mobileNavItems } from '../../config/navigation';
import { useNotificationStore } from '../../stores/notificationStore';

interface MobileBottomNavProps {
  /** Callback when menu button is pressed */
  onMenuClick: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotificationStore();

  // Determine active tab based on current path
  const getActiveValue = (): string => {
    const currentPath = location.pathname;
    
    // Check each mobile nav item
    for (const item of mobileNavItems) {
      if (item.path === 'menu') continue;
      if (currentPath === item.path || currentPath.startsWith(item.path + '/')) {
        return item.id;
      }
    }
    
    // Default to home for dashboard and related pages
    if (currentPath === '/dashboard' || currentPath === '/') {
      return 'home';
    }
    
    return '';
  };

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    const item = mobileNavItems.find(i => i.id === newValue);
    if (!item) return;

    if (item.path === 'menu') {
      onMenuClick();
    } else {
      navigate(item.path);
    }
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar + 1,
        borderTop: `1px solid ${theme.palette.divider}`,
        // Safe area for notched devices
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <BottomNavigation
        value={getActiveValue()}
        onChange={handleChange}
        showLabels
        sx={{
          height: 64,
          backgroundColor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '6px 0',
            color: theme.palette.text.secondary,
            transition: 'all 0.2s ease',
            '&.Mui-selected': {
              color: theme.palette.primary.main,
            },
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.04),
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.65rem',
            fontWeight: 500,
            marginTop: 2,
            transition: 'font-size 0.2s ease',
            '&.Mui-selected': {
              fontSize: '0.7rem',
              fontWeight: 600,
            },
          },
        }}
      >
        {mobileNavItems.map((item) => (
          <BottomNavigationAction
            key={item.id}
            value={item.id}
            label={item.label}
            data-testid={item.testId}
            icon={
              item.id === 'profile' && unreadCount > 0 ? (
                <Badge
                  badgeContent={unreadCount > 99 ? '99+' : unreadCount}
                  color="error"
                  max={99}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.6rem',
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                    },
                  }}
                >
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )
            }
            sx={{
              '& .MuiSvgIcon-root': {
                fontSize: '1.5rem',
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNav;
