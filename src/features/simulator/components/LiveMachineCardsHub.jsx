import React from 'react'
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Button,
  LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  PowerSettingsNew as PowerIcon,
  WarningAmberRounded as AnomalyIcon,
  CheckCircleOutlineRounded as NormalIcon,
  Speed as MeterIcon,
  Schedule as ClockIcon,
  AttachMoney as RupeeIcon,
  ElectricBolt as GridIcon,
  LocalGasStation as DieselIcon,
  LocalFireDepartment as KeroseneIcon,
} from '@mui/icons-material'

export default function LiveMachineCardsHub({
  machines = [],
  gridOutageActive = false,
  onToggleMachine,
  onToggleAnomaly,
}) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>
            Machinery Status & Live Load Hub
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
            Real-time operating telemetry, instantaneous fuel draws, shift schedules, and component efficiency
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-mono)' }}>
          {machines.filter((m) => m.status === 'running').length} of {machines.length} units online
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {machines.map((machine) => {
          const isRunning = machine.status === 'running'
          const isGenset = machine.type === 'genset'
          const fuelType = machine.activeFuel || machine.primaryFuel

          // Badge coloring
          let statusColor = 'var(--color-ink-muted)'
          let statusLabel = 'Standby / Idle'
          let statusBg = 'rgba(100, 116, 139, 0.1)'

          if (isRunning) {
            if (gridOutageActive && machine.primaryFuel === 'electric') {
              statusColor = 'var(--color-rust)'
              statusLabel = 'Running on Genset'
              statusBg = 'rgba(193, 85, 58, 0.12)'
            } else {
              statusColor = 'var(--color-sage)'
              statusLabel = 'Active / Normal'
              statusBg = 'rgba(30, 107, 57, 0.12)'
            }
          } else if (isGenset && !gridOutageActive) {
            statusColor = 'var(--color-ink-muted)'
            statusLabel = 'Genset Standby'
            statusBg = 'rgba(100, 116, 139, 0.08)'
          }

          const fuelIcon =
            fuelType === 'diesel' ? (
              <DieselIcon sx={{ fontSize: 14, color: 'var(--color-rust)' }} />
            ) : fuelType === 'kerosene' ? (
              <KeroseneIcon sx={{ fontSize: 14, color: 'var(--color-amber)' }} />
            ) : (
              <GridIcon sx={{ fontSize: 14, color: 'var(--color-amber)' }} />
            )

          return (
            <Grid key={machine.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'var(--color-surface)',
                  border: '1px solid',
                  borderColor: machine.isUnderperforming
                    ? 'rgba(193, 85, 58, 0.4)'
                    : isRunning
                    ? 'var(--color-line)'
                    : 'var(--color-line)',
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  position: 'relative',
                  boxShadow: machine.isUnderperforming ? '0 0 10px rgba(193, 85, 58, 0.1)' : 'none',
                }}
              >
                {/* Top Row: Name, Status Pill, Power Switch */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ pr: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.25 }}>
                        {machine.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.72rem' }}>
                        {machine.category} • Rating: {machine.powerRatingKw} kW
                      </Typography>
                    </Box>

                    <Tooltip title={isRunning ? 'Turn machine off' : 'Start machine'}>
                      <IconButton
                        size="small"
                        onClick={() => onToggleMachine && onToggleMachine(machine.id)}
                        sx={{
                          color: isRunning ? 'var(--color-sage)' : 'var(--color-ink-muted)',
                          bgcolor: isRunning ? 'rgba(30, 107, 57, 0.1)' : 'var(--color-subtle-bg)',
                          border: '1px solid',
                          borderColor: isRunning ? 'rgba(30, 107, 57, 0.3)' : 'var(--color-line)',
                          borderRadius: '4px',
                          p: 0.6,
                        }}
                      >
                        <PowerIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Status & Fuel Badges */}
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5, alignItems: 'center' }}>
                    <Chip
                      label={statusLabel}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.68rem',
                        height: 20,
                        bgcolor: statusBg,
                        color: statusColor,
                        fontFamily: 'var(--font-mono)',
                        border: `1px solid ${statusColor}40`,
                      }}
                    />

                    <Chip
                      icon={fuelIcon}
                      label={fuelType.toUpperCase()}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.68rem',
                        height: 20,
                        bgcolor: 'var(--color-subtle-bg)',
                        color: 'var(--color-ink-muted)',
                        border: '1px solid var(--color-line)',
                      }}
                    />

                    {machine.isUnderperforming && (
                      <Chip
                        icon={<AnomalyIcon sx={{ fontSize: 13, color: 'var(--color-rust)' }} />}
                        label="UNDERPERFORMING"
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          height: 20,
                          bgcolor: 'rgba(193, 85, 58, 0.12)',
                          color: 'var(--color-rust)',
                          border: '1px solid rgba(193, 85, 58, 0.3)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      />
                    )}
                  </Box>

                  {/* Operational Telemetry Metrics */}
                  <Box
                    sx={{
                      p: 1.25,
                      bgcolor: 'var(--color-subtle-bg)',
                      borderRadius: '4px',
                      border: '1px solid var(--color-line)',
                      mb: 1.5,
                    }}
                  >
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.68rem' }}>
                          Current Draw
                        </Typography>
                        <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.05rem', color: isRunning ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}>
                          {isRunning ? `${machine.currentDrawKw || 0} kW` : '0 kW'}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.68rem' }}>
                          Hourly Cost
                        </Typography>
                        <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.05rem', color: isRunning ? 'var(--color-amber)' : 'var(--color-ink-muted)' }}>
                          ₹{isRunning ? Math.round(machine.costPerHour || 0) : 0} <span style={{ fontSize: '0.68rem', fontWeight: 400 }}>/hr</span>
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Shift schedule */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                    <ClockIcon sx={{ fontSize: 14, color: 'var(--color-ink-muted)' }} />
                    <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.72rem' }}>
                      Shift Window: {String(machine.shiftSchedule.startHour).padStart(2, '0')}:00 – {String(machine.shiftSchedule.endHour).padStart(2, '0')}:00
                    </Typography>
                  </Box>

                  {/* Efficiency Progress Bar */}
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.7rem' }}>
                        Operating Efficiency
                      </Typography>
                      <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem', color: machine.isUnderperforming ? 'var(--color-rust)' : 'var(--color-sage)' }}>
                        {Math.round((machine.efficiency || 0.95) * 100)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.round((machine.efficiency || 0.95) * 100)}
                      sx={{
                        height: 5,
                        borderRadius: '2px',
                        bgcolor: 'var(--color-line)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: machine.isUnderperforming ? 'var(--color-rust)' : 'var(--color-sage)',
                        },
                      }}
                    />
                  </Box>

                  {/* Anomaly Callout Note */}
                  {machine.isUnderperforming && (
                    <Box
                      sx={{
                        p: 1,
                        mt: 1,
                        borderRadius: '2px',
                        borderLeft: '3px solid var(--color-rust)',
                        bgcolor: 'rgba(193, 85, 58, 0.08)',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'var(--color-ink)', fontWeight: 600, display: 'block', fontSize: '0.7rem' }}>
                        Diagnostic Flag:
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.68rem', lineHeight: 1.25 }}>
                        {machine.anomalyReason}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Bottom Action: Toggle Anomaly for demo testing */}
                <Box sx={{ pt: 1.5, mt: 1, borderTop: '1px solid var(--color-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'var(--color-ink-muted)' }}>
                    Baseline: {machine.baselineKw} kW
                  </Typography>

                  <Button
                    size="small"
                    variant="text"
                    onClick={() => onToggleAnomaly && onToggleAnomaly(machine.id)}
                    sx={{
                      fontSize: '0.68rem',
                      color: machine.isUnderperforming ? 'var(--color-sage)' : 'var(--color-rust)',
                      p: 0,
                      minWidth: 0,
                      fontWeight: 600,
                      textTransform: 'none',
                    }}
                  >
                    {machine.isUnderperforming ? 'Clear Leak' : 'Simulate Leak'}
                  </Button>
                </Box>
              </Box>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}
