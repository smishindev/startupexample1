/**
 * HeaderV5 Component
 * Modern navigation header with mega menu dropdowns and mobile-optimized layout
 */

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Button,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Typography,
  ListItemIcon,
  ListItemText,
  Divider,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  AccountCircle,
  School as SchoolIcon,
  Dashboard as DashboardIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { NotificationBell } from '../Notifications/NotificationBell';
import PresenceStatusSelector from '../Presence/PresenceStatusSelector';
import { MegaMenuDropdown } from './MegaMenuDropdown';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileNavDrawer } from './MobileNavDrawer';
import { navGroups, profileMenuItems, filterByRole } from '../../config/navigation';
import { SearchAutocomplete } from '../Search/SearchAutocomplete';

export const HeaderV5: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Filter nav groups by user role
  const visibleGroups = filterByRole(navGroups, user?.role);
  const visibleProfileItems = filterByRole(profileMenuItems, user?.role);

  // Dynamic labels for role-specific items
  const dynamicLabels: Record<string, string> = {};
  if (user?.role === 'instructor') {
    dynamicLabels['my-learning'] = 'My Teaching';
  }

  // Handlers
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
    navigate('/login');
  };

  const handleProfileMenuAction = (item: typeof visibleProfileItems[0]) => {
    if (item.action === 'logout') {
      handleLogout();
    } else if (item.path) {
      navigate(item.path);
      handleProfileMenuClose();
    }
  };

  // Check if Dashboard is active
  const isDashboardActive = location.pathname === '/dashboard';

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 56, sm: 64 },
            px: { xs: 1, sm: 2, md: 3 },
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              mr: { xs: 1, md: 3 },
              '&:hover': {
                opacity: 0.9,
              },
            }}
            onClick={() => navigate('/dashboard')}
            data-testid="header-logo"
          >
            <SchoolIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
            {!isMobile && (
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #ffffff 30%, #e3f2fd 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: { xs: 'none', sm: 'block' },
                  whiteSpace: 'nowrap',
                }}
              >
                Mishin Learn
              </Typography>
            )}
          </Box>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {/* Dashboard Button */}
              <Button
                component={Link}
                to="/dashboard"
                startIcon={<DashboardIcon />}
                data-testid="nav-dashboard"
                sx={{
                  color: 'white',
                  textTransform: 'none',
                  px: 2,
                  py: 1,
                  fontSize: '0.9rem',
                  fontWeight: isDashboardActive ? 600 : 500,
                  borderRadius: 2,
                  backgroundColor: isDashboardActive
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                }}
              >
                Dashboard
              </Button>

              {/* Mega Menu Dropdowns */}
              {visibleGroups.map((group) => (
                <MegaMenuDropdown
                  key={group.id}
                  group={group}
                  dynamicLabels={dynamicLabels}
                />
              ))}
            </Box>
          )}

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Search */}
          {isMobile ? (
            searchExpanded ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexGrow: 1,
                  mx: 1,
                  gap: 0.5,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <SearchAutocomplete
                    variant="header"
                    placeholder="Search courses..."
                    testIdPrefix="header-search-mobile"
                  />
                </Box>
                <IconButton
                  color="inherit"
                  onClick={() => setSearchExpanded(false)}
                  sx={{ ml: 0.5 }}
                  data-testid="header-search-close-button"
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            ) : (
              <Tooltip title="Search">
                <IconButton
                  color="inherit"
                  onClick={() => setSearchExpanded(true)}
                  data-testid="header-search-expand-button"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    },
                  }}
                >
                  <SearchIcon />
                </IconButton>
              </Tooltip>
            )
          ) : (
            <Box sx={{ ml: 2, width: 'auto', maxWidth: 480 }}>
              <SearchAutocomplete
                variant="header"
                placeholder="Search courses, topics..."
                testIdPrefix="header-search"
              />
            </Box>
          )}

          {/* Right Actions */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.5, sm: 1 },
              ml: { xs: 0.5, sm: 2 },
            }}
          >
            {user && !isMobile && (
              <PresenceStatusSelector />
            )}

            {user && (
              <NotificationBell />
            )}

            {/* Profile Menu */}
            <Tooltip title="Account">
              <IconButton
                size="large"
                edge="end"
                onClick={handleProfileMenuOpen}
                color="inherit"
                data-testid="header-profile-menu-button"
                sx={{
                  ml: 0.5,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <Avatar
                  src={user?.avatar || undefined}
                  alt={user?.firstName}
                  sx={{
                    width: { xs: 32, sm: 36 },
                    height: { xs: 32, sm: 36 },
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                  }}
                >
                  {user?.firstName?.charAt(0) || <AccountCircle />}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profile Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1,
            minWidth: 220,
            borderRadius: 2,
            overflow: 'visible',
            '&::before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
              boxShadow: '-2px -2px 4px rgba(0,0,0,0.05)',
            },
          },
        }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.email}
          </Typography>
        </Box>

        {/* Menu Items */}
        {visibleProfileItems.map((item) => {
          if (item.action === 'divider') {
            return <Divider key={item.id} sx={{ my: 0.5 }} />;
          }

          return (
            <MenuItem
              key={item.id}
              onClick={() => handleProfileMenuAction(item)}
              data-testid={item.testId}
              sx={{
                py: 1,
                color: item.action === 'logout' ? 'error.main' : 'inherit',
                '&:hover': {
                  backgroundColor: item.action === 'logout'
                    ? alpha(theme.palette.error.main, 0.08)
                    : undefined,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: item.action === 'logout' ? 'error.main' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
          );
        })}
      </Menu>

      {/* Mobile Navigation - Only show when authenticated */}
      {isMobile && user && (
        <>
          <MobileNavDrawer
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
          />
          <MobileBottomNav
            onMenuClick={() => setMobileDrawerOpen(true)}
          />
        </>
      )}
    </>
  );
};

export default HeaderV5;
