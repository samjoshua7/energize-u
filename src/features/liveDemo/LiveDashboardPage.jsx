import React, { useState, useEffect, useRef } from 'react'
import { Box, Typography, CircularProgress, Chip } from '@mui/material'
import {
  FlashOn as FlashOnIcon, FlashOff as FlashOffIcon, WarningAmber as WarnIcon,
  LocalGasStation as DieselIcon, Bolt as BoltIcon, Co2 as Co2Icon, Speed as LoadIcon,
} from '@mui/icons-material'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { fetchStatus, fetchEvents, fetchMachines, healthCheck } from './api'

const POLL_MS = 2000
const MAX_CHART = 120
const MAX_SPARK = 60

export default function LiveDashboardPage() {
  const [status, setStatus] = useState(null)
  const [events, setEvents] = useState([])
  const [machineData, setMachineData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [coldStart, setColdStart] = useState(true)
  const [error, setError] = useState(null)
  const [costChart, setCostChart] = useState([])
  const [sparklines, setSparklines] = useState({}) // { machineId: [{t, kw}] }
  const prevLoadRef = useRef({})

  // Boot
  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        await healthCheck(); if (c) return; setColdStart(false)
        const [s, e, m] = await Promise.all([fetchStatus(), fetchEvents(30), fetchMachines()])
        if (!c) { setStatus(s); setEvents(e.events||[]); setMachineData(m); setError(null) }
      } catch (err) { if (!c) setError('Backend not reachable') }
      finally { if (!c) setLoading(false) }
    })()
    return () => { c = true }
  }, [])

  // Poll
  useEffect(() => {
    if (loading) return
    const poll = async () => {
      try {
        const [s, e, m] = await Promise.all([fetchStatus(), fetchEvents(30), fetchMachines()])
        setStatus(s); setEvents(e.events||[]); setMachineData(m); setError(null)

        const now = new Date()
        const timeStr = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })

        // Cost chart accumulation
        if (s?.today) {
          setCostChart(prev => {
            const next = [...prev, { time: timeStr, grid: s.today.grid_cost, genset: s.today.genset_cost }]
            return next.length > MAX_CHART ? next.slice(-MAX_CHART) : next
          })
        }

        // Sparkline accumulation per machine
        if (m?.machines) {
          setSparklines(prev => {
            const next = { ...prev }
            for (const mc of m.machines) {
              const arr = next[mc.id] || []
              arr.push({ t: timeStr, kw: mc.power_draw_kw })
              next[mc.id] = arr.length > MAX_SPARK ? arr.slice(-MAX_SPARK) : arr
            }
            return next
          })
        }
      } catch { /* silent */ }
    }
    poll()
    const tid = setInterval(poll, POLL_MS)
    return () => clearInterval(tid)
  }, [loading])

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <CircularProgress sx={{ color: 'var(--color-amber)' }} />
        <Typography sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
          {coldStart ? 'Waking up backend (cold start)…' : 'Connecting…'}
        </Typography>
      </Box>
    )
  }
  if (error && !status) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <WarnIcon sx={{ fontSize: 40, color: 'var(--color-rust)', mb: 1 }} />
        <Typography sx={{ color: 'var(--color-ink)' }}>{error}</Typography>
      </Box>
    )
  }

  const gridOn = status?.grid?.status === 'on'
  const gensetOn = status?.genset?.status === 'on'
  const today = status?.today || {}
  const machines = machineData?.machines || []

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 1060, mx: 'auto', py: 3, px: 2 }}>

      {/* ── Status Banner ──────────────────────────────────── */}
      <Box sx={{
        p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: '6px',
        border: `1.5px solid ${gridOn ? 'var(--color-sage)' : 'var(--color-rust)'}`,
        bgcolor: gridOn ? 'rgba(110,155,123,.06)' : 'rgba(193,85,58,.06)',
        transition: 'all 0.4s',
      }}>
        {gridOn
          ? <FlashOnIcon sx={{ fontSize: 28, color: 'var(--color-sage)' }} />
          : <FlashOffIcon sx={{ fontSize: 28, color: 'var(--color-rust)', animation: 'pulse-glow 1.5s ease-in-out infinite',
              '@keyframes pulse-glow': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }} />}
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: gridOn ? 'var(--color-sage)' : 'var(--color-rust)' }}>
            {gridOn ? 'DISCOM Grid: Active' : '⚠️ GRID DOWN — Genset Running'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
            {gridOn ? 'All systems on mains power' : `Diesel genset auto-started · ${formatDur(status?.genset_running?.running_seconds||0)}`}
          </Typography>
        </Box>
        {gensetOn && status?.genset_running && (
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-amber)' }}>
              ₹{status.genset_running.cost_so_far.toFixed(0)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
              {status.genset_running.diesel_so_far.toFixed(3)} L
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Total Live Load + Top Metrics ─────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
        <MetricCard icon={<LoadIcon />} label="Total Live Load" value={`${machineData?.total_load_kw?.toFixed(1) || '0'} kW`}
          accent="var(--color-amber)" large />
        <MetricCard icon={<BoltIcon />} label="Cost Today" value={`₹${today.total_cost?.toFixed(0) || '0'}`} accent="var(--color-amber)" />
        <MetricCard icon={<DieselIcon />} label="Diesel Used" value={`${today.diesel_litres?.toFixed(2) || '0'} L`} accent="var(--color-rust)" />
        <MetricCard icon={<Co2Icon />} label="CO₂ Today" value={`${today.co2_kg?.toFixed(1) || '0'} kg`} accent="var(--color-ink-muted)" />
        <MetricCard icon={<BoltIcon />} label="Grid kWh" value={`${today.grid_kwh?.toFixed(0) || '0'}`} accent="var(--color-sage)" />
      </Box>

      {/* ── Machine Cards Grid ────────────────────────────── */}
      <Box>
        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)', mb: 1.5 }}>
          Live Machine Telemetry
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
          {machines.map(m => (
            <MachineCard key={m.id} machine={m} sparkData={sparklines[m.id] || []}
              prevLoad={prevLoadRef.current[m.id]} />
          ))}
        </Box>
      </Box>

      {/* Update prevLoad for change detection */}
      <PrevLoadUpdater machines={machines} prevLoadRef={prevLoadRef} />

      {/* ── Cost Accumulation Chart ───────────────────────── */}
      <Box sx={{ border: '1px solid var(--color-line)', borderRadius: '6px', bgcolor: 'var(--color-surface)', p: 2.5 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)', mb: 0.5 }}>
          Live Cost Accumulation
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mb: 2 }}>
          Cumulative ₹ by source — updates every 2s
        </Typography>
        <Box sx={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <AreaChart data={costChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-sage)" stopOpacity={.3} /><stop offset="95%" stopColor="var(--color-sage)" stopOpacity={0} /></linearGradient>
                <linearGradient id="df" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-rust)" stopOpacity={.4} /><stop offset="95%" stopColor="var(--color-rust)" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis dataKey="time" tick={{ fill: 'var(--color-ink-muted)', fontSize: 9, fontFamily: 'IBM Plex Mono' }} stroke="var(--color-line)" interval="preserveStartEnd" minTickGap={60} />
              <YAxis tick={{ fill: 'var(--color-ink-muted)', fontSize: 9, fontFamily: 'IBM Plex Mono' }} stroke="var(--color-line)" tickFormatter={v=>`₹${v}`} width={50} />
              <Tooltip content={<CostTooltip />} />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: '0.7rem', fontFamily: 'IBM Plex Mono' }} />
              <Area type="monotone" dataKey="grid" name="Grid ₹" stroke="var(--color-sage)" fill="url(#gf)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="genset" name="Genset ₹" stroke="var(--color-rust)" fill="url(#df)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* ── Event Log ─────────────────────────────────────── */}
      <Box>
        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)', pb: 1, borderBottom: '1px solid var(--color-line)' }}>
          Event Log ({events.length})
        </Typography>
        {events.length === 0
          ? <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', p: 2, textAlign: 'center' }}>No events yet</Typography>
          : events.slice(0, 20).map(evt => <EventRow key={evt.id} event={evt} />)}
      </Box>
    </Box>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

