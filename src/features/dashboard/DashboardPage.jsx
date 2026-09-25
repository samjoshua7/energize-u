import Grid from '@mui/material/Grid2'
import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  useTheme,
} from '@mui/material'
import {
  DocumentScannerOutlined as ScanIcon,
  SavingsOutlined as SavingsIcon,
  SpeedOutlined as OutputIcon,
  Add as AddIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import { getEnergyEntries } from '../energyEntries/api'
import { getOutputRecords } from '../outputRecords/api'
import { getRecommendations } from '../recommendations/api'
import { getEmissionFactors } from '../benchmarks/api'
import BenchmarkComparisonCard from '../benchmarks/BenchmarkComparisonCard'
import BillUploadDialog from '../energyEntries/BillUploadDialog'
import ManualEntryDialog from '../energyEntries/ManualEntryDialog'
import OutputRecordDialog from '../outputRecords/OutputRecordDialog'
import DashboardProfileProgressCard from './DashboardProfileProgressCard'
import QuickAddMachineDialog from '../machines/QuickAddMachineDialog'
import { getMachines } from '../machines/api'
import { SOURCE_TYPE_LABELS, SOURCE_COLORS } from '../../lib/constants'

export default function DashboardPage() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const { business } = useAuth()

  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [machines, setMachines] = useState([])
  const [latestOutput, setLatestOutput] = useState(null)
  const [topRecommendations, setTopRecommendations] = useState([])
  const [emissionFactors, setEmissionFactors] = useState({})

  // Modals
  const [openScanModal, setOpenScanModal] = useState(false)
  const [openManualModal, setOpenManualModal] = useState(false)
  const [openOutputModal, setOpenOutputModal] = useState(false)
  const [openQuickMachineModal, setOpenQuickMachineModal] = useState(false)

  const loadDashboardData = useCallback(async () => {
    if (!business?.business_id) return
    try {
      setLoading(true)

      const [entryData, outputData, recData, efData, machineData] = await Promise.all([
        getEnergyEntries(business.business_id),
        getOutputRecords(business.business_id),
        getRecommendations(business.business_id, 'open'),
        getEmissionFactors(),
        getMachines(business.business_id),
      ])

      setEntries(entryData || [])
      setMachines(machineData || [])
      setLatestOutput(outputData?.[0] || null)
      setTopRecommendations((recData || []).slice(0, 3))

      const efMap = {}
      ;(efData || []).forEach((item) => {
        efMap[item.source_type] = parseFloat(item.kg_co2_per_unit) || 0
      })
      setEmissionFactors(efMap)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [business?.business_id])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Calculations
  const totalCost = entries.reduce((acc, e) => acc + (parseFloat(e.cost_amount) || 0), 0)

  // kWh equivalent
  const totalKwhEquiv = entries.reduce((acc, e) => {
    const q = parseFloat(e.quantity) || 0
    if (e.source_type === 'grid' || e.source_type === 'solar') return acc + q
    if (e.source_type === 'diesel') return acc + q * 3.3
    if (e.source_type === 'petrol') return acc + q * 2.8
    if (e.source_type === 'kerosene') return acc + q * 3.0
    return acc + q
  }, 0)

  // CO2 emissions in kg
  const totalCo2Kg = entries.reduce((acc, e) => {
    const q = parseFloat(e.quantity) || 0
    const factor = emissionFactors[e.source_type] || 0
    return acc + q * factor
  }, 0)

  // Unit metrics
  const outputQty = latestOutput ? parseFloat(latestOutput.output_quantity) : null
  const unitCost = outputQty && outputQty > 0 ? totalCost / outputQty : null
  const unitEnergy = outputQty && outputQty > 0 ? totalKwhEquiv / outputQty : null
  const unitCo2 = outputQty && outputQty > 0 ? totalCo2Kg / outputQty : null

  // Mix breakdown for Pie Chart
  const mixMap = {}
  entries.forEach((e) => {
    const type = e.source_type
    const cost = parseFloat(e.cost_amount) || 0
    mixMap[type] = (mixMap[type] || 0) + cost
  })

  const pieData = Object.keys(mixMap).map((key) => ({
    name: SOURCE_TYPE_LABELS[key] || key,
    value: Math.round(mixMap[key]),
    color: SOURCE_COLORS[key] || '#10B981',
  }))

  const periodMap = {}
  entries.forEach((entry) => {
    const period = entry.period_end || entry.period_start
    if (!period) return
    const monthKey = period.slice(0, 7)
    if (!periodMap[monthKey]) periodMap[monthKey] = { monthKey, cost: 0, quantity: 0 }
    periodMap[monthKey].cost += parseFloat(entry.cost_amount) || 0
    periodMap[monthKey].quantity += parseFloat(entry.quantity) || 0
  })

  const periodData = Object.values(periodMap)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .map((item) => ({
      ...item,
      month: new Date(`${item.monthKey}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    }))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, '& .MuiGrid2-root': { minWidth: 0 } }}>
      {/* Top Header Row */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
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
            {business?.name || 'Facility Overview'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {business?.location_city || business?.location_state} • {business?.sector?.toUpperCase()} • {entries.length} Ledger entries
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<OutputIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpenOutputModal(true)}
          >
            {latestOutput ? 'Output Logged' : 'Log Output'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpenManualModal(true)}
          >
            Log Fuel
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<ScanIcon sx={{ fontSize: 16 }} />}
            onClick={() => setOpenScanModal(true)}
          >
            Scan Bill
          </Button>
        </Box>
      </Box>

      {/* Profile Completion Card (Calculates % and auto-disappears upon 100% completion) */}
      <DashboardProfileProgressCard
        business={business}
        machines={machines}
        entries={entries}
        latestOutput={latestOutput}
        onOpenAddMachine={() => setOpenQuickMachineModal(true)}
        onOpenScanBill={() => setOpenScanModal(true)}
        onOpenLogFuel={() => setOpenManualModal(true)}
        onOpenLogOutput={() => setOpenOutputModal(true)}
      />

      {/* KPI Cards */}
      <Grid container spacing={1.5} sx={{ '& .MuiCard-root': { height: '100%' } }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Total Energy Spend</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5 }}>
                ₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                {entries.length} logged fuel/grid entries
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Normalized Power Output</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5 }}>
                {Math.round(totalKwhEquiv).toLocaleString('en-IN')}{' '}
                <Typography component="span" variant="body2" color="text.secondary">kWh</Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                Electrical + thermal equivalent
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Carbon Footprint</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5 }}>
                {(totalCo2Kg / 1000).toFixed(2)}{' '}
                <Typography component="span" variant="body2" color="text.secondary">Tonnes CO₂</Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                CEA Grid & IPCC standard factors
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Production Volume & Unit Metrics */}
      <Card sx={{ bgcolor: isDark ? '#141418' : '#F8FAFC' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Specific Energy Metrics
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {latestOutput
                  ? `${parseFloat(latestOutput.output_quantity).toLocaleString('en-IN')} ${latestOutput.output_unit} produced`
                  : 'Log production volume to compute ₹/unit & kWh/unit'}
              </Typography>
            </Box>
            {!latestOutput && (
              <Button size="small" variant="outlined" onClick={() => setOpenOutputModal(true)}>
                + Record Output
              </Button>
            )}
          </Box>

          {latestOutput && (
            <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Cost / Unit</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.25 }}>
                  ₹{unitCost != null ? unitCost.toFixed(3) : '—'}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    /{latestOutput.output_unit}
                  </Typography>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Energy / Unit</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.25 }}>
                  {unitEnergy != null ? unitEnergy.toFixed(3) : '—'}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    kWh/{latestOutput.output_unit}
                  </Typography>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Carbon / Unit</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.25 }}>
                  {unitCo2 != null ? (unitCo2 * 1000).toFixed(1) : '—'}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    g CO₂
                  </Typography>
                </Typography>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Benchmark Comparison Card */}
      <BenchmarkComparisonCard
        businessId={business?.business_id}
        unitCost={unitCost}
        unitEnergy={unitEnergy}
        outputUnit={latestOutput?.output_unit || 'sheets'}
      />

      {/* Ledger charts & Top Priority Actions */}
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Fuel Mix Breakdown
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Expenditure by energy source
              </Typography>

              {pieData.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    No entries logged yet.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%', height: 180, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        innerRadius={40}
                        stroke={isDark ? '#121215' : '#FFFFFF'}
                        strokeWidth={2}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Cost']}
                        contentStyle={{
                          backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                          borderColor: isDark ? '#27272A' : '#E2E8F0',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                {pieData.map((item) => (
                  <Chip
                    key={item.name}
                    label={`${item.name}: ₹${item.value.toLocaleString('en-IN')}`}
                    size="small"
                    sx={{
                      bgcolor: `${item.color}15`,
                      color: item.color,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Spend over time
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Monthly cost from your logged entries
              </Typography>
              {periodData.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">No dated entries logged yet.</Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%', height: 215, mt: 1.5 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={periodData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272A' : '#E2E8F0'} vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: isDark ? '#A1A1AA' : '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: isDark ? '#A1A1AA' : '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} width={42} />
                      <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Spend']} contentStyle={{ backgroundColor: isDark ? '#18181B' : '#FFFFFF', borderColor: isDark ? '#27272A' : '#E2E8F0', borderRadius: 6, fontSize: '0.75rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                      <Bar dataKey="cost" name="Energy spend" fill="#0F766E" radius={[3, 3, 0, 0]} maxBarSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Priority Actions */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Top Efficiency Actions
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Prioritized savings opportunities
                  </Typography>
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowIcon sx={{ fontSize: 14 }} />}
                  onClick={() => navigate('/recommendations')}
                  sx={{ fontSize: '0.75rem' }}
                >
                  View All
                </Button>
              </Box>

              {topRecommendations.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', borderRadius: 1.5 }}>
                  <SavingsIcon sx={{ fontSize: 28, color: 'text.secondary', opacity: 0.4, mb: 0.5 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    No open recommendations yet.
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1, fontSize: '0.75rem' }}
                    onClick={() => navigate('/recommendations')}
                  >
                    Run Advisory Analysis
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {topRecommendations.map((rec) => (
                    <Box
                      key={rec.recommendation_id}
                      sx={{
                        p: 1.25,
                        borderRadius: 1,
                        bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFC',
                        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }} noWrap>
                          {rec.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {rec.description}
                        </Typography>
                      </Box>
                      {rec.estimated_savings_amount && (
                        <Box sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.85rem' }}>
                            ₹{parseFloat(rec.estimated_savings_amount).toLocaleString('en-IN')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            /month
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog Modals */}
      <BillUploadDialog
        open={openScanModal}
        onClose={() => setOpenScanModal(false)}
        businessId={business?.business_id}
        onSuccess={loadDashboardData}
        onFallbackToManual={() => setOpenManualModal(true)}
      />

      <ManualEntryDialog
        open={openManualModal}
        onClose={() => setOpenManualModal(false)}
        businessId={business?.business_id}
        initialSource="diesel"
        onSuccess={loadDashboardData}
      />

      <OutputRecordDialog
        open={openOutputModal}
        onClose={() => setOpenOutputModal(false)}
        businessId={business?.business_id}
        defaultUnit="sheets"
        onSuccess={loadDashboardData}
      />

      <QuickAddMachineDialog
        open={openQuickMachineModal}
        onClose={() => setOpenQuickMachineModal(false)}
        businessId={business?.business_id}
        sector={business?.sector || 'printing'}
        onSuccess={loadDashboardData}
      />
    </Box>
  )
}
