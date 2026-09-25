import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  IconButton,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Chip,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
} from '@mui/material'
import {
  DashboardOutlined as DashboardIcon,
  ReceiptLongOutlined as LedgerIcon,
  AutoAwesomeOutlined as AiIcon,
  PrecisionManufacturingOutlined as FactoryIcon,
  AccountCircleOutlined as UserIcon,
  LogoutOutlined as LogoutIcon,
  BoltOutlined as EnergyIcon,
  LightModeOutlined as SunIcon,
  DarkModeOutlined as MoonIcon,
  BarChartOutlined as BenchmarkIcon,
  Co2Outlined as EmissionsIcon,
  TuneOutlined as SimulatorIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useThemeMode } from '../../app/theme/ThemeModeContext'
import EnergyAssistant from '../assistant/EnergyAssistant'

const NAV_ITEMS = [
  { label: 'Overview', path: '/', icon: <DashboardIcon sx={{ fontSize: 20 }} /> },
  { label: 'Ledger', path: '/ledger', icon: <LedgerIcon sx={{ fontSize: 20 }} /> },
  { label: 'Benchmarks', path: '/benchmarks', icon: <BenchmarkIcon sx={{ fontSize: 20 }} /> },
  { label: 'Decarb & CO₂', path: '/emissions', icon: <EmissionsIcon sx={{ fontSize: 20 }} /> },
  { label: 'Advisory', path: '/recommendations', icon: <AiIcon sx={{ fontSize: 20 }} /> },
  { label: 'Simulator', path: '/simulator', icon: <SimulatorIcon sx={{ fontSize: 20 }} /> },
  { label: 'Equipment', path: '/profile', icon: <FactoryIcon sx={{ fontSize: 20 }} /> },
]

const MOBILE_NAV_ITEMS = [
  { label: 'Overview', path: '/', icon: <DashboardIcon sx={{ fontSize: 18 }} /> },
  { label: 'Ledger', path: '/ledger', icon: <LedgerIcon sx={{ fontSize: 18 }} /> },
  { label: 'Benchmark', path: '/benchmarks', icon: <BenchmarkIcon sx={{ fontSize: 18 }} /> },
  { label: 'Decarb', path: '/emissions', icon: <EmissionsIcon sx={{ fontSize: 18 }} /> },
  { label: 'Advisory', path: '/recommendations', icon: <AiIcon sx={{ fontSize: 18 }} /> },
]

export default function AppShell() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const location = useLocation()
  const { user, business, signOut } = useAuth()
  const { mode, toggleTheme } = useThemeMode()

  const [anchorEl, setAnchorEl] = useState(null)

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const handleSignOut = async () => {
    handleMenuClose()
    await signOut()
    navigate('/login')
  }

  const currentNavIndex = Math.max(
    0,
    MOBILE_NAV_ITEMS.findIndex((item) =>
      item.path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(item.path)
    )
  )

  const isDark = mode === 'dark'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: 60, justifyContent: 'space-between', px: { xs: 1.5, sm: 3 } }}>
          {/* Brand */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <Box sx={{ width: 26, height: 26, borderRadius: '4px', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
              <EnergyIcon sx={{ fontSize: 17 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'text.primary' }}>Energize<span style={{ color: 'var(--color-amber)' }}>U</span></Typography>
          </Box>

          {/* Right Controls: Facility badge + Theme toggle + Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {business?.name && (
              <Chip
                label={business.name}
                size="small"
                variant="outlined"
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  borderColor: 'var(--color-line)',
                  color: 'text.secondary',
                  fontSize: '0.725rem',
                }}
              />
            )}

            {/* Light / Dark Mode Toggle */}
            <Tooltip title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}>
              <IconButton
                onClick={toggleTheme}
                size="small"
                sx={{
                  color: 'text.secondary',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 0.75,
                }}
              >
                {isDark ? <SunIcon sx={{ fontSize: 18 }} /> : <MoonIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>

            {/* Profile Menu */}
            <IconButton onClick={handleMenuOpen} size="small" sx={{ p: 0.5 }}>
              <UserIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{
                paper: {
                  sx: {
                    bgcolor: 'background.paper',
                    border: '1px solid var(--color-line)',
                    minWidth: 190,
                    boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {business?.name || 'Demo MSME'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {user?.email || 'owner@energize-u.com'}
                </Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={() => { handleMenuClose(); navigate('/simulator'); }}>
                <ListItemIcon><SimulatorIcon fontSize="small" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: '0.825rem' }}>Scenario Simulator</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                <ListItemIcon><FactoryIcon fontSize="small" /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: '0.825rem' }}>Equipment & Profile</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleSignOut} sx={{ color: 'error.main' }}>
                <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: '0.825rem' }}>Sign Out</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Area */}
      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Desktop Minimalist Sidebar */}
        {!isMobile && (
          <Drawer
            variant="permanent"
            sx={{
              width: 200,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: 200,
                boxSizing: 'border-box',
                position: 'relative',
                bgcolor: 'background.default',
                borderRight: '1px solid',
                borderColor: 'divider',
                pt: 2,
              },
            }}
          >
            <List sx={{ px: 1.5 }}>
              {NAV_ITEMS.map((item) => {
                const isSelected =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path)
                return (
                  <ListItemButton
                    key={item.path}
                    selected={isSelected}
                    onClick={() => navigate(item.path)}
                    sx={{
                      borderRadius: '3px',
                      mb: 0.35,
                      py: 0.85,
                      px: 1.25,
                      borderLeft: isSelected ? '2px solid var(--color-amber)' : '2px solid transparent',
                      bgcolor: isSelected ? 'rgba(158, 93, 18, 0.08)' : 'transparent',
                      '&:hover': {
                        bgcolor: 'var(--color-subtle-bg)',
                      },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(158, 93, 18, 0.08)',
                        color: 'text.primary',
                        '& .MuiListItemIcon-root': {
                          color: 'var(--color-amber)',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 28, color: isSelected ? 'var(--color-amber)' : 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: isSelected ? 600 : 400 }}
                    />
                  </ListItemButton>
                )
              })}
            </List>
          </Drawer>
        )}

        {/* Content Container */}
        <Container
          component="main"
          maxWidth="lg"
          sx={{
            flex: 1,
            py: { xs: 2, sm: 3.5 },
            px: { xs: 1.5, sm: 4 },
            pb: { xs: 9, sm: 3 },
          }}
        >
          <Outlet />
        </Container>
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'}`,
            bgcolor: isDark ? '#09090B' : '#FFFFFF',
          }}
          elevation={4}
        >
          <BottomNavigation
            showLabels
            value={currentNavIndex}
            onChange={(_, newValue) => {
              navigate(MOBILE_NAV_ITEMS[newValue].path)
            }}
            sx={{
              height: 54,
              bgcolor: 'transparent',
              '& .MuiBottomNavigationAction-root': {
                color: 'text.secondary',
                minWidth: 'auto',
                py: 0.5,
                '&.Mui-selected': {
                  color: isDark ? 'primary.main' : 'primary.main',
                },
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.675rem',
                '&.Mui-selected': {
                  fontSize: '0.7rem',
                  fontWeight: 600,
                },
              },
            }}
          >
            {MOBILE_NAV_ITEMS.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
      <EnergyAssistant />
    </Box>
  )
}
