import { supabase } from '../../lib/supabaseClient'
export async function getEnergyEntries(id,{sourceType,startDate,endDate,page=0,pageSize=100}={}) {
 let q=supabase.from('energy_entries').select('*, machines!machine_id(machine_id,name,machine_type), bill_uploads!bill_upload_id(bill_upload_id,storage_path,ocr_confidence,ai_model_used,parsed_fields,extraction_mode)').eq('business_id',id).is('archived_at',null).order('period_end',{ascending:false}).order('entry_id').range(page*pageSize,(page+1)*pageSize-1);
 if(sourceType&&sourceType!=='all')q=q.eq('source_type',sourceType); if(startDate)q=q.gte('period_end',startDate); if(endDate)q=q.lte('period_start',endDate);
 const {data,error}=await q;if(error)throw error;return data;
}
export async function createEnergyEntry(values) { if(!(values.quantity>0)||!(values.cost_amount>=0)||values.period_end<values.period_start)throw Error('Check quantity, amount and dates.'); const {data,error}=await supabase.from('energy_entries').insert(values).select().single();if(error)throw error;return data; }
export async function deleteEnergyEntry(id) { const {error}=await supabase.from('energy_entries').update({archived_at:new Date().toISOString()}).eq('entry_id',id);if(error)throw error;return true; }
export async function createBillUpload(values) {const {data,error}=await supabase.from('bill_uploads').insert(values).select().single();if(error)throw error;return data;}
export async function updateBillUpload(id,values) {const {data,error}=await supabase.from('bill_uploads').update(values).eq('bill_upload_id',id).select().single();if(error)throw error;return data;}
export async function uploadBillPhoto(id,file) {
 const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};if(!extensions[file.type]||file.size>10485760)throw Error('Choose a JPG, PNG or WebP image under 10 MB.');
 const path=id+'/'+crypto.randomUUID()+'.'+extensions[file.type];const {error}=await supabase.storage.from('bill-uploads').upload(path,file);if(error)throw error;return path;
}
export async function getBillPhotoUrl(path) {const {data,error}=await supabase.storage.from('bill-uploads').createSignedUrl(path,300);if(error)throw error;return data.signedUrl;}
