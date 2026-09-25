import { supabase } from '../../lib/supabaseClient'

export async function getBusinessProfile(ownerId) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createBusinessProfile(businessData) {
  const { data, error } = await supabase
    .from('businesses')
    .insert([businessData])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBusinessProfile(businessId, updates) {
  const { data, error } = await supabase
    .from('businesses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('business_id', businessId)
    .select()
    .single()

  if (error) throw error
  return data
}
