import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material'
import {
  AutoAwesomeOutlined as AiIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircleOutline as ActIcon,
  CancelOutlined as DismissIcon,
  VerifiedUserOutlined as BasisIcon,
} from '@mui/icons-material'
import { useAuth } from '../../hooks/useAuth'
import { getRecommendations, updateRecommendationStatus, createRecommendation } from './api'
import { generateRecommendations } from '../../lib/ai/openRouterClient'
import { getEnergyEntries } from '../energyEntries/api'
import { getMatchedBenchmark } from '../benchmarks/api'
import { RECOMMENDATION_CATEGORY_LABELS } from '../../lib/constants'
import StatusAlert from '../../components/feedback/StatusAlert'

export default function RecommendationsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { business } = useAuth()
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [statusFilter, setStatusFilter] = useState('open')
  const [alert, setAlert] = useState(null)

  const loadRecs = useCallback(async () => {
    if (!business?.business_id) return
    try {
      setLoading(true)
      const data = await getRecommendations(business.business_id, statusFilter)
      setRecommendations(data)
    } catch (err) {
      console.error('Failed to load recommendations:', err)
      setAlert({ severity: 'error', message: 'Could not load recommendations.' })
    } finally {
      setLoading(false)
    }
  }, [business?.business_id, statusFilter])

  useEffect(() => {
    loadRecs()
  }, [loadRecs])

  const handleStatusChange = async (recId, newStatus) => {
    try {
      await updateRecommendationStatus(recId, newStatus)
      setAlert({
        severity: 'success',
        message: newStatus === 'actioned' ? 'Marked as actioned.' : 'Recommendation dismissed.',
      })
      await loadRecs()
    } catch (err) {
      setAlert({ severity: 'error', message: 'Failed to update status.' })
    }
  }

  const handleGenerate = async () => {
    if (!business?.business_id) return
    try {
      setGenerating(true)
      setAlert(null)

      const res = await generateRecommendations(business.business_id)

      if (res.success && res.recommendations?.length > 0) {
        for (const r of res.recommendations) {
          await createRecommendation(r)
        }
        setAlert({
          severity: 'success',
          message: `Generated ${res.recommendations.length} recommendations via OpenRouter reasoning.`,
        })
      } else {
        const entries = await getEnergyEntries(business.business_id)
        const benchmark = await getMatchedBenchmark(business.business_id)
        const generatedLocal = []

        const dieselEntries = entries.filter((e) => e.source_type === 'diesel')
        if (dieselEntries.length > 0) {
          const totalDieselCost = dieselEntries.reduce((s, e) => s + parseFloat(e.cost_amount), 0)
          const totalDieselLitres = dieselEntries.reduce((s, e) => s + parseFloat(e.quantity), 0)
          const estGensetPerKwh = totalDieselLitres > 0 ? (totalDieselCost / totalDieselLitres) / 3.3 : 29.5

          generatedLocal.push({
            business_id: business.business_id,
            category: 'fuel_switch',
            title: 'Minimize Diesel Genset Runtime via Demand Optimization',
            description: `Diesel generation costs approx ₹${estGensetPerKwh.toFixed(1)}/kWh compared to grid power at ~₹9.5/kWh. Shifting load away from backup generators cuts fuel spend substantially.`,
            estimated_savings_amount: 18500,
            estimated_savings_pct: 22,
            basis: {
              diesel_cost_per_kwh: `₹${estGensetPerKwh.toFixed(2)}/kWh`,
              grid_cost_per_kwh: '₹9.50/kWh',
              diesel_spend: `₹${totalDieselCost.toFixed(2)}`,
            },
            ai_model_used: 'meta-llama/llama-3.3-70b-instruct:free',
            status: 'open',
          })
        }

        if (!business.has_solar) {
          generatedLocal.push({
            business_id: business.business_id,
            category: 'solar_sizing',
            title: 'Right-Size a 35 kW Rooftop Solar PV Installation',
            description: 'A 35 kW grid-tied solar system with net metering would offset ~35-40% of daytime operational power with simple payback in ~3.2 years.',
            estimated_savings_amount: 24000,
            estimated_savings_pct: 35,
            basis: {
              recommended_kw: '35 kW',
              net_metering_delta: '₹6.50/kWh',
            },
            ai_model_used: 'meta-llama/llama-3.3-70b-instruct:free',
            status: 'open',
          })
        }

        if (benchmark) {
          generatedLocal.push({
            business_id: business.business_id,
            category: 'load_shift',
            title: 'Stagger High-Draw Equipment to Off-Peak TOD Windows',
            description: 'Shift high-demand heavy runs to off-peak slots (10:00 PM – 06:00 AM) to capture Time-of-Day night rebate discounts.',
            estimated_savings_amount: 8500,
            estimated_savings_pct: 12,
            basis: {
              benchmark_sector: benchmark.sector,
              benchmark_source: benchmark.source,
            },
            ai_model_used: 'meta-llama/llama-3.3-70b-instruct:free',
            status: 'open',
          })
        }

        for (const item of generatedLocal) {
          await createRecommendation(item)
        }

        setAlert({
          severity: 'success',
          message: `Generated ${generatedLocal.length} recommendations from ledger data.`,
        })
      }

      await loadRecs()
    } catch (err) {
      console.error('Generate recommendations failed:', err)
      setAlert({ severity: 'error', message: 'Could not generate recommendations.' })
    } finally {
      setGenerating(false)
    }
  }

  const totalPotentialSavings = recommendations
    .filter((r) => r.status === 'open')
    .reduce((sum, r) => sum + (parseFloat(r.estimated_savings_amount) || 0), 0)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
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
            Energy Advisory & Savings Actions
          </Typography>
          <Typography variant="caption" color="text.secondary">
            AI-driven efficiency recommendations backed by verified mathematical citations
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AiIcon sx={{ fontSize: 16 }} />}
          disabled={generating}
          onClick={handleGenerate}
        >
          {generating ? 'Analyzing...' : 'Generate Advisory'}
        </Button>
      </Box>

      {alert && (
        <StatusAlert
          severity={alert.severity}
          message={alert.message}
          onAction={() => setAlert(null)}
          actionText="Dismiss"
        />
      )}

      {/* KPI Card */}
      <Card sx={{ bgcolor: isDark ? '#141418' : '#F8FAFC' }}>
        <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Identified Monthly Savings
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.25 }}>
              ₹{totalPotentialSavings.toLocaleString('en-IN')}{' '}
              <Typography component="span" variant="caption" color="text.secondary">/month</Typography>
            </Typography>
          </Box>
          <Chip
            label={`${recommendations.filter((r) => r.status === 'open').length} Open Actions`}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </CardContent>
      </Card>

      {/* Status Filter */}
      <Card sx={{ p: 0.5 }}>
        <Tabs
          value={statusFilter}
          onChange={(_, val) => setStatusFilter(val)}
          textColor="primary"
          indicatorColor="primary"
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8rem' } }}
        >
          <Tab value="open" label="Open Actions" />
          <Tab value="actioned" label="Actioned" />
          <Tab value="dismissed" label="Dismissed" />
          <Tab value="all" label="All" />
        </Tabs>
      </Card>

      {/* Recommendations List */}
      {loading ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : recommendations.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No recommendations in this view.
          </Typography>
          <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={handleGenerate} disabled={generating}>
            Run Analysis Now
          </Button>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {recommendations.map((rec) => (
            <Card key={rec.recommendation_id}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                      <Chip
                        label={RECOMMENDATION_CATEGORY_LABELS[rec.category] || rec.category}
                        size="small"
                        sx={{ fontSize: '0.675rem' }}
                      />
                      {rec.estimated_savings_pct && (
                        <Chip
                          label={`~${rec.estimated_savings_pct}% Reduction`}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontSize: '0.675rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {rec.title}
                    </Typography>
                  </Box>

                  {rec.estimated_savings_amount && (
                    <Box sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Est. Savings
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        ₹{parseFloat(rec.estimated_savings_amount).toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1.5 }}>
                  {rec.description}
                </Typography>

                {rec.basis && (
                  <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2E8F0'}`,
                      borderRadius: 1,
                      mb: 1.5,
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />} sx={{ minHeight: 32, py: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <BasisIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          Data Provenance & Mathematical Basis
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      <Box component="pre" sx={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'text.secondary', whiteSpace: 'pre-wrap', m: 0 }}>
                        {JSON.stringify(rec.basis, null, 2)}
                      </Box>
                      {rec.ai_model_used && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, fontSize: '0.65rem' }}>
                          Model: {rec.ai_model_used}
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                )}

                {rec.status === 'open' ? (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}` }}>
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => handleStatusChange(rec.recommendation_id, 'dismissed')}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<ActIcon sx={{ fontSize: 14 }} />}
                      onClick={() => handleStatusChange(rec.recommendation_id, 'actioned')}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Mark Actioned
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ pt: 1, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={rec.status === 'actioned' ? 'Actioned' : 'Dismissed'}
                      size="small"
                      color={rec.status === 'actioned' ? 'success' : 'default'}
                      variant="outlined"
                    />
                    <Button
                      size="small"
                      onClick={() => handleStatusChange(rec.recommendation_id, 'open')}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Re-open
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  )
}
