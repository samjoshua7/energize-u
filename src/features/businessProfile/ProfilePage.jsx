import Grid from '@mui/material/Grid2'
import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import {
  Add as AddIcon,
  DeleteOutline as DeleteIcon,
  PrecisionManufacturingOutlined as FactoryIcon,
  EditOutlined as EditIcon,
} from '@mui/icons-material'
import { useAuth } from '../../hooks/useAuth'
import { updateBusinessProfile } from './api'
import { getMachines, createMachine, deleteMachine } from '../machines/api'
import { SECTORS, SHIFT_PATTERNS, SOURCE_TYPES, SOURCE_TYPE_LABELS } from '../../lib/constants'
import StatusAlert from '../../components/feedback/StatusAlert'

export default function ProfilePage() {
  const { business, refreshBusiness } = useAuth()
  const [machines, setMachines] = useState([])
  const [loadingMachines, setLoadingMachines] = useState(true)
  const [openMachineModal, setOpenMachineModal] = useState(false)
  const [alert, setAlert] = useState(null)

  const [machineForm, setMachineForm] = useState({
    name: '',
    machine_type: 'genset',
    primary_fuel: 'diesel',
    power_rating_kw: '',
    age_years: '',
  })

  const loadMachines = useCallback(async () => {
    if (!business?.business_id) return
    try {
      setLoadingMachines(true)
      const data = await getMachines(business.business_id)
      setMachines(data)
    } catch (err) {
      console.error('Failed to load machines:', err)
      setAlert({ severity: 'error', message: 'Failed to load machine inventory.' })
    } finally {
      setLoadingMachines(false)
    }
  }, [business?.business_id])

  useEffect(() => {
    loadMachines()
  }, [loadMachines])

  const handleAddMachine = async (e) => {
    e.preventDefault()
    if (!machineForm.name) return

    try {
      await createMachine({
        business_id: business.business_id,
        name: machineForm.name.trim(),
        machine_type: machineForm.machine_type,
        primary_fuel: machineForm.primary_fuel,
        power_rating_kw: machineForm.power_rating_kw ? parseFloat(machineForm.power_rating_kw) : null,
        age_years: machineForm.age_years ? parseFloat(machineForm.age_years) : null,
      })
      setOpenMachineModal(false)
      setMachineForm({
        name: '',
        machine_type: 'genset',
        primary_fuel: 'diesel',
        power_rating_kw: '',
        age_years: '',
      })
      setAlert({ severity: 'success', message: 'Machine added successfully.' })
      await loadMachines()
    } catch (err) {
      console.error('Add machine error:', err)
      setAlert({ severity: 'error', message: err.message || 'Failed to add machine.' })
    }
  }

  const handleDeleteMachine = async (machineId) => {
    if (!window.confirm('Are you sure you want to remove this machine?')) return
    try {
      await deleteMachine(machineId)
      setAlert({ severity: 'info', message: 'Machine removed.' })
      await loadMachines()
    } catch (err) {
      setAlert({ severity: 'error', message: 'Failed to delete machine.' })
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Page Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h2" sx={{ fontWeight: 800 }}>
            Facility & machines
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)' }}>
            Manage your operating equipment and baseline profile
          </Typography>
        </Box>
      </Box>

      {alert && (
        <StatusAlert
          severity={alert.severity}
          message={alert.message}
          onAction={() => setAlert(null)}
          actionText="Dismiss"
        />
      )}

      {/* Facility Profile Panel */}
      <Box sx={{ bgcolor: 'var(--color-surface, #1C222A)', border: '1px solid var(--color-line)', borderRadius: '4px', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, pb: 1.5, borderBottom: '1px solid var(--color-line)' }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Facility profile
          </Typography>
          <Chip
            label={business?.sector ? business.sector.charAt(0).toUpperCase() + business.sector.slice(1) : 'Manufacturing'}
            size="small"
            variant="outlined"
            sx={{
              borderRadius: '4px',
              borderColor: 'var(--color-line)',
              color: 'var(--color-amber)',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Facility name</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>{business?.name || '—'}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>State / location</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
              {business?.location_state} {business?.location_city ? `(${business.location_city})` : ''}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Shift pattern</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5, textTransform: 'capitalize' }}>
              {business?.shift_pattern?.replace(/_/g, ' ') || 'Single shift'}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Workforce size</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5, fontFamily: 'var(--font-mono)' }}>
              {business?.employee_count ? `${business.employee_count} workers` : 'Not specified'}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Rooftop solar</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5, color: business?.has_solar ? 'var(--color-sage)' : 'var(--color-ink-muted)' }}>
              {business?.has_solar ? 'Installed' : 'None'}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Primary output unit</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
              {business?.primary_output_unit || 'Units'}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Machines Inventory Panel */}
      <Box sx={{ bgcolor: 'var(--color-surface, #1C222A)', border: '1px solid var(--color-line)', borderRadius: '4px', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, pb: 1.5, borderBottom: '1px solid var(--color-line)' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Equipment & genset inventory
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
              Linking energy consumption to specific machinery unlocks targeted tuning
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setOpenMachineModal(true)}
            sx={{
              bgcolor: 'var(--color-amber)',
              color: '#14181D',
              fontWeight: 700,
              borderRadius: '4px',
              textTransform: 'none',
              '&:hover': { bgcolor: '#c47d25' },
            }}
          >
            Add machine
          </Button>
        </Box>

        {loadingMachines ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={28} sx={{ color: 'var(--color-amber)' }} />
          </Box>
        ) : machines.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed var(--color-line)', borderRadius: '4px' }}>
            <FactoryIcon sx={{ fontSize: 36, color: 'var(--color-ink-muted)', mb: 1, opacity: 0.5 }} />
            <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)' }}>
              No machines or gensets added yet.
            </Typography>
            <Button
              size="small"
              onClick={() => setOpenMachineModal(true)}
              sx={{ mt: 1, color: 'var(--color-amber)', textTransform: 'none', fontWeight: 600 }}
            >
              + Register first machine (e.g. 50 kVA genset)
            </Button>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'var(--color-line)', color: 'var(--color-ink-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }}>
                  <TableCell>Machine name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Primary fuel</TableCell>
                  <TableCell align="right">Power (kW)</TableCell>
                  <TableCell align="right">Age (yrs)</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {machines.map((m) => (
                  <TableRow key={m.machine_id} hover sx={{ '& td': { borderColor: 'var(--color-line)' } }}>
                    <TableCell sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>{m.name}</TableCell>
                    <TableCell sx={{ color: 'var(--color-ink-muted)', textTransform: 'capitalize' }}>{m.machine_type || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={SOURCE_TYPE_LABELS[m.primary_fuel] || m.primary_fuel}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderRadius: '4px',
                          borderColor: 'var(--color-line)',
                          color: 'var(--color-ink-muted)',
                          fontSize: '0.75rem',
                          textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink)' }}>
                      {m.power_rating_kw ? `${m.power_rating_kw} kW` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-muted)' }}>
                      {m.age_years ? `${m.age_years} yrs` : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteMachine(m.machine_id)}
                        sx={{ color: 'var(--color-rust)', '&:hover': { bgcolor: 'rgba(193, 85, 58, 0.1)' } }}
                      >
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

      {/* Add Machine Dialog */}
      <Dialog
        open={openMachineModal}
        onClose={() => setOpenMachineModal(false)}
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
          Add machine or generator
        </DialogTitle>
        <Box component="form" onSubmit={handleAddMachine}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
            <TextField
              label="Machine / equipment name"
              required
              fullWidth
              value={machineForm.name}
              onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
              placeholder="e.g. Kirloskar 62.5 kVA genset"
              slotProps={{ input: { sx: { borderRadius: '4px' } } }}
            />
            <TextField
              label="Machine type"
              fullWidth
              value={machineForm.machine_type}
              onChange={(e) => setMachineForm({ ...machineForm, machine_type: e.target.value })}
              placeholder="e.g. Genset, Offset press, Loom, Compressor"
              slotProps={{ input: { sx: { borderRadius: '4px' } } }}
            />
            <TextField
              select
              label="Primary fuel source"
              fullWidth
              value={machineForm.primary_fuel}
              onChange={(e) => setMachineForm({ ...machineForm, primary_fuel: e.target.value })}
              slotProps={{ select: { sx: { borderRadius: '4px' } } }}
            >
              {Object.keys(SOURCE_TYPES).map((k) => (
                <MenuItem key={k} value={SOURCE_TYPES[k]}>
                  {SOURCE_TYPE_LABELS[SOURCE_TYPES[k]]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Power rating (kW)"
              type="number"
              fullWidth
              value={machineForm.power_rating_kw}
              onChange={(e) => setMachineForm({ ...machineForm, power_rating_kw: e.target.value })}
              placeholder="e.g. 50"
              slotProps={{ input: { sx: { borderRadius: '4px', fontFamily: 'var(--font-mono)' } } }}
            />
            <TextField
              label="Age (years)"
              type="number"
              fullWidth
              value={machineForm.age_years}
              onChange={(e) => setMachineForm({ ...machineForm, age_years: e.target.value })}
              placeholder="e.g. 4.5"
              slotProps={{ input: { sx: { borderRadius: '4px', fontFamily: 'var(--font-mono)' } } }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid var(--color-line)', pt: 2 }}>
            <Button
              onClick={() => setOpenMachineModal(false)}
              sx={{ color: 'var(--color-ink-muted)', textTransform: 'none', borderRadius: '4px' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: 'var(--color-amber)',
                color: '#14181D',
                fontWeight: 700,
                borderRadius: '4px',
                textTransform: 'none',
                '&:hover': { bgcolor: '#c47d25' },
              }}
            >
              Save machine
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
