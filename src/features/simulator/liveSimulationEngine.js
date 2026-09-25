/**
 * Energize U — Real-Time Connected Simulation Engine
 * Simulates a realistic Indian MSME industrial facility (Printing, Textile, Metal Fabrication)
 * with real-time machine operations, resource pools (Grid, Diesel, Solar, Kerosene),
 * dynamic shift patterns, time-of-use tariffs, grid outage triggers, and anomaly detection.
 */

// Initial Machines definition matching realistic industrial equipment
export const DEFAULT_MACHINES = [
  {
    id: 'mac-1',
    name: '4-Color Offset Printing Press #1',
    type: 'offset_press',
    powerRatingKw: 38,
    primaryFuel: 'electric',
    backupFuel: 'diesel',
    status: 'running', // 'running' | 'idle' | 'off'
    shiftSchedule: { startHour: 8, endHour: 22 }, // Two shifts: 08:00 to 22:00
    nominalLoadFactor: 0.82,
    efficiency: 0.96, // 96%
    baselineKw: 31.2,
    isUnderperforming: false,
    anomalyReason: '',
    category: 'Production',
  },
  {
    id: 'mac-2',
    name: 'Automatic Hydraulic Paper Cutter',
    type: 'cutter',
    powerRatingKw: 15,
    primaryFuel: 'electric',
    backupFuel: 'diesel',
    status: 'running',
    shiftSchedule: { startHour: 9, endHour: 21 },
    nominalLoadFactor: 0.65,
    efficiency: 0.95,
    baselineKw: 9.8,
    isUnderperforming: false,
    anomalyReason: '',
    category: 'Finishing',
  },
  {
    id: 'mac-3',
    name: 'Industrial UV Dryer & Curing Tunnel',
    type: 'dryer',
    powerRatingKw: 24,
    primaryFuel: 'electric',
    backupFuel: 'diesel',
    status: 'running',
    shiftSchedule: { startHour: 8.5, endHour: 20.5 },
    nominalLoadFactor: 0.88,
    efficiency: 0.93,
    baselineKw: 21.1,
    isUnderperforming: false,
    anomalyReason: '',
    category: 'Curing',
  },
  {
    id: 'mac-4',
    name: 'Rotary Screw Air Compressor (15 HP)',
    type: 'compressor',
    powerRatingKw: 11,
    primaryFuel: 'electric',
    backupFuel: 'diesel',
    status: 'running',
    shiftSchedule: { startHour: 0, endHour: 24 }, // Continuous 24/7 duty cycle
    nominalLoadFactor: 0.75,
    efficiency: 0.77, // Underperforming due to air leakage
    baselineKw: 8.25,
    isUnderperforming: true,
    anomalyReason: 'Pneumatic line micro-leakage causing 24% excessive duty cycle',
    category: 'Utilities',
  },
  {
    id: 'mac-5',
    name: 'Kirloskar 62.5 kVA Diesel Generator',
    type: 'genset',
    powerRatingKw: 50,
    primaryFuel: 'diesel',
    backupFuel: null,
    status: 'standby', // Runs only when grid is in outage
    shiftSchedule: { startHour: 0, endHour: 24 },
    nominalLoadFactor: 0.80,
    efficiency: 0.92,
    baselineKw: 40.0,
    isUnderperforming: false,
    fuelBurnLtrPerKwh: 0.29, // ~3.45 kWh per litre
    category: 'Backup Power',
  },
  {
    id: 'mac-6',
    name: 'Thermal Lamination Burner Unit',
    type: 'burner',
    powerRatingKw: 18, // thermal equivalent kW
    primaryFuel: 'kerosene',
    backupFuel: null,
    status: 'running',
    shiftSchedule: { startHour: 9, endHour: 18 },
    nominalLoadFactor: 0.70,
    efficiency: 0.90,
    baselineKw: 12.6,
    isUnderperforming: false,
    fuelBurnLtrPerHour: 2.6,
    category: 'Process Heat',
  },
]

// Default resource pool inventory
export const DEFAULT_INVENTORY = {
  grid: {
    available: true,
    normalTariff: 9.20, // ₹9.20 / kWh standard industrial tariff
    peakTariff: 11.50,   // ₹11.50 / kWh peak TOU tariff (18:00 - 22:00)
    consumedTodayKwh: 0,
    costToday: 0,
  },
  diesel: {
    stockLitres: 385,
    capacityLitres: 500,
    pricePerLitre: 94.00,
    consumedTodayLitres: 0,
    costToday: 0,
    minThresholdLitres: 75, // 15% alert threshold
  },
  kerosene: {
    stockLitres: 140,
    capacityLitres: 200,
    pricePerLitre: 62.00,
    consumedTodayLitres: 0,
    costToday: 0,
    minThresholdLitres: 30,
  },
  solar: {
    installedKw: 25,
    generatedTodayKwh: 0,
    currentOutputKw: 0,
    savingsToday: 0,
  },
}

