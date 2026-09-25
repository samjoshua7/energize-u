import React, { useState, useEffect, useRef } from 'react'
import { Box, Typography, CircularProgress, Chip, BottomNavigation, BottomNavigationAction } from '@mui/material'
import {
  Home as HomeIcon, Precision as MachineIcon, NotificationsActive as AlertIcon,
  FlashOn as FlashOnIcon, FlashOff as FlashOffIcon, Bolt as BoltIcon,
  LocalGasStation as DieselIcon, Co2 as Co2Icon, Speed as LoadIcon,
} from '@mui/icons-material'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts'
import { fetchStatus, fetchEvents, fetchMachines, healthCheck } from './api'

const POLL_MS = 2000

export default function MobileDashboardPage() {
  const [tab, setTab] = useState(0)
  const [status, setStatus] = useState(null)
  const [events, setEvents] = useState([])
  const [machineData, setMachineData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sparklines, setSparklines] = useState({})

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        await healthCheck(); if (c) return
        const [s, e, m] = await Promise.all([fetchStatus(), fetchEvents(30), fetchMachines()])
        if (!c) { setStatus(s); setEvents(e.events||[]); setMachineData(m) }
      } catch { /* silent */ }
      finally { if (!c) setLoading(false) }
    })()
    return () => { c = true }
  }, [])

  useEffect(() => {
    if (loading) return
    const poll = async () => {
      try {
        const [s, e, m] = await Promise.all([fetchStatus(), fetchEvents(30), fetchMachines()])
        setStatus(s); setEvents(e.events||[]); setMachineData(m)
        if (m?.machines) {
          const t = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
          setSparklines(prev => {
            const next = { ...prev }
            for (const mc of m.machines) {
              const arr = next[mc.id] || []
              arr.push({ t, kw: mc.power_draw_kw })
              next[mc.id] = arr.length > 40 ? arr.slice(-40) : arr
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
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'var(--color-bg)', gap: 2 }}>
        <CircularProgress sx={{ color: 'var(--color-amber)' }} />
        <Typography sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>Connecting…</Typography>
      </Box>
    )
  }

  const gridOn = status?.grid?.status === 'on'
  const today = status?.today || {}
  const machines = machineData?.machines || []

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--color-bg)', display: 'flex', flexDirection: 'column', pb: '64px' }}>
      {/* Status bar */}
      <Box sx={{
        p: 1.5, display: 'flex', alignItems: 'center', gap: 1,
        bgcolor: gridOn ? 'rgba(110,155,123,.1)' : 'rgba(193,85,58,.1)',
        borderBottom: `2px solid ${gridOn ? 'var(--color-sage)' : 'var(--color-rust)'}`,
      }}>
        {gridOn ? <FlashOnIcon sx={{ color: 'var(--color-sage)', fontSize: 20 }} /> : <FlashOffIcon sx={{ color: 'var(--color-rust)', fontSize: 20 }} />}
        <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', color: gridOn ? 'var(--color-sage)' : 'var(--color-rust)' }}>
          {gridOn ? 'Grid Active' : '⚠️ Grid Down'}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-ink-muted)' }}>
          {machineData?.total_load_kw?.toFixed(1) || '0'} kW live
        </Typography>
      </Box>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {tab === 0 && <HomeTab today={today} machines={machines} machineData={machineData} status={status} />}
        {tab === 1 && <MachinesTab machines={machines} sparklines={sparklines} />}
        {tab === 2 && <AlertsTab events={events} />}
      </Box>

      {/* Bottom Nav */}
      <BottomNavigation value={tab} onChange={(_, v) => setTab(v)} showLabels
        sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10,
          bgcolor: 'var(--color-surface)', borderTop: '1px solid var(--color-line)',
          '& .Mui-selected': { color: 'var(--color-amber) !important' },
          '& .MuiBottomNavigationAction-root': { color: 'var(--color-ink-muted)', minWidth: 0 },
        }}>
        <BottomNavigationAction label="Home" icon={<HomeIcon />} />
        <BottomNavigationAction label="Machines" icon={<MachineIcon />} />
        <BottomNavigationAction label="Alerts" icon={<AlertIcon />} />
      </BottomNavigation>
    </Box>
  )
}

