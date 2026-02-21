/**
 * PageContainer — Responsive page-level wrapper
 *
 * Replaces the repeated pattern:
 *   <Container maxWidth="xl" sx={{ mt: 4, mb: 4, px: { xs: 2, sm: 3, md: 4 }, pb: { xs: 10, md: 0 } }}>
 *
 * Automatically adds:
 *   • Responsive horizontal padding (theme-aware)
 *   • Bottom padding on mobile for MobileBottomNav clearance
 *   • Consistent vertical margin
 *
 * Props pass through to MUI Container, so `maxWidth`, `sx`, etc. all work.
 *
 * Usage:
 *   <PageContainer>
 *     <PageTitle>My Page</PageTitle>
 *     …content…
 *   </PageContainer>
 *
 *   <PageContainer maxWidth="md" disableBottomPad>
 *     …narrow content without bottom pad…
 *   </PageContainer>
 */

import React from 'react';
import { Container, type ContainerProps, type SxProps, type Theme } from '@mui/material';
import {
  PAGE_PADDING_X,
  PAGE_MARGIN_Y,
  BOTTOM_NAV_PADDING,
} from './constants';

export interface PageContainerProps extends Omit<ContainerProps, 'sx'> {
  /** Override the default sx (merged on top of base styles) */
  sx?: SxProps<Theme>;
  /**
   * If true, omit the bottom padding that accounts for MobileBottomNav.
   * Use this for public/guest pages that don't render the bottom nav.
   * @default false
   */
  disableBottomPad?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'xl',
  disableBottomPad = false,
  sx = {},
  ...rest
}) => (
  <Container
    maxWidth={maxWidth}
    sx={[
      {
        mt: PAGE_MARGIN_Y,
        mb: PAGE_MARGIN_Y,
        px: PAGE_PADDING_X,
        ...(disableBottomPad
          ? {}
          : { pb: { xs: BOTTOM_NAV_PADDING, md: 0 } }),
      },
      // Merge consumer sx (supports array or object form)
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
    {...rest}
  >
    {children}
  </Container>
);

export default PageContainer;
