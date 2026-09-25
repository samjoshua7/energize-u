import Grid from '@mui/material/Grid2'
import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
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
        Log production output
      </DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
          {errorMsg && <Alert severity="error" sx={{ borderRadius: '4px' }}>{errorMsg}</Alert>}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Period start"
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
                label="Period end"
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
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextField
                label="Output quantity"
                type="number"
                required
                fullWidth
                slotProps={{
                  input: { sx: { borderRadius: '4px', fontFamily: 'var(--font-mono)' } },
                }}
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
                slotProps={{
                  input: { sx: { borderRadius: '4px' } },
                }}
                value={outputUnit}
                onChange={(e) => setOutputUnit(e.target.value)}
                placeholder="e.g. sheets, kg, meters"
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
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Save output'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