/**
 * Calculates instantaneous solar output based on hour of day (bell curve)
 * Peak sunshine around 12:30 PM (12.5 hrs), sunrise ~06:30, sunset ~18:30
 */
export function calculateSolarOutputKw(hourOfDay, installedKw = 25) {
  if (hourOfDay < 6.5 || hourOfDay > 18.5) return 0
  const peakHour = 12.5
  const spread = 3.2
  const bell = Math.exp(-Math.pow(hourOfDay - peakHour, 2) / (2 * Math.pow(spread, 2)))
  return parseFloat((installedKw * bell * 0.92).toFixed(2))
}

/**
 * Checks if current simulated hour is in DISCOM Time-Of-Use (TOU) peak tariff window (18:00 to 22:00)
 */
export function isPeakTariffWindow(hourOfDay) {
  return hourOfDay >= 18 && hourOfDay < 22
}

/**
 * Steps the simulation forward by simulatedMinutes (default 5 mins)
 */
export function stepSimulationState(prevState, simulatedMinutes = 5) {
  const currentTotalMins = prevState.timeMinutes + simulatedMinutes
  const normalizedMins = currentTotalMins % 1440 // wrap around 24 hours
  const hourOfDay = normalizedMins / 60
  const hoursFraction = simulatedMinutes / 60

  const isPeak = isPeakTariffWindow(hourOfDay)
  const isGridOutage = prevState.gridOutageActive
  const solarKw = calculateSolarOutputKw(hourOfDay, prevState.inventory.solar.installedKw)
  const solarKwhStep = solarKw * hoursFraction

  let stepGridKwh = 0
  let stepDieselLitres = 0
  let stepKeroseneLitres = 0
  let stepCost = 0

  const updatedEvents = [...prevState.events]
  const updatedAlerts = [...prevState.alerts]

  // Update Machines & calculate consumption
  const updatedMachines = prevState.machines.map((machine) => {
    // Check if machine is scheduled to run
    let shouldRun = false
    if (machine.status === 'off' && machine.userToggledOff) {
      shouldRun = false
    } else {
      const { startHour, endHour } = machine.shiftSchedule
      if (startHour <= endHour) {
        shouldRun = hourOfDay >= startHour && hourOfDay < endHour
      } else {
        // Overnight shift (e.g. 22:00 to 06:00)
        shouldRun = hourOfDay >= startHour || hourOfDay < endHour
      }
    }

    if (machine.type === 'genset') {
      shouldRun = isGridOutage
    }

    const currentStatus = shouldRun ? 'running' : 'idle'

    let drawKw = 0
    let drawLitres = 0
    let costStep = 0
    let activeFuel = machine.primaryFuel

    if (currentStatus === 'running') {
      // Load variation (nominal load * efficiency factor + slight realistic industrial vibration ±3%)
      const loadJitter = 1 + (Math.sin(normalizedMins * 0.05 + machine.powerRatingKw) * 0.03)
      const effectiveLoad = machine.powerRatingKw * machine.nominalLoadFactor * loadJitter
      const effPenalty = machine.isUnderperforming ? (1 / Math.max(0.6, machine.efficiency)) : 1
      drawKw = parseFloat((effectiveLoad * effPenalty).toFixed(2))

      if (machine.primaryFuel === 'electric') {
        if (isGridOutage) {
          // Automatic switch to diesel genset
          activeFuel = 'diesel'
          const ltrPerKwh = 0.29
          drawLitres = parseFloat((drawKw * ltrPerKwh * hoursFraction).toFixed(3))
          stepDieselLitres += drawLitres
          costStep = drawLitres * prevState.inventory.diesel.pricePerLitre
        } else {
          // Electric grid power
          activeFuel = 'electric'
          const gridKwh = drawKw * hoursFraction
          stepGridKwh += gridKwh
          const tariff = isPeak ? prevState.inventory.grid.peakTariff : prevState.inventory.grid.normalTariff
          costStep = gridKwh * tariff
        }
      } else if (machine.primaryFuel === 'diesel' && machine.type !== 'genset') {
        drawLitres = parseFloat((drawKw * (machine.fuelBurnLtrPerKwh || 0.28) * hoursFraction).toFixed(3))
        stepDieselLitres += drawLitres
        costStep = drawLitres * prevState.inventory.diesel.pricePerLitre
      } else if (machine.primaryFuel === 'kerosene') {
        drawLitres = parseFloat(((machine.fuelBurnLtrPerHour || 2.5) * hoursFraction).toFixed(3))
        stepKeroseneLitres += drawLitres
        costStep = drawLitres * prevState.inventory.kerosene.pricePerLitre
      }
    }

    stepCost += costStep

    // Log consumption event periodically (every 15 simulated mins or during anomaly/outage)
    if (currentStatus === 'running' && (normalizedMins % 15 === 0 || isGridOutage)) {
      const timeStr = `${String(Math.floor(hourOfDay)).padStart(2, '0')}:${String(Math.floor(normalizedMins % 60)).padStart(2, '0')}`
      updatedEvents.unshift({
        id: `evt-${Date.now()}-${machine.id}`,
        timeString: timeStr,
        minute: normalizedMins,
        machineId: machine.id,
        machineName: machine.name,
        resourceType: activeFuel,
        amount: drawLitres > 0 ? drawLitres : parseFloat((drawKw * hoursFraction).toFixed(2)),
        unit: drawLitres > 0 ? 'L' : 'kWh',
        cost: parseFloat(costStep.toFixed(2)),
        isOutage: isGridOutage,
        isUnderperforming: machine.isUnderperforming,
      })
    }

    return {
      ...machine,
      status: currentStatus,
      currentDrawKw: currentStatus === 'running' ? drawKw : 0,
      activeFuel,
      costPerHour: currentStatus === 'running' ? (costStep / hoursFraction) : 0,
    }
  })

  // Solar offset on electricity: solar offsets grid draw directly
  const netGridKwh = Math.max(0, stepGridKwh - solarKwhStep)
  const solarSavingsStep = Math.min(stepGridKwh, solarKwhStep) * (isPeak ? prevState.inventory.grid.peakTariff : prevState.inventory.grid.normalTariff)

  // Update Inventory Stocks
  const updatedDieselStock = Math.max(0, prevState.inventory.diesel.stockLitres - stepDieselLitres)
  const updatedKeroseneStock = Math.max(0, prevState.inventory.kerosene.stockLitres - stepKeroseneLitres)

  // Check and push alerts
  const timeFormatted = `${String(Math.floor(hourOfDay)).padStart(2, '0')}:${String(Math.floor(normalizedMins % 60)).padStart(2, '0')}`

  // 1. Diesel Stock Alert (< 15%)
  if (updatedDieselStock < prevState.inventory.diesel.minThresholdLitres && prevState.inventory.diesel.stockLitres >= prevState.inventory.diesel.minThresholdLitres) {
    updatedAlerts.unshift({
      id: `alert-diesel-low-${Date.now()}`,
      timestamp: timeFormatted,
      severity: 'critical',
      category: 'stock',
      title: 'Low Diesel Fuel Stock',
      description: `Diesel reserve has dropped to ${Math.round(updatedDieselStock)} L (${Math.round((updatedDieselStock / prevState.inventory.diesel.capacityLitres) * 100)}%). Order fuel replenishment immediately to prevent genset trip.`,
      resolved: false,
    })
  }

  // 2. Grid Outage alert
  if (isGridOutage && !prevState.gridOutageActive) {
    updatedAlerts.unshift({
      id: `alert-outage-start-${Date.now()}`,
      timestamp: timeFormatted,
      severity: 'warning',
      category: 'outage',
      title: 'Grid Power Failure — Genset ATS Engaged',
      description: 'DISCOM grid outage detected. Automatic transfer switch engaged Kirloskar 62.5 kVA genset. Operational energy cost running ~3× higher.',
      resolved: false,
    })
  }

  // Cap event history to 50 items to keep memory lean
  const trimmedEvents = updatedEvents.slice(0, 50)
  const trimmedAlerts = updatedAlerts.slice(0, 20)

  // Update hourly chart history (24 slots: 0 to 23)
  const currentHourIndex = Math.floor(hourOfDay)
  const updatedHourly = [...prevState.hourlyHistory]
  if (updatedHourly[currentHourIndex]) {
    const prevH = updatedHourly[currentHourIndex]
    updatedHourly[currentHourIndex] = {
      ...prevH,
      gridKwh: parseFloat((prevH.gridKwh + netGridKwh).toFixed(2)),
      dieselKwh: parseFloat((prevH.dieselKwh + (stepDieselLitres * 3.45)).toFixed(2)),
      solarKwh: parseFloat((prevH.solarKwh + solarKwhStep).toFixed(2)),
      keroseneKwh: parseFloat((prevH.keroseneKwh + (stepKeroseneLitres * 2.8)).toFixed(2)),
      cost: parseFloat((prevH.cost + stepCost).toFixed(2)),
      activeMachines: updatedMachines.filter((m) => m.status === 'running').length,
      isOutage: isGridOutage,
    }
  }

  return {
    ...prevState,
    timeMinutes: normalizedMins,
    formattedTime: timeFormatted,
    machines: updatedMachines,
    events: trimmedEvents,
    alerts: trimmedAlerts,
    hourlyHistory: updatedHourly,
    inventory: {
      grid: {
        ...prevState.inventory.grid,
        available: !isGridOutage,
        isPeakNow: isPeak,
        consumedTodayKwh: parseFloat((prevState.inventory.grid.consumedTodayKwh + netGridKwh).toFixed(2)),
        costToday: parseFloat((prevState.inventory.grid.costToday + (netGridKwh * (isPeak ? prevState.inventory.grid.peakTariff : prevState.inventory.grid.normalTariff))).toFixed(2)),
      },
      diesel: {
        ...prevState.inventory.diesel,
        stockLitres: parseFloat(updatedDieselStock.toFixed(2)),
        consumedTodayLitres: parseFloat((prevState.inventory.diesel.consumedTodayLitres + stepDieselLitres).toFixed(2)),
        costToday: parseFloat((prevState.inventory.diesel.costToday + (stepDieselLitres * prevState.inventory.diesel.pricePerLitre)).toFixed(2)),
      },
      kerosene: {
        ...prevState.inventory.kerosene,
        stockLitres: parseFloat(updatedKeroseneStock.toFixed(2)),
        consumedTodayLitres: parseFloat((prevState.inventory.kerosene.consumedTodayLitres + stepKeroseneLitres).toFixed(2)),
        costToday: parseFloat((prevState.inventory.kerosene.costToday + (stepKeroseneLitres * prevState.inventory.kerosene.pricePerLitre)).toFixed(2)),
      },
      solar: {
        ...prevState.inventory.solar,
        currentOutputKw: solarKw,
        generatedTodayKwh: parseFloat((prevState.inventory.solar.generatedTodayKwh + solarKwhStep).toFixed(2)),
        savingsToday: parseFloat((prevState.inventory.solar.savingsToday + solarSavingsStep).toFixed(2)),
      },
    },
  }
}

