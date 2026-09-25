/**
 * Energize U — Energy Scenario Simulator Engine
 * Generates mathematically consistent multi-fuel energy data, machinery inventory,
 * output records, and peer benchmark comparison metrics for Indian MSMEs.
 *
 * References published standards:
 * - Central Electricity Authority (CEA) India CO2 Baseline Database v19 (0.7100 kg CO2/kWh)
 * - Bureau of Energy Efficiency (BEE) MSME Energy Audit Compendium (Specific Energy Benchmarks)
 * - IPCC Stationary Combustion Guidelines (Diesel emission factor 2.68 kg CO2/litre)
 */

import { updateBusinessProfile } from '../businessProfile/api'
import { createMachine, getMachines, deleteMachine } from '../machines/api'
import { createEnergyEntry, getEnergyEntries, deleteEnergyEntry } from '../energyEntries/api'
import { createOutputRecord, getOutputRecords } from '../outputRecords/api'
import { createRecommendation } from '../recommendations/api'

// Benchmark references from Bureau of Energy Efficiency (BEE) & Ministry of MSME
export const SECTOR_BENCHMARKS = {
  printing: {
    energy_per_unit: 0.045, // kWh/sheet
    cost_per_unit: 0.38,    // ₹/sheet
    unit: 'sheets',
    defaultOutput: 55000,
    source: 'BEE MSME Energy Audit Compendium & All India Federation of Master Printers (AIFMP)',
    machines: [
      { name: '4-Color Offset Printing Press', machine_type: 'offset_press', primary_fuel: 'grid', power_rating_kw: 38, age_years: 5 },
      { name: 'Kirloskar 62.5 kVA Diesel Generator', machine_type: 'genset', primary_fuel: 'diesel', power_rating_kw: 50, age_years: 3 },
      { name: 'Automatic Paper Cutting Machine', machine_type: 'cutter', primary_fuel: 'grid', power_rating_kw: 15, age_years: 4 },
      { name: 'Screw Air Compressor (15 HP)', machine_type: 'compressor', primary_fuel: 'grid', power_rating_kw: 11, age_years: 2 },
    ],
  },
  textile: {
    energy_per_unit: 0.65, // kWh/meter
    cost_per_unit: 5.20,   // ₹/meter
    unit: 'meters',
    defaultOutput: 12000,
    source: 'BEE Small & Medium Enterprises Initiative — Surat & Bhiwandi Textile Clusters',
    machines: [
      { name: 'Rapier Weaving Looms (Set of 12)', machine_type: 'looms', primary_fuel: 'grid', power_rating_kw: 36, age_years: 4 },
      { name: '125 kVA Diesel Generator', machine_type: 'genset', primary_fuel: 'diesel', power_rating_kw: 100, age_years: 3 },
      { name: 'Sectional Warping Machine', machine_type: 'warping', primary_fuel: 'grid', power_rating_kw: 15, age_years: 5 },
      { name: 'Kerosene / Gas Steam Boiler', machine_type: 'boiler', primary_fuel: 'kerosene', power_rating_kw: 45, age_years: 6 },
    ],
  },
  metal_fabrication: {
    energy_per_unit: 0.85, // kWh/kg
    cost_per_unit: 6.80,   // ₹/kg
    unit: 'kg',
    defaultOutput: 4000,
    source: 'DC-MSME Energy Conservation Guidelines & Rajkot Engineering Cluster Benchmarks',
    machines: [
      { name: 'CNC Turning & Milling Center', machine_type: 'cnc', primary_fuel: 'grid', power_rating_kw: 25, age_years: 3 },
      { name: 'MIG / TIG Welding Stations', machine_type: 'welding', primary_fuel: 'grid', power_rating_kw: 18, age_years: 4 },
      { name: 'Hydraulic Press Brake (100 Ton)', machine_type: 'press', primary_fuel: 'grid', power_rating_kw: 35, age_years: 5 },
      { name: 'Diesel Genset 62.5 kVA', machine_type: 'genset', primary_fuel: 'diesel', power_rating_kw: 50, age_years: 2 },
    ],
  },
  food_processing: {
    energy_per_unit: 0.32, // kWh/pack
    cost_per_unit: 2.75,   // ₹/pack
    unit: 'packs',
    defaultOutput: 20000,
    source: 'BEE Agro & Food Processing Cluster Energy Audit Compendium',
    machines: [
      { name: 'Cold Storage Refrigeration Plant', machine_type: 'chiller', primary_fuel: 'grid', power_rating_kw: 32, age_years: 4 },
      { name: 'Continuous Packaging Line', machine_type: 'packaging', primary_fuel: 'grid', power_rating_kw: 14, age_years: 3 },
      { name: 'Industrial Steam Boiler', machine_type: 'boiler', primary_fuel: 'kerosene', power_rating_kw: 40, age_years: 5 },
      { name: 'Diesel Generator Backup (82.5 kVA)', machine_type: 'genset', primary_fuel: 'diesel', power_rating_kw: 66, age_years: 2 },
    ],
  },
}

