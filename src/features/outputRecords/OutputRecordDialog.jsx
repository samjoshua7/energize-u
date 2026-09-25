import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  InputAdornment,
  Box,
} from '@mui/material'
import { createOutputRecord } from './api'

export default function OutputRecordDialog({
  open,
  onClose,
  businessId,
  defaultUnit = 'sheets',
  onSuccess,
}) {
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [outputQuantity, setOutputQuantity] = useState('')
  const [outputUnit, setOutputUnit] = useState(defaultUnit)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (open) {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const today = now.toISOString().slice(0, 10)
      setPeriodStart(firstDay)
      setPeriodEnd(today)
      setOutputUnit(defaultUnit || 'sheets')
      setErrorMsg('')
    }
  }, [open, defaultUnit])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!periodStart || !periodEnd || !outputQuantity || !outputUnit) {
      setErrorMsg('Please fill in period dates and output quantity.')
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')

      await createOutputRecord({
        business_id: businessId,
        period_start: periodStart,
        period_end: periodEnd,
        output_quantity: parseFloat(outputQuantity),
        output_unit: outputUnit.trim().toLowerCase(),
      })

      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Create output record error:', err)
      setErrorMsg(err.message || 'Failed to save production record.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { bgcolor: 'background.paper', borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Log Production Output</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Period Start"
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
                label="Period End"
                type="date"
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextField
                label="Output Quantity"
                type="number"
                required
                fullWidth
                value={outputQuantity}
                onChange={(e) => setOutputQuantity(e.target.value)}
                placeholder="e.g. 50000"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                label="Unit"
                required
                fullWidth
                value={outputUnit}
                onChange={(e) => setOutputUnit(e.target.value)}
                placeholder="e.g. sheets, kg, meters"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Save Output'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
