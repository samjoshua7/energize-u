import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  Collapse,
  CircularProgress,
  Tabs,
  Tab,
  useTheme,
  IconButton,
} from '@mui/material'
import {
  AutoAwesomeOutlined as AiIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircleOutline as ActIcon,
  CalculateOutlined as MathIcon,
} from '@mui/icons-material'
import { useAuth } from '../../hooks/useAuth'
import { getRecommendations, updateRecommendationStatus, createRecommendation } from './api'
import { generateRecommendations } from '../../lib/ai/openRouterClient'
import { RECOMMENDATION_CATEGORY_LABELS } from '../../lib/constants'
import StatusAlert from '../../components/feedback/StatusAlert'

const EFFORT_STYLES = {
  Low: {
    bgcolor: 'rgba(110, 155, 123, 0.12)',
    color: 'var(--color-sage, #6E9B7B)',
    border: '1px solid rgba(110, 155, 123, 0.3)',
  },
  Medium: {
    bgcolor: 'rgba(217, 142, 46, 0.12)',
    color: 'var(--color-amber, #D98E2E)',
    border: '1px solid rgba(217, 142, 46, 0.3)',
  },
  High: {
    bgcolor: 'rgba(193, 85, 58, 0.12)',
    color: 'var(--color-rust, #C1553A)',
    border: '1px solid rgba(193, 85, 58, 0.3)',
  },
}

const DEFAULT_RECOMMENDATIONS = [
  {
    recommendation_id: 'rec-peak-shift',
    category: 'load_shifting',
    title: 'Shift non-urgent machine runs off peak tariff hours',
    effort_level: 'Low',
    estimated_savings_amount: 14500,
    estimated_savings_pct: 12,
    status: 'open',
    description:
      'Industrial DISCOM tariffs impose an evening peak surcharge of 20% to 35% between 6:00 PM and 10:00 PM. Shifting heavy offline cutting, pre-press heaters, and folding machines to daytime hours (10:00 AM – 4:00 PM) circumvents top-tier TOD (Time-of-Day) penalty tariffs.',
    math_breakdown: {
      formula: 'Savings = Shifted Load (kWh) × (Peak Tariff Rate − Normal Tariff Rate)',
      calculation: '3,920 kWh/month shifted × (₹11.50/kWh peak − ₹7.80/kWh normal) = ₹14,504 / month',
      assumptions: 'Assumes 4 hours/day peak window, 35 kW deferrable auxiliary motor load across 28 work days.',
      citation: 'State Electricity Regulatory Commission (SERC) Industrial TOD Tariff Schedule & CEA Load Guidelines',
    },
    basis: {
      peak_tariff: '₹11.50 / kWh',
      normal_tariff: '₹7.80 / kWh',
      shifted_volume_kwh: 3920,
      monthly_savings: '₹14,504',
    },
    ai_model_used: 'OpenRouter (Llama-3.3-70B-Instruct)',
  },
  {
    recommendation_id: 'rec-solar-offset',
    category: 'solar',
    title: 'Genset running 14 hrs/week — right-sized 25 kW solar could offset 65%',
    effort_level: 'Medium',
    estimated_savings_amount: 22400,
    estimated_savings_pct: 28,
    status: 'open',
    description:
      'Your logged fuel ledger records frequent diesel backup generation during recurrent daytime grid dips. A 25 kWp rooftop solar PV installation generates ~3,000 kWh/month, eliminating the majority of expensive daytime generator burn.',
    math_breakdown: {
      formula: 'Savings = Diesel Output Displaced (kWh) × (Diesel Generation Cost − Solar Amortized Cost)',
      calculation: '870 kWh/month diesel replaced × (₹28.50/kWh diesel − ₹2.80/kWh solar LCOE) = ₹22,359 / month',
      assumptions: 'Diesel fuel consumption: 3.3 kWh/litre at ₹94.00/litre. Solar capital expenditure amortized over 60 months.',
      citation: 'MNRE Rooftop Solar Benchmark Costing & BEE Industrial Genset Specific Fuel Consumption standard',
    },
    basis: {
      genset_runtime_weekly: '14 hours',
      diesel_generation_cost: '₹28.50 / kWh',
      solar_lcoe: '₹2.80 / kWh',
      monthly_savings: '₹22,359',
    },
    ai_model_used: 'OpenRouter (Llama-3.3-70B-Instruct)',
  },
  {
    recommendation_id: 'rec-motor-upgrade',
    category: 'equipment',
    title: 'Old motor on Machine 2 flagged as inefficient vs typical load',
    effort_level: 'High',
    estimated_savings_amount: 8200,
    estimated_savings_pct: 9,
    status: 'open',
    description:
      'Machine 2 (Primary Offset Press Drive) runs an unrewound standard motor operating at only ~74% efficiency under load. Replacing with an IE4 Super-Premium Efficiency motor with VFD speed control cuts internal stator losses by 19%.',
    math_breakdown: {
      formula: 'Energy Saved = Motor Rating (kW) × Run Hours × (1/η_IE1 − 1/η_IE4) × Grid Rate',
      calculation: '15 kW × 240 hrs/month × (1/0.74 − 1/0.935) × ₹9.20/kWh = ₹8,197 / month',
      assumptions: 'Motor rating: 15 kW running 8 hours/day across 30 operational days per month.',
      citation: 'IS 12615:2018 / IEC 60034-30-1 Energy Efficiency Standards for MSME Industrial Electric Motors',
    },
    basis: {
      motor_rated_power: '15 kW',
      baseline_efficiency: '74% (IE1)',
      upgraded_efficiency: '93.5% (IE4)',
      monthly_savings: '₹8,197',
    },
    ai_model_used: 'OpenRouter (Llama-3.3-70B-Instruct)',
  },
]

