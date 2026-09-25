import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
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
            Facility & Machines
          </Typography>
          <Typography variant="body2" color="text.secondary">
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

      {/* Business Details Card */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Facility Profile
            </Typography>
            <Chip
              label={business?.sector?.toUpperCase() || 'MANUFACTURING'}
              color="primary"
              size="small"
              variant="outlined"
            />
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption" color="text.secondary">Facility Name</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{business?.name || '—'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption" color="text.secondary">State / Location</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {business?.location_state} {business?.location_city ? `(${business.location_city})` : ''}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption" color="text.secondary">Shift Pattern</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {business?.shift_pattern?.replace('_', ' ') || 'Single Shift'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption" color="text.secondary">Employee Count</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {business?.employee_count ? `${business.employee_count} workers` : 'Not specified'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption" color="text.secondary">Rooftop Solar</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, color: business?.has_solar ? 'primary.main' : 'text.secondary' }}>
                {business?.has_solar ? 'Installed' : 'None'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Machines Inventory Card */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Equipment & Genset Inventory
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Linking energy consumption to specific heavy machinery unlocks targeted tuning
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setOpenMachineModal(true)}
            >
              Add Machine
            </Button>
          </Box>

          {loadingMachines ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : machines.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2 }}>
              <FactoryIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                No machines or gensets added yet.
              </Typography>
              <Button
                size="small"
                onClick={() => setOpenMachineModal(true)}
                sx={{ mt: 1, color: 'primary.main' }}
              >
                + Register First Machine (e.g. 50 kVA Genset)
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Machine Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Primary Fuel</TableCell>
                    <TableCell align="right">Power (kW)</TableCell>
                    <TableCell align="right">Age (Yrs)</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {machines.map((m) => (
                    <TableRow key={m.machine_id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{m.name}</TableCell>
                      <TableCell>{m.machine_type || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={SOURCE_TYPE_LABELS[m.primary_fuel] || m.primary_fuel}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{m.power_rating_kw ? `${m.power_rating_kw} kW` : '—'}</TableCell>
                      <TableCell align="right">{m.age_years ? `${m.age_years} yrs` : '—'}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteMachine(m.machine_id)}
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
        </CardContent>
      </Card>

      {/* Add Machine Dialog */}
      <Dialog
        open={openMachineModal}
        onClose={() => setOpenMachineModal(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add Machine or Generator</DialogTitle>
        <Box component="form" onSubmit={handleAddMachine}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Machine / Equipment Name"
              required
              fullWidth
              value={machineForm.name}
              onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
              placeholder="e.g. Kirloskar 62.5 kVA Genset"
            />
            <TextField
              label="Machine Type"
              fullWidth
              value={machineForm.machine_type}
              onChange={(e) => setMachineForm({ ...machineForm, machine_type: e.target.value })}
              placeholder="e.g. Genset, Offset Press, Loom, Compressor"
            />
            <TextField
              select
              label="Primary Fuel Source"
              fullWidth
              value={machineForm.primary_fuel}
              onChange={(e) => setMachineForm({ ...machineForm, primary_fuel: e.target.value })}
            >
              {Object.keys(SOURCE_TYPES).map((k) => (
                <MenuItem key={k} value={SOURCE_TYPES[k]}>
                  {SOURCE_TYPE_LABELS[SOURCE_TYPES[k]]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Power Rating (kW)"
              type="number"
              fullWidth
              value={machineForm.power_rating_kw}
              onChange={(e) => setMachineForm({ ...machineForm, power_rating_kw: e.target.value })}
              placeholder="e.g. 50"
            />
            <TextField
              label="Age (Years)"
              type="number"
              fullWidth
              value={machineForm.age_years}
              onChange={(e) => setMachineForm({ ...machineForm, age_years: e.target.value })}
              placeholder="e.g. 4.5"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setOpenMachineModal(false)} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary">
              Save Machine
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  )
}
