import { supabase } from '../../lib/supabaseClient'
export async function getOutputRecords(id) { const {data,error}=await supabase.from('output_records').select('*').eq('business_id',id).order('period_end',{ascending:false}); if(error)throw error; return data; }
export async function createOutputRecord(values) { if(!(values.output_quantity>0)||values.period_end<values.period_start)throw Error('Check production quantity and dates.'); const {data,error}=await supabase.from('output_records').insert(values).select().single(); if(error)throw error; return data; }
export async function deleteOutputRecord(id) { const {error}=await supabase.from('output_records').delete().eq('output_id',id); if(error)throw error; return true; }
