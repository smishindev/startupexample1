/**
 * Responsive Component Library — Barrel Export
 *
 * Reusable, theme-aware responsive wrappers that encapsulate the platform's
 * mobile-optimization patterns. Import from here in every page:
 *
 *   import { PageContainer, PageTitle, useResponsive } from '@/components/Responsive';
 *
 * Philosophy:
 *   • All structural — no colors or visual styling (that's the theme's job)
 *   • All values derived from the active MUI theme (breakpoints, spacing)
 *   • Every wrapper accepts `sx` for one-off overrides
 *   • Layout constants live in `constants.ts` — single source of truth
 */

// ─── Hooks ────────────────────────────────────────────────────────────
export { useResponsive, type ResponsiveFlags } from './useResponsive';

// ─── Layout Wrappers ──────────────────────────────────────────────────
export { PageContainer, type PageContainerProps } from './PageContainer';
export { ResponsivePaper, type ResponsivePaperProps } from './ResponsivePaper';
export { ResponsiveDialog, type ResponsiveDialogProps } from './ResponsiveDialog';
export { ResponsiveStack, type ResponsiveStackProps } from './ResponsiveStack';

// ─── Typography ───────────────────────────────────────────────────────
export { PageTitle, type PageTitleProps } from './PageTitle';

// ─── Constants ────────────────────────────────────────────────────────
export {
  HEADER_HEIGHT_MOBILE,
  HEADER_HEIGHT_DESKTOP,
  BOTTOM_NAV_HEIGHT,
  BOTTOM_NAV_PADDING,
  PAGE_PADDING_X,
  PAGE_MARGIN_Y,
  SIDEBAR_WIDTH,
  MOBILE_DRAWER_WIDTH_PERCENT,
  MOBILE_DRAWER_MAX_WIDTH,
} from './constants';
