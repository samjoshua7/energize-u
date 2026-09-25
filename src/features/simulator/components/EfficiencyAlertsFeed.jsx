import React, { useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
} from '@mui/material'
import {
  WarningAmberRounded as WarningIcon,
  ErrorOutlineRounded as CriticalIcon,
  InfoOutlined as InfoIcon,
  CheckCircleOutlineRounded as ResolvedIcon,
  Done as AcknowledgeIcon,
} from '@mui/icons-material'

export default function EfficiencyAlertsFeed({
  alerts = [],
  onResolveAlert,
}) {
  const [filter, setFilter] = useState('all') // 'all' | 'active' | 'critical'

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'active') return !a.resolved
    if (filter === 'critical') return a.severity === 'critical'
    return true
  })

  return (
    <Box
      sx={{
        p: 2.5,
        bgcolor: 'var(--color-surface)',
        border: '1px solid var(--color-line)',
        borderRadius: '4px',
        mb: 3,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>
            Telemetry & Efficiency Alerts Feed
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
            Real-time anomaly diagnostics, grid power interruptions, low fuel alerts, and tariff triggers
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {['all', 'active', 'critical'].map((f) => (
            <Chip
              key={f}
              label={f.toUpperCase()}
              size="small"
              onClick={() => setFilter(f)}
              sx={{
                fontSize: '0.68rem',
                fontWeight: 700,
                borderRadius: '3px',
                cursor: 'pointer',
                bgcolor: filter === f ? 'var(--color-amber)' : 'var(--color-subtle-bg)',
                color: filter === f ? '#FFFFFF' : 'var(--color-ink-muted)',
                border: '1px solid',
                borderColor: filter === f ? 'var(--color-amber)' : 'var(--color-line)',
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Feed list */}
      {filteredAlerts.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)' }}>
            No alerts logged for this filter. System operating within nominal parameters.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical'
            const isWarning = alert.severity === 'warning'
            const icon = isCritical ? (
              <CriticalIcon sx={{ fontSize: 18, color: 'var(--color-rust)' }} />
            ) : isWarning ? (
              <WarningIcon sx={{ fontSize: 18, color: 'var(--color-amber)' }} />
            ) : (
              <InfoIcon sx={{ fontSize: 18, color: 'var(--color-sage)' }} />
            )

            const borderColor = alert.resolved
              ? 'var(--color-line)'
              : isCritical
              ? 'rgba(193, 85, 58, 0.4)'
              : isWarning
              ? 'rgba(158, 93, 18, 0.4)'
              : 'var(--color-line)'

            return (
              <Box
                key={alert.id}
                sx={{
                  p: 1.5,
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor,
                  bgcolor: alert.resolved ? 'var(--color-subtle-bg)' : 'var(--color-surface)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  opacity: alert.resolved ? 0.65 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <Box sx={{ pt: 0.25 }}>{icon}</Box>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--color-ink)', fontSize: '0.825rem' }}>
                        {alert.title}
                      </Typography>
                      <Chip
                        label={alert.timestamp}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontFamily: 'var(--font-mono)',
                          bgcolor: 'var(--color-subtle-bg)',
                          color: 'var(--color-ink-muted)',
                        }}
                      />
                      {alert.resolved && (
                        <Chip
                          label="RESOLVED"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            bgcolor: 'rgba(30, 107, 57, 0.1)',
                            color: 'var(--color-sage)',
                          }}
                        />
                      )}
                    </Box>

                    <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.75rem', lineHeight: 1.35, display: 'block' }}>
                      {alert.description}
                    </Typography>
                  </Box>
                </Box>

                {!alert.resolved && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onResolveAlert && onResolveAlert(alert.id)}
                    sx={{
                      fontSize: '0.68rem',
                      py: 0.3,
                      px: 1,
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      borderColor: 'var(--color-line)',
                      color: 'var(--color-ink)',
                      '&:hover': { borderColor: 'var(--color-ink-muted)', bgcolor: 'var(--color-subtle-bg)' },
                    }}
                  >
                    Acknowledge
                  </Button>
                )}
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
