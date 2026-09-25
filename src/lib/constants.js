export const SOURCE_TYPES = {
  GRID: 'grid',
  DIESEL: 'diesel',
  PETROL: 'petrol',
  KEROSENE: 'kerosene',
  SOLAR: 'solar',
}

export const SOURCE_TYPE_LABELS = {
  grid: 'Grid Electricity',
  diesel: 'Diesel Genset',
  petrol: 'Petrol Genset/Pump',
  kerosene: 'Kerosene Burner',
  solar: 'Rooftop Solar',
}

export const SOURCE_UNITS = {
  grid: 'kWh',
  diesel: 'litre',
  petrol: 'litre',
  kerosene: 'litre',
  solar: 'kWh',
}

export const SOURCE_COLORS = {
  grid: '#3B82F6',     // Blue
  diesel: '#F59E0B',   // Amber
  petrol: '#EF4444',   // Red
  kerosene: '#8B5CF6', // Purple
  solar: '#10B981',    // Emerald
}

export const ENTRY_SOURCES = {
  OCR: 'ocr',
  MANUAL: 'manual',
}

export const OCR_STATUSES = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  MANUALLY_OVERRIDDEN: 'manually_overridden',
}

export const RECOMMENDATION_CATEGORIES = {
  LOAD_SHIFT: 'load_shift',
  FUEL_SWITCH: 'fuel_switch',
  SOLAR_SIZING: 'solar_sizing',
  MACHINE_EFFICIENCY: 'machine_efficiency',
  OTHER: 'other',
}

export const RECOMMENDATION_CATEGORY_LABELS = {
  load_shift: 'Peak Load Shifting',
  fuel_switch: 'Fuel Switching (Genset vs Grid)',
  solar_sizing: 'Right-Sized Solar & Storage',
  machine_efficiency: 'Machine Efficiency Tuning',
  other: 'Operational Optimization',
}

export const RECOMMENDATION_STATUSES = {
  OPEN: 'open',
  DISMISSED: 'dismissed',
  ACTIONED: 'actioned',
}

export const SECTORS = [
  { value: 'printing', label: 'Commercial Printing & Packaging' },
  { value: 'textile', label: 'Textiles & Garments / Weaving' },
  { value: 'metal_fabrication', label: 'Metal Fabrication & Machining' },
  { value: 'plastics_polymers', label: 'Plastics & Injection Molding' },
  { value: 'food_processing', label: 'Food Processing & Cold Storage' },
  { value: 'auto_components', label: 'Auto Ancillary & Components' },
  { value: 'other', label: 'Other Light Manufacturing' },
]

export const SHIFT_PATTERNS = [
  { value: 'single_shift', label: 'Single Shift (8–9 hrs/day)' },
  { value: 'double_shift', label: 'Double Shift (16 hrs/day)' },
  { value: '24x7', label: 'Continuous 24x7 Operations' },
]

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha',
  'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal'
]
