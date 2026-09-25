import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#10B981', // Energy emerald
      light: '#34D399',
      dark: '#059669',
      contrastText: '#0B0F19',
    },
    secondary: {
      main: '#6366F1', // Indigo
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0B0F19',
      paper: '#131B2E',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
    error: {
      main: '#EF4444',
      light: '#F87171',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
    },
    info: {
      main: '#38BDF8',
      light: '#7DD3FC',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
    },
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    h1: {
      fontWeight: 800,
      fontSize: '2rem',
      letterSpacing: '-0.025em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.65rem',
      letterSpacing: '-0.02em',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.35rem',
      letterSpacing: '-0.015em',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.15rem',
      letterSpacing: '-0.01em',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '0.9rem',
    },
    subtitle1: {
      fontSize: '0.95rem',
      color: '#94A3B8',
    },
    subtitle2: {
      fontSize: '0.85rem',
      color: '#94A3B8',
    },
    body1: {
      fontSize: '0.925rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.825rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0B0F19',
          color: '#F8FAFC',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#131B2E',
          backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.35)',
          borderRadius: 14,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 18px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
          },
        },
        containedPrimary: {
          color: '#0B0F19',
          '&:hover': {
            backgroundColor: '#34D399',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 10,
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.12)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.25)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#10B981',
            },
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: '#0F172A',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
  },
})
