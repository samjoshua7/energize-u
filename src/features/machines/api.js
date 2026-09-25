import { supabase } from '../../lib/supabaseClient'
export async function getMachines(id) { if(!id)return []; const {data,error}=await supabase.from('machines').select('*').eq('business_id',id).order('created_at'); if(error)throw error; return data; }
export async function createMachine(values) { const {data,error}=await supabase.from('machines').insert(values).select().single(); if(error)throw error; return data; }
export async function updateMachine(id,values) { const {data,error}=await supabase.from('machines').update(values).eq('machine_id',id).select().single(); if(error)throw error; return data; }
export async function deleteMachine(id) { const {error}=await supabase.from('machines').delete().eq('machine_id',id); if(error)throw error; return true; }
