import React, { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

const ThemeModeContext = createContext({
  mode: 'dark',
  toggleTheme: () => {},
})

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('energize_u_theme_mode') || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('energize_u_theme_mode', mode)
    document.documentElement.setAttribute('data-theme', mode)
    if (mode === 'dark') {
      document.body.style.backgroundColor = '#09090B'
      document.body.style.color = '#F4F4F5'
    } else {
      document.body.style.backgroundColor = '#F8FAFC'
      document.body.style.color = '#0F172A'
    }
  }, [mode])

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const theme = useMemo(() => {
    const isDark = mode === 'dark'

    return createTheme({
      palette: {
        mode,
        primary: {
          main: isDark ? '#10B981' : '#0F766E',
          light: isDark ? '#34D399' : '#14B8A6',
          dark: isDark ? '#059669' : '#0D5F58',
          contrastText: isDark ? '#09090B' : '#FFFFFF',
        },
        secondary: {
          main: isDark ? '#818CF8' : '#4F46E5',
          light: '#A5B4FC',
          dark: '#3730A3',
          contrastText: '#FFFFFF',
        },
        background: {
          default: isDark ? '#09090B' : '#F8FAFC',
          paper: isDark ? '#121215' : '#FFFFFF',
        },
        text: {
          primary: isDark ? '#F4F4F5' : '#0F172A',
          secondary: isDark ? '#A1A1AA' : '#64748B',
        },
        divider: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
        error: {
          main: '#EF4444',
        },
        warning: {
          main: '#F59E0B',
        },
        info: {
          main: '#0EA5E9',
        },
        success: {
          main: isDark ? '#10B981' : '#0F766E',
        },
      },
      typography: {
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        h1: {
          fontWeight: 700,
          fontSize: '1.75rem',
          letterSpacing: '-0.02em',
        },
        h2: {
          fontWeight: 700,
          fontSize: '1.4rem',
          letterSpacing: '-0.015em',
        },
        h3: {
          fontWeight: 600,
          fontSize: '1.2rem',
          letterSpacing: '-0.01em',
        },
        h4: {
          fontWeight: 600,
          fontSize: '1.05rem',
          letterSpacing: '-0.01em',
        },
        h5: {
          fontWeight: 600,
          fontSize: '0.95rem',
        },
        h6: {
          fontWeight: 600,
          fontSize: '0.85rem',
        },
        body1: {
          fontSize: '0.875rem',
          lineHeight: 1.55,
        },
        body2: {
          fontSize: '0.8rem',
          lineHeight: 1.5,
        },
        caption: {
          fontSize: '0.725rem',
          color: isDark ? '#A1A1AA' : '#64748B',
        },
        button: {
          fontWeight: 600,
          textTransform: 'none',
          letterSpacing: '0.01em',
          fontSize: '0.85rem',
        },
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: isDark ? '#09090B' : '#F8FAFC',
              color: isDark ? '#F4F4F5' : '#0F172A',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundColor: isDark ? '#121215' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'}`,
              boxShadow: isDark ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              borderRadius: 8,
              backgroundImage: 'none',
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
              borderRadius: 6,
              boxShadow: 'none',
              fontWeight: 600,
              padding: '6px 14px',
              '&:hover': {
                boxShadow: 'none',
              },
            },
            containedPrimary: {
              backgroundColor: isDark ? '#10B981' : '#0F766E',
              color: isDark ? '#09090B' : '#FFFFFF',
              '&:hover': {
                backgroundColor: isDark ? '#059669' : '#0D5F58',
              },
            },
            outlined: {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
            },
          },
        },
        MuiTextField: {
          defaultProps: {
            size: 'small',
          },
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: 6,
                backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                '& fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
                },
                '&:hover fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : '#94A3B8',
                },
                '&.Mui-focused fieldset': {
                  borderColor: isDark ? '#10B981' : '#0F766E',
                  borderWidth: 1.5,
                },
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 4,
              fontWeight: 600,
              fontSize: '0.725rem',
              height: 24,
            },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
              padding: '8px 12px',
              fontSize: '0.825rem',
            },
            head: {
              fontWeight: 600,
              color: isDark ? '#A1A1AA' : '#64748B',
              backgroundColor: isDark ? '#16161A' : '#F1F5F9',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              backgroundColor: isDark ? '#121215' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0'}`,
              borderRadius: 10,
              boxShadow: isDark
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.8)'
                : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      },
    })
  }, [mode])

  return (
    <ThemeModeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode() {
  return useContext(ThemeModeContext)
}