function MetricCard({ icon, label, value, accent, large }) {
  return (
    <Box sx={{
      p: 1.5, border: '1px solid var(--color-line)', borderRadius: '6px', bgcolor: 'var(--color-surface)',
      gridColumn: large ? { xs: 'span 2', sm: 'span 1' } : undefined,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        {React.cloneElement(icon, { sx: { fontSize: 14, color: accent } })}
        <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.65rem' }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: large ? '1.4rem' : '1.1rem', fontWeight: 700, color: 'var(--color-ink)' }}>
        {value}
      </Typography>
    </Box>
  )
}

function MachineCard({ machine, sparkData, prevLoad }) {
  const isRunning = machine.status === 'running'
  const changed = prevLoad !== undefined && prevLoad !== machine.power_draw_kw

  const statusColor = { running: 'var(--color-sage)', idle: 'var(--color-amber)', off: 'var(--color-ink-muted)' }[machine.status]

  return (
    <Box sx={{
      p: 2, border: '1px solid var(--color-line)', borderRadius: '6px', bgcolor: 'var(--color-surface)',
      borderLeft: `3px solid ${statusColor}`,
      transition: 'box-shadow 0.3s',
      boxShadow: changed ? `0 0 12px ${statusColor}` : 'none',
      animation: changed ? 'card-pulse 0.6s ease-out' : 'none',
      '@keyframes card-pulse': { '0%': { transform: 'scale(1.01)' }, '100%': { transform: 'scale(1)' } },
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-ink)' }}>{machine.name}</Typography>
        <Chip label={machine.status.toUpperCase()} size="small" sx={{
          fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, height: 20,
          bgcolor: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}`,
        }} />
      </Box>

      {/* Power draw + load */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography sx={{
          fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700,
          color: isRunning ? 'var(--color-ink)' : 'var(--color-ink-muted)',
          transition: 'color 0.3s',
        }}>
          {machine.power_draw_kw.toFixed(1)} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>kW</span>
        </Typography>
        <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
          {machine.current_load_percent}% of {machine.base_power_kw}kW
        </Typography>
      </Box>

      {/* Sparkline */}
      {sparkData.length > 2 && (
        <Box sx={{ width: '100%', height: 50, mb: 1 }}>
          <ResponsiveContainer>
            <LineChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <Line type="monotone" dataKey="kw" stroke={statusColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Cost today */}
      <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-amber)' }}>
        ₹{parseFloat(machine.cost_today || 0).toFixed(1)} today · {parseFloat(machine.kwh_today || 0).toFixed(2)} kWh
      </Typography>
    </Box>
  )
}

function PrevLoadUpdater({ machines, prevLoadRef }) {
  useEffect(() => {
    const next = {}
    for (const m of machines) next[m.id] = m.power_draw_kw
    // Delay so the "changed" detection works for one render cycle
    const t = setTimeout(() => { prevLoadRef.current = next }, 800)
    return () => clearTimeout(t)
  }, [machines, prevLoadRef])
  return null
}

function EventRow({ event }) {
  const labels = { grid_outage: '⚡ Grid Outage', genset_on: '🔥 Genset On', grid_restored: '✅ Grid Restored', genset_off: '🛑 Genset Off' }
  const isOpen = !event.ended_at
  const hasCost = event.cost_incurred && parseFloat(event.cost_incurred) > 0
  const time = new Date(event.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <Box sx={{
      py: 1, px: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: '1px solid var(--color-line)', gap: 1, '&:hover': { bgcolor: 'var(--color-subtle-bg)' },
    }}>
      <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-ink-muted)', width: 70 }}>{time}</Typography>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: isOpen ? 'var(--color-rust)' : 'var(--color-ink)' }}>
          {labels[event.event_type] || event.event_type}
          {isOpen && <Chip label="LIVE" size="small" sx={{ ml: 1, height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: 'var(--color-rust)', color: '#fff' }} />}
        </Typography>
      </Box>
      <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-ink)', width: 60, textAlign: 'right' }}>
        {event.duration_seconds != null ? formatDur(event.duration_seconds) : isOpen ? 'ongoing' : '—'}
      </Typography>
      <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: hasCost ? 600 : 400, color: hasCost ? 'var(--color-amber)' : 'var(--color-ink-muted)', width: 70, textAlign: 'right' }}>
        {hasCost ? `₹${parseFloat(event.cost_incurred).toFixed(0)}` : '—'}
      </Typography>
    </Box>
  )
}

function CostTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{ bgcolor: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: '4px', p: 1.5, minWidth: 140 }}>
      <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-ink-muted)', mb: 0.5 }}>{label}</Typography>
      {payload.map(e => (
        <Box key={e.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography sx={{ fontSize: '0.7rem', color: e.color }}>{e.name}</Typography>
          <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-ink)' }}>₹{e.value?.toFixed(2)}</Typography>
        </Box>
      ))}
    </Box>
  )
}

function formatDur(s) {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), r = s % 60
  return m < 60 ? `${m}m ${r}s` : `${Math.floor(m/60)}h ${m%60}m`
}
