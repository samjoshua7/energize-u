import Grid from '@mui/material/Grid2'
import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Box,
} from '@mui/material'
import { createEnergyEntry } from './api'
import { getMachines } from '../machines/api'
import { SOURCE_TYPES, SOURCE_TYPE_LABELS, SOURCE_UNITS } from '../../lib/constants'

export default function ManualEntryDialog({
  open,
  onClose,
  businessId,
  onSuccess,
  initialSource = 'diesel',
}) {
  const [sourceType, setSourceType] = useState(initialSource)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [quantity, setQuantity] = useState('')
  const [costAmount, setCostAmount] = useState('')
  const [machineId, setMachineId] = useState('')
  const [kvaLoad, setKvaLoad] = useState('')
  const [runtimeHours, setRuntimeHours] = useState('')
  const [notes, setNotes] = useState('')

  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (open) {
      setSourceType(initialSource)
      // Default to current month start and end
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const today = now.toISOString().slice(0, 10)
      setPeriodStart(firstDay)
      setPeriodEnd(today)
      setErrorMsg('')

      if (businessId) {
        getMachines(businessId).then(setMachines).catch(console.error)
      }
    }
  }, [open, initialSource, businessId])

  const quantityUnit = SOURCE_UNITS[sourceType] || 'units'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!periodStart || !periodEnd || !quantity || !costAmount) {
      setErrorMsg('Please fill in required fields (Period, Quantity, and Cost).')
      return
    }

    if (new Date(periodEnd) < new Date(periodStart)) {
      setErrorMsg('End date cannot be earlier than start date.')
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')

      const payload = {
        business_id: businessId,
        source_type: sourceType,
        entry_source: 'manual',
        period_start: periodStart,
        period_end: periodEnd,
        quantity: parseFloat(quantity),
        quantity_unit: quantityUnit,
        cost_amount: parseFloat(costAmount),
        machine_id: machineId || null,
        kva_load: sourceType === 'grid' && kvaLoad ? parseFloat(kvaLoad) : null,
        runtime_hours: runtimeHours ? parseFloat(runtimeHours) : null,
        notes: notes.trim() || null,
      }

      await createEnergyEntry(payload)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Create energy entry error:', err)
      setErrorMsg(err.message || 'Failed to save entry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'var(--color-surface, #1C222A)',
            border: '1px solid var(--color-line)',
            borderRadius: '4px',
            backgroundImage: 'none',
            boxShadow: 'none',
          },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid var(--color-line)', pb: 2 }}>
        Log energy & fuel entry
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
          {errorMsg && <Alert severity="error" sx={{ borderRadius: '4px' }}>{errorMsg}</Alert>}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Source / fuel type"
                fullWidth
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                slotProps={{ select: { sx: { borderRadius: '4px' } } }}
              >
                {Object.keys(SOURCE_TYPES).map((k) => (
                  <MenuItem key={k} value={SOURCE_TYPES[k]}>
                    {SOURCE_TYPE_LABELS[SOURCE_TYPES[k]]}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Assign to machine (optional)"
                fullWidth
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                slotProps={{ select: { sx: { borderRadius: '4px' } } }}
              >
                <MenuItem value="">— None (Facility-wide) —</MenuItem>
                {machines.map((m) => (
                  <MenuItem key={m.machine_id} value={m.machine_id}>
                    {m.name} ({m.machine_type || m.primary_fuel})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Period start date"
                type="date"
                required
                fullWidth
                slotProps={{
                  inputLabel: { shrink: true },
                  input: { sx: { borderRadius: '4px', fontFamily: 'var(--font-mono)' } },
                }}
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Period end date"
                type="date"
                required
                fullWidth
                slotProps={{
                  inputLabel: { shrink: true },
                  input: { sx: { borderRadius: '4px', fontFamily: 'var(--font-mono)' } },
                }}
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label={`Quantity (${quantityUnit})`}
                type="number"
                required
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">{quantityUnit}</InputAdornment>,
                    sx: { borderRadius: '4px', fontFamily: 'var(--font-mono)' },
                  },
                }}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 250"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Total cost (INR)"
                type="number"
                required
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    sx: { borderRadius: '4px', fontFamily: 'var(--font-mono)' },
                  },
                }}
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                placeholder="e.g. 23500"
              />
            </Grid>

            {sourceType === 'grid' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Sanctioned / recorded load (kVA)"
                  type="number"
                  fullWidth
                  slotProps={{ input: { sx: { borderRadius: '4px', fontFamily: 'var(--font-mono)' } } }}
                  value={kvaLoad}
                  onChange={(e) => setKvaLoad(e.target.value)}
                  placeholder="e.g. 45"
                />
              </Grid>
            )}

            {['diesel', 'petrol', 'kerosene'].includes(sourceType) && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Genset / burner runtime (hours)"
                  type="number"
                  fullWidth
                  slotProps={{ input: { sx: { borderRadius: '4px', fontFamily: 'var(--font-mono)' } } }}
                  value={runtimeHours}
                  onChange={(e) => setRuntimeHours(e.target.value)}
                  placeholder="e.g. 18.5"
                />
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Notes / receipt invoice no."
                fullWidth
                slotProps={{ input: { sx: { borderRadius: '4px' } } }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. HPCL petrol pump receipt #8921"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid var(--color-line)', pt: 2 }}>
          <Button onClick={onClose} sx={{ color: 'var(--color-ink-muted)', textTransform: 'none', borderRadius: '4px' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: 'var(--color-amber)',
              color: '#14181D',
              fontWeight: 700,
              borderRadius: '4px',
              textTransform: 'none',
              '&:hover': { bgcolor: '#c47d25' },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Save entry'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
