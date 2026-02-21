import { createTheme } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';

// ─── Mishin Learn Brand Colors ────────────────────────────────────────
// Single source of truth — every hex value used anywhere in the app MUST
// originate from this palette (or from MUI's built-in palette tokens).
// When you need a colour, add it here first, then reference via the theme.
const mishinColors = {
  primary: {
    50: '#f0f4ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // Main brand color
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
};

// ─── Custom theme type extensions ─────────────────────────────────────
// Access via `theme.custom.*` in sx callbacks: `sx={{ color: (t) => t.custom.colors.gold }}`
declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      /** Named colour tokens for values NOT in the MUI palette */
      colors: {
        /** Star-rating gold (#ffd700) */
        gold: string;
        /** Online-status green (#44b700) */
        onlineGreen: string;
        /** Neutral grey for disabled / muted text (#9e9e9e) */
        muted: string;
        /** Slightly darker muted (#666) */
        mutedDark: string;
        /** Light grey border / divider (#e0e0e0) */
        border: string;
        /** Surface tint for cards when hovered */
        surfaceHover: string;
        /** Dark overlay (hero sections, etc.) */
        overlay: string;
        /** Brand primary – for non-sx contexts that need a raw string */
        brandPrimary: string;
      };
      /** Semantic gradient strings ready for `background:` */
      gradients: {
        primary: string;
        secondary: string;
        success: string;
        warning: string;
        error: string;
      };
      /** Named box-shadow tokens — use these instead of inline strings */
      shadows: {
        /** Almost invisible lift */
        soft: string;
        /** Cards at rest */
        card: string;
        /** Hovered cards / elevated panels */
        cardHover: string;
        /** Dialogs, popovers */
        dialog: string;
        /** Hero images, image cards */
        image: string;
        /** Primary-tinted focus ring */
        focusPrimary: string;
        /** Success-tinted glow */
        focusSuccess: string;
        /** Large elevation (modals) */
        large: string;
        /** None (explicit) */
        none: string;
      };
      /**
       * Named border-radius tokens (pixel values).
       *
       * IMPORTANT: In `sx` props, numeric `borderRadius` values are multiplied
       * by `theme.shape.borderRadius`. Always stringify when using in sx:
       *   borderRadius: (t) => `${t.custom.radii.card}px`
       * In component style overrides (raw CSS), use the number directly.
       *
       * EXCEPTION: `full` is already a string ('50%') — use it directly,
       * do NOT wrap it: `borderRadius: (t) => t.custom.radii.full`
       */
      radii: {
        /** 0 — sharp corners */
        none: number;
        /** theme.shape.borderRadius * 0.5  (6px default) — small chips, tags */
        sm: number;
        /** theme.shape.borderRadius * 1    (12px default) — buttons, inputs */
        md: number;
        /** theme.shape.borderRadius * 1.33 (16px default) — cards */
        card: number;
        /** theme.shape.borderRadius * 1.67 (20px default) — chips */
        chip: number;
        /** theme.shape.borderRadius * 2    (24px default) — large panels */
        lg: number;
        /** 50% — circles / avatars */
        full: string;
      };
    };
  }

  interface ThemeOptions {
    custom?: {
      colors?: Partial<Theme['custom']['colors']>;
      gradients?: Partial<Theme['custom']['gradients']>;
      shadows?: Partial<Theme['custom']['shadows']>;
      radii?: Partial<Theme['custom']['radii']>;
    };
  }
}

// ─── Extended palette shades ──────────────────────────────────────────
// MUI's palette only exposes main/light/dark/contrastText.
// Adding all 50–900 shades so `sx={{ bgcolor: 'primary.50' }}` etc. work
// via the custom section while keeping palette type-safe.
declare module '@mui/material/styles' {
  interface PaletteColor {
    50?: string;
    100?: string;
    200?: string;
    300?: string;
    400?: string;
    500?: string;
    600?: string;
    700?: string;
    800?: string;
    900?: string;
  }

  interface SimplePaletteColorOptions {
    50?: string;
    100?: string;
    200?: string;
    300?: string;
    400?: string;
    500?: string;
    600?: string;
    700?: string;
    800?: string;
    900?: string;
  }
}

// ─── Build the theme (single createTheme — no separate augmented export) ─
const baseRadius = 12; // = theme.shape.borderRadius