/**
 * Calculates simulated metrics in real-time for live preview sliders
 */
export function calculateSimulationMetrics({
  sector = 'printing',
  monthlyOutput = 55000,
  gridTariff = 9.20,
  outagePercent = 15,
  dieselPrice = 94.00,
  solarKw = 0,
}) {
  const benchmark = SECTOR_BENCHMARKS[sector] || SECTOR_BENCHMARKS.printing
  const totalKwhNeeded = monthlyOutput * benchmark.energy_per_unit

  // Solar offset (4 kWh/kWp/day * 30 days = ~120 kWh/month per kW)
  const solarMonthlyKwh = Math.min(solarKw * 120, totalKwhNeeded * 0.7)
  const remainingKwh = Math.max(0, totalKwhNeeded - solarMonthlyKwh)

  // Energy split between Grid and Diesel Genset
  const dieselFraction = outagePercent / 100
  const gridFraction = 1 - dieselFraction

  const gridKwh = Math.round(remainingKwh * gridFraction)
  const gridCost = Math.round(gridKwh * gridTariff)

  const dieselKwh = remainingKwh * dieselFraction
  // Thermal-to-electric generator consumption ~0.30 litres per kWh (3.3 kWh/litre)
  const dieselLitres = Math.round(dieselKwh / 3.3)
  const dieselCost = Math.round(dieselLitres * dieselPrice)

  const totalCost = gridCost + dieselCost
  const totalKwhEquiv = Math.round(gridKwh + solarMonthlyKwh + (dieselLitres * 3.3))

  // Carbon emissions
  const gridCo2Kg = gridKwh * 0.7100 // CEA Baseline
  const dieselCo2Kg = dieselLitres * 2.6800 // BEE/IPCC
  const totalCo2Tonnes = parseFloat(((gridCo2Kg + dieselCo2Kg) / 1000).toFixed(2))

  // Specific cost and comparison vs benchmark
  const specificCost = parseFloat((totalCost / monthlyOutput).toFixed(4))
  const benchmarkCost = benchmark.cost_per_unit
  const costDeltaPercent = parseFloat((((specificCost - benchmarkCost) / benchmarkCost) * 100).toFixed(1))

  // Potential monthly savings
  // 1. Diesel to Grid savings delta (Diesel costs ~₹28.5/kWh vs Grid ~₹9.2/kWh)
  const dieselAvoidanceSavings = Math.round(dieselKwh * Math.max(0, (dieselPrice / 3.3) - gridTariff))
  // 2. Solar generation savings (displacing grid @ tariff)
  const solarSavings = Math.round(solarMonthlyKwh * gridTariff)
  const totalPotentialSavings = dieselAvoidanceSavings + solarSavings

  return {
    benchmark,
    totalKwhNeeded: Math.round(totalKwhNeeded),
    solarMonthlyKwh: Math.round(solarMonthlyKwh),
    gridKwh,
    gridCost,
    dieselLitres,
    dieselCost,
    totalCost,
    totalKwhEquiv,
    totalCo2Tonnes,
    specificCost,
    benchmarkCost,
    costDeltaPercent,
    dieselAvoidanceSavings,
    solarSavings,
    totalPotentialSavings,
  }
}

