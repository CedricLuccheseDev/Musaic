/**
 * Centralized Supabase client management for server routes
 * Provides singleton clients for both public and admin access
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Singleton instances
let publicClient: SupabaseClient | null = null
let adminClient: SupabaseClient | null = null

/**
 * Validates that required Supabase configuration exists
 * Throws error if config is missing
 */
export function validateSupabaseConfig() {
  const config = useRuntimeConfig()
  const url = config.supabaseUrl as string
  const key = config.supabaseKey as string

  if (!url || !key) {
    throw createError({
      statusCode: 500,
      message: 'Supabase configuration is missing. Check SUPABASE_URL and SUPABASE_KEY environment variables.'
    })
  }

  return { url, key }
}

/**
 * Get or create public Supabase client (anon key)
 * Uses singleton pattern for efficiency
 * Throws error if configuration is missing
 */
export function getSupabaseClient(): SupabaseClient {
  if (publicClient) return publicClient

  const { url, key } = validateSupabaseConfig()
  publicClient = createClient(url, key)

  return publicClient
}

/**
 * Get or create admin Supabase client (service role key)
 * Uses singleton pattern for efficiency
 * Falls back to public client if service key is not available
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient

  const config = useRuntimeConfig()
  const url = config.supabaseUrl as string
  const serviceKey = config.supabaseServiceKey as string
  const publicKey = config.supabaseKey as string

  if (!url) {
    throw createError({
      statusCode: 500,
      message: 'Supabase URL is missing'
    })
  }

  // Use service key if available, otherwise fall back to public key
  const key = serviceKey || publicKey

  if (!key) {
    throw createError({
      statusCode: 500,
      message: 'Neither Supabase service key nor public key is available'
    })
  }

  adminClient = createClient(url, key)
  return adminClient
}

/**
 * Reset singleton instances (useful for testing)
 */
export function resetSupabaseClients() {
  publicClient = null
  adminClient = null
}
