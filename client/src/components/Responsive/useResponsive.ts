/**
 * useResponsive — Responsive breakpoint hooks
 *
 * Thin wrappers around MUI's `useMediaQuery` that read from the active theme.
 * When breakpoint values change (e.g. a new theme), every consumer updates
 * automatically — no hardcoded pixel values.
 *
 * Usage:
 *   const { isMobile, isTablet, isDesktop } = useResponsive();
 */

import { useTheme, useMediaQuery, type Theme } from '@mui/material';

export interface ResponsiveFlags {
  /** < md  (phones) */
  isMobile: boolean;
  /** >= md && < lg  (tablets) */
  isTablet: boolean;
  /** >= lg  (desktops) */
  isDesktop: boolean;
  /** < sm  (very small phones, e.g. iPhone SE) */
  isSmall: boolean;
  /** The current MUI theme */
  theme: Theme;
}

export function useResponsive(): ResponsiveFlags {
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return { isMobile, isTablet, isDesktop, isSmall, theme };
}

export default useResponsive;
