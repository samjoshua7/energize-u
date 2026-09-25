import { supabase } from '../../lib/supabaseClient'

const STORAGE_KEY = 'energize_u_demo_recommendations'

const DEFAULT_SAMPLE_RECOMMENDATIONS = [
  {
    recommendation_id: 'rec_sample_1',
    business_id: 'b0000000-0000-0000-0000-000000000001',
    category: 'fuel_switch',
    title: 'Minimize Diesel Genset Runtime via Sanctioned Demand Optimization',
    description: 'Diesel power costs approx ₹29.7/kWh vs grid electricity at ~₹9.5/kWh. Your logged diesel fuel consumption indicates high reliance during peak shifts. Adding dedicated backup scheduling cuts generator fuel burn by 35%.',
    estimated_savings_amount: 18500,
    estimated_savings_pct: 24,
    basis: {
      diesel_cost_per_kwh_equiv: '₹29.70/kWh',
      grid_cost_per_kwh_approx: '₹9.50/kWh',
      diesel_spend_logged: '₹29,440.00',
      diesel_litres_logged: '320 L',
    },
    ai_model_used: 'meta-llama/llama-3.3-70b-instruct:free',
    status: 'open',
  },
  {
    recommendation_id: 'rec_sample_2',
    business_id: 'b0000000-0000-0000-0000-000000000001',
    category: 'solar_sizing',
    title: 'Right-Size a 35 kW Rooftop Solar PV Installation',
    description: 'Based on your monthly baseline of ~4,200 kWh, a 35 kW grid-tied solar system with net metering offsets ~38% of your daytime operational power requirement with payback in ~3.2 years.',
    estimated_savings_amount: 25000,
    estimated_savings_pct: 38,
    basis: {
      monthly_kwh_baseline: '4,200 kWh',
      recommended_capacity_kw: '35 kW',
      assumed_net_metering_delta: '₹6.50/kWh',
    },
    ai_model_used: 'meta-llama/llama-3.3-70b-instruct:free',
    status: 'open',
  },
  {
    recommendation_id: 'rec_sample_3',
    business_id: 'b0000000-0000-0000-0000-000000000001',
    category: 'load_shift',
    title: 'Stagger High-Draw Offset Press to Off-Peak TOD Tariff Windows',
    description: 'Shift plate exposure, pre-heating, and heavy print runs to off-peak slots (10:00 PM – 06:00 AM) to capture Time-of-Day (TOD) night discounts from MSEDCL.',
    estimated_savings_amount: 8500,
    estimated_savings_pct: 12,
    basis: {
      matched_sector_benchmark: 'Commercial Printing',
      benchmark_energy_rate: '0.045 kWh/sheet',
      benchmark_source: 'Bureau of Energy Efficiency (BEE) MSME Energy Audit Compendium',
    },
    ai_model_used: 'meta-llama/llama-3.3-70b-instruct:free',
    status: 'open',
  },
]

function getLocalRecs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_RECOMMENDATIONS))
      return DEFAULT_SAMPLE_RECOMMENDATIONS
    }
    return JSON.parse(raw)
  } catch {
    return DEFAULT_SAMPLE_RECOMMENDATIONS
  }
}

function saveLocalRecs(recs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recs))
  } catch (err) {
    console.warn('Local storage write failed:', err)
  }
}

export async function getRecommendations(businessId, status = 'open') {
  try {
    let query = supabase
      .from('recommendations')
      .select('*')
      .eq('business_id', businessId)
      .order('estimated_savings_amount', { ascending: false, nullsFirst: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      return data
    }
  } catch (err) {
    console.warn('Supabase getRecommendations fallback:', err.message)
  }

  let list = getLocalRecs()
  if (status && status !== 'all') {
    list = list.filter((r) => r.status === status)
  }
  return list
}

export async function updateRecommendationStatus(recommendationId, status) {
  try {
    const { data, error } = await supabase
      .from('recommendations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('recommendation_id', recommendationId)
      .select()
      .single()

    if (!error && data) {
      return data
    }
  } catch (err) {
    console.warn('Supabase updateRecommendationStatus fallback:', err.message)
  }

  const recs = getLocalRecs().map((r) =>
    r.recommendation_id === recommendationId ? { ...r, status, updated_at: new Date().toISOString() } : r
  )
  saveLocalRecs(recs)
  return recs.find((r) => r.recommendation_id === recommendationId) || { status }
}

export async function createRecommendation(recData) {
  const localRec = {
    recommendation_id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...recData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabase
      .from('recommendations')
      .insert([recData])
      .select()
      .single()

    if (!error && data) {
      return data
    }
  } catch (err) {
    console.warn('Supabase createRecommendation bypassed due to RLS/Demo:', err.message)
  }

  const recs = getLocalRecs()
  recs.unshift(localRec)
  saveLocalRecs(recs)
  return localRec
}
