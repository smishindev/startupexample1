/**
 * PageHeader Component
 * Displays current page title and breadcrumb navigation
 */

import React from 'react';
import { Box, Breadcrumbs, Link, Typography, useTheme, alpha } from '@mui/material';
import { NavigateNext as NavigateNextIcon, Home as HomeIcon } from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  breadcrumbs,
  actions,
}) => {
  const theme = useTheme();
  const location = useLocation();

  // Auto-generate breadcrumbs if not provided
  const autoBreadcrumbs = React.useMemo(() => {
    if (breadcrumbs) return breadcrumbs;

    const paths = location.pathname.split('/').filter(Boolean);
    const generated: Array<{ label: string; path?: string }> = [{ label: 'Home', path: '/dashboard' }];

    let currentPath = '';
    paths.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === paths.length - 1;
      
      // Format segment name
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      if (isLast) {
        generated.push({ label });
      } else {
        generated.push({ label, path: currentPath });
      }
    });

    return generated;
  }, [location.pathname, breadcrumbs]);

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 1.5, sm: 2.5 },
        position: 'sticky',
        top: { xs: 56, sm: 64 }, // MUI AppBar height: 56 on mobile, 64 on desktop
        zIndex: theme.zIndex.appBar - 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
        sx={{
          mb: 1.5,
          '& .MuiBreadcrumbs-ol': {
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            overflow: 'auto',
          },
          '& .MuiBreadcrumbs-li': {
            whiteSpace: 'nowrap',
          },
        }}
      >
        {autoBreadcrumbs.map((crumb, index) => {
          const isLast = index === autoBreadcrumbs.length - 1;
          
          if (isLast || !crumb.path) {
            return (
              <Typography
                key={index}
                color="text.primary"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontWeight: isLast ? 'bold' : 'regular',
                  fontSize: '0.875rem',
                }}
              >
                {index === 0 && <HomeIcon sx={{ fontSize: 18 }} />}
                {crumb.label}
              </Typography>
            );
          }

          return (
            <Link
              key={index}
              component={RouterLink}
              to={crumb.path}
              underline="hover"
              color="text.secondary"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.875rem',
                transition: 'color 0.2s',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              {index === 0 && <HomeIcon sx={{ fontSize: 18 }} />}
              {crumb.label}
            </Link>
          );
        })}
      </Breadcrumbs>

      {/* Title and Actions */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              }}
            >
              {icon}
            </Box>
          )}
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 'bold',
                color: 'text.primary',
                fontSize: { xs: '1.5rem', sm: '2rem' },
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {actions && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PageHeader;
