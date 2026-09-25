import React from 'react'
import {
  Box,
  Typography,
  Chip,
  Button,
  LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  LocalGasStation as DieselIcon,
  ElectricBolt as GridIcon,
  WbSunny as SolarIcon,
  LocalFireDepartment as KeroseneIcon,
  AddCircleOutline as RefuelIcon,
  TrendingDown as DepleteIcon,
  AccessTime as RunwayIcon,
} from '@mui/icons-material'

export default function ResourceInventoryView({
  inventory,
  gridOutageActive,
  onRefuel,
}) {
  const { grid, diesel, kerosene, solar } = inventory

  const dieselPct = Math.min(100, Math.round((diesel.stockLitres / diesel.capacityLitres) * 100))
  const kerosenePct = Math.min(100, Math.round((kerosene.stockLitres / kerosene.capacityLitres) * 100))

  // Estimate genset runway in hours
  // When running at 40-50 kW load, burn rate is ~12-14.5 L/hr
  const estimatedHourlyBurn = gridOutageActive ? 14.2 : 0
  const gensetRunwayHours = estimatedHourlyBurn > 0 ? (diesel.stockLitres / estimatedHourlyBurn).toFixed(1) : (diesel.stockLitres / 14.2).toFixed(1)

  const isDieselCritical = diesel.stockLitres < diesel.minThresholdLitres

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>
            Resource & Energy Inventory Hub
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
            Current stock reserves, depletion trajectories, utility meters, and rooftop solar generation
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* 1. Diesel Fuel Tank */}
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'var(--color-surface)',
              border: '1px solid',
              borderColor: isDieselCritical ? 'rgba(193, 85, 58, 0.5)' : 'var(--color-line)',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              boxShadow: isDieselCritical ? '0 0 10px rgba(193, 85, 58, 0.15)' : 'none',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <DieselIcon sx={{ fontSize: 18, color: 'var(--color-rust)' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>
                    Commercial Diesel Tank
                  </Typography>
                </Box>
                <Chip
                  label={`${dieselPct}% full`}
                  size="small"
                  sx={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    bgcolor: isDieselCritical ? 'rgba(193, 85, 58, 0.15)' : 'var(--color-subtle-bg)',
                    color: isDieselCritical ? 'var(--color-rust)' : 'var(--color-ink)',
                    border: '1px solid var(--color-line)',
                  }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mb: 1.5 }}>
                Dedicated tank for 62.5 kVA Backup Genset
              </Typography>

              {/* Litres Display */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 700, color: isDieselCritical ? 'var(--color-rust)' : 'var(--color-ink)' }}>
                  {Math.round(diesel.stockLitres)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
                  / {diesel.capacityLitres} Litres
                </Typography>
              </Box>

              {/* Visual Tank Gauge */}
              <LinearProgress
                variant="determinate"
                value={dieselPct}
                sx={{
                  height: 8,
                  borderRadius: '2px',
                  bgcolor: 'var(--color-line)',
                  mb: 1.5,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: isDieselCritical ? 'var(--color-rust)' : 'var(--color-amber)',
                  },
                }}
              />

              {/* Telemetry Stats */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Genset Runway:</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                    ~{gensetRunwayHours} operating hrs
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Burned Today:</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                    {diesel.consumedTodayLitres} L (₹{diesel.costToday.toLocaleString('en-IN')})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Fuel Price:</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                    ₹{diesel.pricePerLitre.toFixed(2)}/L
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Action Button: Refuel */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefuelIcon sx={{ fontSize: 15 }} />}
              onClick={() => onRefuel && onRefuel('diesel', 100)}
              sx={{
                width: '100%',
                borderRadius: '4px',
                borderColor: 'var(--color-line)',
                color: 'var(--color-ink)',
                fontSize: '0.75rem',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: 'var(--color-subtle-bg)', borderColor: 'var(--color-ink-muted)' },
              }}
            >
              Refuel +100 L
            </Button>
          </Box>
        </Grid>

        {/* 2. Kerosene Drum Storage */}
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <KeroseneIcon sx={{ fontSize: 18, color: 'var(--color-amber)' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>
                    Kerosene Drum Stock
                  </Typography>
                </Box>
                <Chip
                  label={`${kerosenePct}% full`}
                  size="small"
                  sx={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    bgcolor: 'var(--color-subtle-bg)',
                    color: 'var(--color-ink)',
                    border: '1px solid var(--color-line)',
                  }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mb: 1.5 }}>
                Thermal lamination and process heat fuel
              </Typography>

              {/* Litres Display */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                  {Math.round(kerosene.stockLitres)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
                  / {kerosene.capacityLitres} Litres
                </Typography>
              </Box>

              {/* Visual Tank Gauge */}
              <LinearProgress
                variant="determinate"
                value={kerosenePct}
                sx={{
                  height: 8,
                  borderRadius: '2px',
                  bgcolor: 'var(--color-line)',
                  mb: 1.5,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'var(--color-amber)',
                  },
                }}
              />

              {/* Telemetry Stats */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Burn Rate:</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                    ~2.6 L/hr when firing
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Burned Today:</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                    {kerosene.consumedTodayLitres} L (₹{kerosene.costToday.toLocaleString('en-IN')})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Fuel Price:</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                    ₹{kerosene.pricePerLitre.toFixed(2)}/L
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Action Button: Refuel */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefuelIcon sx={{ fontSize: 15 }} />}
              onClick={() => onRefuel && onRefuel('kerosene', 50)}
              sx={{
                width: '100%',
                borderRadius: '4px',
                borderColor: 'var(--color-line)',
                color: 'var(--color-ink)',
                fontSize: '0.75rem',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: 'var(--color-subtle-bg)', borderColor: 'var(--color-ink-muted)' },
              }}
            >
              Refuel +50 L
            </Button>
          </Box>
        </Grid>

        {/* 3. DISCOM Grid Electric Meter */}
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'var(--color-surface)',
              border: '1px solid',
              borderColor: gridOutageActive ? 'rgba(193, 85, 58, 0.4)' : 'var(--color-line)',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <GridIcon sx={{ fontSize: 18, color: gridOutageActive ? 'var(--color-rust)' : 'var(--color-amber)' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>
                    DISCOM Grid Feed
                  </Typography>
                </Box>
                <Chip
                  label={gridOutageActive ? 'OUTAGE' : grid.isPeakNow ? 'PEAK TOU' : 'ONLINE'}
                  size="small"
                  sx={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    bgcolor: gridOutageActive
                      ? 'rgba(193, 85, 58, 0.15)'
                      : grid.isPeakNow
                      ? 'rgba(158, 93, 18, 0.15)'
                      : 'rgba(30, 107, 57, 0.15)',
                    color: gridOutageActive
                      ? 'var(--color-rust)'
                      : grid.isPeakNow
                      ? 'var(--color-amber)'
                      : 'var(--color-sage)',
                    border: '1px solid var(--color-line)',
                  }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mb: 1.5 }}>
                HT/LT Industrial Connection Meter
              </Typography>

              {/* Energy Draw Display */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                  {Math.round(grid.consumedTodayKwh).toLocaleString('en-IN')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
                  kWh drawn today
                </Typography>
              </Box>

              {/* Telemetry Stats */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Grid Bill Today:</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                    ₹{grid.costToday.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Current Tariff Slab:</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: grid.isPeakNow ? 'var(--color-amber)' : 'var(--color-ink)' }}>
                    ₹{grid.isPeakNow ? grid.peakTariff.toFixed(2) : grid.normalTariff.toFixed(2)} / kWh
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Grid Emission Factor:</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
                    0.7100 kg CO₂/kWh (CEA)
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ p: 1, mt: 2, bgcolor: 'var(--color-subtle-bg)', borderRadius: '4px', border: '1px solid var(--color-line)' }}>
              <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'var(--color-ink-muted)', display: 'block' }}>
                Peak Window: 18:00 – 22:00 (₹11.50/kWh)
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* 4. Rooftop Solar PV Inverter Station */}
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <SolarIcon sx={{ fontSize: 18, color: 'var(--color-sage)' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>
                    Rooftop Solar PV
                  </Typography>
                </Box>
                <Chip
                  label={`${solar.installedKw} kWp`}
                  size="small"
                  sx={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    bgcolor: 'rgba(30, 107, 57, 0.12)',
                    color: 'var(--color-sage)',
                    border: '1px solid rgba(30, 107, 57, 0.3)',
                  }}
                />
              </Box>

              <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mb: 1.5 }}>
                25 kWp Grid-tied String Inverter
              </Typography>

              {/* Instant Output Display */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-sage)' }}>
                  {solar.currentOutputKw.toFixed(1)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
                  kW instant generation
                </Typography>
              </Box>

              {/* Telemetry Stats */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Generated Today:</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sage)' }}>
                    {solar.generatedTodayKwh} kWh
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Displaced Grid Cost:</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sage)' }}>
                    ₹{solar.savingsToday.toLocaleString('en-IN')} saved
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Carbon Avoided:</Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-sage)' }}>
                    {(solar.generatedTodayKwh * 0.71).toFixed(1)} kg CO₂
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ p: 1, mt: 2, bgcolor: 'rgba(30, 107, 57, 0.08)', borderRadius: '4px', border: '1px solid rgba(30, 107, 57, 0.2)' }}>
              <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'var(--color-sage)', fontWeight: 600, display: 'block' }}>
                Zero operational emission fuel displacement
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
