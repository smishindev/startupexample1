/**
 * PublicFooter Component
 * Reusable footer for public (unauthenticated) pages.
 * Extracted from LandingPage pattern for consistency across all public routes.
 */

import React from 'react';
import {
  Box, 
  Container,
  Typography,
  Grid,
  Stack,
  Link as MuiLink,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const categoryLinks = [
  { label: 'Programming', path: '/courses?category=programming' },
  { label: 'Data Science', path: '/courses?category=data_science' },
  { label: 'Design', path: '/courses?category=design' },
  { label: 'Business', path: '/courses?category=business' },
  { label: 'Marketing', path: '/courses?category=marketing' },
  { label: 'Language', path: '/courses?category=language' },
  { label: 'Mathematics', path: '/courses?category=mathematics' },
  { label: 'Science', path: '/courses?category=science' },
  { label: 'Arts', path: '/courses?category=arts' },
];

const legalLinks = [
  { label: 'Terms of Service', path: '/terms' },
  { label: 'Privacy Policy', path: '/privacy' },
  { label: 'Refund Policy', path: '/refund-policy' },
];

export const PublicFooter: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: '#1a1d29',
        color: 'rgba(255, 255, 255, 0.85)',
        pt: { xs: 5, md: 6 },
        pb: { xs: 3, md: 4 },
      }}
      data-testid="public-footer"
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} sx={{ mb: 4 }}>
          {/* Brand Column */}
          <Grid item xs={12} md={4}>
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1.5,
              }}
            >
              Mishin Learn
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 280 }}>
              AI-powered learning platform with adaptive tutoring, real-time collaboration, and personalized course recommendations.
            </Typography>
          </Grid>

          {/* Browse Categories */}
          <Grid item xs={6} md={4}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Browse by Category
            </Typography>
            <Stack spacing={0.8}>
              {categoryLinks.map((link) => (
                <MuiLink
                  key={link.path}
                  component={RouterLink}
                  to={link.path}
                  variant="body2"
                  sx={{
                    color: 'rgba(255,255,255,0.6)',
                    textDecoration: 'none',
                    '&:hover': { color: '#6366f1', textDecoration: 'none' },
                    transition: 'color 0.2s',
                  }}
                >
                  {link.label}
                </MuiLink>
              ))}
              <MuiLink
                component={RouterLink}
                to="/courses"
                variant="body2"
                sx={{
                  color: '#6366f1',
                  textDecoration: 'none',
                  fontWeight: 500,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                View All Courses →
              </MuiLink>
            </Stack>
          </Grid>

          {/* Legal & Links */}
          <Grid item xs={6} md={4}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Legal
            </Typography>
            <Stack spacing={0.8}>
              {legalLinks.map((link) => (
                <MuiLink
                  key={link.path}
                  component={RouterLink}
                  to={link.path}
                  variant="body2"
                  sx={{
                    color: 'rgba(255,255,255,0.6)',
                    textDecoration: 'none',
                    '&:hover': { color: '#6366f1', textDecoration: 'none' },
                    transition: 'color 0.2s',
                  }}
                >
                  {link.label}
                </MuiLink>
              ))}
            </Stack>
          </Grid>
        </Grid>

        {/* Bottom Bar */}
        <Box
          sx={{
            pt: 3,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            © {new Date().getFullYear()} Mishin Learn. All rights reserved.
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            Built with ❤️ for learners everywhere
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default PublicFooter;
