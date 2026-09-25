import React, { useState, useMemo } from 'react'
import {
  Box,
  Card,
  Typography,
  Slider,
  TextField,
  MenuItem,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  TuneOutlined as SimulatorIcon,
  PlayArrowRounded as RunIcon,
  CheckCircleOutlineRounded as SuccessIcon,
  Co2Outlined as CarbonIcon,
  SavingsOutlined as SavingsIcon,
  ArrowForwardRounded as ArrowIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  calculateSimulationMetrics,
  executeSimulationAndPopulate,
  SECTOR_BENCHMARKS,
} from './simulatorEngine'
import { SECTORS, SHIFT_PATTERNS, INDIAN_STATES } from '../../lib/constants'

const SCENARIO_PRESETS = [
  {
    id: 'printing_standard',
    label: 'Standard Printing Press (Pune MIDC)',
    sector: 'printing',
    monthlyOutput: 55000,
    gridTariff: 9.50,
    outagePercent: 12,
    dieselPrice: 94.0,
    solarKw: 0,
    shiftPattern: 'double_shift',
    locationState: 'Maharashtra',
  },
  {
    id: 'textile_high_outage',
    label: 'High-Outage Textile Mill (Surat)',
    sector: 'textile',
    monthlyOutput: 15000,
    gridTariff: 8.40,
    outagePercent: 28,
    dieselPrice: 95.0,
    solarKw: 0,
    shiftPattern: 'double_shift',
    locationState: 'Gujarat',
  },
  {
    id: 'metal_cnc_shop',
    label: 'Precision CNC Machining Shop (Rajkot)',
    sector: 'metal_fabrication',
    monthlyOutput: 4500,
    gridTariff: 9.80,
    outagePercent: 8,
    dieselPrice: 94.5,
    solarKw: 15,
    shiftPattern: 'single_shift',
    locationState: 'Gujarat',
  },
  {
    id: 'green_solar_plant',
    label: 'Solar-Powered Agro Processing Unit',
    sector: 'food_processing',
    monthlyOutput: 25000,
    gridTariff: 9.20,
    outagePercent: 5,
    dieselPrice: 94.0,
    solarKw: 40,
    shiftPattern: 'double_shift',
    locationState: 'Karnataka',
  },
]

