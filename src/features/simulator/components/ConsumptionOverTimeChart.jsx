import React from 'react'
import {
  Box,
  Typography,
  Chip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

export default function ConsumptionOverTimeChart({ hourlyData = [] }) {
  // Aggregate statistics across the 24h dataset
  const totalGridKwh = hourlyData.reduce((sum, h) => sum + (h.gridKwh || 0), 0)
  const totalDieselKwh = hourlyData.reduce((sum, h) => sum + (h.dieselKwh || 0), 0)
  const totalSolarKwh = hourlyData.reduce((sum, h) => sum + (h.solarKwh || 0), 0)
  const totalKeroseneKwh = hourlyData.reduce((sum, h) => sum + (h.keroseneKwh || 0), 0)
  const totalSpend = hourlyData.reduce((sum, h) => sum + (h.cost || 0), 0)
  const totalKwh = totalGridKwh + totalDieselKwh + totalSolarKwh + totalKeroseneKwh

  const solarSharePct = totalKwh > 0 ? Math.round((totalSolarKwh / totalKwh) * 100) : 0
  const dieselSharePct = totalKwh > 0 ? Math.round((totalDieselKwh / totalKwh) * 100) : 0

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
            24-Hour Energy Draw by Source
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>
            Hourly consumption stacked area profile showing shift ramps, midday solar offset, and genset takeover spikes
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`Total Spend: ₹${Math.round(totalSpend).toLocaleString('en-IN')}`}
            size="small"
            sx={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.72rem',
              bgcolor: 'rgba(158, 93, 18, 0.1)',
              color: 'var(--color-amber)',
              border: '1px solid var(--color-line)',
            }}
          />
          <Chip
            label={`Solar Share: ${solarSharePct}%`}
            size="small"
            sx={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.72rem',
              bgcolor: 'rgba(30, 107, 57, 0.1)',
              color: 'var(--color-sage)',
              border: '1px solid var(--color-line)',
            }}
          />
        </Box>
      </Box>

      {/* Chart container */}
      <Box sx={{ height: 280, width: '100%', mt: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourlyData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-amber)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--color-amber)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorDiesel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-rust)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-rust)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-sage)" stopOpacity={0.75} />
                <stop offset="95%" stopColor="var(--color-sage)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorKerosene" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748B" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#64748B" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="2 2" stroke="var(--color-line)" />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
              unit=" kWh"
            />
            <Tooltip
              formatter={(val, name) => [`${val} kWh`, name]}
              labelFormatter={(label) => `Time: ${label}`}
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
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-ink-muted)', paddingTop: 8 }} />

            <Area
              type="monotone"
              dataKey="gridKwh"
              name="DISCOM Grid Power"
              stroke="var(--color-amber)"
              fillOpacity={1}
              fill="url(#colorGrid)"
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="solarKwh"
              name="Rooftop Solar PV"
              stroke="var(--color-sage)"
              fillOpacity={1}
              fill="url(#colorSolar)"
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="dieselKwh"
              name="Diesel Genset (Backup)"
              stroke="var(--color-rust)"
              fillOpacity={1}
              fill="url(#colorDiesel)"
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="keroseneKwh"
              name="Kerosene Process Heat"
              stroke="#64748B"
              fillOpacity={1}
              fill="url(#colorKerosene)"
              stackId="1"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      {/* Narrative Footer */}
      <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid var(--color-line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)', fontSize: '0.72rem' }}>
          Notice: Peak tariff window active 18:00 – 22:00. Note the solar bell curve mitigating daytime grid draw from 10:00 to 15:00.
        </Typography>
        <Typography variant="caption" sx={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-rust)', fontSize: '0.72rem' }}>
          Diesel reliance: {dieselSharePct}% of energy consumed today
        </Typography>
      </Box>
    </Box>
  )
}
