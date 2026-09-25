import { supabase } from '../../lib/supabaseClient'

export async function getBusinessProfile(ownerId) {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle()

    if (!error && data) return data
  } catch (err) {
    console.warn('Supabase getBusinessProfile notice:', err.message)
  }
  return null
}

export async function createBusinessProfile(businessData) {
  const localBiz = {
    business_id: businessData.business_id || `biz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...businessData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabase
      .from('businesses')
      .insert([businessData])
      .select()
      .maybeSingle()

    if (!error && data) {
      return data
    }
  } catch (err) {
    console.warn('Supabase createBusinessProfile fallback:', err.message)
  }

  return localBiz
}

export async function updateBusinessProfile(businessId, updates) {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .select()
      .maybeSingle()

    if (!error && data) {
      return data
    }
  } catch (err) {
    console.warn('Supabase updateBusinessProfile fallback:', err.message)
  }

  return { business_id: businessId, ...updates }
}
