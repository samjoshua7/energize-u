import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material'
import {
  Add as AddIcon,
  DocumentScannerOutlined as ScanIcon,
  DeleteOutline as DeleteIcon,
  SpeedOutlined as OutputIcon,
  LocalGasStationOutlined as FuelIcon,
  Close as CloseIcon,
  ReceiptOutlined as BillIcon,
  VisibilityOutlined as ViewIcon,
} from '@mui/icons-material'
import { useAuth } from '../../hooks/useAuth'
import { getEnergyEntries, deleteEnergyEntry, getBillPhotoUrl } from '../energyEntries/api'
import ManualEntryDialog from '../energyEntries/ManualEntryDialog'
import BillUploadDialog from '../energyEntries/BillUploadDialog'
import OutputRecordDialog from '../outputRecords/OutputRecordDialog'
import StatusAlert from '../../components/feedback/StatusAlert'
import { SOURCE_TYPE_LABELS } from '../../lib/constants'

export default function LedgerPage() {
  const { business } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [viewTab, setViewTab] = useState('ledger') // 'ledger' or 'bills'
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [fuelSource, setFuelSource] = useState('diesel')

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
      setEntries(data || [])
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
  const gridEntries = entries.filter((e) => e.source_type === 'grid')

  const handleViewBill = async (entry) => {
    if (entry.bill_uploads?.storage_path) {
      try {
        const url = await getBillPhotoUrl(entry.bill_uploads.storage_path)
        setSelectedPhoto({ url, entry })
      } catch (err) {
        setSelectedPhoto({ url: null, entry })
      }
    } else {
      setSelectedPhoto({ url: null, entry })
    }
  }

  const filterOptions = [
    { value: 'all', label: 'All sources' },
    { value: 'grid', label: 'Grid' },
    { value: 'diesel', label: 'Diesel' },
    { value: 'petrol', label: 'Petrol' },
    { value: 'kerosene', label: 'Kerosene' },
    { value: 'solar', label: 'Solar' },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 960 }}>
      {/* Top Header */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          pb: 1.5,
          borderBottom: '1px solid var(--color-line)',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>
            Energy ledger
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
            Multi-fuel ledger normalized across grid, diesel, petrol, kerosene, and solar
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<OutputIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpenOutputModal(true)}
            sx={{
              borderColor: 'var(--color-line)',
              color: 'var(--color-ink)',
              '&:hover': { borderColor: 'var(--color-ink-muted)', bgcolor: 'var(--color-subtle-bg)' },
            }}
          >
            Record output
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FuelIcon sx={{ fontSize: 16 }} />}
            onClick={() => {
              setFuelSource('diesel')
              setOpenManualModal(true)
            }}
            sx={{
              borderColor: 'var(--color-line)',
              color: 'var(--color-ink)',
              '&:hover': { borderColor: 'var(--color-ink-muted)', bgcolor: 'var(--color-subtle-bg)' },
            }}
          >
            Add fuel purchase
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<ScanIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpenScanModal(true)}
            sx={{
              bgcolor: 'var(--color-amber)',
              color: '#FFFFFF',
              fontWeight: 700,
              '&:hover': { bgcolor: '#945814' },
            }}
          >
            Upload bill
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

      {/* Summary Figures in Plex Mono */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          py: 1.5,
          borderBottom: '1px solid var(--color-line)',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block' }}>
            Total ledger spend
          </Typography>
          <Typography
            sx={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--color-ink)',
            }}
          >
            ₹{totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block' }}>
            Logged transactions
          </Typography>
          <Typography
            sx={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--color-ink)',
            }}
          >
            {totalEntries}
          </Typography>
        </Box>

        {/* View Switcher: Ledger Rows vs Bill History */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={viewTab === 'ledger' ? 'contained' : 'outlined'}
            onClick={() => setViewTab('ledger')}
            sx={{
              fontSize: '0.75rem',
              ...(viewTab === 'ledger'
                ? { bgcolor: 'var(--color-amber)', color: '#FFFFFF', '&:hover': { bgcolor: '#945814' } }
                : { borderColor: 'var(--color-line)', color: 'var(--color-ink)' }),
            }}
          >
            Ledger ({entries.length})
          </Button>
          <Button
            size="small"
            variant={viewTab === 'bills' ? 'contained' : 'outlined'}
            onClick={() => setViewTab('bills')}
            sx={{
              fontSize: '0.75rem',
              ...(viewTab === 'bills'
                ? { bgcolor: 'var(--color-amber)', color: '#FFFFFF', '&:hover': { bgcolor: '#945814' } }
                : { borderColor: 'var(--color-line)', color: 'var(--color-ink)' }),
            }}
          >
            Electricity bills ({gridEntries.length})
          </Button>
        </Box>
      </Box>

      {viewTab === 'bills' ? (
        /* Electricity Bill History */
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', mb: 1.5 }}>
            Historical electricity utility bills with confirmed OCR extraction parameters
          </Typography>

          {gridEntries.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', border: '1px solid var(--color-line)', borderRadius: '4px' }}>
              <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mb: 1 }}>
                No electricity bills recorded yet.
              </Typography>
              <Button size="small" variant="contained" onClick={() => setOpenScanModal(true)} sx={{ bgcolor: 'var(--color-amber)', color: '#FFFFFF' }}>
                Upload first bill
              </Button>
            </Box>
          ) : (
            gridEntries.map((entry) => (
              <Box
                key={entry.entry_id}
                sx={{
                  py: 1.5,
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--color-line)',
                  gap: 1.5,
                }}
              >
                <Box sx={{ minWidth: 160 }}>
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                    }}
                  >
                    {entry.period_start} to {entry.period_end}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
                    {entry.entry_source === 'ocr' ? 'Groq Vision OCR' : 'Manual entry'}
                  </Typography>
                </Box>

                <Box sx={{ minWidth: 120 }}>
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.875rem',
                      color: 'var(--color-ink)',
                    }}
                  >
                    {entry.quantity} kWh
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
                    Load: {entry.kva_load ? `${entry.kva_load} kVA` : '—'}
                  </Typography>
                </Box>

                <Box sx={{ minWidth: 120 }}>
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: 'var(--color-amber)',
                    }}
                  >
                    ₹{parseFloat(entry.cost_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
                    {entry.tariff_category || 'Industrial tariff'}
                  </Typography>
                </Box>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ViewIcon sx={{ fontSize: 14 }} />}
                  onClick={() => handleViewBill(entry)}
                  sx={{ fontSize: '0.75rem', borderColor: 'var(--color-line)', color: 'var(--color-ink)' }}
                >
                  View bill
                </Button>
              </Box>
            ))
          )}
        </Box>
      ) : (
        /* Standard Ledger Rows per DESIGN.md */
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {/* Source Filter Strip */}
          <Box sx={{ display: 'flex', gap: 1.5, pb: 1.5, borderBottom: '1px solid var(--color-line)', flexWrap: 'wrap' }}>
            {filterOptions.map((opt) => (
              <Typography
                key={opt.value}
                onClick={() => setSourceFilter(opt.value)}
                sx={{
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: sourceFilter === opt.value ? 600 : 400,
                  color: sourceFilter === opt.value ? 'var(--color-amber)' : 'var(--color-ink-muted)',
                  borderBottom: sourceFilter === opt.value ? '2px solid var(--color-amber)' : 'none',
                  pb: 0.25,
                }}
              >
                {opt.label}
              </Typography>
            ))}
          </Box>

          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={20} sx={{ color: 'var(--color-amber)' }} />
            </Box>
          ) : entries.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', borderBottom: '1px solid var(--color-line)' }}>
              <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)' }}>
                No entries found in this ledger view.
              </Typography>
            </Box>
          ) : (
            /* The Ledger Row Pattern from DESIGN.md */
            entries.map((entry) => {
              const isGrid = entry.source_type === 'grid'
              const isDiesel = entry.source_type === 'diesel'
              const isSolar = entry.source_type === 'solar'

              return (
                <Box
                  key={entry.entry_id}
                  sx={{
                    py: 1.25,
                    px: 0.5,
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--color-line)',
                    gap: 1.5,
                    '&:hover': {
                      bgcolor: 'var(--color-subtle-bg)',
                    },
                  }}
                >
                  {/* Date Column */}
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.8125rem',
                      color: 'var(--color-ink-muted)',
                      width: { xs: '100%', sm: 100 },
                    }}
                  >
                    {entry.period_start}
                  </Typography>

                  {/* Fuel / Source Description */}
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                      {SOURCE_TYPE_LABELS[entry.source_type] || entry.source_type}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
                      {entry.machines?.name || (isGrid ? 'Discom mains' : entry.notes || 'Stationary')}
                    </Typography>
                  </Box>

                  {/* Quantity in Plex Mono */}
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.8125rem',
                      color: isSolar ? 'var(--color-sage)' : 'var(--color-ink)',
                      width: 100,
                      textAlign: 'right',
                    }}
                  >
                    {entry.quantity} {entry.quantity_unit}
                  </Typography>

                  {/* Cost in Plex Mono */}
                  <Typography
                    sx={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: isDiesel ? 'var(--color-rust)' : 'var(--color-ink)',
                      width: 110,
                      textAlign: 'right',
                    }}
                  >
                    ₹{parseFloat(entry.cost_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Typography>

                  {/* Delete Action */}
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(entry.entry_id)}
                    sx={{ color: 'var(--color-ink-muted)', '&:hover': { color: 'var(--color-rust)' } }}
                  >
                    <DeleteIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>
              )
            })
          )}
        </Box>
      )}

      {/* Bill Document View Panel */}
      <Dialog
        open={Boolean(selectedPhoto)}
        onClose={() => setSelectedPhoto(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            borderRadius: '4px',
            boxShadow: 'none',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'var(--color-ink)' }}>
            Electricity utility bill audit
          </Typography>
          <IconButton size="small" onClick={() => setSelectedPhoto(null)} sx={{ color: 'var(--color-ink-muted)' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'var(--color-line)' }}>
          {selectedPhoto && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedPhoto.url && (
                <Box
                  component="img"
                  src={selectedPhoto.url}
                  alt="Electricity Bill"
                  sx={{
                    width: '100%',
                    maxHeight: 400,
                    objectFit: 'contain',
                    bgcolor: 'var(--color-bg)',
                    borderRadius: '2px',
                    border: '1px solid var(--color-line)',
                  }}
                />
              )}

              {/* Parsed Fields (Show your work panel) */}
              <Box sx={{ p: 2, bgcolor: 'var(--color-bg)', border: '1px solid var(--color-line)', borderRadius: '4px' }}>
                <Typography variant="caption" sx={{ color: 'var(--color-amber)', fontWeight: 600, display: 'block', mb: 1 }}>
                  Audited bill parameters
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Billing period</Typography>
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: 'var(--color-ink)' }}>
                      {selectedPhoto.entry?.period_start} to {selectedPhoto.entry?.period_end}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Units consumed</Typography>
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: 'var(--color-ink)' }}>
                      {selectedPhoto.entry?.quantity} kWh
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Sanctioned load</Typography>
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', color: 'var(--color-ink)' }}>
                      {selectedPhoto.entry?.kva_load ? `${selectedPhoto.entry.kva_load} kVA` : '45 kVA'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Total bill amount</Typography>
                    <Typography sx={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-amber)' }}>
                      ₹{parseFloat(selectedPhoto.entry?.cost_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedPhoto(null)} sx={{ color: 'var(--color-ink)' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modals */}
      <ManualEntryDialog
        open={openManualModal}
        onClose={() => setOpenManualModal(false)}
        businessId={business?.business_id}
        initialSource={fuelSource}
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
      />

      <OutputRecordDialog
        open={openOutputModal}
        onClose={() => setOpenOutputModal(false)}
        businessId={business?.business_id}
        defaultUnit={business?.primary_output_unit || 'units'}
        onSuccess={() => {
          setAlert({ severity: 'success', message: 'Output record saved.' })
        }}
      />
    </Box>
  )
}
