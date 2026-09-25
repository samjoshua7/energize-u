import Grid from '@mui/material/Grid2'
import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
  useTheme,
} from '@mui/material'
import {
  TrendingDown as BelowAvgIcon,
  TrendingUp as AboveAvgIcon,
  VerifiedUserOutlined as SourceIcon,
} from '@mui/icons-material'
import { getMatchedBenchmark } from './api'

export default function BenchmarkComparisonCard({
  businessId,
  unitCost,
  unitEnergy,
  outputUnit,
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [benchmark, setBenchmark] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (businessId) {
      getMatchedBenchmark(businessId)
        .then(setBenchmark)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [businessId])

  if (loading) {
    return (
      <Card sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={20} />
      </Card>
    )
  }

  if (!benchmark) {
    return null
  }

  const benchCost = parseFloat(benchmark.cost_per_output_unit) || 0
  const benchEnergy = parseFloat(benchmark.energy_per_output_unit) || 0

  const hasCostData = unitCost != null && unitCost > 0
  const costDeltaPct = hasCostData && benchCost > 0 ? ((unitCost - benchCost) / benchCost) * 100 : null
  const isCostHigher = costDeltaPct != null && costDeltaPct > 0

  return (
    <Box sx={{ bgcolor: 'var(--color-surface, #1C222A)', border: '1px solid var(--color-line)', borderRadius: '4px', p: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>
            Sector benchmark comparison
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
            Sector: {benchmark.sector ? benchmark.sector.charAt(0).toUpperCase() + benchmark.sector.slice(1) : 'Manufacturing'} • Benchmark: {benchmark.business_size_band || 'MSME'}
          </Typography>
        </Box>
        <Chip
          label={benchmark.output_unit ? `Per ${benchmark.output_unit}` : 'Normalized'}
          size="small"
          variant="outlined"
          sx={{
            borderRadius: '4px',
            borderColor: 'var(--color-line)',
            color: 'var(--color-ink-muted)',
            fontSize: '0.7rem',
          }}
        />
      </Box>

      <Grid container spacing={1.5}>
        {/* Energy per unit */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={{
              p: 1.5,
              height: '100%',
              bgcolor: 'var(--color-subtle-bg)',
              borderRadius: '4px',
              border: '1px solid var(--color-line)',
            }}
          >
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Specific energy consumption</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
                {unitEnergy != null ? `${unitEnergy.toFixed(3)} kWh` : '—'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
                vs {benchEnergy.toFixed(3)} kWh peer avg
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Cost per unit */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={{
              p: 1.5,
              height: '100%',
              bgcolor: 'var(--color-subtle-bg)',
              borderRadius: '4px',
              border: '1px solid var(--color-line)',
            }}
          >
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Energy cost / unit</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: costDeltaPct == null ? 'var(--color-ink)' : isCostHigher ? 'var(--color-rust)' : 'var(--color-sage)',
                }}
              >
                {hasCostData ? `₹${unitCost.toFixed(3)}` : '—'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
                vs ₹{benchCost.toFixed(3)} peer avg
              </Typography>
            </Box>
            {costDeltaPct != null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
                {isCostHigher ? (
                  <AboveAvgIcon sx={{ fontSize: 14, color: 'var(--color-rust)' }} />
                ) : (
                  <BelowAvgIcon sx={{ fontSize: 14, color: 'var(--color-sage)' }} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    color: isCostHigher ? 'var(--color-rust)' : 'var(--color-sage)',
                    fontSize: '0.72rem',
                  }}
                >
                  {Math.abs(costDeltaPct).toFixed(1)}% {isCostHigher ? 'above' : 'below'} peer benchmark
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Citation */}
      <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <SourceIcon sx={{ fontSize: 14, color: 'var(--color-ink-muted)' }} />
        <Typography variant="caption" sx={{ fontSize: '0.6875rem', color: 'var(--color-ink-muted)' }}>
          Benchmark source: {benchmark.source}
        </Typography>
      </Box>
    </Box>
  )
}
