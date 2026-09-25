import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Box, Typography, CircularProgress, Chip } from '@mui/material'
import {
  FlashOn as FlashOnIcon, FlashOff as FlashOffIcon,
  LocalGasStation as DieselIcon, Bolt as BoltIcon, Co2 as Co2Icon,
  Speed as LoadIcon, PowerSettingsNew as PowerIcon, TrendingUp as TrendIcon,
} from '@mui/icons-material'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from 'recharts'
import { fetchStatus, fetchEvents, fetchMachines, healthCheck } from './api'

const POLL_MS = 2000
const MAX_TIMELINE = 90

export default function LiveDashboardPage() {
  const [status, setStatus] = useState(null)
  const [events, setEvents] = useState([])
  const [machineData, setMachineData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [coldStart, setColdStart] = useState(true)
  const [error, setError] = useState(null)
  const [timeline, setTimeline] = useState([])       // stacked power over time
  const [sparklines, setSparklines] = useState({})
  const prevRef = useRef({})

  // Boot
  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        await healthCheck(); if (c) return; setColdStart(false)
        const [s, e, m] = await Promise.all([fetchStatus(), fetchEvents(30), fetchMachines()])
        if (!c) { setStatus(s); setEvents(e.events || []); setMachineData(m); setError(null) }
      } catch { if (!c) setError('Backend not reachable') }
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
        setStatus(s); setEvents(e.events || []); setMachineData(m); setError(null)

        const now = new Date()
        const ts = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

        // Build stacked timeline point: one key per machine name
        if (m?.machines) {
          setTimeline(prev => {
            const point = { time: ts }
            let totalKw = 0
            for (const mc of m.machines) {
              point[mc.name] = mc.power_draw_kw
              totalKw += mc.power_draw_kw
            }
            point._total = totalKw
            const next = [...prev, point]
            return next.length > MAX_TIMELINE ? next.slice(-MAX_TIMELINE) : next
          })

          // Sparklines per machine
          setSparklines(prev => {
            const next = { ...prev }
            for (const mc of m.machines) {
              const arr = next[mc.id] || []
              arr.push({ t: ts, kw: mc.power_draw_kw })
              next[mc.id] = arr.length > 60 ? arr.slice(-60) : arr
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

  // Detect changes for pulse animation
  const changedIds = useMemo(() => {
    const ids = new Set()
    if (machineData?.machines) {
      for (const m of machineData.machines) {
        if (prevRef.current[m.id] !== undefined && prevRef.current[m.id] !== m.power_draw_kw) {
          ids.add(m.id)
        }
      }
      // Update refs after comparison
      const next = {}
      for (const m of machineData.machines) next[m.id] = m.power_draw_kw
      setTimeout(() => { prevRef.current = next }, 1000)
    }
    return ids
  }, [machineData])

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#0D1117', gap: 2 }}>
        <CircularProgress sx={{ color: '#D98E2E' }} />
        <Typography sx={{ color: '#8B949E', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.85rem' }}>
          {coldStart ? 'Waking up backend…' : 'Connecting to live feed…'}
        </Typography>
      </Box>
    )
  }

  if (error && !status) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0D1117' }}>
        <Typography sx={{ color: '#F85149' }}>{error}</Typography>
      </Box>
    )
  }

  const gridOn = status?.grid?.status === 'on'
  const gensetOn = status?.genset?.status === 'on'
  const today = status?.today || {}
  const machines = machineData?.machines || []
  const totalLoad = machineData?.total_load_kw || 0
  const maxPossibleLoad = machines.reduce((s, m) => s + parseFloat(m.base_power_kw || 0), 0)
  const loadPct = maxPossibleLoad > 0 ? ((totalLoad / maxPossibleLoad) * 100).toFixed(0) : 0

  // Colors for stacked chart
  const MACHINE_COLORS = ['#D98E2E', '#6E9B7B', '#C1553A', '#58A6FF', '#BC8CFF']

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0D1117', color: '#E6EDF3', fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ══════ Top Status Bar ══════ */}
      <Box sx={{
        px: 3, py: 1.5, display: 'flex', alignItems: 'center', gap: 3,
        borderBottom: `2px solid ${gridOn ? '#238636' : '#F85149'}`,
        bgcolor: gridOn ? 'rgba(35,134,54,.06)' : 'rgba(248,81,73,.06)',
        flexWrap: 'wrap',
      }}>
        {/* Grid status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {gridOn
            ? <FlashOnIcon sx={{ color: '#238636', fontSize: 22 }} />
            : <FlashOffIcon sx={{ color: '#F85149', fontSize: 22, animation: 'blink 1s infinite', '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />}
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '0.85rem', color: gridOn ? '#238636' : '#F85149' }}>
            {gridOn ? 'DISCOM GRID ACTIVE' : '⚠ GRID DOWN — GENSET RUNNING'}
          </Typography>
        </Box>

        {gensetOn && status?.genset_running && (
          <Chip icon={<DieselIcon sx={{ fontSize: 14 }} />}
            label={`Genset: ${status.genset_running.diesel_so_far.toFixed(2)}L · ₹${status.genset_running.cost_so_far.toFixed(0)}`}
            size="small" sx={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 600,
              bgcolor: 'rgba(248,81,73,.1)', color: '#F85149', border: '1px solid #F85149',
              '& .MuiChip-icon': { color: '#F85149' },
            }}
          />
        )}

        <Box sx={{ flex: 1 }} />

        {/* Live clock */}
        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#8B949E' }}>
          LIVE · polling every 2s
        </Typography>
      </Box>

      {/* ══════ Main Content ══════ */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 0 }}>

        {/* ── Left Column: Plant Vitals + Machine Cards ── */}
        <Box sx={{ flex: 1, p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 0 }}>

          {/* Plant Vitals Header */}
          <Box sx={{
            display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr 1fr' }, gap: 1.5,
          }}>
            {/* Total Load — hero metric */}
            <Box sx={{
              p: 2, borderRadius: '8px', border: '1px solid #30363D', bgcolor: '#161B22',
              gridColumn: { xs: 'span 2', sm: 'span 1' }, position: 'relative', overflow: 'hidden',
            }}>
              {/* Animated fill bar */}
              <Box sx={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${Math.min(loadPct, 100)}%`,
                bgcolor: parseFloat(loadPct) > 80 ? 'rgba(248,81,73,.08)' : 'rgba(217,142,46,.08)',
                transition: 'height 0.6s ease',
              }} />
              <Box sx={{ position: 'relative' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <LoadIcon sx={{ fontSize: 14, color: '#D98E2E' }} />
                  <Typography sx={{ fontSize: '0.6rem', color: '#8B949E', textTransform: 'uppercase', letterSpacing: 1 }}>Plant Load</Typography>
                </Box>
                <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>
                  {totalLoad.toFixed(1)}
                  <span style={{ fontSize: '0.7rem', fontWeight: 400, marginLeft: 2, color: '#8B949E' }}>kW</span>
                </Typography>
                <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#8B949E', mt: 0.5 }}>
                  {loadPct}% of {maxPossibleLoad.toFixed(0)} kW capacity
                </Typography>
              </Box>
            </Box>

            <VitalCard icon={<BoltIcon />} label="COST TODAY" value={`₹${today.total_cost?.toFixed(0) || '0'}`}
              sub={`Grid ₹${today.grid_cost?.toFixed(0) || '0'} · Gen ₹${today.genset_cost?.toFixed(0) || '0'}`} color="#D98E2E" />
            <VitalCard icon={<DieselIcon />} label="DIESEL" value={`${today.diesel_litres?.toFixed(2) || '0.00'} L`}
              sub={`₹${((today.diesel_litres || 0) * 90).toFixed(0)} worth`} color="#F85149" />
            <VitalCard icon={<Co2Icon />} label="CO₂ EMITTED" value={`${today.co2_kg?.toFixed(1) || '0'} kg`}
              sub={`Grid ${today.grid_co2_kg?.toFixed(1) || '0'} + Gen ${today.genset_co2_kg?.toFixed(1) || '0'}`} color="#8B949E" />
            <VitalCard icon={<TrendIcon />} label="GRID kWh" value={`${today.grid_kwh?.toFixed(0) || '0'}`}
              sub={`@ ₹${status?.constants?.grid_cost_per_kwh || 8}/kWh`} color="#238636" />
          </Box>

          {/* Machine Vitals Grid */}
          <Box>
            <Typography sx={{ fontSize: '0.7rem', color: '#8B949E', textTransform: 'uppercase', letterSpacing: 1.5, mb: 1.5 }}>
              Machine Vitals — Live
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1.5 }}>
              {machines.map((m, i) => (
                <MachineVitalCard
                  key={m.id}
                  machine={m}
                  sparkData={sparklines[m.id] || []}
                  color={MACHINE_COLORS[i % MACHINE_COLORS.length]}
                  changed={changedIds.has(m.id)}
                />
              ))}
            </Box>
          </Box>

          {/* Event Log */}
          <Box sx={{ border: '1px solid #30363D', borderRadius: '8px', bgcolor: '#161B22', p: 2 }}>
            <Typography sx={{ fontSize: '0.7rem', color: '#8B949E', textTransform: 'uppercase', letterSpacing: 1.5, mb: 1 }}>
              Event Log ({events.length})
            </Typography>
            {events.length === 0
              ? <Typography sx={{ color: '#484F58', fontSize: '0.8rem', textAlign: 'center', py: 2 }}>No events yet — use simulator to trigger outages</Typography>
              : events.slice(0, 12).map(evt => <EventRow key={evt.id} event={evt} />)}
          </Box>
        </Box>

        {/* ── Right Column: Power Timeline Chart ── */}
        <Box sx={{
          width: { xs: '100%', lg: 420 }, p: 2.5,
          borderLeft: { lg: '1px solid #21262D' },
          display: 'flex', flexDirection: 'column', gap: 2.5,
        }}>
          {/* Stacked Power Draw Chart */}
          <Box sx={{ border: '1px solid #30363D', borderRadius: '8px', bgcolor: '#161B22', p: 2 }}>
            <Typography sx={{ fontSize: '0.7rem', color: '#8B949E', textTransform: 'uppercase', letterSpacing: 1.5, mb: 0.5 }}>
              Live Power Draw — All Machines
            </Typography>
            <Typography sx={{ fontSize: '0.6rem', color: '#484F58', fontFamily: "'IBM Plex Mono', monospace", mb: 2 }}>
              Stacked kW by machine · {timeline.length} data points
            </Typography>
            <Box sx={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={timeline} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
                  <XAxis dataKey="time" tick={{ fill: '#484F58', fontSize: 8, fontFamily: 'IBM Plex Mono' }} stroke="#21262D" interval="preserveStartEnd" minTickGap={50} />
                  <YAxis tick={{ fill: '#484F58', fontSize: 8, fontFamily: 'IBM Plex Mono' }} stroke="#21262D" tickFormatter={v => `${v}kW`} width={42} />
                  <Tooltip content={<PowerTooltip />} />
                  {machines.map((m, i) => (
                    <Area key={m.id} type="monotone" dataKey={m.name} stackId="power"
                      stroke={MACHINE_COLORS[i % MACHINE_COLORS.length]}
                      fill={MACHINE_COLORS[i % MACHINE_COLORS.length]}
                      fillOpacity={0.3} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>

          {/* Cost Accumulation Chart */}
          <Box sx={{ border: '1px solid #30363D', borderRadius: '8px', bgcolor: '#161B22', p: 2 }}>
            <Typography sx={{ fontSize: '0.7rem', color: '#8B949E', textTransform: 'uppercase', letterSpacing: 1.5, mb: 0.5 }}>
              Cost Accumulation — ₹
            </Typography>
            <Typography sx={{ fontSize: '0.6rem', color: '#484F58', fontFamily: "'IBM Plex Mono', monospace", mb: 2 }}>
              Grid vs Genset cumulative spend
            </Typography>
            <Box sx={{ width: '100%', height: 180 }}>
              <ResponsiveContainer>
                <AreaChart data={timeline} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
                  <XAxis dataKey="time" tick={false} stroke="#21262D" />
                  <YAxis tick={{ fill: '#484F58', fontSize: 8, fontFamily: 'IBM Plex Mono' }} stroke="#21262D" width={35} />
                  <Area type="monotone" dataKey="_total" stroke="#D98E2E" fill="#D98E2E" fillOpacity={0.1} strokeWidth={2} dot={false} isAnimationActive={false} name="Total kW" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>

          {/* Machine Legend */}
          <Box sx={{ border: '1px solid #30363D', borderRadius: '8px', bgcolor: '#161B22', p: 2 }}>
            <Typography sx={{ fontSize: '0.7rem', color: '#8B949E', textTransform: 'uppercase', letterSpacing: 1.5, mb: 1.5 }}>
              Machine Index
            </Typography>
            {machines.map((m, i) => {
              const pct = maxPossibleLoad > 0 ? ((m.power_draw_kw / maxPossibleLoad) * 100).toFixed(1) : 0
              return (
                <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, borderBottom: '1px solid #21262D' }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: MACHINE_COLORS[i % MACHINE_COLORS.length], flexShrink: 0 }} />
                  <Typography sx={{ flex: 1, fontSize: '0.75rem', color: '#E6EDF3' }}>{m.name}</Typography>
                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: 600, color: '#E6EDF3', minWidth: 55, textAlign: 'right' }}>
                    {m.power_draw_kw.toFixed(1)} kW
                  </Typography>
                  <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#8B949E', minWidth: 35, textAlign: 'right' }}>
                    {pct}%
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

function VitalCard({ icon, label, value, sub, color }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: '8px', border: '1px solid #30363D', bgcolor: '#161B22' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        {React.cloneElement(icon, { sx: { fontSize: 12, color } })}
        <Typography sx={{ fontSize: '0.55rem', color: '#8B949E', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
      <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.55rem', color: '#484F58', mt: 0.25 }}>{sub}</Typography>
    </Box>
  )
}

function MachineVitalCard({ machine, sparkData, color, changed }) {
  const m = machine
  const isRunning = m.status === 'running'
  const loadPct = m.current_load_percent
  const drawKw = m.power_draw_kw

  return (
    <Box sx={{
      p: 2, borderRadius: '8px', border: '1px solid #30363D', bgcolor: '#161B22',
      borderLeft: `3px solid ${color}`,
      transition: 'box-shadow 0.4s, transform 0.3s',
      boxShadow: changed ? `0 0 20px ${color}50` : 'none',
      transform: changed ? 'scale(1.01)' : 'scale(1)',
    }}>
      {/* Header: name + status */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.name}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isRunning && (
            <Box sx={{
              width: 6, height: 6, borderRadius: '50%', bgcolor: '#238636',
              animation: 'pulse-dot 1.5s infinite',
              '@keyframes pulse-dot': {
                '0%': { boxShadow: '0 0 0 0 rgba(35,134,54,.5)' },
                '70%': { boxShadow: '0 0 0 6px rgba(35,134,54,0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(35,134,54,0)' },
              },
            }} />
          )}
          <Typography sx={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', fontWeight: 600,
            color: isRunning ? '#238636' : m.status === 'idle' ? '#D98E2E' : '#484F58',
            textTransform: 'uppercase',
          }}>
            {m.status}
          </Typography>
        </Box>
      </Box>

      {/* Big number: power draw */}
      <Typography sx={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: '2rem', fontWeight: 700, lineHeight: 1,
        color: isRunning ? '#E6EDF3' : '#484F58',
        transition: 'color 0.3s',
      }}>
        {drawKw.toFixed(1)}
        <span style={{ fontSize: '0.65rem', fontWeight: 400, marginLeft: 3, color: '#8B949E' }}>kW</span>
      </Typography>

      {/* Load bar */}
      <Box sx={{ mt: 1.5, mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#8B949E' }}>
            Load
          </Typography>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#8B949E' }}>
            {loadPct}% of {m.base_power_kw} kW
          </Typography>
        </Box>
        <Box sx={{ width: '100%', height: 6, bgcolor: '#21262D', borderRadius: '3px', overflow: 'hidden' }}>
          <Box sx={{
            width: `${loadPct}%`, height: '100%', borderRadius: '3px',
            bgcolor: loadPct > 80 ? '#F85149' : loadPct > 50 ? '#D98E2E' : '#238636',
            transition: 'width 0.5s ease, background-color 0.5s ease',
          }} />
        </Box>
      </Box>

      {/* Sparkline */}
      {sparkData.length > 3 && (
        <Box sx={{ width: '100%', height: 35, my: 0.5 }}>
          <ResponsiveContainer>
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="kw" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Cost row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: '1px solid #21262D' }}>
        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', color: '#D98E2E' }}>
          ₹{parseFloat(m.cost_today || 0).toFixed(1)}
        </Typography>
        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#484F58' }}>
          {parseFloat(m.kwh_today || 0).toFixed(2)} kWh
        </Typography>
      </Box>
    </Box>
  )
}

function EventRow({ event }) {
  const labels = { grid_outage: '⚡ Grid Outage', genset_on: '🔥 Genset On', grid_restored: '✅ Restored', genset_off: '🛑 Genset Off' }
  const isOpen = !event.ended_at
  const hasCost = event.cost_incurred && parseFloat(event.cost_incurred) > 0
  const time = new Date(event.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <Box sx={{
      py: 0.75, display: 'flex', alignItems: 'center', gap: 1.5,
      borderBottom: '1px solid #21262D', '&:last-child': { borderBottom: 'none' },
    }}>
      <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#484F58', width: 65 }}>{time}</Typography>
      <Typography sx={{ flex: 1, fontSize: '0.75rem', fontWeight: 600, color: isOpen ? '#F85149' : '#E6EDF3' }}>
        {labels[event.event_type] || event.event_type}
        {isOpen && <Chip label="LIVE" size="small" sx={{ ml: 1, height: 14, fontSize: '0.5rem', fontWeight: 700, bgcolor: '#F85149', color: '#fff' }} />}
      </Typography>
      <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', color: '#8B949E', width: 55, textAlign: 'right' }}>
        {event.duration_seconds != null ? fmtDur(event.duration_seconds) : isOpen ? 'ongoing' : '—'}
      </Typography>
      <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.7rem', fontWeight: hasCost ? 600 : 400, color: hasCost ? '#D98E2E' : '#484F58', width: 55, textAlign: 'right' }}>
        {hasCost ? `₹${parseFloat(event.cost_incurred).toFixed(0)}` : '—'}
      </Typography>
    </Box>
  )
}

function PowerTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{ bgcolor: '#161B22', border: '1px solid #30363D', borderRadius: '6px', p: 1.5, minWidth: 160 }}>
      <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6rem', color: '#8B949E', mb: 0.75 }}>{label}</Typography>
      {payload.filter(e => e.dataKey !== '_total').map(e => (
        <Box key={e.dataKey} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.15 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: e.color }} />
            <Typography sx={{ fontSize: '0.65rem', color: '#E6EDF3' }}>{e.dataKey}</Typography>
          </Box>
          <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', fontWeight: 600, color: '#E6EDF3' }}>
            {e.value?.toFixed(1)} kW
          </Typography>
        </Box>
      ))}
      <Box sx={{ borderTop: '1px solid #21262D', mt: 0.5, pt: 0.5, display: 'flex', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#D98E2E' }}>Total</Typography>
        <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.65rem', fontWeight: 700, color: '#D98E2E' }}>
          {payload.filter(e => e.dataKey !== '_total').reduce((s, e) => s + (e.value || 0), 0).toFixed(1)} kW
        </Typography>
      </Box>
    </Box>
  )
}

function fmtDur(s) {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), r = s % 60
  return m < 60 ? `${m}m ${r}s` : `${Math.floor(m / 60)}h ${m % 60}m`
}
