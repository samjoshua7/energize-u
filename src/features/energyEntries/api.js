import { supabase } from '../../lib/supabaseClient'

const STORAGE_KEY = 'energize_u_demo_energy_entries'

function getLocalEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveLocalEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (err) {
    console.warn('Local storage write failed:', err)
  }
}

export async function getEnergyEntries(businessId, { sourceType, startDate, endDate } = {}) {
  try {
    let query = supabase
      .from('energy_entries')
      .select(`
        *,
        machines (
          machine_id,
          name,
          machine_type
        ),
        bill_uploads (
          bill_upload_id,
          storage_path,
          ocr_confidence,
          ai_model_used
        )
      `)
      .eq('business_id', businessId)
      .order('period_end', { ascending: false })

    if (sourceType && sourceType !== 'all') {
      query = query.eq('source_type', sourceType)
    }
    if (startDate) {
      query = query.gte('period_start', startDate)
    }
    if (endDate) {
      query = query.lte('period_end', endDate)
    }

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      return data
    }
  } catch (err) {
    console.warn('Supabase getEnergyEntries fallback to local storage:', err.message)
  }

  // Fallback to local storage for demo
  let list = getLocalEntries()
  if (sourceType && sourceType !== 'all') {
    list = list.filter((e) => e.source_type === sourceType)
  }
  return list
}

export async function createEnergyEntry(entryData) {
  const localEntry = {
    entry_id: `ent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...entryData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabase
      .from('energy_entries')
      .insert([entryData])
      .select()
      .single()

    if (!error && data) {
      return data
    }
  } catch (err) {
    console.warn('Supabase createEnergyEntry bypassed due to RLS/Demo:', err.message)
  }

  // Fallback: save locally
  const entries = getLocalEntries()
  entries.unshift(localEntry)
  saveLocalEntries(entries)
  return localEntry
}

export async function deleteEnergyEntry(entryId) {
  try {
    const { error } = await supabase
      .from('energy_entries')
      .delete()
      .eq('entry_id', entryId)

    if (!error) return true
  } catch (err) {
    console.warn('Supabase deleteEnergyEntry fallback:', err.message)
  }

  const entries = getLocalEntries().filter((e) => e.entry_id !== entryId)
  saveLocalEntries(entries)
  return true
}

export async function createBillUpload(uploadData) {
  const localUpload = {
    bill_upload_id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...uploadData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabase
      .from('bill_uploads')
      .insert([uploadData])
      .select()
      .single()

    if (!error && data) {
      return data
    }
  } catch (err) {
    console.warn('Supabase createBillUpload bypassed:', err.message)
  }

  return localUpload
}

export async function updateBillUpload(billUploadId, updates) {
  try {
    const { data, error } = await supabase
      .from('bill_uploads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('bill_upload_id', billUploadId)
      .select()
      .single()

    if (!error && data) {
      return data
    }
  } catch (err) {
    console.warn('Supabase updateBillUpload fallback:', err.message)
  }

  return { bill_upload_id: billUploadId, ...updates }
}
