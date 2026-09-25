import { supabase } from '../../lib/supabaseClient'
export async function getBusinessProfile(ownerId) {
 const {data,error}=await supabase.from('businesses').select('*').eq('owner_id',ownerId).maybeSingle(); if(error) throw error; return data;
}
export async function createBusinessProfile(values) {
 const {data,error}=await supabase.from('businesses').insert(values).select().single(); if(error) throw error; return data;
}
export async function updateBusinessProfile(id,values) {
 const {data,error}=await supabase.from('businesses').update(values).eq('business_id',id).select().single(); if(error) throw error; return data;
}
export async function getTariffReferences(state) {
 const {data,error}=await supabase.from('tariff_references').select('*').eq('state',state).order('effective_from',{ascending:false}); if(error) throw error; return data;
}
