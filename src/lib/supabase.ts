import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string
export const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn('[Yukinon] Supabase credentials not set. Community presets will be unavailable.')
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as any)