/**
 * Runs the full scenario simulation and populates database/localStorage with
 * consistent machines, energy entries, output records, and AI advisory recommendations.
 */
export async function executeSimulationAndPopulate({
  businessId,
  businessName,
  sector = 'printing',
  locationState = 'Maharashtra',
  shiftPattern = 'double_shift',
  monthlyOutput = 55000,
  gridTariff = 9.20,
  outagePercent = 15,
  dieselPrice = 94.00,
  solarKw = 0,
  monthCount = 3,
}) {
  if (!businessId) throw new Error('Valid Business ID required for simulation execution.')

  const metrics = calculateSimulationMetrics({
    sector,
    monthlyOutput,
    gridTariff,
    outagePercent,
    dieselPrice,
    solarKw,
  })

  // 1. Update Business Profile
  await updateBusinessProfile(businessId, {
    name: businessName || `Simulated ${sector.replace('_', ' ').toUpperCase()} Plant`,
    sector,
    location_state: locationState,
    shift_pattern: shiftPattern,
    has_solar: solarKw > 0,
  })

  // 2. Clear Existing Records for fresh simulation
  try {
    const existingEntries = await getEnergyEntries(businessId)
    for (const entry of existingEntries) {
      if (entry.entry_id) {
        await deleteEnergyEntry(entry.entry_id, businessId)
      }
    }

    const existingMachines = await getMachines(businessId)
    for (const mac of existingMachines) {
      if (mac.machine_id) {
        await deleteMachine(mac.machine_id, businessId)
      }
    }
  } catch (cleanErr) {
    console.warn('Simulation cleanup notice:', cleanErr)
  }

  // 3. Populate Machinery Inventory
  const sectorPreset = SECTOR_BENCHMARKS[sector] || SECTOR_BENCHMARKS.printing
  for (const m of sectorPreset.machines) {
    await createMachine({
      business_id: businessId,
      name: m.name,
      machine_type: m.machine_type,
      primary_fuel: m.primary_fuel,
      power_rating_kw: m.power_rating_kw,
      age_years: m.age_years,
    })
  }

  // 4. Generate Multi-Month Energy Ledger & Output Records
  const now = new Date()

  for (let i = monthCount - 1; i >= 0; i--) {
    const end = new Date(now.getFullYear(), now.getMonth() - i, 0) // Last day of month
    const start = new Date(now.getFullYear(), now.getMonth() - i - 1, 1) // First day of month

    const periodEnd = end.toISOString().split('T')[0]
    const periodStart = start.toISOString().split('T')[0]

    // Apply realistic month-to-month variance (±4%)
    const variance = 1 + ((Math.sin(i * 1.5) * 0.04))

    const simGridKwh = Math.round(metrics.gridKwh * variance)
    const simGridCost = Math.round(metrics.gridCost * variance)
    const simDieselLtr = Math.round(metrics.dieselLitres * variance)
    const simDieselCost = Math.round(metrics.dieselCost * variance)
    const simOutputQty = Math.round(monthlyOutput * variance)

    // Log Grid Bill
    await createEnergyEntry({
      business_id: businessId,
      source_type: 'grid',
      entry_source: 'ocr',
      period_start: periodStart,
      period_end: periodEnd,
      quantity: simGridKwh,
      quantity_unit: 'kWh',
      cost_amount: simGridCost,
      notes: `Simulated DISCOM bill (${simGridKwh} kWh @ ₹${gridTariff}/kWh)`,
    })

    // Log Diesel Purchase
    if (simDieselLtr > 0) {
      await createEnergyEntry({
        business_id: businessId,
        source_type: 'diesel',
        entry_source: 'manual',
        period_start: periodStart,
        period_end: periodEnd,
        quantity: simDieselLtr,
        quantity_unit: 'litre',
        cost_amount: simDieselCost,
        runtime_hours: Math.round((outagePercent / 100) * 160),
        notes: `Simulated fuel purchase for genset (${simDieselLtr} L @ ₹${dieselPrice}/L)`,
      })
    }

    // Log Solar generation if solar capacity exists
    if (metrics.solarMonthlyKwh > 0) {
      await createEnergyEntry({
        business_id: businessId,
        source_type: 'solar',
        entry_source: 'manual',
        period_start: periodStart,
        period_end: periodEnd,
        quantity: Math.round(metrics.solarMonthlyKwh * variance),
        quantity_unit: 'kWh',
        cost_amount: 0,
        notes: `Simulated rooftop solar generation (${solarKw} kW plant)`,
      })
    }

    // Log Production Output Record
    await createOutputRecord({
      business_id: businessId,
      period_start: periodStart,
      period_end: periodEnd,
      output_quantity: simOutputQty,
      output_unit: sectorPreset.unit,
      notes: `Simulated production output volume for ${periodEnd.slice(0, 7)}`,
    })
  }

  // 5. Generate Prioritized Scenario Recommendations
  const recsToSeed = [
    {
      business_id: businessId,
      title: outagePercent > 10
        ? `Reduce Diesel Genset Dependency (${outagePercent}% of runtime)`
        : 'Optimize Off-Peak Grid Tariffs with Shift Timing',
      category: 'fuel_switch',
      description: `Diesel generation currently costs you ₹${((dieselPrice / 3.3)).toFixed(1)}/kWh compared to ₹${gridTariff}/kWh on the grid. Negotiating a dedicated industrial express feeder or shifting heavy loads will save an estimated ₹${metrics.dieselAvoidanceSavings.toLocaleString('en-IN')}/mo.`,
      estimated_monthly_savings_inr: metrics.dieselAvoidanceSavings > 0 ? metrics.dieselAvoidanceSavings : 14500,
      estimated_co2_reduction_kg: Math.round(metrics.dieselLitres * 1.9),
      payback_period_months: 4.5,
      status: 'open',
    },
    {
      business_id: businessId,
      title: solarKw === 0
        ? `Install 25 kW Rooftop Solar PV System`
        : `Expand Solar Capacity from ${solarKw} kW to ${solarKw + 20} kW`,
      category: 'solar_sizing',
      description: `Based on your average daytime load of ${Math.round(metrics.gridKwh / 26 / 8)} kW, rooftop solar will offset grid consumption at zero operational cost, yielding ₹${(metrics.solarSavings || 22500).toLocaleString('en-IN')}/mo in net metering credit.`,
      estimated_monthly_savings_inr: metrics.solarSavings > 0 ? metrics.solarSavings : 23400,
      estimated_co2_reduction_kg: 2130,
      payback_period_months: 28.0,
      status: 'open',
    },
    {
      business_id: businessId,
      title: 'Upgrade Main Drive Motors to IE3 Premium Efficiency',
      category: 'machine_efficiency',
      description: `Your production machinery inventory has motors with average age of 4-5 years. Replacing older standard motors with IE3 rated motors reduces shaft power losses by 8–11%, cutting unit energy consumption.`,
      estimated_monthly_savings_inr: Math.round(metrics.totalCost * 0.08),
      estimated_co2_reduction_kg: Math.round(metrics.totalCo2Tonnes * 1000 * 0.08),
      payback_period_months: 14.0,
      status: 'open',
    },
  ]

  for (const rec of recsToSeed) {
    try {
      await createRecommendation(rec)
    } catch (recErr) {
      console.warn('Recommendation create notice:', recErr)
    }
  }

  return {
    success: true,
    metrics,
    recordsCreated: {
      months: monthCount,
      machinesCount: sectorPreset.machines.length,
      recommendationsCount: recsToSeed.length,
    },
  }
}
