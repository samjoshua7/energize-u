import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
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
    <Card sx={{ border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0'}` }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Sector Benchmark Comparison
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Sector: {benchmark.sector?.toUpperCase()} • Benchmark: {benchmark.business_size_band || 'MSME'}
            </Typography>
          </Box>
          <Chip
            label={benchmark.output_unit ? `Per ${benchmark.output_unit}` : 'Normalized'}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
        </Box>

        <Grid container spacing={1.5}>
          {/* Energy per unit */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box
              sx={{
                p: 1.25,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
                borderRadius: 1,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0'}`,
              }}
            >
              <Typography variant="caption" color="text.secondary">Specific Energy Consumption</Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.25 }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {unitEnergy != null ? `${unitEnergy.toFixed(3)} kWh` : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  vs {benchEnergy.toFixed(3)} kWh peer avg
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Cost per unit */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box
              sx={{
                p: 1.25,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
                borderRadius: 1,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0'}`,
              }}
            >
              <Typography variant="caption" color="text.secondary">Energy Cost / Unit</Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.25 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: costDeltaPct == null ? 'text.primary' : isCostHigher ? 'warning.main' : 'primary.main',
                  }}
                >
                  {hasCostData ? `₹${unitCost.toFixed(3)}` : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  vs ₹{benchCost.toFixed(3)} peer avg
                </Typography>
              </Box>
              {costDeltaPct != null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  {isCostHigher ? (
                    <AboveAvgIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                  ) : (
                    <BelowAvgIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: isCostHigher ? 'warning.main' : 'primary.main',
                      fontSize: '0.7rem',
                    }}
                  >
                    {Math.abs(costDeltaPct).toFixed(1)}% {isCostHigher ? 'higher than' : 'below'} peer benchmark
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Citation */}
        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <SourceIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.675rem' }}>
            Benchmark source: {benchmark.source}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}