// ─── Home Tab ────────────────────────────────────────────────────────
function HomeTab({ today, machines, machineData, status }) {
  const gridCost = today.grid_cost || 0
  const gensetCost = today.genset_cost || 0
  const total = gridCost + gensetCost || 1
  const pieData = [
    { name: 'Grid', value: gridCost, color: 'var(--color-sage)' },
    { name: 'Genset', value: gensetCost, color: 'var(--color-rust)' },
  ].filter(d => d.value > 0)

  const runningCount = machines.filter(m => m.status === 'running').length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Big number: total load */}
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography sx={{ color: 'var(--color-ink-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>Total Live Load</Typography>
        <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.1 }}>
          {machineData?.total_load_kw?.toFixed(1) || '0'}
          <span style={{ fontSize: '1rem', fontWeight: 400, marginLeft: 4 }}>kW</span>
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
          {runningCount} of {machines.length} machines running
        </Typography>
      </Box>

      {/* Metric cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <MobileMetric icon={<BoltIcon />} label="Cost Today" value={`₹${today.total_cost?.toFixed(0) || '0'}`} color="var(--color-amber)" />
        <MobileMetric icon={<DieselIcon />} label="Diesel" value={`${today.diesel_litres?.toFixed(2) || '0'} L`} color="var(--color-rust)" />
        <MobileMetric icon={<Co2Icon />} label="CO₂" value={`${today.co2_kg?.toFixed(1) || '0'} kg`} color="var(--color-ink-muted)" />
        <MobileMetric icon={<LoadIcon />} label="Grid kWh" value={`${today.grid_kwh?.toFixed(0) || '0'}`} color="var(--color-sage)" />
      </Box>

      {/* Energy mix donut */}
      {pieData.length > 0 && (
        <Box sx={{ border: '1px solid var(--color-line)', borderRadius: '8px', bgcolor: 'var(--color-surface)', p: 2 }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-ink)', mb: 1, textAlign: 'center' }}>
            Energy Cost Mix
          </Typography>
          <Box sx={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="var(--color-surface)" strokeWidth={2} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 1 }}>
            {pieData.map(d => (
              <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color }} />
                <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-ink-muted)' }}>
                  {d.name}: {((d.value / total) * 100).toFixed(0)}%
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ─── Machines Tab ────────────────────────────────────────────────────
function MachinesTab({ machines, sparklines }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {machines.map(m => {
        const isRunning = m.status === 'running'
        const sc = { running: 'var(--color-sage)', idle: 'var(--color-amber)', off: 'var(--color-ink-muted)' }[m.status]
        const spark = sparklines[m.id] || []

        return (
          <Box key={m.id} sx={{
            p: 2, border: '1px solid var(--color-line)', borderRadius: '8px', bgcolor: 'var(--color-surface)',
            borderLeft: `3px solid ${sc}`,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ink)' }}>{m.name}</Typography>
              <Chip label={m.status.toUpperCase()} size="small" sx={{
                fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, height: 20,
                color: sc, bgcolor: `${sc}15`, border: `1px solid ${sc}`,
              }} />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 700, color: isRunning ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}>
                {m.power_draw_kw.toFixed(1)} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>kW</span>
              </Typography>
              <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-amber)' }}>
                ₹{parseFloat(m.cost_today || 0).toFixed(1)}
              </Typography>
            </Box>

            {spark.length > 2 && (
              <Box sx={{ width: '100%', height: 40, mt: 1 }}>
                <ResponsiveContainer>
                  <LineChart data={spark}><Line type="monotone" dataKey="kw" stroke={sc} strokeWidth={1.5} dot={false} isAnimationActive={false} /></LineChart>
                </ResponsiveContainer>
              </Box>
            )}

            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
              {m.current_load_percent}% load · {parseFloat(m.kwh_today||0).toFixed(2)} kWh today
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

// ─── Alerts Tab ──────────────────────────────────────────────────────
function AlertsTab({ events }) {
  if (!events.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography sx={{ color: 'var(--color-ink-muted)', fontSize: '0.85rem' }}>No alerts yet</Typography>
      </Box>
    )
  }

  const labels = { grid_outage: '⚡ Grid Outage', genset_on: '🔥 Genset Started', grid_restored: '✅ Grid Restored', genset_off: '🛑 Genset Stopped' }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {events.map(evt => {
        const isOpen = !evt.ended_at
        const hasCost = evt.cost_incurred && parseFloat(evt.cost_incurred) > 0
        const time = new Date(evt.started_at).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
        const isAlert = ['grid_outage', 'genset_on'].includes(evt.event_type)

        return (
          <Box key={evt.id} sx={{
            py: 1.5, px: 1, display: 'flex', alignItems: 'center', gap: 1.5,
            borderBottom: '1px solid var(--color-line)',
            bgcolor: isOpen ? 'rgba(193,85,58,.04)' : 'transparent',
          }}>
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-ink-muted)', width: 50 }}>{time}</Typography>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: isAlert ? 'var(--color-rust)' : 'var(--color-sage)' }}>
                {labels[evt.event_type] || evt.event_type}
                {isOpen && <Chip label="LIVE" size="small" sx={{ ml: 1, height: 16, fontSize: '0.5rem', bgcolor: 'var(--color-rust)', color: '#fff' }} />}
              </Typography>
              {(evt.duration_seconds || hasCost) && (
                <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                  {evt.duration_seconds ? `${formatDur(evt.duration_seconds)}` : ''}
                  {hasCost ? ` · ₹${parseFloat(evt.cost_incurred).toFixed(0)}` : ''}
                </Typography>
              )}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────
function MobileMetric({ icon, label, value, color }) {
  return (
    <Box sx={{ p: 1.5, border: '1px solid var(--color-line)', borderRadius: '8px', bgcolor: 'var(--color-surface)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        {React.cloneElement(icon, { sx: { fontSize: 14, color } })}
        <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.65rem' }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-ink)' }}>{value}</Typography>
    </Box>
  )
}

function formatDur(s) {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60), r = s % 60
  return m < 60 ? `${m}m ${r}s` : `${Math.floor(m/60)}h ${m%60}m`
}
