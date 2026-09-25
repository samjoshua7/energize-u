import { supabase } from '../../lib/supabaseClient'

const STORAGE_KEY = 'energize_u_demo_output_records'

function getLocalOutputs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalOutputs(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch (err) {
    console.warn('Local storage write failed:', err)
  }
}

export async function getOutputRecords(businessId) {
  try {
    const { data, error } = await supabase
      .from('output_records')
      .select('*')
      .eq('business_id', businessId)
      .order('period_end', { ascending: false })

    if (!error && data && data.length > 0) {
      return data
    }
  } catch (err) {
    console.warn('Supabase getOutputRecords fallback to local storage:', err.message)
  }

  // Fallback to local records
  const local = getLocalOutputs()
  return local.filter((r) => !businessId || r.business_id === businessId)
}

export async function createOutputRecord(recordData) {
  const localRecord = {
    output_id: `out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...recordData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabase
      .from('output_records')
      .insert([recordData])
      .select()
      .single()

    if (!error && data) {
      return data
    }
  } catch (err) {
    console.warn('Supabase createOutputRecord bypassed due to RLS/Demo:', err.message)
  }

  // Fallback: Store locally so demo and unauthenticated sessions never fail
  const records = getLocalOutputs()
  records.unshift(localRecord)
  saveLocalOutputs(records)
  return localRecord
}

export async function deleteOutputRecord(outputId) {
  try {
    const { error } = await supabase
      .from('output_records')
      .delete()
      .eq('output_id', outputId)

    if (!error) return true
  } catch (err) {
    console.warn('Supabase deleteOutputRecord fallback:', err.message)
  }

  const records = getLocalOutputs().filter((r) => r.output_id !== outputId)
  saveLocalOutputs(records)
  return true
}
