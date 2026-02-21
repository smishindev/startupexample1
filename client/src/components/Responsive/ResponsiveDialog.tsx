/**
 * ResponsiveDialog — Dialog that auto-fullScreens on mobile
 *
 * Replaces the repeated pattern:
 *   const isMobile = useMediaQuery(theme.breakpoints.down('md'));
 *   <Dialog fullScreen={isMobile} open={open} onClose={onClose}>
 *
 * Props pass through to MUI Dialog. `fullScreen` prop is automatically set
 * on mobile but can be overridden.
 *
 * Usage:
 *   <ResponsiveDialog open={open} onClose={onClose}>
 *     <DialogTitle>…</DialogTitle>
 *     <DialogContent>…</DialogContent>
 *   </ResponsiveDialog>
 */

import React from 'react';
import {
  Dialog,
  type DialogProps,
  useTheme,
  useMediaQuery,
} from '@mui/material';

export interface ResponsiveDialogProps extends DialogProps {
  /**
   * Breakpoint below which the dialog becomes fullScreen.
   * @default 'md'
   */
  fullScreenBelow?: 'sm' | 'md' | 'lg';
}

export const ResponsiveDialog: React.FC<ResponsiveDialogProps> = ({
  fullScreenBelow = 'md',
  fullScreen,
  children,
  ...rest
}) => {
  const theme = useTheme();
  const autoFullScreen = useMediaQuery(theme.breakpoints.down(fullScreenBelow));

  return (
    <Dialog fullScreen={fullScreen ?? autoFullScreen} {...rest}>
      {children}
    </Dialog>
  );
};

export default ResponsiveDialog;
