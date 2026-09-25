import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import {
  DEFAULT_MACHINES,
  DEFAULT_INVENTORY,
  generateFullSimulatedDay,
  stepSimulationState,
} from './liveSimulationEngine'
import { createMachine, getMachines, deleteMachine } from '../machines/api'
import { createEnergyEntry, getEnergyEntries, deleteEnergyEntry } from '../energyEntries/api'
import { createOutputRecord } from '../outputRecords/api'
import { createRecommendation } from '../recommendations/api'

const SimulationContext = createContext(null)

const STORAGE_KEY = 'energize_u_live_simulation'

export function SimulationProvider({ children }) {
  const [simState, setSimState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.warn('Simulation storage load notice:', e)
    }
    return generateFullSimulatedDay()
  })

  const [syncing, setSyncing] = useState(false)
  const [syncSuccess, setSyncSuccess] = useState(false)

  // Interval reference for live ticking loop
  const timerRef = useRef(null)

  // Save to localStorage whenever state updates (debounced)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simState))
    } catch (err) {
      // quota safeguard
    }
  }, [simState])

  // Run the background simulation loop
  useEffect(() => {
    if (!simState.isRunning) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    // Interval fires every 1.5 seconds
    const intervalMs = 1500
    const stepMins = simState.speed || 5

    timerRef.current = setInterval(() => {
      setSimState((prev) => stepSimulationState(prev, stepMins))
    }, intervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [simState.isRunning, simState.speed])

  // Play / Pause
  const togglePlay = () => {
    setSimState((prev) => ({ ...prev, isRunning: !prev.isRunning }))
  }

  // Set Speed (1x, 5x, 30x)
  const setSpeed = (newSpeed) => {
    setSimState((prev) => ({ ...prev, speed: newSpeed }))
  }

  // Step manually by N minutes
  const stepManual = (mins = 15) => {
    setSimState((prev) => stepSimulationState(prev, mins))
  }

  // Fast-Forward Full Day
  const fastForwardDay = () => {
    const fullDay = generateFullSimulatedDay()
    setSimState(fullDay)
  }

  // Toggle Grid Outage on / off
  const toggleGridOutage = () => {
    setSimState((prev) => {
      const willBeOutage = !prev.gridOutageActive
      const timeFormatted = prev.formattedTime || '14:30'

      const newAlerts = [...prev.alerts]
      if (willBeOutage) {
        newAlerts.unshift({
          id: `alert-outage-${Date.now()}`,
          timestamp: timeFormatted,
          severity: 'warning',
          category: 'outage',
          title: 'Manual Grid Outage Triggered — ATS Switched to Genset',
          description: 'Factory power source switched from DISCOM LT Grid to 62.5 kVA Genset. Diesel consumption active.',
          resolved: false,
        })
      } else {
        newAlerts.unshift({
          id: `alert-grid-restore-${Date.now()}`,
          timestamp: timeFormatted,
          severity: 'info',
          category: 'outage',
          title: 'Grid Power Restored — Genset Standby',
          description: 'DISCOM grid power stable. Genset shut down and ATS returned to primary grid power.',
          resolved: true,
        })
      }

      return {
        ...prev,
        gridOutageActive: willBeOutage,
        alerts: newAlerts.slice(0, 25),
      }
    })
  }

  // Toggle Individual Machine Status
  const toggleMachine = (machineId) => {
    setSimState((prev) => {
      const updated = prev.machines.map((m) => {
        if (m.id === machineId) {
          const nextStatus = m.status === 'running' ? 'idle' : 'running'
          return {
            ...m,
            status: nextStatus,
            userToggledOff: nextStatus === 'idle',
          }
        }
        return m
      })
      return { ...prev, machines: updated }
    })
  }

  // Trigger / toggle machine anomaly (e.g. compressor air leak)
  const toggleAnomaly = (machineId) => {
    setSimState((prev) => {
      const updated = prev.machines.map((m) => {
        if (m.id === machineId) {
          const nextUnderperf = !m.isUnderperforming
          return {
            ...m,
            isUnderperforming: nextUnderperf,
            efficiency: nextUnderperf ? 0.74 : 0.96,
            anomalyReason: nextUnderperf ? 'Pneumatic line micro-leakage causing 26% excessive duty cycle' : '',
          }
        }
        return m
      })

      const target = prev.machines.find((m) => m.id === machineId)
      const newAlerts = [...prev.alerts]
      if (target && !target.isUnderperforming) {
        newAlerts.unshift({
          id: `alert-anomaly-${Date.now()}`,
          timestamp: prev.formattedTime || '14:35',
          severity: 'warning',
          category: 'efficiency',
          title: `${target.name} Efficiency Anomaly`,
          description: 'Energy draw surged 26% above baseline model. Recommended action: inspect compressed air couplings.',
          resolved: false,
        })
      }

      return {
        ...prev,
        machines: updated,
        alerts: newAlerts.slice(0, 25),
      }
    })
  }

  // Refuel Resource (Diesel or Kerosene)
  const refuel = (resourceType, litres = 150) => {
    setSimState((prev) => {
      if (resourceType === 'diesel') {
        const newStock = Math.min(prev.inventory.diesel.capacityLitres, prev.inventory.diesel.stockLitres + litres)
        return {
          ...prev,
          inventory: {
            ...prev.inventory,
            diesel: { ...prev.inventory.diesel, stockLitres: newStock },
          },
        }
      }
      if (resourceType === 'kerosene') {
        const newStock = Math.min(prev.inventory.kerosene.capacityLitres, prev.inventory.kerosene.stockLitres + litres)
        return {
          ...prev,
          inventory: {
            ...prev.inventory,
            kerosene: { ...prev.inventory.kerosene, stockLitres: newStock },
          },
        }
      }
      return prev
    })
  }

  // Resolve Alert
  const resolveAlert = (alertId) => {
    setSimState((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) => (a.id === alertId ? { ...a, resolved: true } : a)),
    }))
  }

  // Sync simulated state to Supabase database so all views in Energize U are populated
  const syncToDatabase = async (businessId) => {
    if (!businessId) return false
    setSyncing(true)
    setSyncSuccess(false)

    try {
      // 1. Clear previous records if needed
      try {
        const existingEntries = await getEnergyEntries(businessId)
        for (const e of existingEntries) {
          if (e.entry_id) await deleteEnergyEntry(e.entry_id, businessId)
        }
        const existingMachines = await getMachines(businessId)
        for (const m of existingMachines) {
          if (m.machine_id) await deleteMachine(m.machine_id, businessId)
        }
      } catch (cleanErr) {
        console.warn('Sync cleanup notice:', cleanErr)
      }

      // 2. Insert Simulated Machines
      for (const m of simState.machines) {
        await createMachine({
          business_id: businessId,
          name: m.name,
          machine_type: m.type,
          primary_fuel: m.primaryFuel === 'electric' ? 'grid' : m.primaryFuel,
          power_rating_kw: m.powerRatingKw,
          age_years: 3,
        })
      }

      // 3. Insert Aggregated Energy Entries
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

      // Grid Entry
      if (simState.inventory.grid.consumedTodayKwh > 0) {
        await createEnergyEntry({
          business_id: businessId,
          source_type: 'grid',
          entry_source: 'ocr',
          period_start: yesterday,
          period_end: today,
          quantity: Math.round(simState.inventory.grid.consumedTodayKwh),
          quantity_unit: 'kWh',
          cost_amount: Math.round(simState.inventory.grid.costToday),
          notes: 'DISCOM Industrial Billing (Simulated smart meter sync)',
        })
      }

      // Diesel Entry
      if (simState.inventory.diesel.consumedTodayLitres > 0) {
        await createEnergyEntry({
          business_id: businessId,
          source_type: 'diesel',
          entry_source: 'manual',
          period_start: yesterday,
          period_end: today,
          quantity: Math.round(simState.inventory.diesel.consumedTodayLitres),
          quantity_unit: 'litres',
          cost_amount: Math.round(simState.inventory.diesel.costToday),
          notes: '62.5 kVA Genset Fuel Purchase (IOCL Commercial Diesel)',
        })
      }

      // Solar Entry
      if (simState.inventory.solar.generatedTodayKwh > 0) {
        await createEnergyEntry({
          business_id: businessId,
          source_type: 'solar',
          entry_source: 'manual',
          period_start: yesterday,
          period_end: today,
          quantity: Math.round(simState.inventory.solar.generatedTodayKwh),
          quantity_unit: 'kWh',
          cost_amount: 0,
          notes: '25 kWp Rooftop Solar PV Inverter Generation',
        })
      }

      // Kerosene Entry
      if (simState.inventory.kerosene.consumedTodayLitres > 0) {
        await createEnergyEntry({
          business_id: businessId,
          source_type: 'kerosene',
          entry_source: 'manual',
          period_start: yesterday,
          period_end: today,
          quantity: Math.round(simState.inventory.kerosene.consumedTodayLitres),
          quantity_unit: 'litres',
          cost_amount: Math.round(simState.inventory.kerosene.costToday),
          notes: 'Thermal Process Lamination Fuel',
        })
      }

      // Output Record
      await createOutputRecord({
        business_id: businessId,
        record_date: today,
        output_quantity: 48500,
        output_unit: 'sheets',
        notes: 'Daily production run across 2 shifts',
      })

      // Generate realistic AI recommendations matching this plant
      await createRecommendation({
        business_id: businessId,
        title: 'Fix Compressed Air Line Micro-Leakage',
        category: 'process_optimization',
        description: 'Compressor active duty cycle is 24% higher than nominal benchmark due to pneumatic hose leaks.',
        estimated_savings_amount: 6800,
        estimated_savings_pct: 7.2,
        estimated_investment_amount: 3500,
        payback_period_months: 0.5,
        effort_level: 'Low',
        math_breakdown: '2.8 kW unnecessary idle draw × 14 operating hrs/day × 26 days/mo × ₹9.20/kWh = ₹9,372/month gross potential.',
      })

      await createRecommendation({
        business_id: businessId,
        title: 'Shift Hydraulic Paper Cutting out of Peak Tariff (18:00 - 22:00)',
        category: 'load_shifting',
        description: 'Run batch paper cutting during morning solar generation window (10:00 - 14:00) instead of evening peak window.',
        estimated_savings_amount: 4200,
        estimated_savings_pct: 4.8,
        estimated_investment_amount: 0,
        payback_period_months: 0,
        effort_level: 'Low',
        math_breakdown: '15 kW cutter × 2 hrs/day in peak × 25 days × (₹11.50 - ₹9.20 delta = ₹2.30/kWh) = ₹1,725 direct tariff delta + solar self-consumption.',
      })

      setSyncSuccess(true)
      return true
    } catch (err) {
      console.error('Error syncing simulation to Supabase:', err)
      return false
    } finally {
      setSyncing(false)
    }
  }

  return (
    <SimulationContext.Provider
      value={{
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
      }}
    >
      {children}
    </SimulationContext.Provider>
  )
}

export function useSimulation() {
  const context = useContext(SimulationContext)
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider')
  }
  return context
}
