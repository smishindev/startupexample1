import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Button,
  Avatar,
  Menu,
  MenuItem,
  InputBase,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
} from '@mui/material';
import {
  Search as SearchIcon,
  AccountCircle,
  Menu as MenuIcon,
  School as SchoolIcon,
  Dashboard as DashboardIcon,
  Book as BookIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  ExitToApp as ExitToAppIcon,
  PlayCircleOutline as LearningIcon,
  TrendingUp as SmartProgressIcon,
  Chat as ChatIcon,
  Psychology as PsychologyIcon,
  People as PeopleIcon,
  VideoCall as LiveSessionIcon,
  Groups as StudyGroupIcon,
  AccessTime as OfficeHoursIcon,
  Close as CloseIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { NotificationBell } from '../Notifications/NotificationBell';
import PresenceStatusSelector from '../Presence/PresenceStatusSelector';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius * 3,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.5)',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.primary.main,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 500,
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    '&::placeholder': {
      color: theme.palette.text.secondary,
      opacity: 0.7,
    },
    [theme.breakpoints.up('md')]: {
      width: '30ch',
    },
  },
}));

export const HeaderV4 = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Profile menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Mobile submenu states
  const [learningExpanded, setLearningExpanded] = useState(false);
  const [collaborationExpanded, setCollaborationExpanded] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [instructorExpanded, setInstructorExpanded] = useState(false);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/login');
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchExpanded(false);
    }
  };

  // All navigation items in one flat array
  const allNavItems = [
    { text: 'Courses', icon: <BookIcon fontSize="small" />, path: '/courses', category: 'Learning' },
    { text: user?.role === 'instructor' ? 'My Teaching' : 'My Learning', icon: <LearningIcon fontSize="small" />, path: '/my-learning', category: 'Learning' },
    { text: 'Smart Progress', icon: <SmartProgressIcon fontSize="small" />, path: '/smart-progress', category: 'Learning' },
    { text: 'Live Sessions', icon: <LiveSessionIcon fontSize="small" />, path: '/live-sessions', category: 'Collaboration' },
    { text: 'Study Groups', icon: <StudyGroupIcon fontSize="small" />, path: '/study-groups', category: 'Collaboration' },
    { text: 'Office Hours', icon: <OfficeHoursIcon fontSize="small" />, path: '/office-hours', category: 'Collaboration' },
    { text: 'AI Tutoring', icon: <PsychologyIcon fontSize="small" />, path: '/tutoring', category: 'Tools' },
    { text: 'Chat', icon: <ChatIcon fontSize="small" />, path: '/chat', category: 'Tools' },
    { text: 'Online Users', icon: <PeopleIcon fontSize="small" />, path: '/presence', category: 'Tools' },
  ];

  const instructorItems = user?.role === 'instructor' ? [
    { text: 'Instructor Dashboard', icon: <SchoolIcon fontSize="small" />, path: '/instructor/dashboard', category: 'Instructor' },
    { text: 'Analytics Hub', icon: <AnalyticsIcon fontSize="small" />, path: '/instructor/analytics-hub', category: 'Instructor' },
  ] : [];

  const isActivePath = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const profileMenuItems = [
    { text: 'Profile', icon: <AccountCircle />, action: () => navigate('/profile') },
    { text: 'Settings', icon: <SettingsIcon />, action: () => navigate('/settings') },
    { text: 'Logout', icon: <ExitToAppIcon />, action: handleLogout },
  ];

  // Mobile menu
  const mobileMenu = (
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
      sx={{ '& .MuiDrawer-paper': { width: 280 } }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon /> Mishin Learn
        </Typography>
        <IconButton onClick={() => setMobileMenuOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      <List sx={{ px: 1 }}>
        {/* Learning Section */}
        <ListItem button onClick={() => setLearningExpanded(!learningExpanded)}>
          <ListItemText primary="Learning" />
          {learningExpanded ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={learningExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {allNavItems.filter(item => item.category === 'Learning').map((item) => (
              <ListItem
                button
                key={item.text}
                component={Link}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                sx={{ pl: 4, borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Collapse>

        {/* Collaboration Section */}
        <ListItem button onClick={() => setCollaborationExpanded(!collaborationExpanded)}>
          <ListItemText primary="Collaboration" />
          {collaborationExpanded ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={collaborationExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {allNavItems.filter(item => item.category === 'Collaboration').map((item) => (
              <ListItem
                button
                key={item.text}
                component={Link}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                sx={{ pl: 4, borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Collapse>

        {/* Tools Section */}
        <ListItem button onClick={() => setToolsExpanded(!toolsExpanded)}>
          <ListItemText primary="Tools" />
          {toolsExpanded ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        <Collapse in={toolsExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {allNavItems.filter(item => item.category === 'Tools').map((item) => (
              <ListItem
                button
                key={item.text}
                component={Link}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                sx={{ pl: 4, borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Collapse>

        {/* Instructor Section */}
        {user?.role === 'instructor' && (
          <>
            <ListItem button onClick={() => setInstructorExpanded(!instructorExpanded)}>
              <ListItemText primary="Instructor" />
              {instructorExpanded ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={instructorExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {instructorItems.map((item) => (
                  <ListItem
                    button
                    key={item.text}
                    component={Link}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    sx={{ pl: 4, borderRadius: 2, mb: 0.5 }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}
      </List>

      <Divider />

      {/* Profile Section */}
      <List sx={{ px: 1 }}>
        {profileMenuItems.map((item) => (
          <ListItem 
            button 
            key={item.text} 
            onClick={() => {
              item.action();
              setMobileMenuOpen(false);
            }}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );

  return (
    <>
      {/* Top Header Bar */}
      <AppBar 
        position="sticky" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={() => setMobileMenuOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              cursor: 'pointer'
            }}
            onClick={() => navigate('/dashboard')}
          >
            <SchoolIcon sx={{ fontSize: 32 }} />
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #ffffff 30%, #e3f2fd 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              Mishin Learn
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Search */}
          {isMobile ? (
            searchExpanded ? (
              <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                <form onSubmit={handleSearch} style={{ flexGrow: 1 }}>
                  <StyledInputBase
                    placeholder="Search..."
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
                <IconButton color="inherit" onClick={() => setSearchExpanded(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            ) : (
              <IconButton
                color="inherit"
                onClick={() => setSearchExpanded(true)}
                sx={{
                  backgroundColor: alpha(theme.palette.common.white, 0.15),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.25),
                  },
                }}
              >
                <SearchIcon />
              </IconButton>
            )
          ) : (
            <Search>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <form onSubmit={handleSearch}>
                <StyledInputBase
                  placeholder="Search courses, topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </Search>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PresenceStatusSelector />
            <NotificationBell />

            <IconButton
              size="large"
              edge="end"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar
                src={user?.avatar || undefined}
                alt={user?.firstName}
                sx={{ width: 32, height: 32 }}
              >
                {user?.firstName?.charAt(0) || <AccountCircle />}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>

        {/* Secondary Navigation Bar - Desktop Only */}
        {!isMobile && (
          <Box
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              px: 2,
              overflowX: 'auto',
              '&::-webkit-scrollbar': {
                height: 4,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                borderRadius: 2,
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                py: 1,
                minWidth: 'fit-content',
              }}
            >
              {/* Dashboard - Always first */}
              <Button
                component={Link}
                to="/dashboard"
                startIcon={<DashboardIcon fontSize="small" />}
                sx={{
                  color: 'white',
                  textTransform: 'none',
                  px: 2,
                  py: 0.75,
                  fontSize: '0.875rem',
                  fontWeight: isActivePath('/dashboard') ? 600 : 400,
                  borderRadius: 2,
                  backgroundColor: isActivePath('/dashboard') 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : 'transparent',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  '&::after': isActivePath('/dashboard') ? {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60%',
                    height: '2px',
                    backgroundColor: 'white',
                    borderRadius: '2px 2px 0 0',
                  } : {},
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  },
                }}
              >
                Dashboard
              </Button>

              {allNavItems.map((item) => (
                <Button
                  key={item.path}
                  component={Link}
                  to={item.path}
                  startIcon={item.icon}
                  sx={{
                    color: 'white',
                    textTransform: 'none',
                    px: 2,
                    py: 0.75,
                    fontSize: '0.875rem',
                    fontWeight: isActivePath(item.path) ? 600 : 400,
                    borderRadius: 2,
                    backgroundColor: isActivePath(item.path) 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : 'transparent',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    '&::after': isActivePath(item.path) ? {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '60%',
                      height: '2px',
                      backgroundColor: 'white',
                      borderRadius: '2px 2px 0 0',
                    } : {},
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    },
                  }}
                >
                  {item.text}
                </Button>
              ))}

              {/* Instructor Items */}
              {user?.role === 'instructor' && (
                <>
                  <Divider 
                    orientation="vertical" 
                    flexItem 
                    sx={{ 
                      mx: 1, 
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      my: 1,
                    }} 
                  />
                  {instructorItems.map((item) => (
                    <Button
                      key={item.path}
                      component={Link}
                      to={item.path}
                      startIcon={item.icon}
                      sx={{
                        color: 'white',
                        textTransform: 'none',
                        px: 2,
                        py: 0.75,
                        fontSize: '0.875rem',
                        fontWeight: isActivePath(item.path) ? 600 : 400,
                        borderRadius: 2,
                        backgroundColor: isActivePath(item.path) 
                          ? 'rgba(255, 255, 255, 0.2)' 
                          : 'transparent',
                        whiteSpace: 'nowrap',
                        position: 'relative',
                        '&::after': isActivePath(item.path) ? {
                          content: '""',
                          position: 'absolute',
                          bottom: 0,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '60%',
                          height: '2px',
                          backgroundColor: 'white',
                          borderRadius: '2px 2px 0 0',
                        } : {},
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        },
                      }}
                    >
                      {item.text}
                    </Button>
                  ))}
                </>
              )}
            </Box>
          </Box>
        )}
      </AppBar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        {profileMenuItems.map((item) => (
          <MenuItem
            key={item.text}
            onClick={() => {
              item.action();
              handleMenuClose();
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText>{item.text}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {/* Mobile Menu */}
      {mobileMenu}
    </>
  );
};
