/**
 * Reusable SX Fragments (Design Tokens)
 *
 * Pre-composed `sx` objects for common visual patterns.
 * Spread them into any `sx` prop to avoid copy-pasting raw CSS values:
 *
 *   import { cardSx, elevatedPaperSx } from '../../theme/tokens';
 *   <Paper sx={{ ...cardSx, p: 3 }} />
 *
 * RULES:
 *  1. Never put a raw hex colour here — reference the theme callback or
 *     palette token string (e.g. `'primary.100'`).
 *  2. Never put a raw `borderRadius` number — use `` (t) => `${t.custom.radii.*}px` ``
 *     (strings bypass MUI's `borderRadius × shape.borderRadius` multiplier).
 *  3. Never put a raw `boxShadow` string — use `(t) => t.custom.shadows.*`.
 *  4. Keep each token focused on one visual concern (e.g. elevation, or
 *     truncation, not both).
 *
 * These are plain objects, NOT React components. They carry no runtime cost
 * beyond object spread.
 */

import type { SxProps, Theme } from '@mui/material/styles';

// ─── Cards & Surfaces ─────────────────────────────────────────────────

/** Standard card surface — rest shadow + hover lift */
export const cardSx: SxProps<Theme> = {
  borderRadius: (t) => `${t.custom.radii.card}px`,
  boxShadow: (t) => t.custom.shadows.card,
  transition: 'box-shadow 0.2s ease-in-out',
  '&:hover': {
    boxShadow: (t: Theme) => t.custom.shadows.cardHover,
  },
};

/** Elevated panel (dialogs, popovers, modals) */
export const elevatedPaperSx: SxProps<Theme> = {
  borderRadius: (t) => `${t.custom.radii.card}px`,
  boxShadow: (t) => t.custom.shadows.dialog,
};

/** Flat surface — no shadow (e.g. inline cards, sidebar panels) */
export const flatSurfaceSx: SxProps<Theme> = {
  borderRadius: (t) => `${t.custom.radii.card}px`,
  boxShadow: 'none',
  border: '1px solid',
  borderColor: 'divider',
};

// ─── Status Indicator Dots ────────────────────────────────────────────

/** Coloured status dot base — set `bgcolor` per use */
export const statusDotSx: SxProps<Theme> = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  display: 'inline-block',
  flexShrink: 0,
};

// ─── Text ─────────────────────────────────────────────────────────────

/** Single-line text truncation with ellipsis */
export const truncateSx: SxProps<Theme> = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** Two-line clamp (WebKit) */
export const lineClamp2Sx: SxProps<Theme> = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

/** Three-line clamp (WebKit) */
export const lineClamp3Sx: SxProps<Theme> = {
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

// ─── Layout ───────────────────────────────────────────────────────────

/** Centred flex wrapper (horizontal + vertical) */
export const centeredFlexSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/** Flex row with items centred vertically, spaced between */
export const spacedRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

/** Flex row with items centred vertically + gap */
export const inlineRowSx: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
};

// ─── Interactive ──────────────────────────────────────────────────────

/** Clickable surface — pointer cursor + subtle hover tint */
export const clickableSx: SxProps<Theme> = {
  cursor: 'pointer',
  transition: 'background-color 0.15s',
  '&:hover': {
    bgcolor: 'action.hover',
  },
};

/** Primary-tinted focus ring (buttons, interactive cards) */
export const focusRingSx: SxProps<Theme> = {
  '&:focus-visible': {
    outline: 'none',
    boxShadow: (t: Theme) => t.custom.shadows.focusPrimary,
  },
};

// ─── Images ───────────────────────────────────────────────────────────

/** Responsive image with aspect ratio (16:9 default) */
export const responsiveImageSx: SxProps<Theme> = {
  width: '100%',
  height: 'auto',
  maxWidth: '100%',
  borderRadius: (t) => `${t.custom.radii.md}px`,
  objectFit: 'cover',
};

/** Circular avatar / thumbnail */
export const avatarSx: SxProps<Theme> = {
  borderRadius: '50%',
  objectFit: 'cover',
};

// ─── Badges & Chips ───────────────────────────────────────────────────

/** Small rounded badge (counts, labels) */
export const badgeSx: SxProps<Theme> = {
  borderRadius: (t) => `${t.custom.radii.chip}px`,
  px: 1.5,
  py: 0.25,
  fontSize: '0.75rem',
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
};

// ─── Scrollable ───────────────────────────────────────────────────────

/** Horizontal scroll container with hidden scrollbar */
export const scrollRowSx: SxProps<Theme> = {
  display: 'flex',
  overflowX: 'auto',
  scrollbarWidth: 'none', // Firefox
  '&::-webkit-scrollbar': { display: 'none' }, // Chrome/Safari
  gap: 2,
};

// ─── Misc ─────────────────────────────────────────────────────────────

/** Glass-morphism overlay */
export const glassSx: SxProps<Theme> = {
  backdropFilter: 'blur(8px)',
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
};

/** Visually hidden but accessible to screen readers */
export const srOnlySx: SxProps<Theme> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
};
