import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material'
import {
  Add as AddIcon,
  DocumentScannerOutlined as ScanIcon,
  DeleteOutline as DeleteIcon,
  ReceiptLongOutlined as LedgerIcon,
  SpeedOutlined as OutputIcon,
} from '@mui/icons-material'
import { useAuth } from '../../hooks/useAuth'
import { getEnergyEntries, deleteEnergyEntry } from '../energyEntries/api'
import ManualEntryDialog from '../energyEntries/ManualEntryDialog'
import BillUploadDialog from '../energyEntries/BillUploadDialog'
import OutputRecordDialog from '../outputRecords/OutputRecordDialog'
import StatusAlert from '../../components/feedback/StatusAlert'
import { SOURCE_TYPE_LABELS, SOURCE_COLORS } from '../../lib/constants'

export default function LedgerPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { business } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState('all')

  const [openManualModal, setOpenManualModal] = useState(false)
  const [openScanModal, setOpenScanModal] = useState(false)
  const [openOutputModal, setOpenOutputModal] = useState(false)
  const [alert, setAlert] = useState(null)

  const loadEntries = useCallback(async () => {
    if (!business?.business_id) return
    try {
      setLoading(true)
      const data = await getEnergyEntries(business.business_id, {
        sourceType: sourceFilter !== 'all' ? sourceFilter : undefined,
      })
      setEntries(data)
    } catch (err) {
      console.error('Failed to load ledger entries:', err)
      setAlert({ severity: 'error', message: 'Could not load ledger entries.' })
    } finally {
      setLoading(false)
    }
  }, [business?.business_id, sourceFilter])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const handleDelete = async (entryId) => {
    if (!window.confirm('Delete this ledger entry?')) return
    try {
      await deleteEnergyEntry(entryId)
      setAlert({ severity: 'info', message: 'Entry removed from ledger.' })
      await loadEntries()
    } catch (err) {
      setAlert({ severity: 'error', message: 'Failed to delete entry.' })
    }
  }

  const totalSpend = entries.reduce((sum, e) => sum + (parseFloat(e.cost_amount) || 0), 0)
  const totalEntries = entries.length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Top Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1.5,
          pb: 1,
          borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0'}`,
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700 }}>
            Unified Energy Ledger
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Multi-fuel ledger normalized across grid, diesel, petrol, kerosene, and solar
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<OutputIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpenOutputModal(true)}
          >
            Log Output
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpenManualModal(true)}
          >
            Log Fuel
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<ScanIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpenScanModal(true)}
          >
            Scan Bill
          </Button>
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

      {/* Summary Row */}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 6, sm: 4 }}>
          <Card>
            <CardContent sx={{ p: 1.75 }}>
              <Typography variant="caption" color="text.secondary">Total Spend</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.25 }}>
                ₹{totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <Card>
            <CardContent sx={{ p: 1.75 }}>
              <Typography variant="caption" color="text.secondary">Logged Entries</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.25 }}>
                {totalEntries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ p: 1.75 }}>
              <Typography variant="caption" color="text.secondary">Sources Tracked</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
                Grid, Diesel, Petrol, Kerosene, Solar
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fuel Filters */}
      <Card sx={{ p: 0.5 }}>
        <Tabs
          value={sourceFilter}
          onChange={(_, val) => setSourceFilter(val)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8rem' } }}
        >
          <Tab value="all" label="All Sources" />
          <Tab value="grid" label="Grid Electricity" />
          <Tab value="diesel" label="Diesel Genset" />
          <Tab value="petrol" label="Petrol" />
          <Tab value="kerosene" label="Kerosene" />
          <Tab value="solar" label="Solar" />
        </Tabs>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : entries.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <LedgerIcon sx={{ fontSize: 36, color: 'text.secondary', opacity: 0.4, mb: 0.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                No entries in this view
              </Typography>
              <Box sx={{ mt: 1.5, display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Button size="small" variant="contained" color="primary" onClick={() => setOpenScanModal(true)}>
                  Scan Bill
                </Button>
                <Button size="small" variant="outlined" onClick={() => setOpenManualModal(true)}>
                  Log Fuel Manually
                </Button>
              </Box>
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Cost (INR)</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Machine / Notes</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map((entry) => {
                    const color = SOURCE_COLORS[entry.source_type] || '#10B981'
                    return (
                      <TableRow key={entry.entry_id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {entry.period_start}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            to {entry.period_end}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={SOURCE_TYPE_LABELS[entry.source_type] || entry.source_type}
                            size="small"
                            sx={{
                              bgcolor: `${color}15`,
                              color: color,
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {entry.quantity} {entry.quantity_unit}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          ₹{parseFloat(entry.cost_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={entry.entry_source === 'ocr' ? 'OCR' : 'Manual'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.675rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 180 }}>
                          {entry.machines?.name && (
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'primary.main' }}>
                              {entry.machines.name}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {entry.notes || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(entry.entry_id)}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ManualEntryDialog
        open={openManualModal}
        onClose={() => setOpenManualModal(false)}
        businessId={business?.business_id}
        onSuccess={() => {
          setAlert({ severity: 'success', message: 'Fuel entry saved.' })
          loadEntries()
        }}
      />

      <BillUploadDialog
        open={openScanModal}
        onClose={() => setOpenScanModal(false)}
        businessId={business?.business_id}
        onSuccess={() => {
          setAlert({ severity: 'success', message: 'Bill scanned and logged.' })
          loadEntries()
        }}
        onFallbackToManual={() => setOpenManualModal(true)}
      />

      <OutputRecordDialog
        open={openOutputModal}
        onClose={() => setOpenOutputModal(false)}
        businessId={business?.business_id}
        defaultUnit="sheets"
        onSuccess={() => {
          setAlert({ severity: 'success', message: 'Output record saved.' })
        }}
      />
    </Box>
  )
}
