/**
 * MobileNavDrawer Component
 * Full-screen navigation drawer for mobile devices
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  IconButton,
  Collapse,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandLess,
  ExpandMore,
  AccountCircle,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { navGroups, filterByRole } from '../../config/navigation';
import { useAuthStore } from '../../stores/authStore';
import PresenceStatusSelector from '../Presence/PresenceStatusSelector';
import { SearchAutocomplete } from '../Search/SearchAutocomplete';

interface MobileNavDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const activeItemRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollRef = useRef(false);

  // Find which group contains the currently active route
  const findActiveGroupId = useCallback(() => {
    const filtered = filterByRole(navGroups, user?.role);
    for (const group of filtered) {
      for (const item of group.items) {
        if (location.pathname === item.path || location.pathname.startsWith(item.path + '/')) {
          return group.id;
        }
      }
    }
    return null;
  }, [location.pathname, user?.role]);
  
  // Track which groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    learning: true, // Default expanded
  });

  // When drawer opens, expand only default group + the active group, then flag for scroll
  useEffect(() => {
    if (open) {
      const activeGroupId = findActiveGroupId();
      const next: Record<string, boolean> = { learning: true };
      if (activeGroupId) {
        next[activeGroupId] = true;
      }
      setExpandedGroups(next);
      shouldScrollRef.current = true;
    } else {
      shouldScrollRef.current = false;
    }
  }, [open, findActiveGroupId]);

  // Scroll to active item only when drawer just opened (not on manual toggle)
  useEffect(() => {
    if (open && shouldScrollRef.current && activeItemRef.current) {
      const timer = setTimeout(() => {
        if (shouldScrollRef.current) {
          activeItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          shouldScrollRef.current = false;
        }
      }, 350); // wait for Collapse animation
      return () => clearTimeout(timer);
    }
  }, [open, expandedGroups]);

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Handle navigation
  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  // Check if path is active
  const isActive = (path: string) => 
    location.pathname === path || location.pathname.startsWith(path + '/');

  // Filter groups by role
  const visibleGroups = filterByRole(navGroups, user?.role);
  // Get dynamic label for My Learning
  const getDynamicLabel = (itemId: string, defaultLabel: string) => {
    if (itemId === 'my-learning' && user?.role === 'instructor') {
      return 'My Teaching';
    }
    return defaultLabel;
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: '85%',
          maxWidth: 320,
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
        }}
      >
        {/* Close button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: 'white' }}
            data-testid="header-mobile-close-button"
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* User info */}
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={user.avatar || undefined}
              alt={user.firstName}
              sx={{ 
                width: 56, 
                height: 56,
                border: '2px solid rgba(255,255,255,0.3)',
              }}
            >
              {user.firstName?.charAt(0) || <AccountCircle />}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }} noWrap>
                {user.email}
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <PresenceStatusSelector />
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Search */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <SearchAutocomplete
          variant="header"
          placeholder="Search courses..."
          testIdPrefix="drawer-search"
          onNavigate={onClose}
        />
      </Box>

      {/* Navigation Groups */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List sx={{ py: 0 }}>
          {visibleGroups.map((group) => (
            <React.Fragment key={group.id}>
              {/* Group Header */}
              <ListItemButton
                onClick={() => toggleGroup(group.id)}
                data-testid={`header-mobile-${group.id}-toggle`}
                sx={{
                  py: 1.5,
                  backgroundColor: expandedGroups[group.id]
                    ? alpha(theme.palette.primary.main, 0.04)
                    : 'transparent',
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: theme.palette.primary.main }}>
                  {group.icon}
                </ListItemIcon>
                <ListItemText
                  primary={group.label}
                  primaryTypographyProps={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  }}
                />
                {expandedGroups[group.id] ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>

              {/* Group Items */}
              <Collapse in={expandedGroups[group.id]} timeout="auto">
                <List component="div" disablePadding>
                  {group.items.map((item) => (
                    <ListItemButton
                      key={item.id}
                      ref={isActive(item.path) ? activeItemRef : undefined}
                      onClick={() => handleNavigate(item.path)}
                      data-testid={`header-mobile-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      selected={isActive(item.path)}
                      sx={{
                        pl: 4,
                        py: 1.25,
                        borderRadius: 0,
                        '&.Mui-selected': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          borderLeft: `3px solid ${theme.palette.primary.main}`,
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.12),
                          },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={getDynamicLabel(item.id, item.label)}
                        secondary={item.description}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: isActive(item.path) ? 600 : 400,
                        }}
                        secondaryTypographyProps={{
                          fontSize: '0.75rem',
                          sx: { mt: 0.25 },
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>

              <Divider sx={{ my: 0.5 }} />
            </React.Fragment>
          ))}
        </List>
      </Box>

    </Drawer>
  );
};

export default MobileNavDrawer;
