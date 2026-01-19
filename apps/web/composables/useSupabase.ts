import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/* --- Singleton (client-side only) --- */
let supabaseClient: SupabaseClient | null = null

export function useSupabase(): SupabaseClient | null {
  // Only initialize on client side
  if (import.meta.server) {
    return null
  }

  if (supabaseClient) return supabaseClient

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key = config.public.supabaseAnonKey

  console.log('[useSupabase] Config:', { url: url ? 'set' : 'missing', key: key ? 'set' : 'missing' })

  if (!url || !key) {
    console.error('[useSupabase] Missing config:', { url, key })
    return null
  }

  supabaseClient = createClient(url, key)
  return supabaseClient
}
