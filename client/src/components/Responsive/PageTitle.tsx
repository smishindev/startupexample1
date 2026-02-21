/**
 * PageTitle — Responsive page heading
 *
 * Renders a Typography element whose font-size scales down on small screens.
 * Supports an optional `subtitle` and `icon`.
 *
 * Replaces the repeated pattern:
 *   <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
 *     Page Title
 *   </Typography>
 *
 * Usage:
 *   <PageTitle>Dashboard</PageTitle>
 *   <PageTitle subtitle="Manage your courses" icon={<SchoolIcon />}>My Courses</PageTitle>
 */

import React from 'react';
import {
  Typography,
  Box,
  type TypographyProps,
  type SxProps,
  type Theme,
} from '@mui/material';

// Responsive font-size maps keyed by semantic size
const FONT_SIZE_MAP = {
  /** h3-equivalent — largest page headings */
  lg: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
  /** h4-equivalent — standard page title (default) */
  md: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
  /** h5-equivalent — section headings */
  sm: { xs: '1.1rem', sm: '1.25rem', md: '1.375rem' },
} as const;

export interface PageTitleProps extends Omit<TypographyProps, 'variant' | 'sx'> {
  /** Responsive size preset: sm | md (default) | lg */
  size?: 'sm' | 'md' | 'lg';
  /** Optional subtitle rendered below the title */
  subtitle?: React.ReactNode;
  /** Optional icon rendered before the title */
  icon?: React.ReactNode;
  /** Override the default sx (merged on top of base styles) */
  sx?: SxProps<Theme>;
}

export const PageTitle: React.FC<PageTitleProps> = ({
  children,
  size = 'md',
  subtitle,
  icon,
  sx = {},
  ...rest
}) => {
  const titleNode = (
    <Typography
      variant="h4"
      component="h1"
      sx={[
        {
          fontWeight: 'bold',
          color: 'text.primary',
          fontSize: FONT_SIZE_MAP[size],
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {children}
    </Typography>
  );

  // Simple mode — no icon or subtitle
  if (!icon && !subtitle) return titleNode;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {icon && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: { xs: 40, sm: 48 },
            height: { xs: 40, sm: 48 },
            borderRadius: 2,
            backgroundColor: 'primary.50',
            color: 'primary.main',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      )}
      <Box>
        {titleNode}
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PageTitle;
