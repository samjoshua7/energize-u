import Grid from '@mui/material/Grid2'
import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Chip,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import {
  PrecisionManufacturingOutlined as FactoryIcon,
  DeleteOutline as DeleteIcon,
  Add as AddIcon,
  CheckCircleOutline as CheckIcon,
  BoltOutlined as EnergyIcon,
  SpeedOutlined as OutputIcon,
  ArrowForward as ArrowIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { createBusinessProfile, updateBusinessProfile } from './api'
import { createMachine } from '../machines/api'
import { createEnergyEntry } from '../energyEntries/api'
import { createOutputRecord } from '../outputRecords/api'
import { SECTORS, SHIFT_PATTERNS, INDIAN_STATES, SOURCE_TYPES, SOURCE_TYPE_LABELS } from '../../lib/constants'

const SECTOR_PRESET_MACHINES = {
  printing: [
    { name: '4-Color Offset Printing Press', machine_type: 'offset_press', primary_fuel: 'grid', power_rating_kw: 38, age_years: 5 },
    { name: 'Kirloskar 62.5 kVA Diesel Generator', machine_type: 'genset', primary_fuel: 'diesel', power_rating_kw: 50, age_years: 3 },
    { name: 'High-Speed Paper Cutting Machine', machine_type: 'cutter', primary_fuel: 'grid', power_rating_kw: 15, age_years: 4 },
    { name: 'Rotary Screw Air Compressor', machine_type: 'compressor', primary_fuel: 'grid', power_rating_kw: 11, age_years: 2 },
  ],
  textile: [
    { name: 'Rapier Weaving Looms (Set of 12)', machine_type: 'looms', primary_fuel: 'grid', power_rating_kw: 36, age_years: 4 },
    { name: '125 kVA Diesel Generator', machine_type: 'genset', primary_fuel: 'diesel', power_rating_kw: 100, age_years: 3 },
    { name: 'Sectional Warping Machine', machine_type: 'warping', primary_fuel: 'grid', power_rating_kw: 15, age_years: 6 },
    { name: 'Kerosene / Gas Steam Boiler', machine_type: 'boiler', primary_fuel: 'kerosene', power_rating_kw: 45, age_years: 5 },
  ],
  metal_fabrication: [
    { name: 'CNC Turning & Milling Center', machine_type: 'cnc', primary_fuel: 'grid', power_rating_kw: 25, age_years: 3 },
    { name: 'MIG / TIG Welding Stations', machine_type: 'welding', primary_fuel: 'grid', power_rating_kw: 18, age_years: 4 },
    { name: 'Hydraulic Press Brake (100 Ton)', machine_type: 'press', primary_fuel: 'grid', power_rating_kw: 35, age_years: 5 },
    { name: 'Diesel Genset 62.5 kVA', machine_type: 'genset', primary_fuel: 'diesel', power_rating_kw: 50, age_years: 2 },
  ],
  general: [
    { name: 'Main Production Line', machine_type: 'production_line', primary_fuel: 'grid', power_rating_kw: 30, age_years: 4 },
    { name: 'Backup Diesel Generator', machine_type: 'genset', primary_fuel: 'diesel', power_rating_kw: 50, age_years: 3 },
    { name: 'Central Air Compressor', machine_type: 'compressor', primary_fuel: 'grid', power_rating_kw: 15, age_years: 2 },
  ],
}

const STEPS = ['Facility Basics', 'Machinery Inventory', 'Baseline Resources & Output']

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, business, refreshBusiness } = useAuth()

  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Step 1: Facility Basics
  const [facilityData, setFacilityData] = useState({
    name: business?.name || '',
    sector: business?.sector || 'printing',
    location_state: business?.location_state || 'Maharashtra',
    location_city: business?.location_city || '',
    employee_count: business?.employee_count ? String(business.employee_count) : '20',
    shift_pattern: business?.shift_pattern || 'single_shift',
    has_solar: business?.has_solar || false,
    solar_capacity_kw: '',
  })

  // Step 2: Machinery Inventory
  const [machinesList, setMachinesList] = useState([
    {
      id: 'm_init_1',
      name: 'Main Production Machinery',
      machine_type: 'production_machine',
      primary_fuel: 'grid',
      power_rating_kw: 35,
      age_years: 4,
    },
    {
      id: 'm_init_2',
      name: 'Diesel Generator Backup',
      machine_type: 'genset',
      primary_fuel: 'diesel',
      power_rating_kw: 50,
      age_years: 3,
    },
  ])

  const [customMachine, setCustomMachine] = useState({
    name: '',
    machine_type: 'machinery',
    primary_fuel: 'grid',
    power_rating_kw: '',
    age_years: '',
  })

  // Step 3: Baseline Resources & Output
  const [baselineData, setBaselineData] = useState({
    monthly_kwh: '4500',
    monthly_grid_spend: '42750',
    has_diesel_backup: true,
    monthly_diesel_litres: '280',
    monthly_diesel_spend: '25760',
    output_quantity: '50000',
    output_unit: 'sheets',
  })

  const sectorPresets = SECTOR_PRESET_MACHINES[facilityData.sector] || SECTOR_PRESET_MACHINES.general

  const handleFacilityChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFacilityData((prev) => ({ ...prev, [field]: value }))
  }

  const handleBaselineChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setBaselineData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddPresetMachine = (preset) => {
    setMachinesList((prev) => [
      ...prev,
      {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...preset,
      },
    ])
  }

  const handleAddCustomMachine = (e) => {
    e.preventDefault()
    if (!customMachine.name.trim()) return

    setMachinesList((prev) => [
      ...prev,
      {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: customMachine.name.trim(),
        machine_type: customMachine.machine_type || 'machinery',
        primary_fuel: customMachine.primary_fuel,
        power_rating_kw: customMachine.power_rating_kw ? parseFloat(customMachine.power_rating_kw) : null,
        age_years: customMachine.age_years ? parseFloat(customMachine.age_years) : null,
      },
    ])

    setCustomMachine({
      name: '',
      machine_type: 'machinery',
      primary_fuel: 'grid',
      power_rating_kw: '',
      age_years: '',
    })
  }

  const handleRemoveMachine = (id) => {
    setMachinesList((prev) => prev.filter((m) => m.id !== id))
  }

  const handleNext = () => {
    if (activeStep === 0) {
      if (!facilityData.name || !facilityData.sector || !facilityData.location_state) {
        setErrorMsg('Please complete required facility fields (Name, Sector, State).')
        return
      }
    }
    setErrorMsg('')
    setActiveStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setErrorMsg('')
    setActiveStep((prev) => prev - 1)
  }

  const handleSkipToDashboard = async () => {
    try {
      setLoading(true)
      // Save basic facility profile if not created yet
      if (!business?.business_id && user?.id) {
        const payload = {
          owner_id: user.id,
          name: facilityData.name.trim() || 'My Industrial Facility',
          sector: facilityData.sector,
          location_state: facilityData.location_state,
          location_city: facilityData.location_city.trim() || null,
          employee_count: facilityData.employee_count ? parseInt(facilityData.employee_count, 10) : 15,
          shift_pattern: facilityData.shift_pattern,
          has_solar: facilityData.has_solar,
        }
        await createBusinessProfile(payload)
        await refreshBusiness()
      }
      navigate('/', { replace: true })
    } catch (err) {
      console.warn('Skip profile notice:', err)
      navigate('/', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  const handleFinishSetup = async () => {
    try {
      setLoading(true)
      setErrorMsg('')

      let targetBusinessId = business?.business_id

      // 1. Create or Update Business Profile
      const bizPayload = {
        name: facilityData.name.trim(),
        sector: facilityData.sector,
        location_state: facilityData.location_state,
        location_city: facilityData.location_city.trim() || null,
        employee_count: facilityData.employee_count ? parseInt(facilityData.employee_count, 10) : null,
        shift_pattern: facilityData.shift_pattern,
        has_solar: facilityData.has_solar,
      }

      if (targetBusinessId) {
        await updateBusinessProfile(targetBusinessId, bizPayload)
      } else {
        const created = await createBusinessProfile({
          owner_id: user?.id,
          ...bizPayload,
        })
        targetBusinessId = created?.business_id
      }

      // 2. Batch Create Machinery Inventory
      if (targetBusinessId && machinesList.length > 0) {
        for (const m of machinesList) {
          try {
            await createMachine({
              business_id: targetBusinessId,
              name: m.name,
              machine_type: m.machine_type,
              primary_fuel: m.primary_fuel,
              power_rating_kw: m.power_rating_kw,
              age_years: m.age_years,
            })
          } catch (mErr) {
            console.warn('Machine create notice:', mErr)
          }
        }
      }

      // 3. Create Baseline Energy Entries
      if (targetBusinessId) {
        const now = new Date()
        const periodEnd = now.toISOString().split('T')[0]
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const periodStart = lastMonth.toISOString().split('T')[0]

        // Baseline Grid Entry
        if (baselineData.monthly_kwh && baselineData.monthly_grid_spend) {
          await createEnergyEntry({
            business_id: targetBusinessId,
            source_type: 'grid',
            entry_source: 'manual',
            period_start: periodStart,
            period_end: periodEnd,
            quantity: parseFloat(baselineData.monthly_kwh),
            quantity_unit: 'kWh',
            cost_amount: parseFloat(baselineData.monthly_grid_spend),
            notes: 'Baseline electricity consumption logged during setup',
          })
        }

        // Baseline Diesel Entry
        if (baselineData.has_diesel_backup && baselineData.monthly_diesel_litres) {
          await createEnergyEntry({
            business_id: targetBusinessId,
            source_type: 'diesel',
            entry_source: 'manual',
            period_start: periodStart,
            period_end: periodEnd,
            quantity: parseFloat(baselineData.monthly_diesel_litres),
            quantity_unit: 'litre',
            cost_amount: parseFloat(baselineData.monthly_diesel_spend || '0'),
            notes: 'Baseline generator fuel consumption logged during setup',
          })
        }

        // 4. Create Baseline Production Output
        if (baselineData.output_quantity) {
          await createOutputRecord({
            business_id: targetBusinessId,
            period_start: periodStart,
            period_end: periodEnd,
            output_quantity: parseFloat(baselineData.output_quantity),
            output_unit: baselineData.output_unit || 'units',
            notes: 'Initial production output baseline recorded during setup',
          })
        }
      }

      await refreshBusiness()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Failed to complete onboarding setup:', err)
      setErrorMsg(err.message || 'Error saving facility setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 3, sm: 5 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 840, mx: 'auto' }}>
        {/* Top Header & Skip Action */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <FactoryIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                Setup Your Facility Intelligence
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure equipment and energy baseline for instant BEE benchmarks
              </Typography>
            </Box>
          </Box>

          <Button
            variant="text"
            color="inherit"
            onClick={handleSkipToDashboard}
            disabled={loading}
            sx={{ fontWeight: 600, fontSize: '0.85rem' }}
          >
            Skip to Dashboard →
          </Button>
        </Box>

        {/* Stepper Progress */}
        <Card variant="outlined" sx={{ mb: 3, p: 2, borderRadius: 2, borderColor: 'divider' }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Card>

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* ================= STEP 1: FACILITY PROFILE ================= */}
        {activeStep === 0 && (
          <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2.5, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Facility Profile & Operations
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your sector determines the specific energy benchmark against peer MSMEs in India.
            </Typography>

            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Business / Factory Name"
                  fullWidth
                  required
                  value={facilityData.name}
                  onChange={handleFacilityChange('name')}
                  placeholder="e.g. Apex Offset Printers or Shri Ganesh Weaving"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Industrial Sector"
                  fullWidth
                  required
                  value={facilityData.sector}
                  onChange={handleFacilityChange('sector')}
                  helperText="Matches BEE benchmarks and peer consumption curves"
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
                  label="State (for DISCOM Grid Tariffs)"
                  fullWidth
                  required
                  value={facilityData.location_state}
                  onChange={handleFacilityChange('location_state')}
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
                  label="City / Industrial Cluster"
                  fullWidth
                  value={facilityData.location_city}
                  onChange={handleFacilityChange('location_city')}
                  placeholder="e.g. MIDC Bhosari, Pune or Surat GIDC"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Number of Employees"
                  type="number"
                  fullWidth
                  value={facilityData.employee_count}
                  onChange={handleFacilityChange('employee_count')}
                  placeholder="e.g. 20"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Shift Pattern"
                  fullWidth
                  value={facilityData.shift_pattern}
                  onChange={handleFacilityChange('shift_pattern')}
                >
                  {SHIFT_PATTERNS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={facilityData.has_solar}
                        onChange={handleFacilityChange('has_solar')}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Rooftop Solar Installed?
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tracks solar generation offsets
                        </Typography>
                      </Box>
                    }
                  />
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3.5 }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleNext}
                endIcon={<ArrowIcon />}
                sx={{ px: 3, fontWeight: 700 }}
              >
                Next: Machinery Inventory
              </Button>
            </Box>
          </Card>
        )}

        {/* ================= STEP 2: MACHINERY INVENTORY ================= */}
        {activeStep === 1 && (
          <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2.5, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Machinery & Equipment Inventory
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Dump all machines, production lines, and diesel generators operating at your facility.
            </Typography>

            {/* Sector Preset Chips */}
            <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Quick-add Common Equipment for {facilityData.sector.toUpperCase()}:
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Click any equipment below to add it directly to your inventory:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {sectorPresets.map((preset) => (
                  <Chip
                    key={preset.name}
                    label={`+ ${preset.name} (${preset.power_rating_kw} kW • ${preset.primary_fuel})`}
                    variant="outlined"
                    onClick={() => handleAddPresetMachine(preset)}
                    sx={{
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      borderColor: 'primary.main',
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'primary.main', color: '#FFFFFF' },
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Current Machine Inventory Table */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Current Machinery List ({machinesList.length} items registered)
              </Typography>
              {machinesList.length === 0 ? (
                <Alert severity="info" sx={{ fontSize: '0.825rem' }}>
                  No machines added yet. Use the presets above or form below to add equipment.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Machine Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Primary Fuel</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Power (kW)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Age (Yrs)</TableCell>
                        <TableCell align="center" sx={{ width: 60 }}></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {machinesList.map((m) => (
                        <TableRow key={m.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{m.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={SOURCE_TYPE_LABELS[m.primary_fuel] || m.primary_fuel}
                              size="small"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          </TableCell>
                          <TableCell align="right">{m.power_rating_kw ? `${m.power_rating_kw} kW` : '—'}</TableCell>
                          <TableCell align="right">{m.age_years ? `${m.age_years} yrs` : '—'}</TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleRemoveMachine(m.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            {/* Custom Machine Add Form */}
            <Box component="form" onSubmit={handleAddCustomMachine} sx={{ p: 2, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                + Add Custom Machinery / Genset
              </Typography>
              <Grid container spacing={1.5} alignItems="center">
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Machine Name"
                    fullWidth
                    size="small"
                    value={customMachine.name}
                    onChange={(e) => setCustomMachine((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. 50 HP Air Blower"
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    select
                    label="Fuel Source"
                    fullWidth
                    size="small"
                    value={customMachine.primary_fuel}
                    onChange={(e) => setCustomMachine((prev) => ({ ...prev, primary_fuel: e.target.value }))}
                  >
                    {Object.values(SOURCE_TYPES).map((st) => (
                      <MenuItem key={st} value={st}>
                        {SOURCE_TYPE_LABELS[st]}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    label="Power (kW)"
                    type="number"
                    fullWidth
                    size="small"
                    value={customMachine.power_rating_kw}
                    onChange={(e) => setCustomMachine((prev) => ({ ...prev, power_rating_kw: e.target.value }))}
                    placeholder="30"
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    label="Age (Years)"
                    type="number"
                    fullWidth
                    size="small"
                    value={customMachine.age_years}
                    onChange={(e) => setCustomMachine((prev) => ({ ...prev, age_years: e.target.value }))}
                    placeholder="4"
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 1 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={!customMachine.name.trim()}
                    sx={{ height: 40 }}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* Navigation Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3.5 }}>
              <Button variant="outlined" onClick={handleBack} startIcon={<BackIcon />}>
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleNext}
                endIcon={<ArrowIcon />}
                sx={{ px: 3, fontWeight: 700 }}
              >
                Next: Energy & Baseline Output
              </Button>
            </Box>
          </Card>
        )}

        {/* ================= STEP 3: BASELINE ENERGY & OUTPUT ================= */}
        {activeStep === 2 && (
          <Card variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2.5, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Baseline Resource Consumption & Production Output
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Provide average monthly energy consumption and output so Energize U can immediately compute your ₹/unit specific cost.
            </Typography>

            <Grid container spacing={2.5}>
              {/* Electricity Grid Baseline */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EnergyIcon fontSize="small" sx={{ color: 'primary.main' }} />
                  1. Monthly Grid Electricity Consumption
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Average Monthly Consumption (kWh)"
                  type="number"
                  fullWidth
                  required
                  value={baselineData.monthly_kwh}
                  onChange={handleBaselineChange('monthly_kwh')}
                  placeholder="e.g. 4500"
                  helperText="Units consumed as per monthly electricity bill"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Average Monthly Bill Amount (₹)"
                  type="number"
                  fullWidth
                  required
                  value={baselineData.monthly_grid_spend}
                  onChange={handleBaselineChange('monthly_grid_spend')}
                  placeholder="e.g. 42000"
                  helperText="Total electricity bill including fixed & energy charges"
                />
              </Grid>

              {/* Generator Diesel Baseline */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FactoryIcon fontSize="small" sx={{ color: '#F59E0B' }} />
                    2. Diesel Generator Fuel Consumption
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={baselineData.has_diesel_backup}
                        onChange={handleBaselineChange('has_diesel_backup')}
                      />
                    }
                    label="Uses Diesel Generator"
                  />
                </Box>
              </Grid>

              {baselineData.has_diesel_backup && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Monthly Diesel Purchased (Litres)"
                      type="number"
                      fullWidth
                      value={baselineData.monthly_diesel_litres}
                      onChange={handleBaselineChange('monthly_diesel_litres')}
                      placeholder="e.g. 250"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Monthly Diesel Spend (₹)"
                      type="number"
                      fullWidth
                      value={baselineData.monthly_diesel_spend}
                      onChange={handleBaselineChange('monthly_diesel_spend')}
                      placeholder="e.g. 23500"
                    />
                  </Grid>
                </>
              )}

              {/* Production Output */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <OutputIcon fontSize="small" sx={{ color: '#3B82F6' }} />
                  3. Monthly Production Output
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Monthly Production Output Quantity"
                  type="number"
                  fullWidth
                  required
                  value={baselineData.output_quantity}
                  onChange={handleBaselineChange('output_quantity')}
                  placeholder="e.g. 50000"
                  helperText="e.g. 50,000 printed sheets, 8,000 meters cloth, or 2,500 kg metal"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Output Unit"
                  fullWidth
                  required
                  value={baselineData.output_unit}
                  onChange={handleBaselineChange('output_unit')}
                  placeholder="e.g. sheets, meters, kg, boxes, pieces"
                  helperText="The measurement unit for specific energy calculations"
                />
              </Grid>
            </Grid>

            {/* Navigation & Submit Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button variant="outlined" onClick={handleBack} startIcon={<BackIcon />} disabled={loading}>
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
                onClick={handleFinishSetup}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckIcon />}
                sx={{ px: 3.5, fontWeight: 700 }}
              >
                {loading ? 'Configuring Facility Intelligence...' : 'Complete & Launch Intelligence'}
              </Button>
            </Box>
          </Card>
        )}
      </Box>
    </Box>
  )
}
