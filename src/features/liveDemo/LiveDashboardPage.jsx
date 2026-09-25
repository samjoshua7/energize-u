import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Divider,
  Chip,
} from '@mui/material'
import {
  FlashOn as FlashOnIcon,
  FlashOff as FlashOffIcon,
  WarningAmber as WarnIcon,
  LocalGasStation as DieselIcon,
  Bolt as BoltIcon,
  Co2 as Co2Icon,
} from '@mui/icons-material'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { fetchStatus, fetchEvents, healthCheck } from './api'

const POLL_INTERVAL = 2000   // 2 seconds
const MAX_CHART_POINTS = 120 // 4 minutes of data at 2s intervals

export default function LiveDashboardPage() {
  const [status, setStatus] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [coldStart, setColdStart] = useState(true)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState([])
  const pollRef = useRef(null)

  // Boot: wake backend, then start polling
  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        await healthCheck()
        if (cancelled) return
        setColdStart(false)

        const [statusData, eventsData] = await Promise.all([
          fetchStatus(),
          fetchEvents(30),
        ])
        if (cancelled) return
        setStatus(statusData)
        setEvents(eventsData.events || [])
        setError(null)
      } catch (err) {
        if (!cancelled) setError('Backend not reachable — is the server running?')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    boot()
    return () => { cancelled = true }
  }, [])

  // Polling loop
  useEffect(() => {
    if (loading) return

    async function poll() {
      try {
        const [statusData, eventsData] = await Promise.all([
          fetchStatus(),
          fetchEvents(30),
        ])
        setStatus(statusData)
        setEvents(eventsData.events || [])
        setError(null)

        // Accumulate chart data point
        if (statusData?.today) {
          const now = new Date()
          setChartData(prev => {
            const point = {
              time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              ts: now.getTime(),
              grid: statusData.today.grid_cost,
              genset: statusData.today.genset_cost,
              total: statusData.today.total_cost,
            }
            const next = [...prev, point]
            return next.length > MAX_CHART_POINTS ? next.slice(-MAX_CHART_POINTS) : next
          })
        }
      } catch {
        // Silent — dashboard keeps showing last known state
      }
    }

    poll() // immediate first poll
    pollRef.current = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [loading])

  // ─── Loading / Error states ──────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}>
        <CircularProgress sx={{ color: 'var(--color-amber)' }} />
        <Typography sx={{
          color: 'var(--color-ink-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.875rem',
        }}>
          {coldStart
            ? 'Waking up backend (Render free-tier cold start)…'
            : 'Connecting to live feed…'}
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 960 }}>

      {/* ── Live Status Banner ───────────────────────────────────── */}
      <Box sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderRadius: '6px',
        border: `1.5px solid ${gridOn ? 'var(--color-sage)' : 'var(--color-rust)'}`,
        bgcolor: gridOn
          ? 'rgba(110, 155, 123, 0.08)'
          : 'rgba(193, 85, 58, 0.08)',
        transition: 'all 0.4s ease',
      }}>
        {gridOn
          ? <FlashOnIcon sx={{ fontSize: 28, color: 'var(--color-sage)' }} />
          : <FlashOffIcon sx={{
              fontSize: 28,
              color: 'var(--color-rust)',
              animation: 'pulse-glow 1.5s ease-in-out infinite',
              '@keyframes pulse-glow': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.4 },
              },
            }} />}

        <Box sx={{ flex: 1 }}>
          <Typography sx={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '1rem',
            color: gridOn ? 'var(--color-sage)' : 'var(--color-rust)',
          }}>
            {gridOn ? 'DISCOM Grid: Active' : '⚠️ GRID DOWN — Genset Running'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
            {gridOn
              ? 'All systems on mains power'
              : `Diesel genset auto-started · Running ${formatDuration(status?.genset_running?.running_seconds || 0)}`}
          </Typography>
        </Box>

        {gensetOn && status?.genset_running && (
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-amber)',
            }}>
              ₹{status.genset_running.cost_so_far.toFixed(0)}/running
            </Typography>
            <Typography variant="caption" sx={{
              color: 'var(--color-ink-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
            }}>
              {status.genset_running.diesel_so_far.toFixed(3)} L consumed
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Metric Cards Row ─────────────────────────────────────── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' },
        gap: 2,
      }}>
        <MetricCard
          icon={<BoltIcon />}
          label="Total Cost Today"
          value={`₹${today.total_cost?.toLocaleString('en-IN', { minimumFractionDigits: 0 }) || '0'}`}
          detail={`Grid: ₹${today.grid_cost?.toFixed(0) || '0'} · Genset: ₹${today.genset_cost?.toFixed(0) || '0'}`}
          accentColor="var(--color-amber)"
        />
        <MetricCard
          icon={<DieselIcon />}
          label="Diesel Used Today"
          value={`${today.diesel_litres?.toFixed(2) || '0.00'} L`}
          detail={`@ ₹${status?.constants?.diesel_cost_per_litre || 90}/litre`}
          accentColor="var(--color-rust)"
        />
        <MetricCard
          icon={<Co2Icon />}
          label="CO₂ Emitted Today"
          value={`${today.co2_kg?.toFixed(2) || '0.00'} kg`}
          detail={`Grid: ${today.grid_co2_kg?.toFixed(1) || '0'} · Genset: ${today.genset_co2_kg?.toFixed(1) || '0'}`}
          accentColor="var(--color-ink-muted)"
        />
        <MetricCard
          icon={<BoltIcon />}
          label="Grid Consumption"
          value={`${today.grid_kwh?.toFixed(1) || '0'} kWh`}
          detail={`@ ₹${status?.constants?.grid_cost_per_kwh || 8}/kWh`}
          accentColor="var(--color-sage)"
        />
      </Box>

      {/* ── Live Cost Chart ──────────────────────────────────────── */}
      <Box sx={{
        border: '1px solid var(--color-line)',
        borderRadius: '6px',
        bgcolor: 'var(--color-surface)',
        p: 2.5,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
          <Box>
            <Typography sx={{
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: 'var(--color-ink)',
            }}>
              Live Cost Accumulation
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
              Cumulative ₹ by source — updates every 2 seconds
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`${chartData.length} pts`}
            sx={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              bgcolor: 'var(--color-subtle-bg)',
              color: 'var(--color-ink-muted)',
              border: '1px solid var(--color-line)',
            }}
          />
        </Box>

        <Box sx={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gridFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-sage)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-sage)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gensetFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-rust)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-rust)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis
                dataKey="time"
                tick={{ fill: 'var(--color-ink-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                stroke="var(--color-line)"
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis
                tick={{ fill: 'var(--color-ink-muted)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                stroke="var(--color-line)"
                tickFormatter={v => `₹${v}`}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={30}
                wrapperStyle={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono' }}
              />
              <Area
                type="monotone"
                dataKey="grid"
                name="Grid (₹)"
                stroke="var(--color-sage)"
                fill="url(#gridFill)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="genset"
                name="Genset (₹)"
                stroke="var(--color-rust)"
                fill="url(#gensetFill)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* ── Event History Feed ───────────────────────────────────── */}
      <Box>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          pb: 1,
          borderBottom: '1px solid var(--color-line)',
        }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-ink)' }}>
            Outage & Event Log
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
            {events.length} events
          </Typography>
        </Box>

        {events.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)' }}>
              No events recorded yet. Use the simulator to trigger a grid outage.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {events.map((evt) => (
              <EventRow key={evt.id} event={evt} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────

function MetricCard({ icon, label, value, detail, accentColor }) {
  return (
    <Box sx={{
      p: 2,
      border: '1px solid var(--color-line)',
      borderRadius: '6px',
      bgcolor: 'var(--color-surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        {React.cloneElement(icon, { sx: { fontSize: 16, color: accentColor } })}
        <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.6875rem' }}>
          {label}
        </Typography>
      </Box>
      <Typography sx={{
        fontFamily: 'var(--font-mono)',
        fontSize: '1.25rem',
        fontWeight: 700,
        color: 'var(--color-ink)',
        lineHeight: 1.2,
      }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{
        color: 'var(--color-ink-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.625rem',
      }}>
        {detail}
      </Typography>
    </Box>
  )
}

function EventRow({ event }) {
  const isOutage = event.event_type === 'grid_outage'
  const isGensetOn = event.event_type === 'genset_on'
  const isRestore = event.event_type === 'grid_restored'
  const isGensetOff = event.event_type === 'genset_off'

  const time = new Date(event.started_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const label = {
    grid_outage: '⚡ Grid Outage',
    genset_on: '🔥 Genset Started',
    grid_restored: '✅ Grid Restored',
    genset_off: '🛑 Genset Stopped',
  }[event.event_type] || event.event_type

  const isOpen = !event.ended_at
  const hasCost = event.cost_incurred && parseFloat(event.cost_incurred) > 0

  return (
    <Box sx={{
      py: 1.25,
      px: 0.5,
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid var(--color-line)',
      gap: 1,
      bgcolor: isOpen ? 'rgba(193, 85, 58, 0.04)' : 'transparent',
      '&:hover': { bgcolor: 'var(--color-subtle-bg)' },
    }}>
      {/* Time */}
      <Typography sx={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--color-ink-muted)',
        width: 80,
      }}>
        {time}
      </Typography>

      {/* Event type */}
      <Box sx={{ flex: 1, minWidth: 140 }}>
        <Typography variant="body2" sx={{
          fontWeight: 600,
          color: (isOutage || isGensetOn) ? 'var(--color-rust)' : 'var(--color-sage)',
          fontSize: '0.8125rem',
        }}>
          {label}
          {isOpen && (
            <Chip
              label="LIVE"
              size="small"
              sx={{
                ml: 1,
                height: 18,
                fontSize: '0.6rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                bgcolor: 'var(--color-rust)',
                color: '#fff',
                animation: 'pulse-glow 1.5s ease-in-out infinite',
                '@keyframes pulse-glow': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
          )}
        </Typography>
      </Box>

      {/* Duration */}
      <Typography sx={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--color-ink)',
        width: 80,
        textAlign: 'right',
      }}>
        {event.duration_seconds != null
          ? formatDuration(event.duration_seconds)
          : isOpen ? 'ongoing…' : '—'}
      </Typography>

      {/* Cost */}
      <Typography sx={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8125rem',
        fontWeight: hasCost ? 600 : 400,
        color: hasCost ? 'var(--color-amber)' : 'var(--color-ink-muted)',
        width: 90,
        textAlign: 'right',
      }}>
        {hasCost
          ? `₹${parseFloat(event.cost_incurred).toFixed(0)}`
          : event.diesel_litres ? `${parseFloat(event.diesel_litres).toFixed(2)}L` : '—'}
      </Typography>
    </Box>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{
      bgcolor: 'var(--color-surface)',
      border: '1px solid var(--color-line)',
      borderRadius: '4px',
      p: 1.5,
      minWidth: 160,
    }}>
      <Typography sx={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.6875rem',
        color: 'var(--color-ink-muted)',
        mb: 0.5,
      }}>
        {label}
      </Typography>
      {payload.map((entry) => (
        <Box key={entry.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Typography sx={{ fontSize: '0.75rem', color: entry.color }}>
            {entry.name}
          </Typography>
          <Typography sx={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-ink)',
          }}>
            ₹{entry.value?.toFixed(2)}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}