export default function SimulatorPage() {
  const navigate = useNavigate()
  const { business, refreshBusiness } = useAuth()

  // Simulator Inputs
  const [sector, setSector] = useState(business?.sector || 'printing')
  const [businessName, setBusinessName] = useState(business?.name || 'Apex Packaging & Offset Printers')
  const [locationState, setLocationState] = useState(business?.location_state || 'Maharashtra')
  const [shiftPattern, setShiftPattern] = useState(business?.shift_pattern || 'double_shift')
  const [monthlyOutput, setMonthlyOutput] = useState(55000)
  const [gridTariff, setGridTariff] = useState(9.20)
  const [outagePercent, setOutagePercent] = useState(15)
  const [dieselPrice, setDieselPrice] = useState(94.0)
  const [solarKw, setSolarKw] = useState(0)
  const [monthCount, setMonthCount] = useState(3)

  const [loading, setLoading] = useState(false)
  const [simulationResult, setSimulationResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Calculate live preview metrics in real time as sliders move
  const liveMetrics = useMemo(() => {
    return calculateSimulationMetrics({
      sector,
      monthlyOutput: Number(monthlyOutput) || 1000,
      gridTariff: Number(gridTariff) || 9,
      outagePercent: Number(outagePercent) || 0,
      dieselPrice: Number(dieselPrice) || 94,
      solarKw: Number(solarKw) || 0,
    })
  }, [sector, monthlyOutput, gridTariff, outagePercent, dieselPrice, solarKw])

  const handleApplyPreset = (preset) => {
    setSector(preset.sector)
    setMonthlyOutput(preset.monthlyOutput)
    setGridTariff(preset.gridTariff)
    setOutagePercent(preset.outagePercent)
    setDieselPrice(preset.dieselPrice)
    setSolarKw(preset.solarKw)
    setShiftPattern(preset.shiftPattern)
    setLocationState(preset.locationState)
    setSimulationResult(null)
  }

  const handleRunSimulation = async () => {
    if (!business?.business_id) {
      setErrorMsg('No active business found. Please ensure you are logged in.')
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')
      setSimulationResult(null)

      const result = await executeSimulationAndPopulate({
        businessId: business.business_id,
        businessName: businessName.trim(),
        sector,
        locationState,
        shiftPattern,
        monthlyOutput: Number(monthlyOutput),
        gridTariff: Number(gridTariff),
        outagePercent: Number(outagePercent),
        dieselPrice: Number(dieselPrice),
        solarKw: Number(solarKw),
        monthCount: Number(monthCount),
      })

      await refreshBusiness()
      setSimulationResult(result)
    } catch (err) {
      console.error('Simulation execution failed:', err)
      setErrorMsg(err.message || 'Simulation execution encountered an error.')
    } finally {
      setLoading(false)
    }
  }

  const isAboveBenchmark = liveMetrics.costDeltaPercent > 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%', minWidth: 0 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1.5,
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 44,
              flexShrink: 0,
              height: 44,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <SimulatorIcon sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              Energy Scenario Simulator
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tune operational variables to simulate energy costs, outages, and solar offsets
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate('/')}
          startIcon={<ArrowIcon sx={{ transform: 'rotate(180deg)' }} />}
          sx={{ fontWeight: 600, flexShrink: 0 }}
        >
          Back to Dashboard
        </Button>
      </Box>

      {/* Scenario Presets Quick-Picks */}
      <Card variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
          ⚡ 1-Click Operational Presets:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {SCENARIO_PRESETS.map((preset) => (
            <Chip
              key={preset.id}
              label={preset.label}
              variant="outlined"
              onClick={() => handleApplyPreset(preset)}
              sx={{
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
                maxWidth: '100%',
                height: 'auto',
                minHeight: 40,
                '& .MuiChip-label': { whiteSpace: 'normal', py: 1 },
                borderColor: sector === preset.sector ? 'primary.main' : 'divider',
                bgcolor: sector === preset.sector ? 'action.selected' : 'background.paper',
                '&:hover': { borderColor: 'primary.main' },
              }}
            />
          ))}
        </Box>
      </Card>

      {/* Main Two-Column Layout */}
      <Grid container spacing={2.5} sx={{ '& .MuiGrid2-root': { minWidth: 0 } }}>
        {/* Left Column: Customization Sliders & Controls */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" sx={{ p: { xs: 2, sm: 2.75 }, borderRadius: 2.5, borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
              1. Operational Parameters & Fuel Mix
            </Typography>

            <Grid container spacing={2.5} sx={{ '& .MuiSlider-root': { width: 'calc(100% - 16px)', mx: 1 } }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Industrial Sector"
                  fullWidth
                  size="small"
                  value={sector}
                  onChange={(e) => {
                    const nextSector = e.target.value
                    setSector(nextSector)
                    setMonthlyOutput(SECTOR_BENCHMARKS[nextSector]?.defaultOutput || 50000)
                  }}
                  helperText="Sets BEE benchmark baseline"
                >
                  {SECTORS.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="DISCOM State"
                  fullWidth
                  size="small"
                  value={locationState}
                  onChange={(e) => setLocationState(e.target.value)}
                >
                  {INDIAN_STATES.map((state) => (
                    <MenuItem key={state} value={state}>
                      {state}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Shift Pattern"
                  fullWidth
                  size="small"
                  value={shiftPattern}
                  onChange={(e) => setShiftPattern(e.target.value)}
                >
                  {SHIFT_PATTERNS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Historical Timeline"
                  fullWidth
                  size="small"
                  value={monthCount}
                  onChange={(e) => setMonthCount(Number(e.target.value))}
                >
                  <MenuItem value={1}>1 Month (Current Period)</MenuItem>
                  <MenuItem value={3}>3 Months (Quarterly Trend)</MenuItem>
                  <MenuItem value={6}>6 Months (Half-Yearly History)</MenuItem>
                </TextField>
              </Grid>

              {/* Monthly Production Output Slider */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Monthly Production Target ({liveMetrics.benchmark.unit})
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {Number(monthlyOutput).toLocaleString('en-IN')} {liveMetrics.benchmark.unit}
                  </Typography>
                </Box>
                <Slider
                  aria-label="Monthly production target"
                  valueLabelDisplay="auto"
                  value={Number(monthlyOutput)}
                  min={1000}
                  max={sector === 'metal_fabrication' ? 20000 : 150000}
                  step={sector === 'metal_fabrication' ? 250 : 2500}
                  onChange={(_, val) => setMonthlyOutput(val)}
                  color="primary"
                />
              </Grid>

              {/* Grid Tariff Slider */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Grid Electricity Tariff
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    ₹{Number(gridTariff).toFixed(2)}/kWh
                  </Typography>
                </Box>
                <Slider
                  aria-label="Grid electricity tariff"
                  valueLabelDisplay="auto"
                  value={Number(gridTariff)}
                  min={7.0}
                  max={13.0}
                  step={0.1}
                  onChange={(_, val) => setGridTariff(val)}
                  color="primary"
                />
              </Grid>

              {/* Diesel Outage Dependency Slider */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Grid Outage / Genset Share
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      color: outagePercent > 15 ? 'warning.main' : 'text.primary',
                    }}
                  >
                    {outagePercent}% of runtime
                  </Typography>
                </Box>
                <Slider
                  aria-label="Grid outage or genset share"
                  valueLabelDisplay="auto"
                  value={Number(outagePercent)}
                  min={0}
                  max={45}
                  step={1}
                  onChange={(_, val) => setOutagePercent(val)}
                  color={outagePercent > 15 ? 'warning' : 'primary'}
                />
              </Grid>

              {/* Diesel Fuel Price Slider */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Diesel Fuel Price
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    ₹{Number(dieselPrice).toFixed(1)}/L
                  </Typography>
                </Box>
                <Slider
                  aria-label="Diesel fuel price"
                  valueLabelDisplay="auto"
                  value={Number(dieselPrice)}
                  min={85.0}
                  max={110.0}
                  step={0.5}
                  onChange={(_, val) => setDieselPrice(val)}
                  color="primary"
                />
              </Grid>

              {/* Rooftop Solar Capacity Slider */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Rooftop Solar Installed
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: solarKw > 0 ? '#10B981' : 'text.secondary' }}>
                    {solarKw > 0 ? `${solarKw} kW Plant` : 'None (0 kW)'}
                  </Typography>
                </Box>
                <Slider
                  aria-label="Rooftop solar capacity"
                  valueLabelDisplay="auto"
                  value={Number(solarKw)}
                  min={0}
                  max={80}
                  step={5}
                  onChange={(_, val) => setSolarKw(val)}
                  sx={{ color: '#10B981' }}
                />
              </Grid>
            </Grid>

            {/* Run Action Button */}
            <Box sx={{ mt: 3.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={loading}
                onClick={handleRunSimulation}
                startIcon={loading ? <CircularProgress size={22} color="inherit" /> : <RunIcon sx={{ fontSize: 24 }} />}
                sx={{
                  py: 1.4,
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  letterSpacing: '0.01em',
                }}
              >
                {loading ? 'Simulating & Populating Facility Data...' : 'Run Simulation & Populate Entire App'}
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Right Column: Live Projected Impact & Benchmark Delta */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 2.75 },
              borderRadius: 2.5,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              2. Projected Monthly Impact
            </Typography>

            {/* Main Spend Tile */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Total Projected Monthly Energy Spend
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5, letterSpacing: '-0.02em' }}>
                ₹{liveMetrics.totalCost.toLocaleString('en-IN')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                <span>Grid: <strong>₹{liveMetrics.gridCost.toLocaleString('en-IN')}</strong> ({liveMetrics.gridKwh.toLocaleString('en-IN')} kWh)</span>
                {liveMetrics.dieselCost > 0 && (
                  <span>• Diesel: <strong>₹{liveMetrics.dieselCost.toLocaleString('en-IN')}</strong> ({liveMetrics.dieselLitres} L)</span>
                )}
              </Box>
            </Box>

            {/* Benchmark Comparison Tile */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: isAboveBenchmark ? 'warning.main' : 'primary.main',
                bgcolor: isAboveBenchmark ? 'rgba(245, 158, 11, 0.05)' : 'rgba(16, 185, 129, 0.05)',
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Specific Energy Cost (₹/{liveMetrics.benchmark.unit})
                </Typography>
                <Chip
                  label={`${isAboveBenchmark ? '+' : ''}${liveMetrics.costDeltaPercent}% vs BEE`}
                  size="small"
                  color={isAboveBenchmark ? 'warning' : 'primary'}
                  sx={{ fontWeight: 700, fontSize: '0.72rem', height: 22 }}
                />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1.5, my: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  ₹{liveMetrics.specificCost.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (BEE Peer Benchmark: ₹{liveMetrics.benchmarkCost.toFixed(2)})
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
                {isAboveBenchmark
                  ? `Your facility is consuming ${liveMetrics.costDeltaPercent}% more energy money per unit than benchmark peers.`
                  : `Your facility is beating the BEE sector benchmark by ${Math.abs(liveMetrics.costDeltaPercent)}%!`}
              </Typography>
            </Box>

            {/* Carbon & Savings Split Tiles */}
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6, md: 12, lg: 6 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CarbonIcon fontSize="small" sx={{ color: 'text.secondary' }} /> Carbon Footprint
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.25 }}>
                    {liveMetrics.totalCo2Tonnes} <Typography component="span" variant="caption" color="text.secondary">T CO₂</Typography>
                  </Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 12, lg: 6 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SavingsIcon fontSize="small" sx={{ color: 'primary.main' }} /> Savings Potential
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.25, color: 'primary.main' }}>
                    ₹{liveMetrics.totalPotentialSavings.toLocaleString('en-IN')}<Typography component="span" variant="caption" color="text.secondary">/mo</Typography>
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Simulation Success Banner */}
            {simulationResult && (
              <Alert
                icon={<SuccessIcon fontSize="inherit" />}
                severity="success"
                sx={{ borderRadius: 2, fontSize: '0.825rem' }}
                action={
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => navigate('/')}
                    sx={{ fontWeight: 700 }}
                  >
                    View Dashboard →
                  </Button>
                }
              >
                Simulation Complete! Populated {simulationResult.recordsCreated.months} months of energy bills, {simulationResult.recordsCreated.machinesCount} machines, and {simulationResult.recordsCreated.recommendationsCount} AI recommendations.
              </Alert>
            )}

            {errorMsg && (
              <Alert severity="error" sx={{ borderRadius: 2, fontSize: '0.825rem' }}>
                {errorMsg}
              </Alert>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
