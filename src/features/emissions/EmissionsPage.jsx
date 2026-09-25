import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  useTheme,
} from '@mui/material'
import {
  Co2Outlined as CarbonIcon,
  ForestOutlined as TreeIcon,
  LocalGasStationOutlined as FuelIcon,
  SolarPowerOutlined as SolarIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getEnergyEntries } from '../energyEntries/api'
import { getEmissionFactors } from '../benchmarks/api'
import { getRecommendations } from '../recommendations/api'
import { SOURCE_TYPE_LABELS } from '../../lib/constants'

const SOURCE_BAR_COLORS = {
  diesel: 'var(--color-rust, #C1553A)',
  kerosene: 'var(--color-rust, #C1553A)',
  petrol: 'var(--color-rust, #C1553A)',
  grid: 'var(--color-ink-muted, #A7ACB3)',
  solar: 'var(--color-sage, #6E9B7B)',
}

const CITATION_BY_SOURCE = {
  grid: { factor: '0.7100 kg CO₂/kWh', source: 'CEA Baseline Database v19 (2023)' },
  diesel: { factor: '2.6800 kg CO₂/L', source: 'IPCC 2006 & BEE Industrial Standards' },
  petrol: { factor: '2.3100 kg CO₂/L', source: 'IPCC Guidelines for GHG Inventories' },
  kerosene: { factor: '2.5200 kg CO₂/L', source: 'IPCC 2006 & MoPNG Refinery Factors' },
  solar: { factor: '0.0000 kg CO₂/kWh', source: 'Zero direct combustion emissions' },
}