/**
 * Initializes a 24-hour realistic baseline day of data for instant demo fast-forward
 */
export function generateFullSimulatedDay() {
  const hourly = []
  let gridTotalKwh = 0
  let dieselTotalLitres = 0
  let solarTotalKwh = 0
  let keroseneTotalLitres = 0
  let totalSpend = 0

  for (let h = 0; h < 24; h++) {
    const isPeak = isPeakTariffWindow(h)
    const isOutageHour = h >= 14 && h < 16 // Simulated afternoon 2-hour grid cut (14:00 - 16:00)
    const solarKw = calculateSolarOutputKw(h + 0.5, 25)

    // Machinery active count based on shifts
    let activeKw = 0
    if (h >= 8 && h < 22) {
      activeKw = 72 + (Math.sin(h * 0.8) * 8) // Full production shift: Press, Cutter, Dryer, Compressor
    } else if (h >= 6 && h < 8) {
      activeKw = 28 // Shift warmup: Compressor + lighting + prep
    } else {
      activeKw = 11 // Night standby: Compressor cycling
    }

    let gridKwh = 0
    let dieselLitres = 0
    let keroseneLitres = 0
    let hourCost = 0

    if (isOutageHour) {
      // 100% on Genset
      dieselLitres = parseFloat((activeKw * 0.29).toFixed(1))
      hourCost = dieselLitres * 94.00
      gridKwh = 0
    } else {
      // Grid with solar offset
      const netKwh = Math.max(0, activeKw - solarKw)
      gridKwh = parseFloat(netKwh.toFixed(1))
      hourCost = gridKwh * (isPeak ? 11.50 : 9.20)
    }

    if (h >= 9 && h < 18) {
      keroseneLitres = 2.6
      hourCost += keroseneLitres * 62.00
    }

    gridTotalKwh += gridKwh
    dieselTotalLitres += dieselLitres
    solarTotalKwh += solarKw
    keroseneTotalLitres += keroseneLitres
    totalSpend += hourCost

    hourly.push({
      hour: `${String(h).padStart(2, '0')}:00`,
      gridKwh: parseFloat(gridKwh.toFixed(1)),
      dieselKwh: parseFloat((dieselLitres * 3.45).toFixed(1)),
      dieselLitres: parseFloat(dieselLitres.toFixed(1)),
      solarKwh: parseFloat(solarKw.toFixed(1)),
      keroseneKwh: parseFloat((keroseneLitres * 2.8).toFixed(1)),
      cost: Math.round(hourCost),
      activeMachines: h >= 8 && h < 22 ? 5 : h >= 6 ? 2 : 1,
      isOutage: isOutageHour,
    })
  }

  const initialAlerts = [
    {
      id: 'alert-1',
      timestamp: '14:02',
      severity: 'warning',
      category: 'outage',
      title: 'Grid Power Interruption (14:00 – 16:00)',
      description: 'Automatic Transfer Switch routed factory loads to 62.5 kVA Genset. 48.2 L diesel consumed (~₹4,530).',
      resolved: true,
    },
    {
      id: 'alert-2',
      timestamp: '11:45',
      severity: 'warning',
      category: 'efficiency',
      title: 'Screw Compressor Efficiency Drop',
      description: 'Compressor active draw 11.2 kW vs baseline 8.25 kW (26% efficiency leakage). Probable pneumatic air leak.',
      resolved: false,
    },
    {
      id: 'alert-3',
      timestamp: '18:00',
      severity: 'info',
      category: 'tariff',
      title: 'Peak TOU Tariff Window Active (18:00 – 22:00)',
      description: 'DISCOM tariff elevated to ₹11.50/kWh (+25%). Non-critical finishing operations shifted to off-peak.',
      resolved: false,
    },
  ]

  const initialEvents = [
    {
      id: 'evt-init-1',
      timeString: '15:45',
      minute: 945,
      machineId: 'mac-1',
      machineName: '4-Color Offset Press #1',
      resourceType: 'diesel',
      amount: 4.8,
      unit: 'L',
      cost: 451.20,
      isOutage: true,
      isUnderperforming: false,
    },
    {
      id: 'evt-init-2',
      timeString: '15:30',
      minute: 930,
      machineId: 'mac-4',
      machineName: 'Rotary Screw Air Compressor',
      resourceType: 'diesel',
      amount: 1.4,
      unit: 'L',
      cost: 131.60,
      isOutage: true,
      isUnderperforming: true,
    },
    {
      id: 'evt-init-3',
      timeString: '12:15',
      minute: 735,
      machineId: 'mac-3',
      machineName: 'UV Dryer & Curing Tunnel',
      resourceType: 'grid',
      amount: 5.25,
      unit: 'kWh',
      cost: 48.30,
      isOutage: false,
      isUnderperforming: false,
    },
    {
      id: 'evt-init-4',
      timeString: '11:00',
      minute: 660,
      machineId: 'mac-6',
      machineName: 'Thermal Lamination Burner Unit',
      resourceType: 'kerosene',
      amount: 2.6,
      unit: 'L',
      cost: 161.20,
      isOutage: false,
      isUnderperforming: false,
    },
  ]

  return {
    timeMinutes: 14 * 60 + 35, // 14:35 (afternoon active state)
    formattedTime: '14:35',
    isRunning: true,
    speed: 5, // 5x speed
    gridOutageActive: false,
    machines: DEFAULT_MACHINES,
    hourlyHistory: hourly,
    events: initialEvents,
    alerts: initialAlerts,
    inventory: {
      grid: {
        available: true,
        normalTariff: 9.20,
        peakTariff: 11.50,
        isPeakNow: false,
        consumedTodayKwh: parseFloat(gridTotalKwh.toFixed(1)),
        costToday: Math.round(gridTotalKwh * 9.20),
      },
      diesel: {
        stockLitres: 342, // started at 390 - 48L consumed
        capacityLitres: 500,
        pricePerLitre: 94.00,
        consumedTodayLitres: parseFloat(dieselTotalLitres.toFixed(1)),
        costToday: Math.round(dieselTotalLitres * 94.00),
        minThresholdLitres: 75,
      },
      kerosene: {
        stockLitres: 122,
        capacityLitres: 200,
        pricePerLitre: 62.00,
        consumedTodayLitres: parseFloat(keroseneTotalLitres.toFixed(1)),
        costToday: Math.round(keroseneTotalLitres * 62.00),
        minThresholdLitres: 30,
      },
      solar: {
        installedKw: 25,
        generatedTodayKwh: parseFloat(solarTotalKwh.toFixed(1)),
        currentOutputKw: 18.5,
        savingsToday: Math.round(solarTotalKwh * 9.20),
      },
    },
  }
}
