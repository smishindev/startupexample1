/**
 * Responsive Layout Constants
 *
 * Single source of truth for layout dimensions used by responsive wrappers.
 * All values in MUI spacing units (1 unit = 8px) unless noted otherwise.
 *
 * If per-theme layout dimensions are needed in the future, move these into
 * `theme.custom.layout` and read them via `useTheme()` instead.
 */

// ─── Header ───────────────────────────────────────────────────────────
/** AppBar height on xs–sm screens (pixels) */
export const HEADER_HEIGHT_MOBILE = 56;
/** AppBar height on md+ screens (pixels) */
export const HEADER_HEIGHT_DESKTOP = 64;

// ─── Mobile Bottom Navigation ─────────────────────────────────────────
/** MobileBottomNav bar height (pixels) */
export const BOTTOM_NAV_HEIGHT = 64;
/**
 * Bottom padding (MUI spacing units) to add on mobile so content is not
 * hidden behind MobileBottomNav.  64px bar ≈ 8 units + 2 units safety.
 */
export const BOTTOM_NAV_PADDING = 10;

// ─── Page Container ───────────────────────────────────────────────────
/** Default horizontal padding per breakpoint (MUI spacing units) */
export const PAGE_PADDING_X = { xs: 2, sm: 3, md: 4 } as const;
/** Default vertical margin (MUI spacing units) */
export const PAGE_MARGIN_Y = 4;

// ─── Sidebar / Drawer ────────────────────────────────────────────────
/** Permanent sidebar width on desktop (pixels) */
export const SIDEBAR_WIDTH = 280;
/** MobileNavDrawer width as percentage of viewport */
export const MOBILE_DRAWER_WIDTH_PERCENT = '85%';
/** MobileNavDrawer max width (pixels) */
export const MOBILE_DRAWER_MAX_WIDTH = 320;