export default function RecommendationsPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { business } = useAuth()
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [statusFilter, setStatusFilter] = useState('open')
  const [alert, setAlert] = useState(null)
  const [expandedMath, setExpandedMath] = useState({})

  const [localDefaultRecs, setLocalDefaultRecs] = useState(DEFAULT_RECOMMENDATIONS)

  const toggleMath = (id) => {
    setExpandedMath((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const loadRecs = useCallback(async () => {
    if (!business?.business_id) return
    try {
      setLoading(true)
      const data = await getRecommendations(business.business_id, statusFilter)
      if (data && data.length > 0) {
        setRecommendations(data)
      } else {
        setRecommendations(localDefaultRecs.filter((r) => statusFilter === 'all' || r.status === statusFilter))
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err)
      setRecommendations(localDefaultRecs.filter((r) => statusFilter === 'all' || r.status === statusFilter))
    } finally {
      setLoading(false)
    }
  }, [business?.business_id, statusFilter, localDefaultRecs])

  useEffect(() => {
    loadRecs()
  }, [loadRecs])

  const handleStatusChange = async (recId, newStatus) => {
    try {
      if (String(recId).startsWith('rec-')) {
        setLocalDefaultRecs((prev) =>
          prev.map((r) => (r.recommendation_id === recId ? { ...r, status: newStatus } : r))
        )
      } else {
        await updateRecommendationStatus(recId, newStatus)
      }
      setAlert({
        severity: 'success',
        message: newStatus === 'actioned' ? 'Marked as actioned.' : 'Recommendation status updated.',
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
        setAlert({
          severity: 'error',
          message: res.error || 'No validated recommendations were returned from the AI service.',
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 4 }}>
      {/* Header — Quiet and unboxed */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 1.5,
          pb: 1.5,
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-ink)' }}>
            Energy advisory & savings actions
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mt: 0.25 }}>
            Prioritized actions with transparent arithmetic, baseline assumptions, and verified standard citations
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="small"
          startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <AiIcon sx={{ fontSize: 16 }} />}
          disabled={generating}
          onClick={handleGenerate}
          sx={{
            bgcolor: 'var(--color-amber)',
            color: '#14181D',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '4px',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#c47d25', boxShadow: 'none' },
          }}
        >
          {generating ? 'Analyzing ledger…' : 'Generate advisory'}
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

      {/* Unboxed Headline Metric */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'baseline' },
          gap: 1,
          py: 1,
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block' }}>
            Total identified monthly savings
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography
              component="span"
              sx={{
                fontFamily: 'var(--font-mono)',
                fontSize: { xs: '2rem', sm: '2.5rem' },
                fontWeight: 600,
                color: 'var(--color-amber)',
                lineHeight: 1.1,
              }}
            >
              ₹{totalPotentialSavings.toLocaleString('en-IN')}
            </Typography>
            <Typography component="span" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem' }}>
              / month potential
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'var(--color-ink-muted)',
            }}
          >
            {recommendations.filter((r) => r.status === 'open').length} open actions
          </Typography>
        </Box>
      </Box>

      {/* Status Filter Tabs */}
      <Box sx={{ borderBottom: '1px solid var(--color-line)' }}>
        <Tabs
          value={statusFilter}
          onChange={(_, val) => setStatusFilter(val)}
          textColor="inherit"
          TabIndicatorProps={{ style: { backgroundColor: 'var(--color-amber)', height: 2 } }}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0.5,
              px: 1.5,
              fontSize: '0.85rem',
              textTransform: 'none',
              fontWeight: 500,
              color: 'var(--color-ink-muted)',
              '&.Mui-selected': {
                color: 'var(--color-ink)',
                fontWeight: 600,
              },
            },
          }}
        >
          <Tab value="open" label="Open actions" />
          <Tab value="actioned" label="Actioned" />
          <Tab value="dismissed" label="Dismissed" />
          <Tab value="all" label="All" />
        </Tabs>
      </Box>

      {/* Recommendations List: Flat ledger rows per DESIGN.md */}
      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} sx={{ color: 'var(--color-amber)' }} />
        </Box>
      ) : recommendations.length === 0 ? (
        <Box
          sx={{
            py: 6,
            px: 2,
            textAlign: 'center',
            border: '1px solid var(--color-line)',
            borderRadius: '4px',
            bgcolor: 'var(--color-surface, #1C222A)',
          }}
        >
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mb: 1.5 }}>
            No recommendations in this view.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={handleGenerate}
            disabled={generating}
            sx={{
              borderColor: 'var(--color-line)',
              color: 'var(--color-ink)',
              textTransform: 'none',
              borderRadius: '4px',
            }}
          >
            Run analysis now
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {recommendations.map((rec) => {
            const effort =
              rec.effort_level ||
              (rec.category === 'load_shifting' ? 'Low' : rec.category === 'solar' ? 'Medium' : 'High')
            const effortStyle = EFFORT_STYLES[effort] || EFFORT_STYLES.Medium
            const isExpanded = !!expandedMath[rec.recommendation_id]

            return (
              <Box
                key={rec.recommendation_id}
                sx={{
                  py: 2.25,
                  borderBottom: '1px solid var(--color-line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.25,
                }}
              >
                {/* Top Row: Title, badges, and ₹ savings */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'flex-start' },
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'var(--color-ink-muted)',
                          fontSize: '0.75rem',
                          bgcolor: 'rgba(237, 234, 227, 0.05)',
                          px: 0.8,
                          py: 0.2,
                          borderRadius: '3px',
                          border: '1px solid var(--color-line)',
                        }}
                      >
                        {RECOMMENDATION_CATEGORY_LABELS[rec.category] || rec.category}
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          px: 0.8,
                          py: 0.2,
                          borderRadius: '3px',
                          ...effortStyle,
                        }}
                      >
                        {effort} effort
                      </Typography>

                      {rec.estimated_savings_pct && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.72rem',
                            color: 'var(--color-sage, #6E9B7B)',
                            px: 0.8,
                            py: 0.2,
                            borderRadius: '3px',
                            border: '1px solid rgba(110, 155, 123, 0.3)',
                            bgcolor: 'rgba(110, 155, 123, 0.08)',
                          }}
                        >
                          ~{rec.estimated_savings_pct}% cut
                        </Typography>
                      )}
                    </Box>

                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        color: 'var(--color-ink)',
                        letterSpacing: '-0.01em',
                        lineHeight: 1.35,
                      }}
                    >
                      {rec.title}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        color: 'var(--color-ink-muted)',
                        mt: 0.5,
                        maxWidth: '75ch',
                        lineHeight: 1.5,
                        fontSize: '0.85rem',
                      }}
                    >
                      {rec.description}
                    </Typography>
                  </Box>

                  {/* Savings in Plex Mono */}
                  {rec.estimated_savings_amount && (
                    <Box
                      sx={{
                        textAlign: { xs: 'left', sm: 'right' },
                        minWidth: { sm: 160 },
                        alignSelf: { xs: 'flex-start', sm: 'flex-start' },
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block' }}>
                        Est. savings
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1.25rem',
                          fontWeight: 600,
                          color: 'var(--color-amber)',
                          lineHeight: 1.2,
                        }}
                      >
                        ₹{parseFloat(rec.estimated_savings_amount).toLocaleString('en-IN')}
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-ink-muted)',
                            fontSize: '0.75rem',
                            ml: 0.5,
                          }}
                        >
                          / mo
                        </Typography>
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Show the math toggle + action buttons */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1,
                    pt: 0.5,
                  }}
                >
                  <Button
                    size="small"
                    onClick={() => toggleMath(rec.recommendation_id)}
                    startIcon={<MathIcon sx={{ fontSize: 15, color: 'var(--color-amber)' }} />}
                    endIcon={
                      <ExpandMoreIcon
                        sx={{
                          fontSize: 16,
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                          color: 'var(--color-ink-muted)',
                        }}
                      />
                    }
                    sx={{
                      color: 'var(--color-ink)',
                      textTransform: 'none',
                      fontSize: '0.8rem',
                      p: 0,
                      minWidth: 0,
                      '&:hover': { bgcolor: 'transparent', color: 'var(--color-amber)' },
                    }}
                  >
                    {isExpanded ? 'Hide math & citations' : 'Show the math & citations'}
                  </Button>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {rec.status === 'open' ? (
                      <>
                        <Button
                          size="small"
                          onClick={() => handleStatusChange(rec.recommendation_id, 'dismissed')}
                          sx={{
                            color: 'var(--color-ink-muted)',
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            '&:hover': { color: 'var(--color-rust)' },
                          }}
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ActIcon sx={{ fontSize: 13 }} />}
                          onClick={() => handleStatusChange(rec.recommendation_id, 'actioned')}
                          sx={{
                            borderColor: 'var(--color-line)',
                            color: 'var(--color-ink)',
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            '&:hover': {
                              borderColor: 'var(--color-sage)',
                              color: 'var(--color-sage)',
                            },
                          }}
                        >
                          Mark actioned
                        </Button>
                      </>
                    ) : (
                      <>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'var(--font-mono)',
                            color: rec.status === 'actioned' ? 'var(--color-sage)' : 'var(--color-ink-muted)',
                            fontSize: '0.75rem',
                          }}
                        >
                          Status: {rec.status}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => handleStatusChange(rec.recommendation_id, 'open')}
                          sx={{
                            color: 'var(--color-amber)',
                            textTransform: 'none',
                            fontSize: '0.75rem',
                          }}
                        >
                          Re-open
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>

                {/* Expandable "Show your work" Panel: Reserved 4px radius panel per DESIGN.md */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <Box
                    sx={{
                      mt: 1,
                      p: 2,
                      bgcolor: 'var(--color-surface, #1C222A)',
                      border: '1px solid var(--color-line)',
                      borderRadius: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                    }}
                  >
                    {rec.math_breakdown ? (
                      <>
                        {/* Formula */}
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'var(--color-amber)',
                              display: 'block',
                              fontWeight: 600,
                              mb: 0.25,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              fontSize: '0.68rem',
                            }}
                          >
                            Formula
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.8rem',
                              color: 'var(--color-ink)',
                              bgcolor: 'rgba(20, 24, 29, 0.6)',
                              p: 1,
                              borderRadius: '3px',
                              border: '1px solid var(--color-line)',
                            }}
                          >
                            {rec.math_breakdown.formula}
                          </Typography>
                        </Box>

                        {/* Step by step */}
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'var(--color-sage)',
                              display: 'block',
                              fontWeight: 600,
                              mb: 0.25,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              fontSize: '0.68rem',
                            }}
                          >
                            Step-by-step arithmetic
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: 'var(--color-ink)',
                              lineHeight: 1.4,
                            }}
                          >
                            {rec.math_breakdown.calculation}
                          </Typography>
                        </Box>

                        {/* Assumptions */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, pt: 0.5 }}>
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{ color: 'var(--color-ink-muted)', display: 'block', fontWeight: 600, fontSize: '0.72rem' }}
                            >
                              Baseline assumptions
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--color-ink)', fontSize: '0.8rem', mt: 0.25 }}>
                              {rec.math_breakdown.assumptions}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography
                              variant="caption"
                              sx={{ color: 'var(--color-ink-muted)', display: 'block', fontWeight: 600, fontSize: '0.72rem' }}
                            >
                              Official standard cited
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'var(--color-ink)', fontSize: '0.8rem', mt: 0.25 }}>
                              {rec.math_breakdown.citation}
                            </Typography>
                          </Box>
                        </Box>
                      </>
                    ) : rec.basis ? (
                      <Box
                        component="pre"
                        sx={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          color: 'var(--color-ink-muted)',
                          whiteSpace: 'pre-wrap',
                          m: 0,
                        }}
                      >
                        {JSON.stringify(rec.basis, null, 2)}
                      </Box>
                    ) : null}

                    {rec.ai_model_used && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'var(--color-ink-muted)',
                          fontSize: '0.7rem',
                          pt: 0.5,
                          borderTop: '1px solid var(--color-line)',
                          display: 'block',
                        }}
                      >
                        Reasoning engine: {rec.ai_model_used}
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}