export const theme = createTheme({
  palette: {
    primary: {
      main: mishinColors.primary[500],
      light: mishinColors.primary[400],
      dark: mishinColors.primary[600],
      contrastText: '#ffffff',
      50: mishinColors.primary[50],
      100: mishinColors.primary[100],
      200: mishinColors.primary[200],
      300: mishinColors.primary[300],
      400: mishinColors.primary[400],
      500: mishinColors.primary[500],
      600: mishinColors.primary[600],
      700: mishinColors.primary[700],
      800: mishinColors.primary[800],
      900: mishinColors.primary[900],
    },
    secondary: {
      main: mishinColors.secondary[600],
      light: mishinColors.secondary[400],
      dark: mishinColors.secondary[800],
      contrastText: '#ffffff',
      50: mishinColors.secondary[50],
      100: mishinColors.secondary[100],
      200: mishinColors.secondary[200],
      300: mishinColors.secondary[300],
      400: mishinColors.secondary[400],
      500: mishinColors.secondary[500],
      600: mishinColors.secondary[600],
      700: mishinColors.secondary[700],
      800: mishinColors.secondary[800],
      900: mishinColors.secondary[900],
    },
    success: {
      main: mishinColors.success[500],
      light: mishinColors.success[400],
      dark: mishinColors.success[600],
      50: mishinColors.success[50],
      100: mishinColors.success[100],
      200: mishinColors.success[200],
      300: mishinColors.success[300],
      400: mishinColors.success[400],
      500: mishinColors.success[500],
      600: mishinColors.success[600],
      700: mishinColors.success[700],
      800: mishinColors.success[800],
      900: mishinColors.success[900],
    },
    warning: {
      main: mishinColors.warning[500],
      light: mishinColors.warning[400],
      dark: mishinColors.warning[600],
      50: mishinColors.warning[50],
      100: mishinColors.warning[100],
      200: mishinColors.warning[200],
      300: mishinColors.warning[300],
      400: mishinColors.warning[400],
      500: mishinColors.warning[500],
      600: mishinColors.warning[600],
      700: mishinColors.warning[700],
      800: mishinColors.warning[800],
      900: mishinColors.warning[900],
    },
    error: {
      main: mishinColors.error[500],
      light: mishinColors.error[400],
      dark: mishinColors.error[600],
      50: mishinColors.error[50],
      100: mishinColors.error[100],
      200: mishinColors.error[200],
      300: mishinColors.error[300],
      400: mishinColors.error[400],
      500: mishinColors.error[500],
      600: mishinColors.error[600],
      700: mishinColors.error[700],
      800: mishinColors.error[800],
      900: mishinColors.error[900],
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: mishinColors.secondary[900],
      secondary: mishinColors.secondary[600],
    },
    divider: mishinColors.secondary[200],
  },

  // ─── Typography ───────────────────────────────────────────────────────
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontFamily: 'Poppins, Inter, sans-serif',
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontFamily: 'Poppins, Inter, sans-serif',
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontFamily: 'Poppins, Inter, sans-serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: 'Poppins, Inter, sans-serif',
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontFamily: 'Poppins, Inter, sans-serif',
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: 'Poppins, Inter, sans-serif',
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: mishinColors.secondary[700],
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: mishinColors.secondary[600],
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.02em',
    },
  },

  // ─── Shape ────────────────────────────────────────────────────────────
  shape: {
    borderRadius: baseRadius,
  },

  // ─── Component Overrides ──────────────────────────────────────────────
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: baseRadius,
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(99, 102, 241, 0.25)',
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${mishinColors.primary[500]} 0%, ${mishinColors.primary[600]} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${mishinColors.primary[600]} 0%, ${mishinColors.primary[700]} 100%)`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: Math.round(baseRadius * 1.33),
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: baseRadius,
            '&:hover fieldset': {
              borderColor: mishinColors.primary[400],
            },
            '&.Mui-focused fieldset': {
              borderColor: mishinColors.primary[500],
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: Math.round(baseRadius * 1.67),
          fontWeight: 500,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${mishinColors.secondary[200]}`,
          color: mishinColors.secondary[900],
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRight: `1px solid ${mishinColors.secondary[200]}`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: baseRadius,
          margin: '4px 8px',
          '&:hover': {
            backgroundColor: mishinColors.primary[50],
          },
          '&.Mui-selected': {
            backgroundColor: mishinColors.primary[100],
            color: mishinColors.primary[800],
            '&:hover': {
              backgroundColor: mishinColors.primary[200],
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '1rem',
          minHeight: 48,
          '&.Mui-selected': {
            color: mishinColors.primary[600],
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: mishinColors.primary[500],
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },
  },

  // ─── Breakpoints ──────────────────────────────────────────────────────
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },

  // ─── Custom Design Tokens ─────────────────────────────────────────────
  // Access: `sx={{ color: (t) => t.custom.colors.gold }}`
  // or:     `const { custom } = useTheme(); custom.shadows.card`
  custom: {
    colors: {
      gold: '#ffd700',
      onlineGreen: '#44b700',
      muted: '#9e9e9e',
      mutedDark: '#666666',
      border: '#e0e0e0',
      surfaceHover: mishinColors.primary[50],
      overlay: 'rgba(0, 0, 0, 0.6)',
      brandPrimary: mishinColors.primary[500],
    },
    gradients: {
      primary: `linear-gradient(135deg, ${mishinColors.primary[500]} 0%, ${mishinColors.primary[600]} 100%)`,
      secondary: `linear-gradient(135deg, ${mishinColors.secondary[400]} 0%, ${mishinColors.secondary[600]} 100%)`,
      success: `linear-gradient(135deg, ${mishinColors.success[400]} 0%, ${mishinColors.success[600]} 100%)`,
      warning: `linear-gradient(135deg, ${mishinColors.warning[400]} 0%, ${mishinColors.warning[600]} 100%)`,
      error: `linear-gradient(135deg, ${mishinColors.error[400]} 0%, ${mishinColors.error[600]} 100%)`,
    },
    shadows: {
      soft: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      cardHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      dialog: '0 12px 24px rgba(0, 0, 0, 0.15)',
      image: '0 4px 12px rgba(99, 102, 241, 0.4)',
      focusPrimary: '0 2px 4px rgba(99, 102, 241, 0.4)',
      focusSuccess: '0 2px 8px rgba(34, 197, 94, 0.4)',
      large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      none: 'none',
    },
    radii: {
      none: 0,
      sm: Math.round(baseRadius * 0.5),
      md: baseRadius,
      card: Math.round(baseRadius * 1.33),
      chip: Math.round(baseRadius * 1.67),
      lg: baseRadius * 2,
      full: '50%',
    },
  },
});

// ─── Convenience exports ──────────────────────────────────────────────
export { mishinColors };
export type { SxProps, Theme };
export default theme;