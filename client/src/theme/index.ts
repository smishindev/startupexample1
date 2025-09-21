import { createTheme } from '@mui/material/styles';

// Mishin Learn Brand Colors
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

export const theme = createTheme({
  palette: {
    primary: {
      main: mishinColors.primary[500],
      light: mishinColors.primary[400],
      dark: mishinColors.primary[600],
      contrastText: '#ffffff',
    },
    secondary: {
      main: mishinColors.secondary[600],
      light: mishinColors.secondary[400],
      dark: mishinColors.secondary[800],
      contrastText: '#ffffff',
    },
    success: {
      main: mishinColors.success[500],
      light: mishinColors.success[400],
      dark: mishinColors.success[600],
    },
    warning: {
      main: mishinColors.warning[500],
      light: mishinColors.warning[400],
      dark: mishinColors.warning[600],
    },
    error: {
      main: mishinColors.error[500],
      light: mishinColors.error[400],
      dark: mishinColors.error[600],
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
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
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
          borderRadius: 16,
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
            borderRadius: 12,
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
          borderRadius: 20,
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
          borderRadius: 12,
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
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
});

// Create custom theme variants
declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      gradients: {
        primary: string;
        secondary: string;
        success: string;
        warning: string;
        error: string;
      };
      shadows: {
        soft: string;
        medium: string;
        large: string;
      };
    };
  }
  interface ThemeOptions {
    custom?: {
      gradients?: {
        primary?: string;
        secondary?: string;
        success?: string;
        warning?: string;
        error?: string;
      };
      shadows?: {
        soft?: string;
        medium?: string;
        large?: string;
      };
    };
  }
}

// Augment the theme with custom properties
export const augmentedTheme = createTheme(theme, {
  custom: {
    gradients: {
      primary: `linear-gradient(135deg, ${mishinColors.primary[500]} 0%, ${mishinColors.primary[600]} 100%)`,
      secondary: `linear-gradient(135deg, ${mishinColors.secondary[400]} 0%, ${mishinColors.secondary[600]} 100%)`,
      success: `linear-gradient(135deg, ${mishinColors.success[400]} 0%, ${mishinColors.success[600]} 100%)`,
      warning: `linear-gradient(135deg, ${mishinColors.warning[400]} 0%, ${mishinColors.warning[600]} 100%)`,
      error: `linear-gradient(135deg, ${mishinColors.error[400]} 0%, ${mishinColors.error[600]} 100%)`,
    },
    shadows: {
      soft: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
  },
});

export { mishinColors };
export default theme;