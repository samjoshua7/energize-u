import React, { useState } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
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
      <Box sx={{ pb: 1, borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0'}` }}>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          Energy Logging & Bill OCR
        </Typography>
        <Typography variant="caption" color="text.secondary">
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

      {/* Action Cards Grid */}
      <Grid container spacing={2}>
        {/* Bill Photo OCR Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScanIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Scan Electricity Bill
                  </Typography>
                </Box>
                <Chip label="Groq AI Vision" size="small" variant="outlined" sx={{ fontSize: '0.675rem' }} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Upload or capture a photo of your DISCOM bill (MSEDCL, BESCOM, UPPCL, TNEB, etc.).
                Groq extracts billing dates, total units (kWh), max kVA demand, and net cost into a structured review form.
              </Typography>
            </CardContent>
            <Box sx={{ p: 2.5, pt: 0 }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<ScanIcon />}
                onClick={() => setOpenScanModal(true)}
              >
                Upload Bill Photo
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Manual Multi-Fuel Entry Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ManualIcon sx={{ color: 'secondary.main', fontSize: 24 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Manual Fuel / Runtime Entry
                  </Typography>
                </Box>
                <Chip label="Zero-Failure Fallback" size="small" variant="outlined" sx={{ fontSize: '0.675rem' }} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Log diesel purchases for gensets, petrol for pumps, kerosene for burners, or rooftop solar generation.
                Never blocked by internet outages or OCR extraction failures.
              </Typography>
            </CardContent>
            <Box sx={{ p: 2.5, pt: 0 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<ManualIcon />}
                onClick={() => {
                  setManualInitialSource('diesel')
                  setOpenManualModal(true)
                }}
              >
                Log Fuel Entry
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Zero-Friction Notice */}
      <Card sx={{ bgcolor: isDark ? '#141418' : '#F8FAFC' }}>
        <CardContent sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <HelpIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.2 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Zero-Friction Logging Guarantee
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              Every bill extraction gives you an editable review dialog before anything is saved to the ledger.
              If an image is blurry or network drops, tap <b>Manual Entry Fallback</b> to type values in directly without losing your place.
            </Typography>
          </Box>
        </CardContent>
      </Card>

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
