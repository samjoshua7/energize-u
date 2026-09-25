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
      slotProps={{ paper: { sx: { bgcolor: 'background.paper', borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        Log Energy & Fuel Entry (Manual)
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Source / Fuel Type"
                fullWidth
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
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
                label="Assign to Machine (Optional)"
                fullWidth
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
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
                label="Period Start Date"
                type="date"
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Period End Date"
                type="date"
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
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
                  },
                }}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 250"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Total Cost (INR)"
                type="number"
                required
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
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
                  label="Sanctioned / Recorded Load (kVA)"
                  type="number"
                  fullWidth
                  value={kvaLoad}
                  onChange={(e) => setKvaLoad(e.target.value)}
                  placeholder="e.g. 45"
                />
              </Grid>
            )}

            {['diesel', 'petrol', 'kerosene'].includes(sourceType) && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Genset / Burner Runtime (Hours)"
                  type="number"
                  fullWidth
                  value={runtimeHours}
                  onChange={(e) => setRuntimeHours(e.target.value)}
                  placeholder="e.g. 18.5"
                />
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Notes / Receipt Invoice No."
                fullWidth
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. HPCL petrol pump receipt #8921"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Save Entry'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
