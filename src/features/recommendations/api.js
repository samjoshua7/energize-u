import { supabase } from '../../lib/supabaseClient'
export async function getRecommendations(id,status='open') {let q=supabase.from('recommendations').select('*').eq('business_id',id).order('estimated_savings_amount',{ascending:false,nullsFirst:false});if(status!=='all')q=q.eq('status',status);const {data,error}=await q;if(error)throw error;return data;}
export async function updateRecommendationStatus(id,status) {const {data,error}=await supabase.from('recommendations').update({status}).eq('recommendation_id',id).select().single();if(error)throw error;return data;}
export async function createRecommendation(values) {const {data,error}=await supabase.from('recommendations').insert(values).select().single();if(error)throw error;return data;}
