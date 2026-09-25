import Grid from '@mui/material/Grid2'
import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  CheckCircleRounded as CheckIcon,
  RadioButtonUncheckedRounded as PendingIcon,
  PrecisionManufacturingOutlined as MachineIcon,
  ReceiptLongOutlined as EnergyIcon,
  SpeedOutlined as OutputIcon,
  BusinessOutlined as FacilityIcon,
  ArrowForwardRounded as ArrowIcon,
  AutoAwesomeOutlined as WizardIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

export default function DashboardProfileProgressCard({
  business,
  machines = [],
  entries = [],
  latestOutput = null,
  onOpenAddMachine,
  onOpenScanBill,
  onOpenLogFuel,
  onOpenLogOutput,
}) {
  const navigate = useNavigate()

  // Calculate 4 completion dimensions
  const hasFacilityBasics = Boolean(business?.name && business?.sector && business?.location_state)
  const hasMachines = machines.length > 0
  const hasEnergyEntries = entries.length > 0
  const hasOutputRecord = Boolean(latestOutput)

  const steps = [
    {
      id: 'facility',
      title: 'Facility Profile',
      completed: hasFacilityBasics,
      icon: <FacilityIcon fontSize="small" />,
      detail: hasFacilityBasics
        ? `${business.name} (${business.sector})`
        : 'Name, sector & shift pattern pending',
      actionText: hasFacilityBasics ? 'Edit Profile' : 'Setup Profile',
      onAction: () => navigate('/profile'),
    },
    {
      id: 'machines',
      title: 'Machinery Inventory',
      completed: hasMachines,
      icon: <MachineIcon fontSize="small" />,
      detail: hasMachines
        ? `${machines.length} machine${machines.length > 1 ? 's' : ''} registered`
        : 'Add your main machines & gensets',
      actionText: '+ Add Machine',
      onAction: onOpenAddMachine,
    },
    {
      id: 'energy',
      title: 'Energy & Fuel Ledger',
      completed: hasEnergyEntries,
      icon: <EnergyIcon fontSize="small" />,
      detail: hasEnergyEntries
        ? `${entries.length} energy entr${entries.length > 1 ? 'ies' : 'y'} logged`
        : 'Scan a bill or log fuel purchase',
      actionText: 'Scan Bill / Fuel',
      onAction: onOpenScanBill || onOpenLogFuel,
    },
    {
      id: 'output',
      title: 'Production Volume',
      completed: hasOutputRecord,
      icon: <OutputIcon fontSize="small" />,
      detail: hasOutputRecord
        ? `${Number(latestOutput.output_quantity).toLocaleString()} ${latestOutput.output_unit} logged`
        : 'Log monthly production output',
      actionText: '+ Log Output',
      onAction: onOpenLogOutput,
    },
  ]

  const completedCount = steps.filter((s) => s.completed).length
  const progressPercent = Math.round((completedCount / steps.length) * 100)

  // REQUIREMENT: Once profile is 100% complete, this card completely disappears
  if (progressPercent >= 100) {
    return null
  }

  return (
    <Box
      sx={{
        mb: 3,
        p: 2.5,
        bgcolor: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '4px',
      }}
    >
      {/* Header with Title & Progress Pill */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>
              Complete your facility profile
            </Typography>
            <Chip
              label={`${progressPercent}% complete`}
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
                borderRadius: '4px',
                bgcolor: 'rgba(217, 142, 46, 0.12)',
                color: 'var(--color-amber)',
                border: '1px solid rgba(217, 142, 46, 0.3)',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.825rem', color: 'var(--color-ink-muted)' }}>
            Add machinery inventory and energy baseline to unlock accurate sector benchmarks, CO₂ tracking, and ₹ savings recommendations.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<WizardIcon sx={{ fontSize: 16 }} />}
          onClick={() => navigate('/onboarding')}
          sx={{
            fontWeight: 600,
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            py: 0.6,
            px: 1.5,
            borderRadius: '4px',
            borderColor: 'var(--color-line)',
            color: 'var(--color-ink)',
            textTransform: 'none',
            '&:hover': { borderColor: 'var(--color-ink-muted)', bgcolor: 'var(--color-subtle-bg)' },
          }}
        >
          Full setup wizard
        </Button>
      </Box>

      {/* Linear Progress Bar */}
      <Box sx={{ width: '100%', mb: 2.5 }}>
        <LinearProgress
          variant="determinate"
          value={progressPercent}
          sx={{
            height: 6,
            borderRadius: '2px',
            bgcolor: 'var(--color-line)',
            '& .MuiLinearProgress-bar': {
              bgcolor: 'var(--color-amber)',
            },
          }}
        />
      </Box>

      {/* 4 Steps Checklist Tiles */}
      <Grid container spacing={1.5}>
        {steps.map((step) => (
          <Grid key={step.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '4px',
                border: '1px solid',
                borderColor: step.completed ? 'rgba(110, 155, 123, 0.35)' : 'var(--color-line)',
                bgcolor: step.completed ? 'rgba(110, 155, 123, 0.08)' : 'var(--color-subtle-bg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ color: step.completed ? 'var(--color-sage)' : 'var(--color-ink-muted)' }}>
                      {step.icon}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--color-ink)' }}>
                      {step.title}
                    </Typography>
                  </Box>
                  {step.completed ? (
                    <CheckIcon sx={{ fontSize: 18, color: 'var(--color-sage)' }} />
                  ) : (
                    <PendingIcon sx={{ fontSize: 18, color: 'var(--color-ink-muted)', opacity: 0.5 }} />
                  )}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    fontSize: '0.72rem',
                    lineHeight: 1.35,
                    mb: 1.5,
                    color: 'var(--color-ink-muted)',
                  }}
                >
                  {step.detail}
                </Typography>
              </Box>

              <Button
                size="small"
                variant={step.completed ? 'text' : 'contained'}
                onClick={step.onAction}
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  py: 0.4,
                  px: 1,
                  textTransform: 'none',
                  alignSelf: 'flex-start',
                  borderRadius: '4px',
                  ...(step.completed
                    ? { color: 'var(--color-ink-muted)' }
                    : {
                        bgcolor: 'var(--color-amber)',
                        color: '#FFFFFF',
                        '&:hover': { bgcolor: '#945814' },
                      }),
                }}
              >
                {step.actionText}
              </Button>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
