/**
 * ResponsiveStack — Stack that switches direction at a breakpoint
 *
 * Replaces the repeated pattern:
 *   <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
 *
 * Props pass through to MUI Stack.
 *
 * Usage:
 *   <ResponsiveStack>                          // column on mobile, row on sm+
 *     <Button>Save</Button>
 *     <Button>Cancel</Button>
 *   </ResponsiveStack>
 *
 *   <ResponsiveStack flipAt="md" spacing={2}>  // column on mobile, row on md+
 *     …
 *   </ResponsiveStack>
 */

import React from 'react';
import { Stack, type StackProps, type SxProps, type Theme } from '@mui/material';

export interface ResponsiveStackProps extends Omit<StackProps, 'direction' | 'sx'> {
  /**
   * Breakpoint at which the stack flips from column → row.
   * @default 'sm'
   */
  flipAt?: 'sm' | 'md' | 'lg';
  /** Override the default sx (merged on top of base styles) */
  sx?: SxProps<Theme>;
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  flipAt = 'sm',
  spacing = 1,
  children,
  sx = {},
  ...rest
}) => (
  <Stack
    direction={{ xs: 'column', [flipAt]: 'row' }}
    spacing={spacing}
    sx={[
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
    {...rest}
  >
    {children}
  </Stack>
);

export default ResponsiveStack;
