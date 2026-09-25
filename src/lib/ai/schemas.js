/**
 * AI/OCR Schema definitions & response validators
 */

export const BILL_EXTRACTION_SCHEMA = {
  type: 'object',
  required: ['period_start', 'period_end', 'quantity', 'cost_amount'],
  properties: {
    period_start: { type: 'string', description: 'YYYY-MM-DD' },
    period_end: { type: 'string', description: 'YYYY-MM-DD' },
    quantity: { type: 'number', description: 'Units consumed in kWh' },
    quantity_unit: { type: 'string', enum: ['kWh'], default: 'kWh' },
    kva_load: { type: 'number', nullable: true, description: 'Sanctioned or recorded KVA / KW load' },
    cost_amount: { type: 'number', description: 'Total bill amount in INR' },
    confidence: { type: 'number', nullable: true, description: 'Confidence score between 0.0 and 1.0' },
    consumer_number: { type: 'string', nullable: true },
    discom_name: { type: 'string', nullable: true },
  },
}

export function validateBillExtraction(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid response format: not an object' }
  }

  const { period_start, period_end, quantity, cost_amount } = data

  if (!period_start || isNaN(Date.parse(period_start))) {
    return { valid: false, error: 'Missing or invalid billing period start date' }
  }

  if (!period_end || isNaN(Date.parse(period_end))) {
    return { valid: false, error: 'Missing or invalid billing period end date' }
  }

  const parsedQty = parseFloat(quantity)
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return { valid: false, error: 'Missing or non-positive energy quantity (kWh)' }
  }

  const parsedCost = parseFloat(cost_amount)
  if (isNaN(parsedCost) || parsedCost < 0) {
    return { valid: false, error: 'Missing or negative bill cost amount' }
  }

  return {
    valid: true,
    data: {
      period_start: period_start.slice(0, 10),
      period_end: period_end.slice(0, 10),
      quantity: Number(parsedQty.toFixed(3)),
      quantity_unit: 'kWh',
      kva_load: data.kva_load ? Number(parseFloat(data.kva_load).toFixed(2)) : null,
      cost_amount: Number(parsedCost.toFixed(2)),
      confidence: data.confidence ? Math.min(1, Math.max(0, parseFloat(data.confidence))) : 0.85,
      consumer_number: data.consumer_number || null,
      discom_name: data.discom_name || null,
    },
  }
}

export function validateRecommendationOutput(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Recommendation output must be an object' }
  }

  if (!data.title || typeof data.title !== 'string') {
    return { valid: false, error: 'Recommendation missing required title' }
  }

  if (!data.description || typeof data.description !== 'string') {
    return { valid: false, error: 'Recommendation missing required description' }
  }

  const validCategories = ['load_shift', 'fuel_switch', 'solar_sizing', 'machine_efficiency', 'other']
  const category = validCategories.includes(data.category) ? data.category : 'other'

  if (!data.basis || typeof data.basis !== 'object') {
    return { valid: false, error: 'Data provenance violation: recommendation missing basis citations' }
  }

  return {
    valid: true,
    data: {
      title: data.title.trim(),
      category,
      description: data.description.trim(),
      estimated_savings_amount: data.estimated_savings_amount ? Number(parseFloat(data.estimated_savings_amount).toFixed(2)) : null,
      estimated_savings_pct: data.estimated_savings_pct ? Number(parseFloat(data.estimated_savings_pct).toFixed(2)) : null,
      basis: data.basis,
    },
  }
}
