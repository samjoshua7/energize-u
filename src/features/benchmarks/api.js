import { supabase } from '../../lib/supabaseClient'

export async function getMatchedBenchmark(businessId) {
  try {
    const { data, error } = await supabase.rpc('match_sector_benchmark', {
      p_business_id: businessId,
    })
    if (error) throw error
    return data
  } catch (err) {
    console.warn('RPC match_sector_benchmark fallback:', err)
    // Fallback directly to sector_benchmarks table query
    const { data: bData } = await supabase
      .from('sector_benchmarks')
      .select('*')
      .limit(1)
      .maybeSingle()
    return bData || null
  }
}

export async function getAllBenchmarks() {
  const { data, error } = await supabase
    .from('sector_benchmarks')
    .select('*')
    .order('sector', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getEmissionFactors() {
  const { data, error } = await supabase
    .from('co2_emission_factors')
    .select('*')

  if (error) throw error
  return data || []
}

export async function getBusinessEnergySummary(businessId) {
  try {
    const { data, error } = await supabase.rpc('get_business_energy_summary', {
      p_business_id: businessId,
    })
    if (error) throw error
    return data
  } catch (err) {
    console.warn('RPC get_business_energy_summary fallback:', err)
    return null
  }
}
