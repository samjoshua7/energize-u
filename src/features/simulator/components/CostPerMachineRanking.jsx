import React, { useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  Tabs,
  Tab,
} from '@mui/material'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'

export default function CostPerMachineRanking({ machines = [] }) {
  const [metric, setMetric] = useState('hourly') // 'hourly' | 'daily'

  const chartData = machines
    .map((m) => {
      const isRunning = m.status === 'running'
      const shiftHours = Math.abs(m.shiftSchedule.endHour - m.shiftSchedule.startHour)
      const hourlyCost = Math.round(m.costPerHour || (m.powerRatingKw * 0.8 * 9.20))
      const estimatedDayCost = isRunning ? Math.round(hourlyCost * shiftHours) : 0

      return {
        name: m.name.length > 20 ? m.name.slice(0, 20) + '…' : m.name,
        fullName: m.name,
        hourlyCost,
        estimatedDayCost,
        value: metric === 'hourly' ? hourlyCost : estimatedDayCost,
        fuel: m.primaryFuel,
        isUnderperforming: m.isUnderperforming,
        powerRatingKw: m.powerRatingKw,
      }
    })
    .sort((a, b) => b.value - a.value)

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
            Cost-per-Machine Benchmark & Ranking
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
            Comparative ranking of facility machinery by operating cost intensity and daily financial burn
          </Typography>
        </Box>

        <Tabs
          value={metric}
          onChange={(_, val) => setMetric(val)}
          sx={{
            minHeight: 32,
            '& .MuiTab-root': {
              minHeight: 30,
              py: 0.25,
              px: 1.5,
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'none',
              color: 'var(--color-ink-muted)',
              '&.Mui-selected': {
                color: 'var(--color-ink)',
                bgcolor: 'var(--color-subtle-bg)',
                borderRadius: '4px',
              },
            },
            '& .MuiTabs-indicator': {
              bgcolor: 'var(--color-amber)',
            },
          }}
        >
          <Tab value="hourly" label="Cost per Hour (₹/hr)" />
          <Tab value="daily" label="Est. Daily Spend (₹)" />
        </Tabs>
      </Box>

      {/* Chart */}
      <Box sx={{ height: 260, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="var(--color-line)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
              unit={metric === 'hourly' ? ' ₹/hr' : ' ₹'}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--color-ink)' }}
              width={100}
            />
            <Tooltip
              formatter={(val, name, item) => [
                `₹${val.toLocaleString('en-IN')} ${metric === 'hourly' ? '/hr' : 'estimated today'}`,
                item.payload.fullName,
              ]}
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-line)',
                borderRadius: 4,
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-ink)',
              }}
              itemStyle={{ color: 'var(--color-ink)' }}
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {chartData.map((entry, index) => {
                const fill = entry.isUnderperforming
                  ? 'var(--color-rust)'
                  : entry.fuel === 'diesel'
                  ? 'var(--color-rust)'
                  : 'var(--color-amber)'
                return <Cell key={`cell-${index}`} fill={fill} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Narrative Legend */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1.5, pt: 1, borderTop: '1px solid var(--color-line)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, bgcolor: 'var(--color-amber)', borderRadius: '1px' }} />
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.72rem' }}>
            Grid Electric Operations
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, bgcolor: 'var(--color-rust)', borderRadius: '1px' }} />
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.72rem' }}>
            Diesel / Underperforming Leakage
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
