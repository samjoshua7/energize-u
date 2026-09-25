import React, { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

const ThemeModeContext = createContext({
  mode: 'dark',
  toggleTheme: () => {},
})

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('energize_u_theme_mode') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)
    return saved
  })

  useEffect(() => {
    localStorage.setItem('energize_u_theme_mode', mode)
    document.documentElement.setAttribute('data-theme', mode)
    document.body.setAttribute('data-theme', mode)
    if (mode === 'dark') {
      document.body.style.backgroundColor = '#14181D'
      document.body.style.color = '#EDEAE3'
    } else {
      document.body.style.backgroundColor = '#F8F6F0'
      document.body.style.color = '#12161A'
    }
  }, [mode])

  const toggleTheme = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      document.body.setAttribute('data-theme', next)
      return next
    })
  }

  const theme = useMemo(() => {
    const isDark = mode === 'dark'

    return createTheme({
      palette: {
        mode,
        primary: {
          main: isDark ? '#D98E2E' : '#9E5D12', // Analog meter amber
          light: isDark ? '#E6A34A' : '#B8721F',
          dark: isDark ? '#B8721F' : '#7E470B',
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: isDark ? '#6E9B7B' : '#1B6535', // Muted sage / forest sage
          light: isDark ? '#88B294' : '#237D43',
          dark: isDark ? '#547B5F' : '#134D27',
          contrastText: '#FFFFFF',
        },
        background: {
          default: isDark ? '#14181D' : '#F8F6F0',
          paper: isDark ? '#1C222A' : '#FFFFFF',
        },
        text: {
          primary: isDark ? '#EDEAE3' : '#12161A',
          secondary: isDark ? '#A7ACB3' : '#454D59',
        },
        divider: isDark ? 'rgba(237, 234, 227, 0.12)' : 'rgba(18, 22, 26, 0.12)',
        error: {
          main: isDark ? '#C1553A' : '#A83218',
        },
        warning: {
          main: isDark ? '#D98E2E' : '#9E5D12',
        },
        info: {
          main: isDark ? '#A7ACB3' : '#525866',
        },
        success: {
          main: isDark ? '#6E9B7B' : '#236B3B',
        },
      },
      typography: {
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        h1: {
          fontWeight: 600,
          fontSize: '2rem',
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
          color: isDark ? '#A7ACB3' : '#525866',
        },
        button: {
          fontWeight: 600,
          textTransform: 'none',
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
              backgroundColor: isDark ? '#14181D' : '#F8F6F0',
              color: isDark ? '#EDEAE3' : '#12161A',
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundColor: isDark ? '#1C222A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(237, 234, 227, 0.12)' : 'rgba(18, 22, 26, 0.12)'}`,
              boxShadow: 'none', // Strictly no soft shadows per DESIGN.md
              borderRadius: 4,
              backgroundImage: 'none',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: isDark ? '#1C222A' : '#FFFFFF',
              boxShadow: 'none',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: 4,
              boxShadow: 'none',
              fontWeight: 600,
              padding: '6px 14px',
              textTransform: 'none', // Sentence case everywhere
              '&:hover': {
                boxShadow: 'none',
              },
            },
            containedPrimary: {
              backgroundColor: isDark ? '#D98E2E' : '#9E5D12',
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: isDark ? '#E6A34A' : '#7E470B',
              },
            },
            outlined: {
              borderColor: isDark ? 'rgba(237, 234, 227, 0.2)' : 'rgba(18, 22, 26, 0.2)',
              color: isDark ? '#EDEAE3' : '#12161A',
              '&:hover': {
                borderColor: isDark ? '#D98E2E' : '#9E5D12',
                backgroundColor: isDark ? 'rgba(217, 142, 46, 0.08)' : 'rgba(158, 93, 18, 0.08)',
              },
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
                borderRadius: 4,
                backgroundColor: isDark ? '#14181D' : '#FFFFFF',
                '& fieldset': {
                  borderColor: isDark ? 'rgba(237, 234, 227, 0.16)' : 'rgba(18, 22, 26, 0.16)',
                },
                '&:hover fieldset': {
                  borderColor: isDark ? 'rgba(237, 234, 227, 0.3)' : 'rgba(18, 22, 26, 0.3)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: isDark ? '#D98E2E' : '#9E5D12',
                  borderWidth: 1.5,
                },
              },
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
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
              borderColor: isDark ? 'rgba(237, 234, 227, 0.12)' : 'rgba(18, 22, 26, 0.12)',
              padding: '8px 12px',
              fontSize: '0.825rem',
              color: isDark ? '#EDEAE3' : '#12161A',
            },
            head: {
              fontWeight: 600,
              color: isDark ? '#A7ACB3' : '#454D59',
              backgroundColor: isDark ? '#14181D' : '#F0EDE6',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              backgroundColor: isDark ? '#1C222A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(237, 234, 227, 0.12)' : 'rgba(20, 24, 29, 0.12)'}`,
              borderRadius: 4,
              boxShadow: isDark
                ? '0 20px 25px -5px rgba(0, 0, 0, 0.8)'
                : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
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
