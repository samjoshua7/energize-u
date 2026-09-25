import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  FastForward as FastForwardIcon,
  FlashOff as OutageIcon,
  FlashOn as RestoreIcon,
  CloudSync as SyncIcon,
  CheckCircle as SuccessIcon,
  Speed as SpeedIcon,
  Tune as PresetIcon,
  Hub as HubIcon,
  Inventory2 as InventoryIcon,
  ShowChart as ChartIcon,
  BarChart as RankingIcon,
  NotificationsActive as AlertsIcon,
  AutoAwesome as WizardIcon,
} from '@mui/icons-material'
import { useAuth } from '../../hooks/useAuth'
import { useSimulation } from './SimulationContext'
import FactoryEnergyFlowMap from './components/FactoryEnergyFlowMap'
import LiveMachineCardsHub from './components/LiveMachineCardsHub'
import ResourceInventoryView from './components/ResourceInventoryView'
import ConsumptionOverTimeChart from './components/ConsumptionOverTimeChart'
import CostPerMachineRanking from './components/CostPerMachineRanking'
import EfficiencyAlertsFeed from './components/EfficiencyAlertsFeed'
import { SECTORS, INDIAN_STATES } from '../../lib/constants'

export default function SimulatorPage() {
  const { business, refreshBusiness } = useAuth()
  const {
    simState,
    togglePlay,
    setSpeed,
    stepManual,
    fastForwardDay,
    toggleGridOutage,
    toggleMachine,
    toggleAnomaly,
    refuel,
    resolveAlert,
    syncToDatabase,
    syncing,
    syncSuccess,
  } = useSimulation()

  const [activeTab, setActiveTab] = useState(0)
  const [openPresetDialog, setOpenPresetDialog] = useState(false)
  const [syncNotice, setSyncNotice] = useState(false)

  const handleSync = async () => {
    if (!business?.business_id) return
    const ok = await syncToDatabase(business.business_id)
    if (ok) {
      setSyncNotice(true)
      if (refreshBusiness) await refreshBusiness()
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 6 }}>
      {/* Top Header & Context Description */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 1.5,
          pb: 2,
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>
              Industrial Energy & Machinery Simulation Engine
            </Typography>
            <Chip
              label="LIVE DEMO HUB"
              size="small"
              sx={{
                bgcolor: 'rgba(158, 93, 18, 0.12)',
                color: 'var(--color-amber)',
                fontWeight: 700,
                fontSize: '0.68rem',
                border: '1px solid rgba(158, 93, 18, 0.3)',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mt: 0.5 }}>
            Dynamic digital twin simulating Indian MSME shop-floor machinery, real-time grid vs genset fuel drawing, and anomaly diagnostics.
          </Typography>
        </Box>

        {/* Sync to Database Button */}
        <Button
          variant="contained"
          size="small"
          startIcon={syncing ? <CircularProgress size={16} sx={{ color: '#FFFFFF' }} /> : <SyncIcon sx={{ fontSize: 18 }} />}
          onClick={handleSync}
          disabled={syncing || !business?.business_id}
          sx={{
            bgcolor: 'var(--color-amber)',
            color: '#FFFFFF',
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '0.8125rem',
            py: 0.8,
            px: 2,
            boxShadow: 'none',
            '&:hover': { bgcolor: '#7E470B' },
          }}
        >
          {syncing ? 'Syncing to Supabase…' : 'Sync to Live App Ledger'}
        </Button>
      </Box>

      {/* Sync Success Alert */}
      {syncNotice && (
        <Alert
          severity="success"
          onClose={() => setSyncNotice(false)}
          sx={{
            borderRadius: '4px',
            bgcolor: 'rgba(30, 107, 57, 0.08)',
            border: '1px solid rgba(30, 107, 57, 0.3)',
            color: 'var(--color-ink)',
            '& .MuiAlert-icon': { color: 'var(--color-sage)' },
          }}
        >
          <strong>Simulation successfully synced!</strong> Supabase database populated with simulated machines, multi-fuel energy entries, production records, and AI recommendations. Overview, Ledger, Benchmarks, and Emissions are now live.
        </Alert>
      )}

      {/* Interactive Simulation Control Bar */}
      <Box
        sx={{
          p: 1.75,
          bgcolor: 'var(--color-surface)',
          border: '1px solid var(--color-line)',
          borderRadius: '4px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Left: Clock & Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: simState.isRunning ? 'var(--color-sage)' : 'var(--color-ink-muted)',
                boxShadow: simState.isRunning ? '0 0 8px var(--color-sage)' : 'none',
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--color-ink)' }}>
              {simState.isRunning ? 'SIMULATION ACTIVE' : 'PAUSED'}
            </Typography>
          </Box>

          <Box sx={{ borderLeft: '1px solid var(--color-line)', pl: 2 }}>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', display: 'block', fontSize: '0.68rem' }}>
              Simulated Factory Time
            </Typography>
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--color-amber)', lineHeight: 1.1 }}>
              {simState.formattedTime} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-ink-muted)' }}>IST</span>
            </Typography>
          </Box>
        </Box>

        {/* Center: Controls (Play/Pause, Speed, Step) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={simState.isRunning ? 'Pause simulation' : 'Resume simulation'}>
            <IconButton
              size="small"
              onClick={togglePlay}
              sx={{
                bgcolor: simState.isRunning ? 'var(--color-subtle-bg)' : 'var(--color-amber)',
                color: simState.isRunning ? 'var(--color-ink)' : '#FFFFFF',
                border: '1px solid var(--color-line)',
                borderRadius: '4px',
                p: 0.75,
                '&:hover': { bgcolor: 'var(--color-amber)', color: '#FFFFFF' },
              }}
            >
              {simState.isRunning ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          {/* Speed Selector Buttons */}
          <Box sx={{ display: 'flex', border: '1px solid var(--color-line)', borderRadius: '4px', overflow: 'hidden' }}>
            {[
              { label: '1x', val: 1 },
              { label: '5x', val: 5 },
              { label: '30x', val: 30 },
            ].map((spd) => (
              <Button
                key={spd.label}
                size="small"
                onClick={() => setSpeed(spd.val)}
                sx={{
                  py: 0.3,
                  px: 1,
                  minWidth: 32,
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: simState.speed === spd.val ? 700 : 500,
                  bgcolor: simState.speed === spd.val ? 'var(--color-amber)' : 'transparent',
                  color: simState.speed === spd.val ? '#FFFFFF' : 'var(--color-ink)',
                  borderRadius: 0,
                  '&:hover': { bgcolor: simState.speed === spd.val ? 'var(--color-amber)' : 'var(--color-subtle-bg)' },
                }}
              >
                {spd.label}
              </Button>
            ))}
          </Box>

          {/* Fast-forward Day */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<FastForwardIcon sx={{ fontSize: 16 }} />}
            onClick={fastForwardDay}
            sx={{
              borderRadius: '4px',
              borderColor: 'var(--color-line)',
              color: 'var(--color-ink)',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { borderColor: 'var(--color-ink-muted)', bgcolor: 'var(--color-subtle-bg)' },
            }}
          >
            Fast-forward 1 Day
          </Button>
        </Box>

        {/* Right: Pitch Interventions (Trigger Outage Switch) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={simState.gridOutageActive ? <RestoreIcon sx={{ fontSize: 16 }} /> : <OutageIcon sx={{ fontSize: 16 }} />}
            onClick={toggleGridOutage}
            sx={{
              bgcolor: simState.gridOutageActive ? 'var(--color-sage)' : 'var(--color-rust)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.75rem',
              textTransform: 'none',
              borderRadius: '4px',
              py: 0.6,
              px: 1.5,
              '&:hover': { opacity: 0.9 },
            }}
          >
            {simState.gridOutageActive ? 'Restore Grid Power' : 'Simulate Grid Outage'}
          </Button>
        </Box>
      </Box>

      {/* View Tabs */}
      <Box sx={{ borderBottom: '1px solid var(--color-line)' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.825rem',
              color: 'var(--color-ink-muted)',
              py: 1,
              px: 2,
              '&.Mui-selected': {
                color: 'var(--color-ink)',
              },
            },
            '& .MuiTabs-indicator': {
              bgcolor: 'var(--color-amber)',
              height: 2.5,
            },
          }}
        >
          <Tab icon={<HubIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Live Hub & Energy Flow Map" />
          <Tab icon={<InventoryIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Resource Inventory & Stocks" />
          <Tab icon={<ChartIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="24h Consumption Profiles" />
          <Tab icon={<RankingIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="Machine Cost Benchmark" />
          <Tab
            icon={<AlertsIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
            label={`Efficiency Alerts (${simState.alerts.filter((a) => !a.resolved).length})`}
          />
        </Tabs>
      </Box>

      {/* Tab 0: Factory Hub & Energy Flow Map */}
      {activeTab === 0 && (
        <Box>
          <FactoryEnergyFlowMap simState={simState} />
          <LiveMachineCardsHub
            machines={simState.machines}
            gridOutageActive={simState.gridOutageActive}
            onToggleMachine={toggleMachine}
            onToggleAnomaly={toggleAnomaly}
          />
        </Box>
      )}

      {/* Tab 1: Resource Inventory View */}
      {activeTab === 1 && (
        <ResourceInventoryView
          inventory={simState.inventory}
          gridOutageActive={simState.gridOutageActive}
          onRefuel={refuel}
        />
      )}

      {/* Tab 2: Consumption Over Time 24h Profile */}
      {activeTab === 2 && (
        <ConsumptionOverTimeChart hourlyData={simState.hourlyHistory} />
      )}

      {/* Tab 3: Machine Cost Benchmark */}
      {activeTab === 3 && (
        <CostPerMachineRanking machines={simState.machines} />
      )}

      {/* Tab 4: Efficiency Alerts Feed */}
      {activeTab === 4 && (
        <EfficiencyAlertsFeed
          alerts={simState.alerts}
          onResolveAlert={resolveAlert}
        />
      )}
    </Box>
  )
}
