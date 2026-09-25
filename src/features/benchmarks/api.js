import { supabase } from '../../lib/supabaseClient'
export async function getMatchedBenchmark(id) {const {data,error}=await supabase.rpc('match_sector_benchmark',{p_business_id:id});if(error)throw error;return data;}
export async function getAllBenchmarks() {const {data,error}=await supabase.from('sector_benchmarks').select('*').order('sector');if(error)throw error;return data;}
export async function getEmissionFactors() {const {data,error}=await supabase.from('co2_emission_factors').select('*');if(error)throw error;return data;}
export async function getBusinessEnergySummary(id) {const {data,error}=await supabase.rpc('get_business_energy_summary',{p_business_id:id});if(error)throw error;return data;}
export async function getPeriodReport(id,start,end) {const {data,error}=await supabase.rpc('get_energy_period_report',{p_business_id:id,p_start:start,p_end:end});if(error)throw error;return data;}