export default function EmissionsPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { business } = useAuth()

  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [emissionFactors, setEmissionFactors] = useState({})
  const [solarRec, setSolarRec] = useState(null)

  useEffect(() => {
    if (!business?.business_id) return
    setLoading(true)
    Promise.all([
      getEnergyEntries(business.business_id),
      getEmissionFactors(),
      getRecommendations(business.business_id, 'all').catch(() => []),
    ])
      .then(([entriesData, efData, recsData]) => {
        setEntries(entriesData || [])
        const efMap = {}
        ;(efData || []).forEach((item) => {
          efMap[item.source_type] = parseFloat(item.kg_co2_per_unit) || 0
        })
        setEmissionFactors(efMap)

        const matchedRec = (recsData || []).find(
          (r) => r.category === 'solar' || r.category === 'solar_sizing' || r.category === 'fuel_switch'
        )
        setSolarRec(matchedRec || null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [business?.business_id])

  // Calculate CO2 per source
  const co2BySource = {}
  let totalCo2Kg = 0

  entries.forEach((e) => {
    const q = parseFloat(e.quantity) || 0
    const factor = emissionFactors[e.source_type] || (e.source_type === 'grid' ? 0.7100 : 2.6800)
    const co2 = q * factor
    co2BySource[e.source_type] = (co2BySource[e.source_type] || 0) + co2
    totalCo2Kg += co2
  })

  const totalCo2Tonnes = (totalCo2Kg / 1000).toFixed(2)

  // 1 mature tree absorbs ~21.77 kg CO2 / year (IPCC / USFS agroforestry standard)
  const treesEquivalentYear = Math.max(1, Math.round(totalCo2Kg / 21.77))

  // Bar chart data sorted by emissions descending
  const barChartData = Object.keys(co2BySource)
    .map((key) => ({
      sourceKey: key,
      sourceName: SOURCE_TYPE_LABELS[key] || key,
      co2Tonnes: parseFloat((co2BySource[key] / 1000).toFixed(3)),
      co2Kg: Math.round(co2BySource[key]),
      pct: totalCo2Kg > 0 ? Math.round((co2BySource[key] / totalCo2Kg) * 100) : 0,
      fill: SOURCE_BAR_COLORS[key] || 'var(--color-ink-muted)',
    }))
    .sort((a, b) => b.co2Kg - a.co2Kg)

  const dieselCo2 = co2BySource['diesel'] || 0
  const dieselSharePct = totalCo2Kg > 0 ? Math.round((dieselCo2 / totalCo2Kg) * 100) : 0

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
            Decarbonisation & emissions intelligence
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mt: 0.25 }}>
            Scope 1 (stationary diesel/fuel) and Scope 2 (grid electricity) carbon footprint ledger
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

      {/* Hero Carbon Metric — Unboxed */}
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
            Total carbon footprint this period
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography
              component="span"
              sx={{
                fontFamily: 'var(--font-mono)',
                fontSize: { xs: '2.25rem', sm: '3rem' },
                fontWeight: 600,
                color: 'var(--color-amber)',
                lineHeight: 1.1,
              }}
            >
              {totalCo2Tonnes}
            </Typography>
            <Typography component="span" sx={{ color: 'var(--color-ink-muted)', fontSize: '1rem' }}>
              Tonnes CO₂
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mt: 0.5, fontSize: '0.85rem' }}>
            ≈ <span style={{ color: 'var(--color-sage)', fontFamily: 'var(--font-mono)' }}>{treesEquivalentYear.toLocaleString('en-IN')}</span> mature trees needed for annual absorption (21.77 kg CO₂/tree/yr, IPCC factor)
          </Typography>
        </Box>

        {dieselSharePct > 0 && (
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block' }}>
              Stationary diesel intensity
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--color-rust)',
              }}
            >
              {dieselSharePct}% of total CO₂
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block' }}>
              Diesel burns at 2.68 kg CO₂/L (3.8× dirtier per electric unit than grid)
            </Typography>
          </Box>
        )}
      </Box>

      {/* CO2 Breakdown by Source — Bar Chart per FEATURES.md § 6 */}
      <Box
        sx={{
          p: 2.5,
          bgcolor: 'var(--color-surface, #1C222A)',
          border: '1px solid var(--color-line)',
          borderRadius: '4px',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>
          Emissions breakdown by energy source
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mb: 2 }}>
          Diesel and kerosene are highlighted as the carbon-dense drivers per unit of energy delivered
        </Typography>

        <Box sx={{ height: 200, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--color-line)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                unit=" T"
              />
              <YAxis
                type="category"
                dataKey="sourceName"
                tick={{ fontSize: 11, fill: 'var(--color-ink)' }}
                width={80}
              />
              <Tooltip
                formatter={(val, name, item) => [
                  `${val} Tonnes CO₂ (${item.payload.pct}%)`,
                  item.payload.sourceName,
                ]}
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
              <Bar dataKey="co2Tonnes" radius={[0, 3, 3, 0]}>
                {barChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* Ledger-Row: Emission Factors with Direct Inline Citations */}
      <Box sx={{ borderTop: '1px solid var(--color-line)', pt: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-ink)', mb: 1 }}>
          Verified emission factors and ledger contributions
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {barChartData.map((item) => {
            const citation = CITATION_BY_SOURCE[item.sourceKey] || {
              factor: 'Standard factor',
              source: 'CEA / IPCC standard',
            }

            return (
              <Box
                key={item.sourceKey}
                sx={{
                  py: 1.75,
                  borderBottom: '1px solid var(--color-line)',
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 1,
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                      {item.sourceName}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'var(--font-mono)',
                        color: item.fill,
                        fontSize: '0.75rem',
                      }}
                    >
                      {item.pct}% of total
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mt: 0.25 }}>
                    Factor: <strong style={{ color: 'var(--color-ink)' }}>{citation.factor}</strong> · Citation: {citation.source}
                  </Typography>
                </Box>

                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                    }}
                  >
                    {item.co2Tonnes} Tonnes
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-ink-muted)',
                      fontSize: '0.75rem',
                    }}
                  >
                    {item.co2Kg.toLocaleString('en-IN')} kg CO₂
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>

      {/* Fuel-Switch / Solar-Sizing Suggestion — Tied to actual load per FEATURES.md § 6 */}
      <Box sx={{ borderTop: '1px solid var(--color-line)', pt: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-ink)', mb: 1 }}>
          Facility decarbonisation pathway
        </Typography>

        {solarRec ? (
          <Box
            sx={{
              p: 2,
              bgcolor: 'var(--color-surface, #1C222A)',
              border: '1px solid var(--color-line)',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                {solarRec.title}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mt: 0.5, maxWidth: '75ch' }}>
                {solarRec.description}
              </Typography>
              {solarRec.math_breakdown?.calculation && (
                <Typography
                  sx={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--color-sage)',
                    mt: 1,
                    bgcolor: 'rgba(110, 155, 123, 0.08)',
                    p: 0.75,
                    borderRadius: '3px',
                    border: '1px solid rgba(110, 155, 123, 0.2)',
                  }}
                >
                  Basis: {solarRec.math_breakdown.calculation}
                </Typography>
              )}
            </Box>

            <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, minWidth: 160 }}>
              <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block' }}>
                Est. monthly savings
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--color-amber)',
                }}
              >
                ₹{parseFloat(solarRec.estimated_savings_amount).toLocaleString('en-IN')}
                <Typography component="span" sx={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', ml: 0.5 }}>
                  / mo
                </Typography>
              </Typography>
              <Button
                size="small"
                onClick={() => navigate('/recommendations')}
                sx={{
                  color: 'var(--color-ink)',
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  p: 0,
                  mt: 0.5,
                  '&:hover': { color: 'var(--color-amber)', bgcolor: 'transparent' },
                }}
              >
                View full math in advisory →
              </Button>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              p: 2,
              bgcolor: 'var(--color-surface, #1C222A)',
              border: '1px solid var(--color-line)',
              borderRadius: '4px',
            }}
          >
            <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.85rem' }}>
              No fuel-switch or solar-sizing opportunity flagged yet. Run advisory analysis to evaluate your logged fuel mix.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

