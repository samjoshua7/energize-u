import React from 'react'
import { Box, Typography, Chip, Tooltip } from '@mui/material'
import {
  Bolt as GridIcon,
  WbSunny as SolarIcon,
  LocalGasStation as DieselIcon,
  PowerSettingsNew as GensetIcon,
  PrecisionManufacturing as MachineIcon,
  Air as CompressorIcon,
  LocalFireDepartment as BurnerIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material'

export default function FactoryEnergyFlowMap({ simState }) {
  const { gridOutageActive, inventory, machines } = simState
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'

  const activeMachines = machines.filter((m) => m.status === 'running')
  const totalDrawKw = activeMachines.reduce((sum, m) => sum + (m.currentDrawKw || 0), 0)
  const solarKw = inventory.solar.currentOutputKw || 0
  const gensetKw = gridOutageActive ? totalDrawKw : 0
  const gridKw = gridOutageActive ? 0 : Math.max(0, totalDrawKw - solarKw)

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>
              Live Factory Energy Flow Map
            </Typography>
            <Chip
              label={gridOutageActive ? 'GRID DOWN • GENSET ONLINE' : 'NORMAL GRID + SOLAR RUN'}
              size="small"
              sx={{
                bgcolor: gridOutageActive ? 'rgba(193, 85, 58, 0.12)' : 'rgba(30, 107, 57, 0.12)',
                color: gridOutageActive ? 'var(--color-rust)' : 'var(--color-sage)',
                border: '1px solid',
                borderColor: gridOutageActive ? 'rgba(193, 85, 58, 0.3)' : 'rgba(30, 107, 57, 0.3)',
                fontWeight: 700,
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
            Real-time power routing across DISCOM grid, rooftop solar PV, diesel genset, and shop-floor machines
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block' }}>
              Total Facility Load
            </Typography>
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-amber)' }}>
              {totalDrawKw.toFixed(1)} <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)' }}>kW</span>
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Schematic Layout: Sources -> Busbar / ATS -> Machinery */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px 100px 1fr' },
          gap: 2,
          alignItems: 'center',
          p: 1.5,
          bgcolor: 'var(--color-subtle-bg)',
          borderRadius: '4px',
          border: '1px dashed var(--color-line)',
        }}
      >
        {/* Left Column: Energy Sources */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--color-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            1. Generation & Utility Feeds
          </Typography>

          {/* Grid Source */}
          <Box
            sx={{
              p: 1.25,
              borderRadius: '4px',
              border: '1px solid',
              borderColor: !gridOutageActive ? 'var(--color-amber)' : 'var(--color-line)',
              bgcolor: !gridOutageActive ? 'rgba(158, 93, 18, 0.08)' : 'transparent',
              opacity: gridOutageActive ? 0.45 : 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GridIcon sx={{ fontSize: 20, color: !gridOutageActive ? 'var(--color-amber)' : 'var(--color-ink-muted)' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '0.825rem' }}>
                  DISCOM LT Grid (11 kV)
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.7rem' }}>
                  {gridOutageActive ? 'Power failure / Tripped' : inventory.grid.isPeakNow ? 'Peak Tariff: ₹11.50/kWh' : 'Standard Tariff: ₹9.20/kWh'}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-ink)' }}>
              {gridKw.toFixed(1)} kW
            </Typography>
          </Box>

          {/* Solar PV Source */}
          <Box
            sx={{
              p: 1.25,
              borderRadius: '4px',
              border: '1px solid',
              borderColor: solarKw > 0 ? 'var(--color-sage)' : 'var(--color-line)',
              bgcolor: solarKw > 0 ? 'rgba(30, 107, 57, 0.08)' : 'transparent',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SolarIcon sx={{ fontSize: 20, color: 'var(--color-sage)' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '0.825rem' }}>
                  25 kW Rooftop Solar PV
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.7rem' }}>
                  Offsetting grid load directly
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-sage)' }}>
              +{solarKw.toFixed(1)} kW
            </Typography>
          </Box>

          {/* Diesel Genset Source */}
          <Box
            sx={{
              p: 1.25,
              borderRadius: '4px',
              border: '1px solid',
              borderColor: gridOutageActive ? 'var(--color-rust)' : 'var(--color-line)',
              bgcolor: gridOutageActive ? 'rgba(193, 85, 58, 0.08)' : 'transparent',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GensetIcon sx={{ fontSize: 20, color: gridOutageActive ? 'var(--color-rust)' : 'var(--color-ink-muted)' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-ink)', fontSize: '0.825rem' }}>
                  62.5 kVA Diesel Genset
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.7rem' }}>
                  {gridOutageActive ? 'Active (~₹28.50/kWh equivalent)' : 'Standby / Ready'}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: gridOutageActive ? 'var(--color-rust)' : 'var(--color-ink-muted)' }}>
              {gensetKw > 0 ? `${gensetKw.toFixed(1)} kW` : '0 kW'}
            </Typography>
          </Box>
        </Box>

        {/* Center: ATS Switch / Busbar */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 1,
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: 'var(--color-surface)',
              border: '2px solid',
              borderColor: gridOutageActive ? 'var(--color-rust)' : 'var(--color-amber)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              boxShadow: gridOutageActive ? '0 0 12px rgba(193, 85, 58, 0.35)' : '0 0 12px rgba(158, 93, 18, 0.25)',
              position: 'relative',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.65rem', color: 'var(--color-ink)' }}>
              ATS
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'var(--color-ink-muted)', lineHeight: 1 }}>
              {gridOutageActive ? 'GENSET' : 'MAINS'}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'var(--color-ink-muted)', mt: 0.5, textAlign: 'center' }}>
            Main LT Busbar
          </Typography>
        </Box>

        {/* Right Column: Connected Factory Machinery */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--color-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 1 }}>
            2. Shop Floor Active Machinery
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
            {machines.map((mac) => {
              const isRunning = mac.status === 'running'
              const icon =
                mac.type === 'compressor' ? (
                  <CompressorIcon fontSize="small" />
                ) : mac.type === 'burner' ? (
                  <BurnerIcon fontSize="small" />
                ) : (
                  <MachineIcon fontSize="small" />
                )

              return (
                <Box
                  key={mac.id}
                  sx={{
                    p: 1,
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: isRunning ? 'var(--color-line)' : 'transparent',
                    bgcolor: isRunning ? 'var(--color-surface)' : 'rgba(0,0,0,0.02)',
                    opacity: isRunning ? 1 : 0.45,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: isRunning ? 'var(--color-amber)' : 'var(--color-ink-muted)' }}>
                      {icon}
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--color-ink)', lineHeight: 1.2 }}>
                        {mac.name}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'var(--color-ink-muted)' }}>
                        {mac.category} • {mac.powerRatingKw} kW
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem', color: isRunning ? 'var(--color-ink)' : 'var(--color-ink-muted)' }}>
                      {isRunning ? `${mac.currentDrawKw} kW` : 'Standby'}
                    </Typography>
                    {mac.isUnderperforming && (
                      <Chip
                        label="LEAK"
                        size="small"
                        sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'rgba(193, 85, 58, 0.15)', color: 'var(--color-rust)', fontWeight: 700 }}
                      />
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
