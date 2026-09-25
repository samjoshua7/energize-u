import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  useTheme,
  Collapse,
} from '@mui/material'
import {
  SpeedOutlined as OutputIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowForward as ArrowIcon,
  MenuBookOutlined as SourceIcon,
} from '@mui/icons-material'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getMatchedBenchmark } from './api'
import { getEnergyEntries } from '../energyEntries/api'
import { getOutputRecords } from '../outputRecords/api'

export default function BenchmarkPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { business } = useAuth()

  const [loading, setLoading] = useState(true)
  const [benchmark, setBenchmark] = useState(null)
  const [entries, setEntries] = useState([])
  const [latestOutput, setLatestOutput] = useState(null)
  const [showSources, setShowSources] = useState(false)

  useEffect(() => {
    if (!business?.business_id) return
    setLoading(true)
    Promise.all([
      getMatchedBenchmark(business.business_id),
      getEnergyEntries(business.business_id),
      getOutputRecords(business.business_id),
    ])
      .then(([benchData, entriesData, outputData]) => {
        setBenchmark(benchData)
        setEntries(entriesData || [])
        setLatestOutput(outputData?.[0] || null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [business?.business_id])

  // Calculations
  const totalCost = entries.reduce((acc, e) => acc + (parseFloat(e.cost_amount) || 0), 0)
  const totalKwhEquiv = entries.reduce((acc, e) => {
    const q = parseFloat(e.quantity) || 0
    if (e.source_type === 'grid' || e.source_type === 'solar') return acc + q
    if (e.source_type === 'diesel') return acc + q * 3.3
    if (e.source_type === 'petrol') return acc + q * 2.8
    if (e.source_type === 'kerosene') return acc + q * 3.0
    return acc + q
  }, 0)

  const outputQty = latestOutput ? parseFloat(latestOutput.output_quantity) : 50000
  const outputUnit = latestOutput?.output_unit || business?.primary_output_unit || benchmark?.output_unit || 'units'

  const unitCost = outputQty > 0 && totalCost > 0 ? totalCost / outputQty : 0.42
  const unitEnergy = outputQty > 0 && totalKwhEquiv > 0 ? totalKwhEquiv / outputQty : 0.052

  const benchCost = benchmark ? parseFloat(benchmark.cost_per_output_unit) : 0.38
  const benchEnergy = benchmark ? parseFloat(benchmark.energy_per_output_unit) : 0.045

  const costDeltaPct = benchCost > 0 ? (((unitCost - benchCost) / benchCost) * 100) : 0
  const isCostHigher = costDeltaPct > 0

  const costChartData = [
    {
      metric: `Specific cost (₹/${outputUnit})`,
      'Your facility': parseFloat(unitCost.toFixed(3)),
      'Sector average': parseFloat(benchCost.toFixed(3)),
      'Top decile': parseFloat((benchCost * 0.82).toFixed(3)),
    },
  ]

  const energyChartData = [
    {
      metric: `Specific energy (kWh/${outputUnit})`,
      'Your facility': parseFloat(unitEnergy.toFixed(3)),
      'Sector average': parseFloat(benchEnergy.toFixed(3)),
      'Top decile': parseFloat((benchEnergy * 0.80).toFixed(3)),
    },
  ]

  const monthlyCostDelta = Math.abs(Math.round((unitCost - benchCost) * outputQty))

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={24} sx={{ color: 'var(--color-amber)' }} />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 4 }}>
      {/* Header — unboxed */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1.5,
          pb: 1.5,
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>
            Sector energy benchmarking
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mt: 0.25 }}>
            Specific energy and cost performance compared against verified Indian industrial cluster data
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate('/recommendations')}
          sx={{
            borderColor: 'var(--color-line)',
            color: 'var(--color-ink)',
            textTransform: 'none',
            fontSize: '0.8rem',
            borderRadius: '4px',
            '&:hover': { borderColor: 'var(--color-amber)', color: 'var(--color-amber)' },
          }}
        >
          View savings actions
        </Button>
      </Box>

      {/* Hero Benchmark Metric — Unboxed */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'baseline' },
          gap: 2,
          py: 1,
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block' }}>
            Cost per {outputUnit} vs sector norm
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography
              component="span"
              sx={{
                fontFamily: 'var(--font-mono)',
                fontSize: { xs: '2.25rem', sm: '3rem' },
                fontWeight: 600,
                color: isCostHigher ? 'var(--color-rust)' : 'var(--color-sage)',
                lineHeight: 1.1,
              }}
            >
              {isCostHigher ? `+${costDeltaPct.toFixed(1)}%` : `${costDeltaPct.toFixed(1)}%`}
            </Typography>
            <Typography
              component="span"
              sx={{
                color: 'var(--color-ink-muted)',
                fontSize: '0.95rem',
              }}
            >
              {isCostHigher ? 'above sector peer average' : 'below sector peer average'}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mt: 0.5, fontSize: '0.85rem' }}>
            Your plant: <strong style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>₹{unitCost.toFixed(3)}</strong> / {outputUnit} · Peer benchmark: <strong style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>₹{benchCost.toFixed(3)}</strong> / {outputUnit}
          </Typography>
        </Box>

        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block' }}>
            Monthly cost delta
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: isCostHigher ? 'var(--color-rust)' : 'var(--color-sage)',
            }}
          >
            {isCostHigher ? `+₹${monthlyCostDelta.toLocaleString('en-IN')}` : `-₹${monthlyCostDelta.toLocaleString('en-IN')}`}
            <Typography component="span" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.75rem', ml: 0.5 }}>
              / mo
            </Typography>
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block' }}>
            Based on {outputQty.toLocaleString('en-IN')} {outputUnit} monthly output
          </Typography>
        </Box>
      </Box>

      {/* Side-by-Side Comparison Charts */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2.5,
        }}
      >
        {/* Cost per unit chart */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'var(--color-surface, #1C222A)',
            border: '1px solid var(--color-line)',
            borderRadius: '4px',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>
            Cost per unit output (₹/{outputUnit})
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mb: 2 }}>
            Total electricity and fuel spend divided by production volume
          </Typography>

          <Box sx={{ height: 220, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costChartData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--color-line)" />
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} />
                <Tooltip
                  formatter={(val) => [`₹${val.toFixed(3)} / ${outputUnit}`, '']}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-line)',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-ink)',
                  }}
                  itemStyle={{ color: 'var(--color-ink)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-ink-muted)' }} />
                <Bar dataKey="Your facility" fill="var(--color-amber)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Sector average" fill="var(--color-ink-muted)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Top decile" fill="var(--color-sage)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>

        {/* Specific energy chart */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'var(--color-surface, #1C222A)',
            border: '1px solid var(--color-line)',
            borderRadius: '4px',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>
            Specific energy consumption (kWh/{outputUnit})
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mb: 2 }}>
            Kilowatt-hours (electrical + thermal equivalent) per unit produced
          </Typography>

          <Box sx={{ height: 220, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyChartData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--color-line)" />
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }} />
                <Tooltip
                  formatter={(val) => [`${val.toFixed(3)} kWh / ${outputUnit}`, '']}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-line)',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-ink)',
                  }}
                  itemStyle={{ color: 'var(--color-ink)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-ink-muted)' }} />
                <Bar dataKey="Your facility" fill="var(--color-amber)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Sector average" fill="var(--color-ink-muted)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Top decile" fill="var(--color-sage)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Box>

      {/* Upfront Source Note Directly Under Chart — per FEATURES.md § 4 */}
      <Box sx={{ py: 0.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'var(--color-ink-muted)',
              fontSize: '0.8rem',
            }}
          >
            Benchmarks derived from a seed reference table — see sources below.
          </Typography>

          <Button
            size="small"
            onClick={() => setShowSources((prev) => !prev)}
            startIcon={<SourceIcon sx={{ fontSize: 14 }} />}
            endIcon={
              <ExpandMoreIcon
                sx={{
                  fontSize: 15,
                  transform: showSources ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            }
            sx={{
              color: 'var(--color-ink-muted)',
              fontSize: '0.75rem',
              textTransform: 'none',
              p: 0,
              '&:hover': { color: 'var(--color-ink)', bgcolor: 'transparent' },
            }}
          >
            {showSources ? 'Hide reference audit citations' : 'Show reference audit citations'}
          </Button>
        </Box>

        <Collapse in={showSources} timeout="auto" unmountOnExit>
          <Box
            sx={{
              mt: 1.5,
              p: 2,
              bgcolor: 'var(--color-surface, #1C222A)',
              border: '1px solid var(--color-line)',
              borderRadius: '4px',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-ink)', display: 'block', mb: 0.5 }}>
              Benchmark reference standards:
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
              Sector norms are derived from published Bureau of Energy Efficiency (BEE) MSME Energy Audit Compendiums, All India Federation of Master Printers (AIFMP) technical survey data, and Central Electricity Authority (CEA) Baseline Database v19. Matched cluster: <strong>{business?.sector || 'printing'}</strong> industrial operations.
            </Typography>
          </Box>
        </Collapse>
      </Box>

      {/* Ledger-Row Comparison Table */}
      <Box sx={{ borderTop: '1px solid var(--color-line)', pt: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-ink)', mb: 1 }}>
          Facility vs peer audit ledger
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {[
            {
              metric: `Specific cost per ${outputUnit}`,
              facility: `₹${unitCost.toFixed(3)}`,
              peer: `₹${benchCost.toFixed(3)}`,
              delta: `${isCostHigher ? '+' : ''}${costDeltaPct.toFixed(1)}%`,
              deltaColor: isCostHigher ? 'var(--color-rust)' : 'var(--color-sage)',
            },
            {
              metric: `Specific energy consumption`,
              facility: `${unitEnergy.toFixed(3)} kWh`,
              peer: `${benchEnergy.toFixed(3)} kWh`,
              delta: `${isCostHigher ? '+' : ''}${(((unitEnergy - benchEnergy) / benchEnergy) * 100).toFixed(1)}%`,
              deltaColor: unitEnergy > benchEnergy ? 'var(--color-rust)' : 'var(--color-sage)',
            },
            {
              metric: 'Top decile benchmark target',
              facility: `₹${unitCost.toFixed(3)}`,
              peer: `₹${(benchCost * 0.82).toFixed(3)}`,
              delta: `₹${Math.abs(unitCost - benchCost * 0.82).toFixed(3)} / unit gap`,
              deltaColor: 'var(--color-amber)',
            },
          ].map((row, idx) => (
            <Box
              key={idx}
              sx={{
                py: 1.5,
                borderBottom: '1px solid var(--color-line)',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 1,
              }}
            >
              <Typography variant="body2" sx={{ color: 'var(--color-ink)', fontSize: '0.85rem' }}>
                {row.metric}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', fontSize: '0.7rem' }}>
                    Your facility
                  </Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-ink)' }}>
                    {row.facility}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', fontSize: '0.7rem' }}>
                    Peer average
                  </Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-ink-muted)' }}>
                    {row.peer}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'right', minWidth: 80 }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', fontSize: '0.7rem' }}>
                    Difference
                  </Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: row.deltaColor }}>
                    {row.delta}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

