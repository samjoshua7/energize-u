import { supabase } from '../../lib/supabaseClient'

const STORAGE_KEY = 'energize_u_demo_recommendations'

function getLocalRecs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
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
