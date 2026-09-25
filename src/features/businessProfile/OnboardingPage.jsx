import React, { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  Stack,
  Switch,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material'
import {
  ReceiptOutlined as BillIcon,
  BoltOutlined as EnergyIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  createBusinessProfile,
  updateBusinessProfile,
  getBusinessProfile,
  getTariffReferences,
} from './api'
import { getMachines, createMachine, updateMachine } from '../machines/api'
import { SECTORS, INDIAN_STATES } from '../../lib/constants'
import BillUploadDialog from '../energyEntries/BillUploadDialog'

const OUTPUT_UNIT_PRESETS = [
  { label: 'per 1,000 prints (Printing)', unit: 'prints', scale: 1000 },
  { label: 'per meter of fabric (Textile)', unit: 'meters', scale: 1 },
  { label: 'per kg processed (Metal / Food / Chemical)', unit: 'kg', scale: 1 },
  { label: 'per 100 parts produced (Machining)', unit: 'parts', scale: 100 },
  { label: 'Custom output unit', unit: 'custom', scale: 1 },
]

const COMMON_GENSET_RATINGS = [
  5, 7.5, 10, 15, 20, 25, 30, 40, 50, 62.5, 82.5, 100, 125, 160, 200, 250, 320, 500,
]

export default function OnboardingPage() {
  const { user, business, refreshBusiness } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [billOpen, setBillOpen] = useState(false)
  const [billSaved, setBillSaved] = useState(false)
  const [businessId, setBusinessId] = useState(business?.business_id)
  const [generator, setGenerator] = useState(null)
  const [tariffRefs, setTariffRefs] = useState([])
  const [selectedPreset, setSelectedPreset] = useState('per 1,000 prints (Printing)')

  const [form, setForm] = useState({
    name: business?.name || '',
    sector: business?.sector || 'printing',
    location_state: business?.location_state || 'Tamil Nadu',
    location_city: business?.location_city || '',
    primary_output_unit: business?.primary_output_unit || 'prints',
    output_unit_scale: business?.output_unit_scale || 1000,
    has_solar: business?.has_solar || false,
    solar_capacity_kw: business?.solar_capacity_kw || '',
    discom_name: business?.discom_name || '',
    tariff_category: business?.tariff_category || 'LT-IV',
    has_generator: true,
    fuel: 'diesel',
    kva: 62.5,
  })

  useEffect(() => {
    if (business?.business_id) {
      setBusinessId(business.business_id)
      getMachines(business.business_id)
        .then((rows) => {
          const genset = rows.find((m) => m.machine_type === 'genset')
          if (genset) {
            setGenerator(genset)
            setForm((prev) => ({
              ...prev,
              has_generator: true,
              fuel: genset.primary_fuel,
              kva: genset.kva_rating || 62.5,
            }))
          }
        })
        .catch(console.error)
    }
  }, [business?.business_id])

  useEffect(() => {
    let active = true
    if (form.location_state) {
      getTariffReferences(form.location_state)
        .then((rows) => {
          if (active) setTariffRefs(rows || [])
        })
        .catch(console.error)
    }
    return () => {
      active = false
    }
  }, [form.location_state])

  const handleField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handlePresetChange = (e) => {
    const val = e.target.value
    setSelectedPreset(val)
    const preset = OUTPUT_UNIT_PRESETS.find((p) => p.label === val)
    if (preset && preset.unit !== 'custom') {
      setForm((prev) => ({
        ...prev,
        primary_output_unit: preset.unit,
        output_unit_scale: preset.scale,
      }))
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (!form.name.trim() || !form.primary_output_unit.trim() || !(Number(form.output_unit_scale) > 0)) {
        throw new Error('Please enter business name and valid output basis.')
      }

      if (form.has_generator && !(Number(form.kva) > 0)) {
        throw new Error('Please select your generator rating in kVA.')
      }

      if (form.has_solar && !(Number(form.solar_capacity_kw) > 0)) {
        throw new Error('Please enter approximate solar capacity in kW.')
      }

      const values = {
        name: form.name.trim(),
        sector: form.sector,
        location_state: form.location_state,
        location_city: form.location_city.trim() || null,
        primary_output_unit: form.primary_output_unit.trim().toLowerCase(),
        output_unit_scale: Number(form.output_unit_scale),
        has_solar: form.has_solar,
        solar_capacity_kw: form.has_solar ? Number(form.solar_capacity_kw) : null,
        discom_name: form.discom_name.trim() || null,
        tariff_category: form.tariff_category.trim() || null,
      }

      const existing = businessId ? { business_id: businessId } : await getBusinessProfile(user.id)
      const saved = existing
        ? await updateBusinessProfile(existing.business_id, values)
        : await createBusinessProfile({ ...values, owner_id: user.id })

      setBusinessId(saved.business_id)

      if (form.has_generator) {
        const genValues = {
          business_id: saved.business_id,
          name: `${form.kva} kVA ${form.fuel.toUpperCase()} Generator`,
          machine_type: 'genset',
          primary_fuel: form.fuel,
          kva_rating: Number(form.kva),
        }
        const existingMachines = await getMachines(saved.business_id).catch(() => [])
        const currentGen = generator || existingMachines.find((m) => m.machine_type === 'genset')
        const savedGen = currentGen
          ? await updateMachine(currentGen.machine_id, genValues)
          : await createMachine(genValues)
        setGenerator(savedGen)
      }

      await refreshBusiness()
      setStep(1)
    } catch (err) {
      setError(err.message || 'Could not save profile details.')
    } finally {
      setBusy(false)
    }
  }

  async function handleFinish() {
    setBusy(true)
    setError('')
    try {
      if (businessId) {
        await updateBusinessProfile(businessId, { onboarding_completed_at: new Date().toISOString() })
      }
      await refreshBusiness()
      navigate('/')
    } catch {
      setError('Could not finish setup. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" sx={{ color: 'var(--color-amber)', fontWeight: 600, display: 'block', mb: 0.5 }}>
          Facility onboarding
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.02em' }}>
          One-time facility profile setup
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mt: 0.5, maxWidth: '75ch' }}>
          Configure your plant parameters, fuel sources, and production basis to enable unified ₹/unit and CO₂ tracking across grid, diesel, and solar.
        </Typography>
      </Box>

      {/* Numbered Steps: Valid for sequential flow per DESIGN.md */}
      <Stepper
        activeStep={step}
        sx={{
          mb: 4,
          '& .MuiStepLabel-label': {
            color: 'var(--color-ink-muted)',
            fontSize: '0.85rem',
            '&.Mui-active': { color: 'var(--color-amber)', fontWeight: 600 },
            '&.Mui-completed': { color: 'var(--color-sage)' },
          },
          '& .MuiStepIcon-root': {
            color: 'var(--color-surface, #1C222A)',
            border: '1px solid var(--color-line)',
            borderRadius: '50%',
            '&.Mui-active': { color: 'var(--color-amber)' },
            '&.Mui-completed': { color: 'var(--color-sage)' },
          },
        }}
      >
        <Step>
          <StepLabel>1. Facility & machinery</StepLabel>
        </Step>
        <Step>
          <StepLabel>2. First electricity bill (OCR)</StepLabel>
        </Step>
      </Stepper>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: '4px',
            bgcolor: 'rgba(193, 85, 58, 0.12)',
            color: 'var(--color-ink)',
            border: '1px solid rgba(193, 85, 58, 0.3)',
          }}
        >
          {error}
        </Alert>
      )}

      {step === 0 ? (
        <Box
          component="form"
          onSubmit={handleSaveProfile}
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            bgcolor: 'var(--color-surface, #1C222A)',
            border: '1px solid var(--color-line)',
            borderRadius: '4px',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--color-ink)', mb: 2 }}>
            1. Business identity & location
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 3 }}>
            <TextField
              required
              label="Business name"
              placeholder="e.g. Sivakasi Fine Arts Press"
              value={form.name}
              onChange={handleField('name')}
              size="small"
            />
            <TextField
              required
              select
              label="Business sector"
              value={form.sector}
              onChange={handleField('sector')}
              size="small"
            >
              {SECTORS.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              required
              select
              label="State (for grid emission factor & tariff)"
              value={form.location_state}
              onChange={handleField('location_state')}
              size="small"
            >
              {INDIAN_STATES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="City / industrial cluster"
              placeholder="e.g. Peenya Industrial Area, Bengaluru"
              value={form.location_city}
              onChange={handleField('location_city')}
              size="small"
            />
          </Box>

          <Divider sx={{ my: 3, borderColor: 'var(--color-line)' }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--color-ink)', mb: 0.5 }}>
            2. Primary output unit (cost divisor)
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mb: 2 }}>
            All multi-fuel expenditures (grid + diesel + thermal) will divide by this unit to calculate your headline ₹/unit metric.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mb: 3 }}>
            <TextField
              select
              label="Output unit preset"
              value={selectedPreset}
              onChange={handlePresetChange}
              size="small"
            >
              {OUTPUT_UNIT_PRESETS.map((p) => (
                <MenuItem key={p.label} value={p.label}>
                  {p.label}
                </MenuItem>
              ))}
            </TextField>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                required
                label="Unit label"
                value={form.primary_output_unit}
                onChange={handleField('primary_output_unit')}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                required
                type="number"
                label="Scale multiplier"
                inputProps={{ min: 1 }}
                value={form.output_unit_scale}
                onChange={handleField('output_unit_scale')}
                size="small"
                sx={{ width: 140 }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3, borderColor: 'var(--color-line)' }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--color-ink)', mb: 2 }}>
            3. Backup generator & solar presence
          </Typography>

          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.has_generator}
                  onChange={(e) => setForm((prev) => ({ ...prev, has_generator: e.target.checked }))}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-amber)' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--color-amber)' },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: 'var(--color-ink)', fontSize: '0.85rem' }}>
                  Facility operates an on-site backup generator (genset)
                </Typography>
              }
            />
          </Box>

          {form.has_generator && (
            <Box
              sx={{
                p: 2,
                borderRadius: '4px',
                bgcolor: 'rgba(20, 24, 29, 0.6)',
                border: '1px solid var(--color-line)',
                mb: 3,
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  select
                  size="small"
                  label="Generator fuel type"
                  value={form.fuel}
                  onChange={handleField('fuel')}
                >
                  <MenuItem value="diesel">Diesel (Standard MSME genset)</MenuItem>
                  <MenuItem value="petrol">Petrol (Portable backup unit)</MenuItem>
                </TextField>

                <TextField
                  fullWidth
                  required
                  select
                  size="small"
                  label="Genset rating (kVA)"
                  value={form.kva}
                  onChange={handleField('kva')}
                >
                  {COMMON_GENSET_RATINGS.map((rating) => (
                    <MenuItem key={rating} value={rating}>
                      {rating} kVA
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Box>
          )}

          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.has_solar}
                  onChange={(e) => setForm((prev) => ({ ...prev, has_solar: e.target.checked }))}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--color-amber)' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'var(--color-amber)' },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: 'var(--color-ink)', fontSize: '0.85rem' }}>
                  Facility has rooftop solar installed
                </Typography>
              }
            />
          </Box>

          {form.has_solar && (
            <Box
              sx={{
                p: 2,
                borderRadius: '4px',
                bgcolor: 'rgba(20, 24, 29, 0.6)',
                border: '1px solid var(--color-line)',
                mb: 3,
              }}
            >
              <TextField
                required
                type="number"
                size="small"
                label="Installed solar capacity (kWp)"
                inputProps={{ min: 0.1, step: 0.5 }}
                value={form.solar_capacity_kw}
                onChange={handleField('solar_capacity_kw')}
                sx={{ maxWidth: 300 }}
              />
            </Box>
          )}

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={busy}
              sx={{
                bgcolor: 'var(--color-amber)',
                color: '#14181D',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '4px',
                boxShadow: 'none',
                px: 3,
                py: 1,
                '&:hover': { bgcolor: '#c47d25', boxShadow: 'none' },
              }}
            >
              {busy ? 'Saving…' : 'Save & proceed to bill upload'}
            </Button>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            bgcolor: 'var(--color-surface, #1C222A)',
            border: '1px solid var(--color-line)',
            borderRadius: '4px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <BillIcon sx={{ color: 'var(--color-amber)', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>
              Scan first electricity bill
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mb: 3, fontSize: '0.85rem' }}>
            Upload a recent electricity bill photo. The multimodal vision model will parse units consumed, sanctioned load, and tariff charges, allowing full review before saving.
          </Typography>

          {billSaved && (
            <Alert
              severity="success"
              sx={{
                mb: 3,
                borderRadius: '4px',
                bgcolor: 'rgba(110, 155, 123, 0.12)',
                color: 'var(--color-ink)',
                border: '1px solid rgba(110, 155, 123, 0.3)',
              }}
            >
              Electricity bill scanned and recorded in ledger. You can now access your facility overview.
            </Alert>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="outlined"
              startIcon={<EnergyIcon />}
              onClick={() => setBillOpen(true)}
              sx={{
                borderColor: 'var(--color-line)',
                color: 'var(--color-ink)',
                textTransform: 'none',
                borderRadius: '4px',
                '&:hover': { borderColor: 'var(--color-amber)', color: 'var(--color-amber)' },
              }}
            >
              Upload electricity bill (AI OCR)
            </Button>
            <Button
              variant="contained"
              disabled={busy}
              onClick={handleFinish}
              sx={{
                bgcolor: 'var(--color-amber)',
                color: '#14181D',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '4px',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#c47d25', boxShadow: 'none' },
              }}
            >
              {busy ? 'Finishing…' : 'Enter facility dashboard'}
            </Button>
            <Button
              disabled={busy}
              onClick={() => setStep(0)}
              sx={{ color: 'var(--color-ink-muted)', textTransform: 'none' }}
            >
              Back to facility setup
            </Button>
          </Stack>
        </Box>
      )}

      <BillUploadDialog
        open={billOpen}
        onClose={() => setBillOpen(false)}
        businessId={businessId}
        onSuccess={() => setBillSaved(true)}
      />
    </Container>
  )
}

