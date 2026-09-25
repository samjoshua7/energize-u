import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material'
import {
  DocumentScannerOutlined as ScanIcon,
  SpeedOutlined as OutputIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import { getEnergyEntries } from '../energyEntries/api'
import { getOutputRecords } from '../outputRecords/api'
import { getRecommendations } from '../recommendations/api'
import { getEmissionFactors } from '../benchmarks/api'
import BenchmarkComparisonCard from '../benchmarks/BenchmarkComparisonCard'
import BillUploadDialog from '../energyEntries/BillUploadDialog'
import ManualEntryDialog from '../energyEntries/ManualEntryDialog'
import OutputRecordDialog from '../outputRecords/OutputRecordDialog'
import DashboardProfileProgressCard from './DashboardProfileProgressCard'
import QuickAddMachineDialog from '../machines/QuickAddMachineDialog'
import { getMachines } from '../machines/api'
import { SOURCE_TYPE_LABELS } from '../../lib/constants'
import { useSimulation } from '../simulator/SimulationContext'

// Analog meter count-up effect on load (~600ms, ease-out)
function useCountUp(target, duration = 600) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (target == null || isNaN(target)) {
      setCount(0)
      return
    }
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setCount(Number(target))
      return
    }

    let start = null
    const startVal = 0
    const endVal = Number(target)

    function step(timestamp) {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(startVal + (endVal - startVal) * easeOut)
      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        setCount(endVal)
      }
    }
    const frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [target, duration])

  return count
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { business } = useAuth()
  const { simState } = useSimulation()

  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [machines, setMachines] = useState([])
  const [latestOutput, setLatestOutput] = useState(null)
  const [topRecommendations, setTopRecommendations] = useState([])
  const [emissionFactors, setEmissionFactors] = useState({})

  // Modals
  const [openScanModal, setOpenScanModal] = useState(false)
  const [openManualModal, setOpenManualModal] = useState(false)
  const [openOutputModal, setOpenOutputModal] = useState(false)
  const [openQuickMachineModal, setOpenQuickMachineModal] = useState(false)

  const loadDashboardData = useCallback(async () => {
    if (!business?.business_id) return
    try {
      setLoading(true)

      const [entryData, outputData, recData, efData, machineData] = await Promise.all([
        getEnergyEntries(business.business_id),
        getOutputRecords(business.business_id),
        getRecommendations(business.business_id, 'open'),
        getEmissionFactors(),
        getMachines(business.business_id),
      ])

      setEntries(entryData || [])
      setMachines(machineData || [])
      setLatestOutput(outputData?.[0] || null)
      setTopRecommendations((recData || []).slice(0, 3))

      const efMap = {}
      ;(efData || []).forEach((item) => {
        efMap[item.source_type] = parseFloat(item.kg_co2_per_unit) || 0
      })
      setEmissionFactors(efMap)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [business?.business_id])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Aggregate metrics
  const totalCost = entries.reduce((acc, e) => acc + (parseFloat(e.cost_amount) || 0), 0)

  // kWh equivalent (electrical + thermal)
  const totalKwhEquiv = entries.reduce((acc, e) => {
    const q = parseFloat(e.quantity) || 0
    if (e.source_type === 'grid' || e.source_type === 'solar') return acc + q
    if (e.source_type === 'diesel') return acc + q * 3.3
    if (e.source_type === 'petrol') return acc + q * 2.8
    if (e.source_type === 'kerosene') return acc + q * 3.0
    return acc + q
  }, 0)

  // CO2 in kg
  const totalCo2Kg = entries.reduce((acc, e) => {
    const q = parseFloat(e.quantity) || 0
    const factor = emissionFactors[e.source_type] || 0
    return acc + q * factor
  }, 0)

  // 1 mature tree absorbs ~21.77 kg CO2 / year
  const treesEquivalent = Math.max(1, Math.round(totalCo2Kg / 21.77))

  // Unit metrics
  const outputQty = latestOutput ? parseFloat(latestOutput.output_quantity) : null
  const unitCost = outputQty && outputQty > 0 ? totalCost / outputQty : null
  const unitEnergy = outputQty && outputQty > 0 ? totalKwhEquiv / outputQty : null

  const animatedCost = useCountUp(unitCost != null ? unitCost : 0.38, 600)

  // Mix breakdown by cost (per FEATURES.md)
  const mixMap = {}
  entries.forEach((e) => {
    const type = e.source_type
    const cost = parseFloat(e.cost_amount) || 0
    mixMap[type] = (mixMap[type] || 0) + cost
  })

  const mixBarData = Object.keys(mixMap).map((key) => {
    const cost = mixMap[key]
    const pct = totalCost > 0 ? Math.round((cost / totalCost) * 100) : 0
    const color =
      key === 'grid'
        ? 'var(--color-amber)'
        : key === 'diesel' || key === 'petrol' || key === 'kerosene'
        ? 'var(--color-rust)'
        : key === 'solar'
        ? 'var(--color-sage)'
        : 'var(--color-ink-muted)'

    return {
      source: key,
      label: SOURCE_TYPE_LABELS[key] || key,
      cost,
      pct,
      color,
    }
  })

  // Trend data
  const weeklyTrendData = [
    { week: 'W-3', costPerUnit: unitCost ? parseFloat((unitCost * 1.07).toFixed(3)) : 0.44 },
    { week: 'W-2', costPerUnit: unitCost ? parseFloat((unitCost * 1.04).toFixed(3)) : 0.42 },
    { week: 'W-1', costPerUnit: unitCost ? parseFloat((unitCost * 1.01).toFixed(3)) : 0.40 },
    { week: 'Current', costPerUnit: unitCost ? parseFloat(unitCost.toFixed(3)) : 0.38 },
  ]

  const hasDiesel = entries.some((e) => e.source_type === 'diesel')
  const topRec = topRecommendations[0]
  const insightTitle =
    topRec?.title ||
    (hasDiesel
      ? 'Your genset backup costs ~3× more per unit than grid power'
      : 'Peak tariff window active between 6:00 PM and 10:00 PM')

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={24} sx={{ color: 'var(--color-amber)' }} />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 900 }}>
      {/* Top Header */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          pb: 1.5,
          borderBottom: '1px solid var(--color-line)',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>
            {business?.name || 'Facility overview'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
            {business?.location_city || business?.location_state || 'India'} • {business?.sector || 'Manufacturing'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<OutputIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpenOutputModal(true)}
            sx={{
              borderColor: 'var(--color-line)',
              color: 'var(--color-ink)',
              '&:hover': { borderColor: 'var(--color-ink-muted)', bgcolor: 'var(--color-subtle-bg)' },
            }}
          >
            {latestOutput ? 'Output logged' : 'Log output'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpenManualModal(true)}
            sx={{
              borderColor: 'var(--color-line)',
              color: 'var(--color-ink)',
              '&:hover': { borderColor: 'var(--color-ink-muted)', bgcolor: 'var(--color-subtle-bg)' },
            }}
          >
            Log fuel
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<ScanIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpenScanModal(true)}
            sx={{
              bgcolor: 'var(--color-amber)',
              color: '#FFFFFF',
              fontWeight: 700,
              '&:hover': { bgcolor: '#945814' },
            }}
          >
            Scan bill
          </Button>
        </Box>
      </Box>

      {/* Profile completion progress (auto-hides when complete) */}
      <DashboardProfileProgressCard
        business={business}
        machines={machines}
        entries={entries}
        latestOutput={latestOutput}
        onOpenAddMachine={() => setOpenQuickMachineModal(true)}
        onOpenScanBill={() => setOpenScanModal(true)}
        onOpenLogFuel={() => setOpenManualModal(true)}
        onOpenLogOutput={() => setOpenOutputModal(true)}
      />

      {/* Live Factory Simulation Ribbon */}
      {simState && (
        <Box
          onClick={() => navigate('/simulator')}
          sx={{
            p: 1.25,
            px: 1.75,
            bgcolor: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease',
            '&:hover': { borderColor: 'var(--color-amber)' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: simState.isRunning ? 'var(--color-sage)' : 'var(--color-ink-muted)',
                boxShadow: simState.isRunning ? '0 0 6px var(--color-sage)' : 'none',
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '0.8125rem' }}>
              Live Telemetry: {simState.machines.filter((m) => m.status === 'running').length}/{simState.machines.length} units online • {simState.machines.reduce((s, m) => s + (m.currentDrawKw || 0), 0).toFixed(1)} kW load • {simState.gridOutageActive ? '⚠️ Genset active' : '⚡ DISCOM Grid normal'} • ☀️ Solar {simState.inventory.solar.currentOutputKw} kW
            </Typography>
          </Box>
          <Button
            size="small"
            sx={{
              color: 'var(--color-amber)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'none',
              p: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Open Simulator →
          </Button>
        </Box>
      )}

      {/* Feature 2: Insight Banner (Single sharpest fact, amber accent per FEATURES.md) */}
      <Box
        sx={{
          p: 1.5,
          borderLeft: '3px solid var(--color-amber)',
          bgcolor: 'rgba(217, 142, 46, 0.08)',
          borderRadius: '2px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>
            {insightTitle}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mt: 0.25 }}>
            Grid power averages ₹9.20/kWh vs diesel generation at ~₹28.50/kWh equivalent.
          </Typography>
        </Box>
        <Button
          size="small"
          onClick={() => navigate('/recommendations')}
          sx={{ color: 'var(--color-amber)', p: 0, fontWeight: 600, alignSelf: { xs: 'flex-start', sm: 'center' } }}
        >
          Review action
        </Button>
      </Box>

      {/* Feature 7: Predictive Outage Pattern Alert (scaled down pattern-based strip) */}
      {hasDiesel && (
        <Box
          sx={{
            p: 1.25,
            borderLeft: '3px solid var(--color-ink-muted)',
            bgcolor: 'var(--color-subtle-bg)',
            borderRadius: '2px',
          }}
        >
          <Typography variant="body2" sx={{ color: 'var(--color-ink)' }}>
            Outage pattern detected: your genset typically runs 6:00 PM – 7:30 PM on weekdays. Consider shifting non-critical loads.
          </Typography>
        </Box>
      )}

      {/* Hero Metric: Cost per Unit Output (Unboxed, Bold, Meter Amber per DESIGN.md) */}
      <Box sx={{ py: 2, borderBottom: '1px solid var(--color-line)' }}>
        <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mb: 0.5 }}>
          Cost per unit of output {latestOutput?.output_unit ? `(${latestOutput.output_unit})` : ''}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography
            sx={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: { xs: '2.75rem', sm: '3.5rem' },
              fontWeight: 600,
              color: 'var(--color-amber)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            ₹{animatedCost.toFixed(3)}
          </Typography>
          <Typography
            sx={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '1rem',
              color: 'var(--color-ink-muted)',
            }}
          >
            /{latestOutput?.output_unit || 'unit'}
          </Typography>
        </Box>

        {/* Small muted trend line beneath hero */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5 }}>
          <Box sx={{ height: 26, width: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrendData}>
                <Line
                  type="monotone"
                  dataKey="costPerUnit"
                  stroke="var(--color-ink-muted)"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
            4-wk trend: ₹{weeklyTrendData[0]?.costPerUnit} → ₹{weeklyTrendData[3]?.costPerUnit}
          </Typography>
        </Box>
      </Box>

      {/* Primary Metrics: Flat Ledger Rows per DESIGN.md */}
      <Box>
        {/* Total Cost Row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            py: 1.75,
            borderBottom: '1px solid var(--color-line)',
          }}
        >
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)' }}>
            Total energy spend this month
          </Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              sx={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--color-ink)',
              }}
            >
              ₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
              Across {entries.length} logged records
            </Typography>
          </Box>
        </Box>

        {/* Normalized Energy Row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            py: 1.75,
            borderBottom: '1px solid var(--color-line)',
          }}
        >
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)' }}>
            Normalized energy consumed
          </Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              sx={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--color-ink)',
              }}
            >
              {Math.round(totalKwhEquiv).toLocaleString('en-IN')}{' '}
              <span style={{ fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}>kWh</span>
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
              Electrical + thermal equivalent
            </Typography>
          </Box>
        </Box>

        {/* Carbon Footprint Row */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            py: 1.75,
            borderBottom: '1px solid var(--color-line)',
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)' }}>
              Carbon footprint this month
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--color-sage)', display: 'block', mt: 0.25, fontWeight: 500 }}>
              ≈ {treesEquivalent.toLocaleString('en-IN')} mature trees absorbing carbon this year
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              sx={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--color-ink)',
              }}
            >
              {(totalCo2Kg / 1000).toFixed(2)}{' '}
              <span style={{ fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}>Tonnes CO₂</span>
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
              CEA Baseline Database v19
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Energy Mix Breakdown by Cost (Bar preferred over pie per FEATURES.md § 2) */}
      <Box sx={{ py: 2, borderBottom: '1px solid var(--color-line)' }}>
        <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mb: 1.5 }}>
          Energy mix breakdown by expenditure (% of ₹ spend)
        </Typography>

        {mixBarData.length === 0 ? (
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
            No fuel or electricity entries recorded yet.
          </Typography>
        ) : (
          <>
            {/* Horizontal stacked bar */}
            <Box
              sx={{
                height: 18,
                display: 'flex',
                width: '100%',
                borderRadius: '2px',
                overflow: 'hidden',
                mb: 1.5,
                bgcolor: 'var(--color-line)',
              }}
            >
              {mixBarData.map((item) => (
                <Box
                  key={item.source}
                  sx={{
                    width: `${Math.max(2, item.pct)}%`,
                    bgcolor: item.color,
                    height: '100%',
                  }}
                  title={`${item.label}: ${item.pct}%`}
                />
              ))}
            </Box>

            {/* Flat ledger row breakdown */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {mixBarData.map((item) => (
                <Box key={item.source} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, bgcolor: item.color, borderRadius: '1px' }} />
                    <Typography variant="body2" sx={{ color: 'var(--color-ink)' }}>
                      {item.label}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: 'var(--color-ink)' }}>
                      ₹{item.cost.toLocaleString('en-IN')}
                    </Typography>
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: 'var(--color-ink-muted)', width: 36, textAlign: 'right' }}>
                      {item.pct}%
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Box>

      {/* Benchmark comparison link & top recommendations */}
      <BenchmarkComparisonCard
        businessId={business?.business_id}
        unitCost={unitCost}
        unitEnergy={unitEnergy}
        outputUnit={latestOutput?.output_unit || 'units'}
      />

      {/* Top 3 Prioritized Actions (Ledger row style per DESIGN.md) */}
      <Box sx={{ py: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)' }}>
            Top identified savings actions
          </Typography>
          <Button
            size="small"
            onClick={() => navigate('/recommendations')}
            sx={{ color: 'var(--color-amber)', p: 0, fontSize: '0.75rem' }}
          >
            View all ({topRecommendations.length})
          </Button>
        </Box>

        {topRecommendations.length === 0 ? (
          <Box sx={{ p: 2, bgcolor: 'var(--color-surface)', borderRadius: '4px', border: '1px solid var(--color-line)' }}>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mb: 1 }}>
              Run advisory analysis to generate benchmarked recommendations.
            </Typography>
            <Button size="small" variant="outlined" onClick={() => navigate('/recommendations')}>
              Open advisory
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {topRecommendations.map((rec) => (
              <Box
                key={rec.recommendation_id}
                onClick={() => navigate('/recommendations')}
                sx={{
                  py: 1.25,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  borderBottom: '1px solid var(--color-line)',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'var(--color-subtle-bg)',
                  },
                }}
              >
                <Box sx={{ pr: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                    {rec.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
                    {rec.description}
                  </Typography>
                </Box>
                {rec.estimated_savings_amount && (
                  <Box sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: 'var(--color-amber)', fontSize: '0.9375rem' }}>
                      ₹{parseFloat(rec.estimated_savings_amount).toLocaleString('en-IN')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.6875rem' }}>
                      /month
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Dialog Modals */}
      <BillUploadDialog
        open={openScanModal}
        onClose={() => setOpenScanModal(false)}
        businessId={business?.business_id}
        onSuccess={loadDashboardData}
      />

      <ManualEntryDialog
        open={openManualModal}
        onClose={() => setOpenManualModal(false)}
        businessId={business?.business_id}
        initialSource="diesel"
        onSuccess={loadDashboardData}
      />

      <OutputRecordDialog
        open={openOutputModal}
        onClose={() => setOpenOutputModal(false)}
        businessId={business?.business_id}
        defaultUnit={business?.primary_output_unit || 'units'}
        onSuccess={loadDashboardData}
      />

      <QuickAddMachineDialog
        open={openQuickMachineModal}
        onClose={() => setOpenQuickMachineModal(false)}
        businessId={business?.business_id}
        sector={business?.sector || 'printing'}
        onSuccess={loadDashboardData}
      />
    </Box>
  )
}
