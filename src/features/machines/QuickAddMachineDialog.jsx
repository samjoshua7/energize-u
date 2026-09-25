import Grid from '@mui/material/Grid2'
import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material'
import { PrecisionManufacturingOutlined as MachineIcon } from '@mui/icons-material'
import { createMachine } from './api'
import { SOURCE_TYPES, SOURCE_TYPE_LABELS } from '../../lib/constants'

const SECTOR_PRESETS = {
  printing: [
    { name: '4-Color Offset Press', machine_type: 'offset_press', primary_fuel: 'grid', power_rating_kw: 38 },
    { name: 'Kirloskar 62.5 kVA Genset', machine_type: 'genset', primary_fuel: 'diesel', power_rating_kw: 50 },
    { name: 'High-Speed Paper Cutter', machine_type: 'cutter', primary_fuel: 'grid', power_rating_kw: 15 },
    { name: 'Rotary Screw Air Compressor', machine_type: 'compressor', primary_fuel: 'grid', power_rating_kw: 11 },
  ],
  textile: [
    { name: 'Rapier Weaving Looms (Set of 12)', machine_type: 'looms', primary_fuel: 'grid', power_rating_kw: 36 },
    { name: '125 kVA Diesel Generator', machine_type: 'genset', primary_fuel: 'diesel', power_rating_kw: 100 },
    { name: 'Sectional Warping Machine', machine_type: 'warping', primary_fuel: 'grid', power_rating_kw: 15 },
    { name: 'Kerosene / Gas Steam Boiler', machine_type: 'boiler', primary_fuel: 'kerosene', power_rating_kw: 45 },
  ],
  metal_fabrication: [
    { name: 'CNC Turning Center', machine_type: 'cnc', primary_fuel: 'grid', power_rating_kw: 25 },
    { name: 'MIG / TIG Welding Stations', machine_type: 'welding', primary_fuel: 'grid', power_rating_kw: 18 },
    { name: 'Hydraulic Press Brake (100T)', machine_type: 'press', primary_fuel: 'grid', power_rating_kw: 35 },
    { name: 'Diesel Genset 62.5 kVA', machine_type: 'genset', primary_fuel: 'diesel', power_rating_kw: 50 },
  ],
  general: [
    { name: 'Main Production Line', machine_type: 'production_line', primary_fuel: 'grid', power_rating_kw: 30 },
    { name: 'Backup Diesel Generator', machine_type: 'genset', primary_fuel: 'diesel', power_rating_kw: 45 },
    { name: 'Central Air Compressor', machine_type: 'compressor', primary_fuel: 'grid', power_rating_kw: 15 },
  ],
}

export default function QuickAddMachineDialog({ open, onClose, businessId, sector = 'printing', onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    machine_type: 'genset',
    primary_fuel: 'diesel',
    power_rating_kw: '',
    age_years: '',
  })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const presets = SECTOR_PRESETS[sector] || SECTOR_PRESETS.general

  const handleApplyPreset = (preset) => {
    setFormData({
      name: preset.name,
      machine_type: preset.machine_type,
      primary_fuel: preset.primary_fuel,
      power_rating_kw: preset.power_rating_kw ? String(preset.power_rating_kw) : '',
      age_years: '3',
    })
  }

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name) {
      setErrorMsg('Please specify machine name.')
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')

      await createMachine({
        business_id: businessId,
        name: formData.name.trim(),
        machine_type: formData.machine_type || 'machinery',
        primary_fuel: formData.primary_fuel,
        power_rating_kw: formData.power_rating_kw ? parseFloat(formData.power_rating_kw) : null,
        age_years: formData.age_years ? parseFloat(formData.age_years) : null,
      })

      setFormData({
        name: '',
        machine_type: 'genset',
        primary_fuel: 'diesel',
        power_rating_kw: '',
        age_years: '',
      })

      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Quick add machine error:', err)
      setErrorMsg(err.message || 'Failed to save machine.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pb: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
          }}
        >
          <MachineIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Add Machinery to Inventory
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Register production machines & gensets to model fuel loads
          </Typography>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 1.5 }}>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '0.825rem' }}>
              {errorMsg}
            </Alert>
          )}

          {/* Quick Preset Suggestions */}
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
              Quick-add Common {sector.replace('_', ' ').toUpperCase()} Equipment:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {presets.map((p) => (
                <Chip
                  key={p.name}
                  label={`${p.name} (${p.power_rating_kw} kW)`}
                  size="small"
                  variant="outlined"
                  onClick={() => handleApplyPreset(p)}
                  sx={{
                    fontSize: '0.725rem',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                  }}
                />
              ))}
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Machine / Equipment Name"
                fullWidth
                required
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="e.g. Heidelberg 4-Color Press or 62.5 kVA Genset"
                size="small"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Primary Fuel / Energy Source"
                fullWidth
                value={formData.primary_fuel}
                onChange={handleChange('primary_fuel')}
                size="small"
              >
                {Object.values(SOURCE_TYPES).map((st) => (
                  <MenuItem key={st} value={st}>
                    {SOURCE_TYPE_LABELS[st]}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Power Rating (kW or kVA)"
                type="number"
                fullWidth
                value={formData.power_rating_kw}
                onChange={handleChange('power_rating_kw')}
                placeholder="e.g. 45"
                size="small"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Machine Type"
                fullWidth
                value={formData.machine_type}
                onChange={handleChange('machine_type')}
                placeholder="e.g. genset, press, boiler, motor"
                size="small"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Equipment Age (Years)"
                type="number"
                fullWidth
                value={formData.age_years}
                onChange={handleChange('age_years')}
                placeholder="e.g. 5"
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} color="inherit" disabled={loading} size="small">
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={loading} size="small">
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Save Machine'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
