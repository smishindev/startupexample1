/**
 * ResponsivePaper — Paper with responsive padding
 *
 * Replaces the repeated pattern:
 *   <Paper sx={{ p: { xs: 2, sm: 3 } }}>
 *
 * Props pass through to MUI Paper.
 *
 * Usage:
 *   <ResponsivePaper>…content…</ResponsivePaper>
 *   <ResponsivePaper padSize="lg" elevation={0}>…</ResponsivePaper>
 */

import React from 'react';
import { Paper, type PaperProps, type SxProps, type Theme } from '@mui/material';

const PAD_MAP = {
  sm: { xs: 1.5, sm: 2 },
  md: { xs: 2, sm: 3 },
  lg: { xs: 2, sm: 3, md: 4 },
} as const;

export interface ResponsivePaperProps extends Omit<PaperProps, 'sx'> {
  /** Responsive padding preset: sm | md (default) | lg */
  padSize?: 'sm' | 'md' | 'lg';
  /** Override the default sx (merged on top of base styles) */
  sx?: SxProps<Theme>;
}

export const ResponsivePaper: React.FC<ResponsivePaperProps> = ({
  children,
  padSize = 'md',
  sx = {},
  ...rest
}) => (
  <Paper
    sx={[
      { p: PAD_MAP[padSize] },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
    {...rest}
  >
    {children}
  </Paper>
);

export default ResponsivePaper;
