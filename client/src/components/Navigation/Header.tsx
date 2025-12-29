// Not in use, but do not delete this file yet
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
  ListSubheader,
  Zoom,
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
  KeyboardArrowDown as ArrowDownIcon,
  Close as CloseIcon,
  ExpandLess,
  ExpandMore,
  Notifications as NotificationsIcon,
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
      width: '20ch',
      '&:focus': {
        width: '30ch',
      },
    },
  },
}));

interface HeaderProps {
  onDrawerToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [learningMenuAnchor, setLearningMenuAnchor] = useState<null | HTMLElement>(null);
  const [collaborationMenuAnchor, setCollaborationMenuAnchor] = useState<null | HTMLElement>(null);
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<null | HTMLElement>(null);
  const [instructorMenuAnchor, setInstructorMenuAnchor] = useState<null | HTMLElement>(null);
  const [toolsExpanded, setToolsExpanded] = useState(false);

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

  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Simple hover handler - just switch menus
  const handleMenuHover = React.useCallback((menuName: 'learning' | 'collaboration' | 'tools' | 'instructor', anchorElement: HTMLElement) => {
    // Cancel any pending close
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    
    // Close all other menus and open this one
    setLearningMenuAnchor(menuName === 'learning' ? anchorElement : null);
    setCollaborationMenuAnchor(menuName === 'collaboration' ? anchorElement : null);
    setToolsMenuAnchor(menuName === 'tools' ? anchorElement : null);
    setInstructorMenuAnchor(menuName === 'instructor' ? anchorElement : null);
  }, []);

  const handleCloseAllMenus = React.useCallback(() => {
    // Add small delay to allow mouse movement from button to menu
    closeTimeoutRef.current = setTimeout(() => {
      setLearningMenuAnchor(null);
      setCollaborationMenuAnchor(null);
      setToolsMenuAnchor(null);
      setInstructorMenuAnchor(null);
    }, 100);
  }, []);

