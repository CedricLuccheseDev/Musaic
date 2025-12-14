import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/* --- Singleton --- */
let supabaseClient: SupabaseClient | null = null

export function useSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key = config.public.supabaseAnonKey

  if (!url || !key) {
    return null
  }

  supabaseClient = createClient(url, key)
  return supabaseClient
}
