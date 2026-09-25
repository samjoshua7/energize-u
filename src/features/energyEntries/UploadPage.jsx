import Grid from '@mui/material/Grid2'
import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  useTheme,
} from '@mui/material'
import {
  DocumentScannerOutlined as ScanIcon,
  EditNoteOutlined as ManualIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material'
import { useAuth } from '../../hooks/useAuth'
import BillUploadDialog from './BillUploadDialog'
import ManualEntryDialog from './ManualEntryDialog'
import StatusAlert from '../../components/feedback/StatusAlert'

export default function UploadPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { business } = useAuth()
  const [openScanModal, setOpenScanModal] = useState(false)
  const [openManualModal, setOpenManualModal] = useState(false)
  const [manualInitialSource, setManualInitialSource] = useState('grid')
  const [feedback, setFeedback] = useState(null)

  const handleScanSuccess = () => {
    setFeedback({
      severity: 'success',
      message: 'Bill verified and logged into your Unified Energy Ledger.',
    })
  }

  const handleManualSuccess = () => {
    setFeedback({
      severity: 'success',
      message: 'Energy entry successfully logged into your ledger.',
    })
  }

  const handleFallbackToManual = () => {
    setManualInitialSource('grid')
    setOpenManualModal(true)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Title */}
      <Box sx={{ pb: 2, borderBottom: '1px solid var(--color-line)' }}>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          Energy logging & bill OCR
        </Typography>
        <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mt: 0.5 }}>
          Upload electricity bill photos or record fuel purchases and runtime hours
        </Typography>
      </Box>

      {feedback && (
        <StatusAlert
          severity={feedback.severity}
          message={feedback.message}
          onAction={() => setFeedback(null)}
          actionText="Dismiss"
        />
      )}

      {/* Action Panels Grid */}
      <Grid container spacing={3}>
        {/* Bill Photo OCR Panel */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              height: '100%',
              bgcolor: 'var(--color-surface, #1C222A)',
              border: '1px solid var(--color-line)',
              borderRadius: '4px',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ScanIcon sx={{ color: 'var(--color-amber)', fontSize: 24 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Scan electricity bill
                  </Typography>
                </Box>
                <Chip
                  label="Groq AI vision"
                  size="small"
                  variant="outlined"
                  sx={{
                    borderRadius: '4px',
                    borderColor: 'var(--color-line)',
                    color: 'var(--color-amber)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', lineHeight: 1.6 }}>
                Upload or capture a photo of your DISCOM bill (MSEDCL, BESCOM, UPPCL, TNEB, etc.).
                Groq extracts billing dates, total units (kWh), max kVA demand, and net cost into a structured review form.
              </Typography>
            </Box>
            <Box sx={{ pt: 3 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<ScanIcon />}
                onClick={() => setOpenScanModal(true)}
                sx={{
                  bgcolor: 'var(--color-amber)',
                  color: '#14181D',
                  fontWeight: 700,
                  borderRadius: '4px',
                  textTransform: 'none',
                  py: 1,
                  '&:hover': { bgcolor: '#c47d25' },
                }}
              >
                Upload bill photo
              </Button>
            </Box>
          </Box>
        </Grid>

        {/* Manual Multi-Fuel Entry Panel */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              height: '100%',
              bgcolor: 'var(--color-surface, #1C222A)',
              border: '1px solid var(--color-line)',
              borderRadius: '4px',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ManualIcon sx={{ color: 'var(--color-ink-muted)', fontSize: 24 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Manual fuel / runtime entry
                  </Typography>
                </Box>
                <Chip
                  label="Manual fallback"
                  size="small"
                  variant="outlined"
                  sx={{
                    borderRadius: '4px',
                    borderColor: 'var(--color-line)',
                    color: 'var(--color-ink-muted)',
                    fontSize: '0.75rem',
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', lineHeight: 1.6 }}>
                Log diesel purchases for gensets, petrol for pumps, kerosene for burners, or rooftop solar generation.
                Never blocked by internet outages or OCR extraction failures.
              </Typography>
            </Box>
            <Box sx={{ pt: 3 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<ManualIcon />}
                onClick={() => {
                  setManualInitialSource('diesel')
                  setOpenManualModal(true)
                }}
                sx={{
                  borderColor: 'var(--color-line)',
                  color: 'var(--color-ink)',
                  borderRadius: '4px',
                  textTransform: 'none',
                  py: 1,
                  '&:hover': { borderColor: 'var(--color-ink-muted)', bgcolor: 'rgba(255,255,255,0.03)' },
                }}
              >
                Log fuel entry
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Zero-Friction Notice */}
      <Box
        sx={{
          bgcolor: 'var(--color-surface, #1C222A)',
          border: '1px solid var(--color-line)',
          borderRadius: '4px',
          p: 2.5,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 2,
        }}
      >
        <HelpIcon sx={{ fontSize: 20, color: 'var(--color-ink-muted)', mt: 0.2 }} />
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Zero-friction logging guarantee
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', mt: 0.5 }}>
            Every bill extraction gives you an editable review dialog before anything is saved to the ledger.
            If an image is blurry or network drops, tap <b>Manual entry fallback</b> to type values in directly without losing your place.
          </Typography>
        </Box>
      </Box>

      {/* Dialog Modals */}
      <BillUploadDialog
        open={openScanModal}
        onClose={() => setOpenScanModal(false)}
        businessId={business?.business_id}
        onSuccess={handleScanSuccess}
        onFallbackToManual={handleFallbackToManual}
      />

      <ManualEntryDialog
        open={openManualModal}
        onClose={() => setOpenManualModal(false)}
        businessId={business?.business_id}
        initialSource={manualInitialSource}
        onSuccess={handleManualSuccess}
      />
    </Box>
  )
}
