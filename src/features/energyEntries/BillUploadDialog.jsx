import Grid from '@mui/material/Grid2'
import React, { useState, useRef } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  TextField,
  Alert,
  Chip,
  InputAdornment,
} from '@mui/material'
import {
  CloudUploadOutlined as UploadIcon,
  CheckCircleOutline as CheckIcon,
  ErrorOutline as ErrorIcon,
  DocumentScannerOutlined as ScanIcon,
} from '@mui/icons-material'
import { extractBillData } from '../../lib/ai/groqClient'
import { createBillUpload, createEnergyEntry } from './api'

export default function BillUploadDialog({
  open,
  onClose,
  businessId,
  onSuccess,
  onFallbackToManual,
}) {
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Extracted/Editable form values
  const [reviewForm, setReviewForm] = useState({
    period_start: '',
    period_end: '',
    quantity: '',
    cost_amount: '',
    kva_load: '',
    discom_name: '',
    notes: '',
  })

  const resetState = () => {
    setFile(null)
    setPreviewUrl('')
    setExtracting(false)
    setSubmitting(false)
    setOcrResult(null)
    setErrorMessage('')
    setReviewForm({
      period_start: '',
      period_end: '',
      quantity: '',
      cost_amount: '',
      kva_load: '',
      discom_name: '',
      notes: '',
    })
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    const localUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(localUrl)
    setErrorMessage('')

    // Automatically trigger OCR extraction
    setExtracting(true)
    try {
      const res = await extractBillData(selectedFile, businessId)
      if (res.success && res.data) {
        setOcrResult(res)
        setReviewForm({
          period_start: res.data.period_start || '',
          period_end: res.data.period_end || '',
          quantity: res.data.quantity != null ? String(res.data.quantity) : '',
          cost_amount: res.data.cost_amount != null ? String(res.data.cost_amount) : '',
          kva_load: res.data.kva_load != null ? String(res.data.kva_load) : '',
          discom_name: res.data.discom_name || '',
          notes: res.data.discom_name ? `Extracted from ${res.data.discom_name} bill` : 'Extracted via Groq OCR',
        })
      } else {
        setErrorMessage(res.error || 'Could not automatically parse the bill.')
      }
    } catch (err) {
      console.error('OCR Extraction failed:', err)
      setErrorMessage('OCR scan failed. You can switch to manual entry below.')
    } finally {
      setExtracting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reviewForm.period_start || !reviewForm.period_end || !reviewForm.quantity || !reviewForm.cost_amount) {
      setErrorMessage('Please ensure Period, Units (kWh), and Amount are entered.')
      return
    }

    try {
      setSubmitting(true)
      setErrorMessage('')

      // 1. Save bill_uploads record
      const uploadRecord = await createBillUpload({
        business_id: businessId,
        storage_path: file?.name || 'bill-photo.jpg',
        ocr_status: ocrResult ? 'success' : 'manually_overridden',
        ocr_raw_response: ocrResult?.rawResponse || null,
        ocr_confidence: ocrResult?.data?.confidence || null,
        ai_model_used: ocrResult?.modelUsed || 'groq-multimodal',
      })

      // 2. Save unified energy_entries record linked to bill_upload
      await createEnergyEntry({
        business_id: businessId,
        bill_upload_id: uploadRecord.bill_upload_id,
        source_type: 'grid',
        entry_source: 'ocr',
        period_start: reviewForm.period_start,
        period_end: reviewForm.period_end,
        quantity: parseFloat(reviewForm.quantity),
        quantity_unit: 'kWh',
        cost_amount: parseFloat(reviewForm.cost_amount),
        kva_load: reviewForm.kva_load ? parseFloat(reviewForm.kva_load) : null,
        notes: reviewForm.notes || 'Grid bill verified from OCR scan',
      })

      if (onSuccess) onSuccess()
      handleClose()
    } catch (err) {
      console.error('Submit reviewed bill error:', err)
      setErrorMessage(err.message || 'Failed to save bill entry.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { bgcolor: 'background.paper', borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScanIcon color="primary" />
        Scan Electricity Bill (Groq OCR)
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {/* File Upload / Camera Input Area */}
          {!file ? (
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed rgba(16, 185, 129, 0.4)',
                borderRadius: 3,
                p: { xs: 3, sm: 4 },
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: 'rgba(16, 185, 129, 0.03)',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'rgba(16, 185, 129, 0.08)',
                },
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1.5 }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Snap or Upload Bill Photo
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Supports JPG, PNG of your MSEDCL, BESCOM, TNEB, or UPPCL electricity bill
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
              {previewUrl && (
                <Box
                  component="img"
                  src={previewUrl}
                  alt="Bill preview"
                  sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 1.5 }}
                />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(file.size / 1024).toFixed(1)} KB
                </Typography>
              </Box>
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  resetState()
                  fileInputRef.current?.click()
                }}
              >
                Change
              </Button>
            </Box>
          )}

          {/* Loading / Extraction State */}
          {extracting && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress size={36} color="primary" />
              <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 600 }}>
                Reading bill via Groq Multimodal Vision...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Extracting kWh consumption, billing period, and tariff amounts
              </Typography>
            </Box>
          )}

          {/* Error Message with Immediate Manual Fallback button */}
          {errorMessage && (
            <Alert
              severity="warning"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    handleClose()
                    if (onFallbackToManual) onFallbackToManual()
                  }}
                >
                  Enter Manually
                </Button>
              }
            >
              {errorMessage}
            </Alert>
          )}

          {/* Editable Review Form (Pre-filled from OCR or typed) */}
          {(ocrResult || file) && !extracting && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Review Extracted Data
                </Typography>
                {ocrResult?.data?.confidence && (
                  <Chip
                    label={`Confidence: ${(ocrResult.data.confidence * 100).toFixed(0)}%`}
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Period Start Date"
                    type="date"
                    required
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={reviewForm.period_start}
                    onChange={(e) => setReviewForm({ ...reviewForm, period_start: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Period End Date"
                    type="date"
                    required
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={reviewForm.period_end}
                    onChange={(e) => setReviewForm({ ...reviewForm, period_end: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Units Consumed (kWh)"
                    type="number"
                    required
                    fullWidth
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">kWh</InputAdornment>,
                      },
                    }}
                    value={reviewForm.quantity}
                    onChange={(e) => setReviewForm({ ...reviewForm, quantity: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Total Bill Amount (INR)"
                    type="number"
                    required
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      },
                    }}
                    value={reviewForm.cost_amount}
                    onChange={(e) => setReviewForm({ ...reviewForm, cost_amount: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Sanctioned / Max Load (kVA/kW)"
                    type="number"
                    fullWidth
                    value={reviewForm.kva_load}
                    onChange={(e) => setReviewForm({ ...reviewForm, kva_load: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Discom / Utility"
                    fullWidth
                    value={reviewForm.discom_name}
                    onChange={(e) => setReviewForm({ ...reviewForm, discom_name: e.target.value })}
                    placeholder="e.g. MSEDCL or BESCOM"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between' }}>
          <Button
            color="inherit"
            onClick={() => {
              handleClose()
              if (onFallbackToManual) onFallbackToManual()
            }}
          >
            Manual Entry Fallback
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleClose} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting || extracting || !file}
            >
              {submitting ? <CircularProgress size={20} color="inherit" /> : 'Confirm & Save to Ledger'}
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