  const cancelClose = React.useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      handleCloseAllMenus();
    };
  }, [handleCloseAllMenus]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchExpanded(false);
    }
  };

  // Categorized navigation structure
  const learningItems = [
    { text: 'Courses', icon: <BookIcon />, path: '/courses', description: 'Browse all courses' },
    { text: user?.role === 'instructor' ? 'My Teaching' : 'My Learning', icon: <LearningIcon />, path: '/my-learning', description: 'Your enrolled courses' },
    { text: 'Smart Progress', icon: <SmartProgressIcon />, path: '/smart-progress', description: 'Track your learning' },
  ];

  const collaborationItems = [
    { text: 'Live Sessions', icon: <LiveSessionIcon />, path: '/live-sessions', description: 'Join live classes' },
    { text: 'Study Groups', icon: <StudyGroupIcon />, path: '/study-groups', description: 'Collaborate with peers' },
    { text: 'Office Hours', icon: <OfficeHoursIcon />, path: '/office-hours', description: 'Meet with instructors' },
  ];

  const toolsItems = [
    { text: 'AI Tutoring', icon: <PsychologyIcon />, path: '/tutoring', description: 'Get AI assistance' },
    { text: 'Chat', icon: <ChatIcon />, path: '/chat', description: 'Message others' },
    { text: 'Online Users', icon: <PeopleIcon />, path: '/presence', description: 'See who\'s online' },
  ];

  const instructorItems = user?.role === 'instructor' ? [
    { text: 'Instructor Dashboard', icon: <SchoolIcon />, path: '/instructor/dashboard', description: 'Manage your courses' },
    { text: 'Analytics Hub', icon: <AnalyticsIcon />, path: '/instructor/analytics-hub', description: 'View detailed analytics' },
  ] : [];

  const isActivePath = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Profile dropdown menu items
  const profileMenuItems = [
    { text: 'Profile', icon: <AccountCircle />, action: () => navigate('/profile') },
    { text: 'Notifications', icon: <NotificationsIcon />, action: () => navigate('/settings/notifications') },
    { text: 'Settings', icon: <SettingsIcon />, action: () => navigate('/settings') },
    { text: 'Logout', icon: <ExitToAppIcon />, action: handleLogout },
  ];

  const renderMegaMenuItem = (item: any, onClose: () => void) => (
    <MenuItem
      key={item.path}
      component={Link}
      to={item.path}
      onClick={onClose}
      selected={isActivePath(item.path)}
      sx={{
        py: 2,
        px: 2.5,
        borderRadius: 3,
        mb: 0.75,
        border: '2px solid transparent',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          opacity: 0,
          transition: 'opacity 0.3s ease',
        },
        '&.Mui-selected': {
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white',
          border: '2px solid #90caf9',
          boxShadow: '0 8px 24px rgba(25, 118, 210, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
          transform: 'translateX(8px) scale(1.02)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
            boxShadow: '0 12px 32px rgba(25, 118, 210, 0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
          },
          '& .MuiTypography-caption': {
            color: 'rgba(255,255,255,0.95)',
          },
          '& .MuiListItemIcon-root': {
            color: 'white',
            transform: 'scale(1.1)',
          },
        },
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          transform: 'translateX(6px)',
          borderColor: alpha(theme.palette.primary.main, 0.3),
          boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
          '& .MuiListItemIcon-root': {
            transform: 'scale(1.1) translateX(4px)',
            color: 'primary.main',
          },
        },
      }}
    >
      <ListItemIcon sx={{ 
        color: isActivePath(item.path) ? 'white' : 'primary.main',
        minWidth: 48,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 1,
      }}>
        {item.icon}
      </ListItemIcon>
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Typography 
          variant="body1" 
          fontWeight={isActivePath(item.path) ? '700' : '600'}
          sx={{ 
            mb: 0.25,
            transition: 'all 0.3s ease',
          }}
        >
          {item.text}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            color: isActivePath(item.path) ? 'rgba(255,255,255,0.95)' : 'text.secondary',
            transition: 'color 0.3s ease',
            display: 'block',
            fontSize: '0.75rem',
          }}
        >
          {item.description}
        </Typography>
      </Box>
    </MenuItem>
  );

  const mobileMenu = (
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
      sx={{ display: { xs: 'block', md: 'none' } }}
    >
      <Box sx={{ width: 280 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              Mishin Learn
            </Typography>
          </Box>
          <IconButton onClick={() => setMobileMenuOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <List sx={{ px: 1, py: 2 }}>
          {/* Dashboard - Always visible */}
          <ListItem
            button
            component={Link}
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            selected={isActivePath('/dashboard')}
            sx={{
              borderRadius: 2,
              mb: 1,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'white',
                '& .MuiListItemIcon-root': { color: 'white' },
              },
            }}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>

          {/* Learning Section */}
          <ListSubheader sx={{ backgroundColor: 'transparent', fontWeight: 'bold', mt: 1 }}>
            LEARNING
          </ListSubheader>
          {learningItems.map((item) => (
            <ListItem
              button
              key={item.text}
              component={Link}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              selected={isActivePath(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} secondary={item.description} />
            </ListItem>
          ))}

          {/* Collaboration Section */}
          <ListSubheader sx={{ backgroundColor: 'transparent', fontWeight: 'bold', mt: 2 }}>
            COLLABORATION
          </ListSubheader>
          {collaborationItems.map((item) => (
            <ListItem
              button
              key={item.text}
              component={Link}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              selected={isActivePath(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} secondary={item.description} />
            </ListItem>
          ))}

          {/* Tools Section - Collapsible */}
          <ListItem
            button
            onClick={() => setToolsExpanded(!toolsExpanded)}
            sx={{ mt: 2, borderRadius: 2 }}
          >
            <ListItemText 
              primary="TOOLS" 
              primaryTypographyProps={{ fontWeight: 'bold', variant: 'caption' }}
            />
            {toolsExpanded ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          <Collapse in={toolsExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {toolsItems.map((item) => (
                <ListItem
                  button
                  key={item.text}
                  component={Link}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  selected={isActivePath(item.path)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    pl: 4,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '& .MuiListItemIcon-root': { color: 'white' },
                    },
                  }}
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
              <ListSubheader sx={{ backgroundColor: 'transparent', fontWeight: 'bold', mt: 2 }}>
                INSTRUCTOR
              </ListSubheader>
              {instructorItems.map((item) => (
                <ListItem
                  button
                  key={item.text}
                  component={Link}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  selected={isActivePath(item.path)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '& .MuiListItemIcon-root': { color: 'white' },
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} secondary={item.description} />
                </ListItem>
              ))}
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
      </Box>
    </Drawer>
  );

  return (
    <>
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
              textDecoration: 'none', 
              color: 'inherit',
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
              }}
            >
              Mishin Learn
            </Typography>
          </Box>

          {!isMobile && (
            <Box 
              sx={{ display: 'flex', ml: 4, gap: 1 }}
            >
              {/* Dashboard - Primary */}
              <Button
                color="inherit"
                component={Link}
                to="/dashboard"
                startIcon={<DashboardIcon />}
                onMouseEnter={() => {
                  // Close all menus when hovering dashboard
                  handleCloseAllMenus();
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: isActivePath('/dashboard') ? '700' : '500',
                  px: 2.5,
                  py: 1.2,
                  borderRadius: '12px 12px 0 0',
                  position: 'relative',
                  color: 'white',
                  background: isActivePath('/dashboard')
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)'
                    : 'transparent',
                  backdropFilter: isActivePath('/dashboard') ? 'blur(10px)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%) scaleX(0)',
                    width: '80%',
                    height: '3px',
                    background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)',
                    borderRadius: '3px 3px 0 0',
                    boxShadow: '0 0 10px rgba(255,215,0,0.5)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    ...(isActivePath('/dashboard') && {
                      transform: 'translateX(-50%) scaleX(1)',
                    }),
                  },
                  '&:hover': {
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.15) 100%)',
                    transform: 'translateY(-2px)',
                    '&::after': {
                      transform: 'translateX(-50%) scaleX(1)',
                    },
                  },
                }}
              >
                Dashboard
              </Button>

              {/* Learning Dropdown */}
              <Button
                color="inherit"
                aria-haspopup="true"
                endIcon={<ArrowDownIcon sx={{ 
                  transform: Boolean(learningMenuAnchor) ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }} />}
                onMouseEnter={(e) => handleMenuHover('learning', e.currentTarget)}
                sx={{
                    textTransform: 'none',
                    fontWeight: learningItems.some(item => isActivePath(item.path)) ? '700' : '500',
                    px: 2.5,
                    py: 1.2,
                    borderRadius: '12px 12px 0 0',
                    position: 'relative',
                    color: 'white',
                    background: learningItems.some(item => isActivePath(item.path))
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)'
                      : Boolean(learningMenuAnchor)
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)'
                      : 'transparent',
                    backdropFilter: (learningItems.some(item => isActivePath(item.path)) || Boolean(learningMenuAnchor)) ? 'blur(10px)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%) scaleX(0)',
                      width: '80%',
                      height: '3px',
                      background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                      borderRadius: '3px 3px 0 0',
                      boxShadow: '0 0 10px rgba(25,118,210,0.5)',
                      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      ...(learningItems.some(item => isActivePath(item.path)) && {
                        transform: 'translateX(-50%) scaleX(1)',
                      }),
                    },
                    '&:hover': {
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.15) 100%)',
                      transform: 'translateY(-2px)',
                      '&::after': {
                        transform: 'translateX(-50%) scaleX(1)',
                      },
                    },
                  }}
                >
                  Learning
                </Button>

              {/* Collaboration Dropdown */}
              <Button
                color="inherit"
                aria-haspopup="true"
                endIcon={<ArrowDownIcon sx={{ 
                  transform: Boolean(collaborationMenuAnchor) ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }} />}
                onMouseEnter={(e) => handleMenuHover('collaboration', e.currentTarget)}
                sx={{
                    textTransform: 'none',
                    fontWeight: collaborationItems.some(item => isActivePath(item.path)) ? '700' : '500',
                    px: 2.5,
                    py: 1.2,
                    borderRadius: '12px 12px 0 0',
                    position: 'relative',
                    color: 'white',
                    background: collaborationItems.some(item => isActivePath(item.path))
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)'
                      : Boolean(collaborationMenuAnchor)
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)'
                      : 'transparent',
                    backdropFilter: (collaborationItems.some(item => isActivePath(item.path)) || Boolean(collaborationMenuAnchor)) ? 'blur(10px)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%) scaleX(0)',
                      width: '80%',
                      height: '3px',
                      background: 'linear-gradient(90deg, #9c27b0 0%, #ba68c8 100%)',
                      borderRadius: '3px 3px 0 0',
                      boxShadow: '0 0 10px rgba(156,39,176,0.5)',
                      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      ...(collaborationItems.some(item => isActivePath(item.path)) && {
                        transform: 'translateX(-50%) scaleX(1)',
                      }),
                    },
                    '&:hover': {
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.15) 100%)',
                      transform: 'translateY(-2px)',
                      '&::after': {
                        transform: 'translateX(-50%) scaleX(1)',
                      },
                    },
                  }}
                >
                  Collaboration
                </Button>

              {/* Tools Dropdown */}
              <Button
                color="inherit"
                aria-haspopup="true"
                endIcon={<ArrowDownIcon sx={{ 
                  transform: Boolean(toolsMenuAnchor) ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                }} />}
                onMouseEnter={(e) => handleMenuHover('tools', e.currentTarget)}
                sx={{
                    textTransform: 'none',
                    fontWeight: toolsItems.some(item => isActivePath(item.path)) ? '700' : '500',
                    px: 2.5,
                    py: 1.2,
                    borderRadius: '12px 12px 0 0',
                    position: 'relative',
                    color: 'white',
                    background: toolsItems.some(item => isActivePath(item.path))
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)'
                      : Boolean(toolsMenuAnchor)
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)'
                      : 'transparent',
                    backdropFilter: (toolsItems.some(item => isActivePath(item.path)) || Boolean(toolsMenuAnchor)) ? 'blur(10px)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%) scaleX(0)',
                      width: '80%',
                      height: '3px',
                      background: 'linear-gradient(90deg, #ff9800 0%, #ffa726 100%)',
                      borderRadius: '3px 3px 0 0',
                      boxShadow: '0 0 10px rgba(255,152,0,0.5)',
                      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      ...(toolsItems.some(item => isActivePath(item.path)) && {
                        transform: 'translateX(-50%) scaleX(1)',
                      }),
                    },
                    '&:hover': {
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.15) 100%)',
                      transform: 'translateY(-2px)',
                      '&::after': {
                        transform: 'translateX(-50%) scaleX(1)',
                      },
                    },
                  }}
                >
                  Tools
                </Button>

              {/* Instructor Dropdown (if instructor) */}
              {user?.role === 'instructor' && (
                <Button
                  color="inherit"
                  aria-haspopup="true"
                  endIcon={<ArrowDownIcon sx={{ 
                    transform: Boolean(instructorMenuAnchor) ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                  }} />}
                  onMouseEnter={(e) => handleMenuHover('instructor', e.currentTarget)}
                  sx={{
                      textTransform: 'none',
                      fontWeight: instructorItems.some(item => isActivePath(item.path)) ? '700' : '500',
                      px: 2.5,
                      py: 1.2,
                      borderRadius: '12px 12px 0 0',
                      position: 'relative',
                      color: 'white',
                      background: instructorItems.some(item => isActivePath(item.path))
                        ? 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.15) 100%)'
                        : Boolean(instructorMenuAnchor)
                        ? 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)'
                        : 'transparent',
                      backdropFilter: (instructorItems.some(item => isActivePath(item.path)) || Boolean(instructorMenuAnchor)) ? 'blur(10px)' : 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%) scaleX(0)',
                        width: '80%',
                        height: '3px',
                        background: 'linear-gradient(90deg, #d32f2f 0%, #f44336 100%)',
                        borderRadius: '3px 3px 0 0',
                        boxShadow: '0 0 10px rgba(211,47,47,0.5)',
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        ...(instructorItems.some(item => isActivePath(item.path)) && {
                          transform: 'translateX(-50%) scaleX(1)',
                        }),
                      },
                      '&:hover': {
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.15) 100%)',
                        transform: 'translateY(-2px)',
                        '&::after': {
                          transform: 'translateX(-50%) scaleX(1)',
                        },
                      },
                    }}
                  >
                    Instructor
                  </Button>
              )}
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {isMobile ? (
            // Mobile: Expandable search
            searchExpanded ? (
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 300 }}>
                <Search sx={{ flex: 1 }}>
                  <SearchIconWrapper>
                    <SearchIcon />
                  </SearchIconWrapper>
                  <form onSubmit={handleSearch}>
                    <StyledInputBase
                      placeholder="Search..."
                      inputProps={{ 'aria-label': 'search' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </form>
                </Search>
                <IconButton 
                  color="inherit" 
                  onClick={() => {
                    setSearchExpanded(false);
                    setSearchQuery('');
                  }}
                  sx={{ ml: 1 }}
                >
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
            // Desktop: Always visible search
            <Search>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <form onSubmit={handleSearch}>
                <StyledInputBase
                  placeholder="Search courses, topics..."
                  inputProps={{ 'aria-label': 'search' }}
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
              aria-label="account of current user"
              aria-controls="primary-search-account-menu"
              aria-haspopup="true"
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
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
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
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        {profileMenuItems.map((item) => (
          <MenuItem key={item.text} onClick={item.action}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText>{item.text}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {mobileMenu}

      {/* Learning Mega Menu */}
      <Menu
        anchorEl={learningMenuAnchor}
        open={Boolean(learningMenuAnchor)}
        onClose={() => setLearningMenuAnchor(null)}
        MenuListProps={{
          onMouseEnter: cancelClose,
          onMouseLeave: handleCloseAllMenus,
        }}
        TransitionComponent={Zoom}
        transitionDuration={150}
        disableAutoFocusItem
        disableAutoFocus
        disableEnforceFocus
        slotProps={{
          paper: {
            'data-menu': 'learning',
            sx: {
              mt: 0,
              minWidth: 320,
              borderRadius: '0 12px 12px 12px',
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
              boxShadow: '0 12px 40px rgba(25, 118, 210, 0.15), 0 0 0 1px rgba(25, 118, 210, 0.08)',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 50%, #1976d2 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s infinite linear',
              },
              '@keyframes shimmer': {
                '0%': { backgroundPosition: '200% 0' },
                '100%': { backgroundPosition: '-200% 0' },
              },
            },
          } as any,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'stretch', minHeight: '200px' }}>
          {/* Category Color Bar */}
          <Box sx={{ 
            width: '6px', 
            background: 'linear-gradient(180deg, #1976d2 0%, #42a5f5 100%)',
            borderRadius: '0 0 0 12px',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '2px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 100%)',
              boxShadow: '0 0 10px rgba(25, 118, 210, 0.5)',
            },
          }}>
            {/* Active Item Position Indicator */}
            {learningItems.some(item => isActivePath(item.path)) && (
              <Box sx={{
                position: 'absolute',
                right: -3,
                top: `${learningItems.findIndex(item => isActivePath(item.path)) * 80 + 30}px`,
                width: 0,
                height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderLeft: '8px solid #1976d2',
                filter: 'drop-shadow(0 0 4px rgba(25, 118, 210, 0.6))',
                transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            )}
          </Box>
          <Box sx={{ p: 1.5, flex: 1 }}>
            {/* Category Badge */}
            {learningItems.some(item => isActivePath(item.path)) && (
              <Box sx={{
                mb: 1.5,
                px: 2,
                py: 0.75,
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                color: 'white',
                borderRadius: 2,
                fontSize: '0.75rem',
                fontWeight: 700,
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.85 },
                },
              }}>
                LEARNING • {learningItems.find(item => isActivePath(item.path))?.text.toUpperCase()}
              </Box>
            )}
            {learningItems.map((item, index) => (
            <Box
              key={item.path}
              sx={{
                animation: 'slideIn 0.3s ease-out',
                animationDelay: `${index * 0.05}s`,
                animationFillMode: 'both',
                '@keyframes slideIn': {
                  from: {
                    opacity: 0,
                    transform: 'translateX(-20px)',
                  },
                  to: {
                    opacity: 1,
                    transform: 'translateX(0)',
                  },
                },
              }}
            >
              {renderMegaMenuItem(item, () => setLearningMenuAnchor(null))}
            </Box>
          ))}
          </Box>
        </Box>
      </Menu>

      {/* Collaboration Mega Menu */}
      <Menu
        anchorEl={collaborationMenuAnchor}
        open={Boolean(collaborationMenuAnchor)}
        onClose={() => setCollaborationMenuAnchor(null)}
        MenuListProps={{
          onMouseEnter: cancelClose,
          onMouseLeave: handleCloseAllMenus,
        }}
        TransitionComponent={Zoom}
        transitionDuration={150}
        disableAutoFocusItem
        disableAutoFocus
        disableEnforceFocus
        slotProps={{
          paper: {
            'data-menu': 'collaboration',
            sx: {
              mt: 0,
              minWidth: 320,
              borderRadius: '0 12px 12px 12px',
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
              boxShadow: '0 12px 40px rgba(25, 118, 210, 0.15), 0 0 0 1px rgba(25, 118, 210, 0.08)',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 50%, #1976d2 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s infinite linear',
              },
            },
          } as any,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'stretch', minHeight: '200px' }}>
          {/* Category Color Bar */}
          <Box sx={{ 
            width: '6px', 
            background: 'linear-gradient(180deg, #9c27b0 0%, #ba68c8 100%)',
            borderRadius: '0 0 0 12px',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '2px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 100%)',
              boxShadow: '0 0 10px rgba(156, 39, 176, 0.5)',
            },
          }}>
            {/* Active Item Position Indicator */}
            {collaborationItems.some(item => isActivePath(item.path)) && (
              <Box sx={{
                position: 'absolute',
                right: -3,
                top: `${collaborationItems.findIndex(item => isActivePath(item.path)) * 80 + 30}px`,
                width: 0,
                height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderLeft: '8px solid #9c27b0',
                filter: 'drop-shadow(0 0 4px rgba(156, 39, 176, 0.6))',
                transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            )}
          </Box>
          <Box sx={{ p: 1.5, flex: 1 }}>
            {/* Category Badge */}
            {collaborationItems.some(item => isActivePath(item.path)) && (
              <Box sx={{
                mb: 1.5,
                px: 2,
                py: 0.75,
                background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                color: 'white',
                borderRadius: 2,
                fontSize: '0.75rem',
                fontWeight: 700,
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(156, 39, 176, 0.3)',
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.85 },
                },
              }}>
                COLLABORATION • {collaborationItems.find(item => isActivePath(item.path))?.text.toUpperCase()}
              </Box>
            )}
            {collaborationItems.map((item, index) => (
            <Box
              key={item.path}
              sx={{
                animation: 'slideIn 0.3s ease-out',
                animationDelay: `${index * 0.05}s`,
                animationFillMode: 'both',
              }}
            >
              {renderMegaMenuItem(item, () => setCollaborationMenuAnchor(null))}
            </Box>
          ))}
          </Box>
        </Box>
      </Menu>

      {/* Tools Mega Menu */}
      <Menu
        anchorEl={toolsMenuAnchor}
        open={Boolean(toolsMenuAnchor)}
        onClose={() => setToolsMenuAnchor(null)}
        MenuListProps={{
          onMouseEnter: cancelClose,
          onMouseLeave: handleCloseAllMenus,
        }}
        TransitionComponent={Zoom}
        transitionDuration={150}
        disableAutoFocusItem
        disableAutoFocus
        disableEnforceFocus
        slotProps={{
          paper: {
            'data-menu': 'tools',
            sx: {
              mt: 0,
              minWidth: 320,
              borderRadius: '0 12px 12px 12px',
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
              boxShadow: '0 12px 40px rgba(25, 118, 210, 0.15), 0 0 0 1px rgba(25, 118, 210, 0.08)',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 50%, #1976d2 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s infinite linear',
              },
            },
          } as any,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'stretch', minHeight: '200px' }}>
          {/* Category Color Bar with Active Indicator */}
          <Box sx={{ 
            width: '6px', 
            background: 'linear-gradient(180deg, #ff9800 0%, #ffa726 100%)',
            borderRadius: '0 0 0 12px',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '2px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 100%)',
              boxShadow: '0 0 10px rgba(255, 152, 0, 0.5)',
            },
          }}>
            {/* Active Item Position Indicator */}
            {toolsItems.some(item => isActivePath(item.path)) && (
              <Box sx={{
                position: 'absolute',
                right: -3,
                top: `${toolsItems.findIndex(item => isActivePath(item.path)) * 80 + 30}px`,
                width: 0,
                height: 0,
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                borderLeft: '8px solid #ff9800',
                filter: 'drop-shadow(0 0 4px rgba(255, 152, 0, 0.6))',
                transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            )}
          </Box>
          <Box sx={{ p: 1.5, flex: 1 }}>
            {/* Category Badge */}
            {toolsItems.some(item => isActivePath(item.path)) && (
              <Box sx={{
                mb: 1.5,
                px: 2,
                py: 0.75,
                background: 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)',
                color: 'white',
                borderRadius: 2,
                fontSize: '0.75rem',
                fontWeight: 700,
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)',
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.85 },
                },
              }}>
                TOOLS • {toolsItems.find(item => isActivePath(item.path))?.text.toUpperCase()}
              </Box>
            )}
            {toolsItems.map((item, index) => (
              <Box
                key={item.path}
                sx={{
                  animation: 'slideIn 0.3s ease-out',
                  animationDelay: `${index * 0.05}s`,
                  animationFillMode: 'both',
                }}
              >
                {renderMegaMenuItem(item, () => setToolsMenuAnchor(null))}
              </Box>
            ))}
          </Box>
        </Box>
      </Menu>

      {/* Instructor Mega Menu */}
      {user?.role === 'instructor' && (
        <Menu
          anchorEl={instructorMenuAnchor}
          open={Boolean(instructorMenuAnchor)}
          onClose={() => setInstructorMenuAnchor(null)}
          MenuListProps={{
            onMouseEnter: cancelClose,
            onMouseLeave: handleCloseAllMenus,
          }}
          TransitionComponent={Zoom}
          transitionDuration={150}
          disableAutoFocusItem
          disableAutoFocus
          disableEnforceFocus
          slotProps={{
            paper: {
              'data-menu': 'instructor',
              sx: {
                mt: 0,
                minWidth: 320,
                borderRadius: '0 12px 12px 12px',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                boxShadow: '0 12px 40px rgba(25, 118, 210, 0.15), 0 0 0 1px rgba(25, 118, 210, 0.08)',
                backdropFilter: 'blur(20px)',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 50%, #1976d2 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 3s infinite linear',
                },
              },
            } as any,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'stretch', minHeight: '200px' }}>
            {/* Category Color Bar with Active Indicator */}
            <Box sx={{ 
              width: '6px', 
              background: 'linear-gradient(180deg, #d32f2f 0%, #f44336 100%)',
              borderRadius: '0 0 0 12px',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 100%)',
                boxShadow: '0 0 10px rgba(211, 47, 47, 0.5)',
              },
            }}>
              {/* Active Item Position Indicator */}
              {instructorItems.some(item => isActivePath(item.path)) && (
                <Box sx={{
                  position: 'absolute',
                  right: -3,
                  top: `${instructorItems.findIndex(item => isActivePath(item.path)) * 80 + 30}px`,
                  width: 0,
                  height: 0,
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  borderLeft: '8px solid #d32f2f',
                  filter: 'drop-shadow(0 0 4px rgba(211, 47, 47, 0.6))',
                  transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              )}
            </Box>
            <Box sx={{ p: 1.5, flex: 1 }}>
              {/* Category Badge */}
              {instructorItems.some(item => isActivePath(item.path)) && (
                <Box sx={{
                  mb: 1.5,
                  px: 2,
                  py: 0.75,
                  background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
                  color: 'white',
                  borderRadius: 2,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(211, 47, 47, 0.3)',
                  animation: 'pulse 2s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.85 },
                  },
                }}>
                  INSTRUCTOR • {instructorItems.find(item => isActivePath(item.path))?.text.toUpperCase()}
                </Box>
              )}
              {instructorItems.map((item, index) => (
                <Box
                  key={item.path}
                  sx={{
                    animation: 'slideIn 0.3s ease-out',
                    animationDelay: `${index * 0.05}s`,
                    animationFillMode: 'both',
                  }}
                >
                  {renderMegaMenuItem(item, () => setInstructorMenuAnchor(null))}
                </Box>
              ))}
            </Box>
          </Box>
        </Menu>
      )}
    </>
  );
};