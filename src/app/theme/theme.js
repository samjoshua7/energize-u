import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#D98E2E', // The one accent: analog meter amber
      light: '#E6A34A',
      dark: '#B8721F',
      contrastText: '#14181D',
    },
    secondary: {
      main: '#6E9B7B', // Muted sage for positive states
      light: '#88B294',
      dark: '#547B5F',
      contrastText: '#14181D',
    },
    background: {
      default: '#14181D', // Charcoal-navy meter housing
      paper: '#1C222A',   // Raised panel surface
    },
    text: {
      primary: '#EDEAE3',   // Warm paper ink
      secondary: '#A7ACB3', // Muted caption ink
    },
    divider: 'rgba(237, 234, 227, 0.12)', // Hairline rule
    error: {
      main: '#C1553A', // Muted rust/clay-red
      light: '#D36F56',
      dark: '#9E3F27',
    },
    warning: {
      main: '#D98E2E', // Meter amber
      light: '#E6A34A',
      dark: '#B8721F',
    },
    success: {
      main: '#6E9B7B', // Muted sage
      light: '#88B294',
      dark: '#547B5F',
    },
    info: {
      main: '#A7ACB3',
    },
  },
  typography: {
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    h1: {
      fontWeight: 600,
      fontSize: '2.5rem',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.5rem',
      letterSpacing: '-0.015em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.25rem',
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '0.9375rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '0.8125rem',
    },
    subtitle1: {
      fontSize: '0.9375rem',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.8125rem',
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none', // Sentence case everywhere
      fontSize: '0.8125rem',
    },
  },
  shape: {
    borderRadius: 4, // Strict 4px radius per DESIGN.md
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#14181D',
          color: '#EDEAE3',
          fontFamily: "'IBM Plex Sans', sans-serif",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1C222A',
          border: '1px solid rgba(237, 234, 227, 0.12)',
          boxShadow: 'none', // Reject soft shadows per DESIGN.md
          borderRadius: 4,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#1C222A',
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: '6px 14px',
          fontWeight: 600,
          boxShadow: 'none',
          textTransform: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: '#D98E2E',
          color: '#14181D',
          '&:hover': {
            backgroundColor: '#E6A34A',
          },
        },
        outlined: {
          borderColor: 'rgba(237, 234, 227, 0.2)',
          color: '#EDEAE3',
          '&:hover': {
            borderColor: '#D98E2E',
            backgroundColor: 'rgba(217, 142, 46, 0.08)',
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
            backgroundColor: '#14181D',
            borderRadius: 4,
            color: '#EDEAE3',
            '& fieldset': {
              borderColor: 'rgba(237, 234, 227, 0.15)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(237, 234, 227, 0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#D98E2E',
              borderWidth: 1,
            },
          },
          '& .MuiInputLabel-root': {
            color: '#A7ACB3',
            '&.Mui-focused': {
              color: '#D98E2E',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(237, 234, 227, 0.12)',
          padding: '10px 14px',
          fontSize: '0.8125rem',
          color: '#EDEAE3',
        },
        head: {
          color: '#A7ACB3',
          fontWeight: 600,
          fontSize: '0.75rem',
          backgroundColor: '#14181D',
          borderBottom: '1px solid rgba(237, 234, 227, 0.2)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 3,
          fontSize: '0.75rem',
          fontWeight: 500,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          border: '1px solid',
        },
      },
    },
  },
})
