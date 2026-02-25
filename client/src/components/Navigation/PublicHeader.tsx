/**
 * PublicHeader Component
 * Guest-appropriate navigation header for unauthenticated users.
 * Used on public pages: Landing, Courses catalog, Course detail, Legal pages.
 * Consistent with project brand (Mishin Learn) and existing design system.
 */

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Container,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  Explore as ExploreIcon,
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { SearchAutocomplete } from '../Search/SearchAutocomplete';

interface PublicHeaderProps {
  /** Hide the search bar (e.g., on LandingPage where hero has its own search) */
  hideSearch?: boolean;
  /** Make header transparent (for hero overlay on LandingPage) */
  transparent?: boolean;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({ hideSearch = false, transparent = false }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <AppBar
        position="sticky"
        elevation={transparent ? 0 : 1}
        sx={{
          backgroundColor: transparent
            ? 'rgba(255, 255, 255, 0.95)'
            : 'background.paper',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
        }}
        data-testid="public-header"
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              minHeight: { xs: 56, md: 64 },
              gap: { xs: 1, md: 2 },
            }}
          >
            {/* Logo */}
            <Typography
              component={Link}
              to="/"
              variant="h6"
              fontWeight="bold"
              sx={{
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mr: { xs: 1, md: 3 },
                flexShrink: 0,
                fontSize: { xs: '1.1rem', md: '1.25rem' },
              }}
              data-testid="public-header-logo"
            >
              Mishin Learn
            </Typography>

            {/* Browse Courses Link — desktop only */}
            {!isMobile && (
              <Button
                component={Link}
                to="/courses"
                color="inherit"
                startIcon={<ExploreIcon />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                  flexShrink: 0,
                  mr: 1,
                }}
                data-testid="public-header-browse-courses"
              >
                Browse Courses
              </Button>
            )}

            {/* Search Bar with live autocomplete — desktop/tablet only */}
            {!hideSearch && !isSmall && (
              <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', maxWidth: 480 }}>
                <SearchAutocomplete
                  variant="header"
                  placeholder="What do you want to learn?"
                  testIdPrefix="public-header-search"
                />
              </Box>
            )}

            {/* Spacer */}
            <Box sx={{ flex: 1 }} />

            {/* Desktop Auth Buttons */}
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/login')}
                  sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 500,
                    borderColor: 'divider',
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                    },
                  }}
                  data-testid="public-header-signin-button"
                >
                  Sign In
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/register')}
                  sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                  data-testid="public-header-getstarted-button"
                >
                  Get Started
                </Button>
              </Box>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                onClick={() => setMobileMenuOpen(true)}
                color="inherit"
                data-testid="public-header-mobile-menu"
              >
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Mishin Learn
          </Typography>
          <IconButton onClick={() => setMobileMenuOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Mobile Search with autocomplete */}
        {!hideSearch && (
          <Box sx={{ px: 2, pb: 2 }}>
            <SearchAutocomplete
              variant="header"
              placeholder="Search courses..."
              testIdPrefix="public-header-mobile-search"
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </Box>
        )}

        <Divider />

        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => { navigate('/courses'); setMobileMenuOpen(false); }}
            >
              <ListItemIcon><ExploreIcon /></ListItemIcon>
              <ListItemText primary="Browse Courses" />
            </ListItemButton>
          </ListItem>
        </List>

        <Divider />

        <List>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
            >
              <ListItemIcon><LoginIcon /></ListItemIcon>
              <ListItemText primary="Sign In" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
            >
              <ListItemIcon><PersonAddIcon /></ListItemIcon>
              <ListItemText primary="Get Started" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
};

export default PublicHeader;
