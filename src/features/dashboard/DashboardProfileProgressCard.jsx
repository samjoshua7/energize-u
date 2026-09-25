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
    <Card
      variant="outlined"
      sx={{
        mb: 3,
        borderColor: 'primary.main',
        borderWidth: 1.5,
        borderRadius: 2.5,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(16, 185, 129, 0.04)'
            : 'rgba(16, 185, 129, 0.03)',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 4px 20px rgba(0, 0, 0, 0.25)'
            : '0 4px 16px rgba(16, 185, 129, 0.08)',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
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
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
                Complete Your Facility Profile
              </Typography>
              <Chip
                label={`${progressPercent}% Complete`}
                size="small"
                color={progressPercent > 50 ? 'primary' : 'warning'}
                sx={{ fontWeight: 700, fontSize: '0.75rem', height: 24 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.825rem' }}>
              Add your machinery inventory and energy baseline to unlock accurate sector benchmarks, CO₂ tracking, and ₹ savings recommendations.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            color="primary"
            startIcon={<WizardIcon sx={{ fontSize: 18 }} />}
            onClick={() => navigate('/onboarding')}
            sx={{
              fontWeight: 700,
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
              py: 0.6,
              px: 1.5,
              borderRadius: 2,
            }}
          >
            Full Setup Wizard
          </Button>
        </Box>

        {/* Linear Progress Bar */}
        <Box sx={{ width: '100%', mb: 2.5 }}>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            color="primary"
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.08)',
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
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: step.completed ? 'primary.light' : 'divider',
                  bgcolor: (theme) =>
                    step.completed
                      ? theme.palette.mode === 'dark'
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(16, 185, 129, 0.06)'
                      : 'background.paper',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ color: step.completed ? 'primary.main' : 'text.secondary' }}>
                        {step.icon}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.825rem' }}>
                        {step.title}
                      </Typography>
                    </Box>
                    {step.completed ? (
                      <CheckIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                    ) : (
                      <PendingIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: '0.72rem',
                      lineHeight: 1.35,
                      mb: 1.5,
                    }}
                  >
                    {step.detail}
                  </Typography>
                </Box>

                <Button
                  size="small"
                  variant={step.completed ? 'text' : 'contained'}
                  color={step.completed ? 'inherit' : 'primary'}
                  onClick={step.onAction}
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    py: 0.4,
                    px: 1,
                    textTransform: 'none',
                    alignSelf: 'flex-start',
                    borderRadius: 1.5,
                  }}
                >
                  {step.actionText}
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}
