import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material'
import {
  PowerSettingsNew as PowerIcon,
  FlashOff as FlashOffIcon,
  FlashOn as FlashOnIcon,
  RestartAlt as ResetIcon,
  CheckCircleOutline as OkIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material'
import { toggleGrid, fetchStatus, resetDemo, healthCheck } from './api'

export default function LiveSimulatorPage() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [coldStart, setColdStart] = useState(true)
  const [message, setMessage] = useState(null)

  // Wake the backend and then fetch initial status
  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        await healthCheck()
        if (cancelled) return
        setColdStart(false)
        const data = await fetchStatus()
        if (!cancelled) setStatus(data)
      } catch {
        if (!cancelled) setMessage({ type: 'error', text: 'Backend not reachable — is the server running?' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    boot()
    return () => { cancelled = true }
  }, [])

  // Poll status every 3 seconds to stay in sync
  useEffect(() => {
    if (loading) return
    const timer = setInterval(async () => {
      try {
        const data = await fetchStatus()
        setStatus(data)
      } catch { /* silent */ }
    }, 3000)
    return () => clearInterval(timer)
  }, [loading])

  const handleToggle = useCallback(async (newStatus) => {
    setToggling(true)
    setMessage(null)
    try {
      const result = await toggleGrid(newStatus)
      setMessage({ type: 'success', text: result.message })
      // Immediately fetch updated status
      const data = await fetchStatus()
      setStatus(data)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setToggling(false)
    }
  }, [])

  const handleReset = useCallback(async () => {
    if (!window.confirm('Reset all demo data? This clears all events and consumption logs.')) return
    try {
      await resetDemo()
      const data = await fetchStatus()
      setStatus(data)
      setMessage({ type: 'success', text: 'Demo data cleared — fresh start' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }, [])

  const gridOn = status?.grid?.status === 'on'
  const gensetOn = status?.genset?.status === 'on'

  if (loading) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'var(--color-bg)',
        gap: 2,
      }}>
        <CircularProgress sx={{ color: 'var(--color-amber)' }} />
        <Typography sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
          {coldStart ? 'Waking up Render backend…' : 'Loading state…'}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{
      maxWidth: 600,
      mx: 'auto',
      py: 4,
      px: 2,
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
    }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{
          fontWeight: 700,
          color: 'var(--color-ink)',
          fontFamily: 'var(--font-sans)',
        }}>
          ⚡ DISCOM Grid Simulator
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mt: 0.5 }}>
          Hackathon operator console — trigger grid outages and watch the dashboard react in real time
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'var(--color-line)' }} />

      {/* Current State Panel */}
      <Box sx={{
        p: 3,
        border: '1px solid var(--color-line)',
        borderRadius: '6px',
        bgcolor: 'var(--color-surface)',
      }}>
        <Typography variant="overline" sx={{ color: 'var(--color-ink-muted)', letterSpacing: 1.5 }}>
          Live Power State
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
          {/* Grid status */}
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Chip
              icon={gridOn ? <FlashOnIcon /> : <FlashOffIcon />}
              label={gridOn ? 'GRID ON' : 'GRID DOWN'}
              sx={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '0.875rem',
                px: 2,
                py: 2.5,
                bgcolor: gridOn
                  ? 'rgba(110, 155, 123, 0.15)'
                  : 'rgba(193, 85, 58, 0.15)',
                color: gridOn ? 'var(--color-sage)' : 'var(--color-rust)',
                border: `1px solid ${gridOn ? 'var(--color-sage)' : 'var(--color-rust)'}`,
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
            <Typography variant="caption" sx={{
              display: 'block', mt: 1,
              color: 'var(--color-ink-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
            }}>
              {status?.grid?.since ? `since ${new Date(status.grid.since).toLocaleTimeString('en-IN')}` : '—'}
            </Typography>
          </Box>

          {/* Genset status */}
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Chip
              icon={<PowerIcon />}
              label={gensetOn ? 'GENSET RUNNING' : 'GENSET OFF'}
              sx={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '0.875rem',
                px: 2,
                py: 2.5,
                bgcolor: gensetOn
                  ? 'rgba(217, 142, 46, 0.15)'
                  : 'rgba(167, 172, 179, 0.1)',
                color: gensetOn ? 'var(--color-amber)' : 'var(--color-ink-muted)',
                border: `1px solid ${gensetOn ? 'var(--color-amber)' : 'var(--color-line)'}`,
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
            <Typography variant="caption" sx={{
              display: 'block', mt: 1,
              color: 'var(--color-ink-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
            }}>
              {gensetOn && status?.genset_running
                ? `${status.genset_running.running_seconds}s · ${status.genset_running.diesel_so_far}L`
                : '—'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={toggling || !gridOn}
          onClick={() => handleToggle('off')}
          startIcon={toggling ? <CircularProgress size={18} /> : <FlashOffIcon />}
          sx={{
            py: 2,
            bgcolor: 'var(--color-rust)',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
            '&:hover': { bgcolor: '#a0341f' },
            '&.Mui-disabled': { opacity: 0.4 },
          }}
        >
          Turn OFF Grid
        </Button>

        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={toggling || gridOn}
          onClick={() => handleToggle('on')}
          startIcon={toggling ? <CircularProgress size={18} /> : <FlashOnIcon />}
          sx={{
            py: 2,
            bgcolor: 'var(--color-sage)',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
            '&:hover': { bgcolor: '#155528' },
            '&.Mui-disabled': { opacity: 0.4 },
          }}
        >
          Turn ON Grid
        </Button>
      </Box>

      {/* Message */}
      {message && (
        <Box sx={{
          p: 2,
          display: 'flex',
          gap: 1.5,
          alignItems: 'flex-start',
          bgcolor: message.type === 'error'
            ? 'rgba(193, 85, 58, 0.1)'
            : 'rgba(110, 155, 123, 0.1)',
          border: `1px solid ${message.type === 'error' ? 'var(--color-rust)' : 'var(--color-sage)'}`,
          borderRadius: '4px',
        }}>
          {message.type === 'error'
            ? <ErrorIcon sx={{ color: 'var(--color-rust)', fontSize: 20, mt: '2px' }} />
            : <OkIcon sx={{ color: 'var(--color-sage)', fontSize: 20, mt: '2px' }} />}
          <Typography variant="body2" sx={{
            color: 'var(--color-ink)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
          }}>
            {message.text}
          </Typography>
        </Box>
      )}

      {/* Running Totals */}
      {status?.today && (
        <>
          <Divider sx={{ borderColor: 'var(--color-line)' }} />
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 2,
          }}>
            <MetricBox
              label="Cost today"
              value={`₹${status.today.total_cost.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`}
            />
            <MetricBox
              label="Diesel used"
              value={`${status.today.diesel_litres.toFixed(2)} L`}
            />
            <MetricBox
              label="CO₂ emitted"
              value={`${status.today.co2_kg.toFixed(2)} kg`}
            />
          </Box>
        </>
      )}

      {/* Reset Button */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ResetIcon />}
          onClick={handleReset}
          sx={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            borderColor: 'var(--color-line)',
            color: 'var(--color-ink-muted)',
            '&:hover': { borderColor: 'var(--color-rust)', color: 'var(--color-rust)' },
          }}
        >
          Reset Demo Data
        </Button>
      </Box>
    </Box>
  )
}

function MetricBox({ label, value }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="caption" sx={{
        color: 'var(--color-ink-muted)',
        display: 'block',
        fontSize: '0.6875rem',
      }}>
        {label}
      </Typography>
      <Typography sx={{
        fontFamily: 'var(--font-mono)',
        fontSize: '1.125rem',
        fontWeight: 600,
        color: 'var(--color-ink)',
      }}>
        {value}
      </Typography>
    </Box>
  )
}
