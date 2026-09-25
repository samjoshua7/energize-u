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
  Grid,
} from '@mui/material'
import { PrecisionManufacturingOutlined as FactoryIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { createBusinessProfile } from './api'
import { SECTORS, SHIFT_PATTERNS, INDIAN_STATES } from '../../lib/constants'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, refreshBusiness } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    sector: 'printing',
    location_state: 'Maharashtra',
    location_city: '',
    employee_count: '',
    shift_pattern: 'single_shift',
    has_solar: false,
  })

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.sector || !formData.location_state) {
      setErrorMsg('Please fill in required fields (Facility Name, Sector, and State).')
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')

      const payload = {
        owner_id: user?.id,
        name: formData.name.trim(),
        sector: formData.sector,
        location_state: formData.location_state,
        location_city: formData.location_city.trim() || null,
        employee_count: formData.employee_count ? parseInt(formData.employee_count, 10) : null,
        shift_pattern: formData.shift_pattern,
        has_solar: formData.has_solar,
      }

      await createBusinessProfile(payload)
      await refreshBusiness()
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Failed to create business profile:', err)
      setErrorMsg(err.message || 'Error saving facility profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0B0F19',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Card sx={{ maxWidth: 640, width: '100%', p: { xs: 1.5, sm: 2.5 } }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0B0F19',
              }}
            >
              <FactoryIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>
                Setup Facility Profile
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tell us about your plant to unlock benchmark comparisons
              </Typography>
            </Box>
          </Box>

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {errorMsg}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Business / Factory Name"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={handleChange('name')}
                  placeholder="e.g. Apex Offset Printers or Om Weaving Mills"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Manufacturing Sector"
                  fullWidth
                  required
                  value={formData.sector}
                  onChange={handleChange('sector')}
                  helperText="Drives peer benchmark matching"
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
                  label="State (for Grid Tariff & Emissions)"
                  fullWidth
                  required
                  value={formData.location_state}
                  onChange={handleChange('location_state')}
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
                  label="City / Industrial Area"
                  fullWidth
                  value={formData.location_city}
                  onChange={handleChange('location_city')}
                  placeholder="e.g. MIDC Bhosari, Pune"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Employee Count"
                  type="number"
                  fullWidth
                  value={formData.employee_count}
                  onChange={handleChange('employee_count')}
                  placeholder="e.g. 15"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  label="Shift Pattern"
                  fullWidth
                  value={formData.shift_pattern}
                  onChange={handleChange('shift_pattern')}
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
                    bgcolor: 'rgba(15, 23, 42, 0.6)',
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.has_solar}
                        onChange={handleChange('has_solar')}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Rooftop Solar Installed?
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tracks solar offset vs grid
                        </Typography>
                      </Box>
                    }
                  />
                </Box>
              </Grid>
            </Grid>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 3, py: 1.3 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Profile & Enter App'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
