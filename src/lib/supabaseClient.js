import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[Energize U] Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.'
  )
}

// Fallback dummy URL and anon key to prevent createClient from crashing if env is not yet filled
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
