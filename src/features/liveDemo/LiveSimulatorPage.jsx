import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box, Typography, Button, CircularProgress, Divider, Chip, Slider, IconButton,
} from '@mui/material'
import {
  PowerSettingsNew as PowerIcon, FlashOff as FlashOffIcon, FlashOn as FlashOnIcon,
  RestartAlt as ResetIcon, CheckCircleOutline as OkIcon, ErrorOutline as ErrorIcon,
  PlayArrow as RunIcon, Pause as IdleIcon, Stop as StopIcon,
} from '@mui/icons-material'
import { toggleGrid, fetchStatus, fetchMachines, adjustMachine, resetDemo, healthCheck } from './api'

export default function LiveSimulatorPage() {
  const [status, setStatus] = useState(null)
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(true)
  const [coldStart, setColdStart] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        await healthCheck()
        if (cancelled) return
        setColdStart(false)
        const [s, m] = await Promise.all([fetchStatus(), fetchMachines()])
        if (!cancelled) { setStatus(s); setMachines(m.machines || []) }
      } catch {
        if (!cancelled) setMessage({ type: 'error', text: 'Backend not reachable' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    boot()
    return () => { cancelled = true }
  }, [])

  // Poll every 3s
  useEffect(() => {
    if (loading) return
    const t = setInterval(async () => {
      try {
        const [s, m] = await Promise.all([fetchStatus(), fetchMachines()])
        setStatus(s); setMachines(m.machines || [])
      } catch { /* silent */ }
    }, 3000)
    return () => clearInterval(t)
  }, [loading])

  const handleGridToggle = useCallback(async (newStatus) => {
    setToggling(true); setMessage(null)
    try {
      const r = await toggleGrid(newStatus)
      setMessage({ type: 'success', text: r.message })
      const s = await fetchStatus(); setStatus(s)
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
    finally { setToggling(false) }
  }, [])

  const handleReset = useCallback(async () => {
    if (!window.confirm('Reset all demo data?')) return
    try {
      await resetDemo()
      const [s, m] = await Promise.all([fetchStatus(), fetchMachines()])
      setStatus(s); setMachines(m.machines || [])
      setMessage({ type: 'success', text: 'Demo data cleared' })
    } catch (err) { setMessage({ type: 'error', text: err.message }) }
  }, [])

  const gridOn = status?.grid?.status === 'on'
  const gensetOn = status?.genset?.status === 'on'

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'var(--color-bg)', gap: 2 }}>
        <CircularProgress sx={{ color: 'var(--color-amber)' }} />
        <Typography sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
          {coldStart ? 'Waking up backend…' : 'Loading…'}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', py: 3, px: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>⚡ Energize Simulator</Typography>
        <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mt: 0.5 }}>
          Operator console — control grid and machine loads. Dashboard on PC #2 reflects changes live.
        </Typography>
      </Box>

      {/* ── Grid Controls ──────────────────────────────────────── */}
      <Box sx={{ p: 2.5, border: '1px solid var(--color-line)', borderRadius: '6px', bgcolor: 'var(--color-surface)' }}>
        <Typography variant="overline" sx={{ color: 'var(--color-ink-muted)', letterSpacing: 1.5 }}>Grid Power</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 1.5, alignItems: 'center' }}>
          <Chip
            icon={gridOn ? <FlashOnIcon /> : <FlashOffIcon />}
            label={gridOn ? 'GRID ON' : 'GRID DOWN'}
            sx={{
              fontFamily: 'var(--font-mono)', fontWeight: 700, px: 1.5, py: 2,
              bgcolor: gridOn ? 'rgba(110,155,123,.12)' : 'rgba(193,85,58,.12)',
              color: gridOn ? 'var(--color-sage)' : 'var(--color-rust)',
              border: `1px solid ${gridOn ? 'var(--color-sage)' : 'var(--color-rust)'}`,
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
          {gensetOn && (
            <Chip icon={<PowerIcon />} label="GENSET RUNNING" sx={{
              fontFamily: 'var(--font-mono)', fontWeight: 700, px: 1.5, py: 2,
              bgcolor: 'rgba(217,142,46,.12)', color: 'var(--color-amber)',
              border: '1px solid var(--color-amber)', '& .MuiChip-icon': { color: 'inherit' },
            }} />
          )}
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="contained" disabled={toggling || !gridOn}
            onClick={() => handleGridToggle('off')}
            sx={{ bgcolor: 'var(--color-rust)', fontFamily: 'var(--font-mono)', fontWeight: 700, '&:hover': { bgcolor: '#a0341f' } }}>
            {toggling ? <CircularProgress size={16} /> : 'Kill Grid'}
          </Button>
          <Button size="small" variant="contained" disabled={toggling || gridOn}
            onClick={() => handleGridToggle('on')}
            sx={{ bgcolor: 'var(--color-sage)', fontFamily: 'var(--font-mono)', fontWeight: 700, '&:hover': { bgcolor: '#155528' } }}>
            {toggling ? <CircularProgress size={16} /> : 'Restore Grid'}
          </Button>
        </Box>
      </Box>

      {/* Message */}
      {message && (
        <Box sx={{
          p: 1.5, display: 'flex', gap: 1, alignItems: 'center', borderRadius: '4px',
          bgcolor: message.type === 'error' ? 'rgba(193,85,58,.08)' : 'rgba(110,155,123,.08)',
          border: `1px solid ${message.type === 'error' ? 'var(--color-rust)' : 'var(--color-sage)'}`,
        }}>
          {message.type === 'error' ? <ErrorIcon sx={{ color: 'var(--color-rust)', fontSize: 18 }} /> : <OkIcon sx={{ color: 'var(--color-sage)', fontSize: 18 }} />}
          <Typography variant="body2" sx={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{message.text}</Typography>
        </Box>
      )}

      {/* ── Machine Sliders ───────────────────────────────────── */}
      <Box>
        <Typography variant="overline" sx={{ color: 'var(--color-ink-muted)', letterSpacing: 1.5 }}>
          Machine Load Controls
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {machines.map(m => (
            <MachineSliderCard key={m.id} machine={m} onUpdate={(updated) => {
              setMachines(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
            }} />
          ))}
        </Box>
      </Box>

      {/* Reset */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
        <Button variant="outlined" size="small" startIcon={<ResetIcon />} onClick={handleReset}
          sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', borderColor: 'var(--color-line)', color: 'var(--color-ink-muted)', '&:hover': { borderColor: 'var(--color-rust)', color: 'var(--color-rust)' } }}>
          Reset Demo
        </Button>
      </Box>
    </Box>
  )
}

function MachineSliderCard({ machine, onUpdate }) {
  const [load, setLoad] = useState(machine.current_load_percent)
  const [localStatus, setLocalStatus] = useState(machine.status)
  const [adjusting, setAdjusting] = useState(false)
  const debounceRef = useRef(null)

  // Sync when polls bring new data
  useEffect(() => {
    if (!adjusting) {
      setLoad(machine.current_load_percent)
      setLocalStatus(machine.status)
    }
  }, [machine.current_load_percent, machine.status, adjusting])

  const sendAdjust = useCallback(async (updates) => {
    setAdjusting(true)
    try {
      const { machine: updated } = await adjustMachine(machine.id, updates)
      onUpdate(updated)
    } catch { /* silent */ }
    finally { setTimeout(() => setAdjusting(false), 500) }
  }, [machine.id, onUpdate])

  const handleSlider = (_e, val) => {
    setLoad(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => sendAdjust({ load_percent: val }), 300)
  }

  const handleStatusChange = (newStatus) => {
    setLocalStatus(newStatus)
    sendAdjust({ status: newStatus, load_percent: newStatus === 'running' ? (load || 50) : 0 })
  }

  const isRunning = localStatus === 'running'
  const drawKw = isRunning ? (machine.base_power_kw * load / 100) : 0

  const statusColors = {
    running: 'var(--color-sage)',
    idle: 'var(--color-amber)',
    off: 'var(--color-ink-muted)',
  }

  return (
    <Box sx={{
      p: 2, border: '1px solid var(--color-line)', borderRadius: '6px', bgcolor: 'var(--color-surface)',
      borderLeft: `3px solid ${statusColors[localStatus]}`,
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)' }}>{machine.name}</Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
            Base: {machine.base_power_kw} kW · Cost today: ₹{parseFloat(machine.cost_today || 0).toFixed(1)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" onClick={() => handleStatusChange('running')}
            sx={{ color: localStatus === 'running' ? 'var(--color-sage)' : 'var(--color-ink-muted)', bgcolor: localStatus === 'running' ? 'rgba(110,155,123,.12)' : 'transparent' }}>
            <RunIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleStatusChange('idle')}
            sx={{ color: localStatus === 'idle' ? 'var(--color-amber)' : 'var(--color-ink-muted)', bgcolor: localStatus === 'idle' ? 'rgba(217,142,46,.12)' : 'transparent' }}>
            <IdleIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleStatusChange('off')}
            sx={{ color: localStatus === 'off' ? 'var(--color-rust)' : 'var(--color-ink-muted)', bgcolor: localStatus === 'off' ? 'rgba(193,85,58,.12)' : 'transparent' }}>
            <StopIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Slider
          value={load} min={0} max={100} step={5}
          disabled={!isRunning}
          onChange={handleSlider}
          sx={{
            flex: 1, color: 'var(--color-amber)',
            '& .MuiSlider-thumb': { width: 16, height: 16 },
            '& .Mui-disabled': { color: 'var(--color-line)' },
          }}
        />
        <Typography sx={{
          fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', minWidth: 50, textAlign: 'right',
          color: isRunning ? 'var(--color-ink)' : 'var(--color-ink-muted)',
        }}>
          {load}%
        </Typography>
        <Typography sx={{
          fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.875rem', minWidth: 70, textAlign: 'right',
          color: drawKw > 0 ? 'var(--color-amber)' : 'var(--color-ink-muted)',
        }}>
          {drawKw.toFixed(1)} kW
        </Typography>
      </Box>
    </Box>
  )
}
