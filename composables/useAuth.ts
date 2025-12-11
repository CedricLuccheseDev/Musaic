import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl
  const key = config.public.supabaseAnonKey

  if (!url || !key) {
    console.warn('[Auth] Supabase not configured')
    return null
  }

  supabaseClient = createClient(url, key)
  return supabaseClient
}

export const useAuth = () => {
  const user = useState<User | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => true)

  const supabase = getSupabase()

  // Initialize auth state
  async function init() {
    if (!supabase) {
      loading.value = false
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      user.value = session?.user ?? null

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null
      })
    } catch (err) {
      console.error('[Auth] Init error:', err)
    } finally {
      loading.value = false
    }
  }

  // Sign in with Google
  async function signInWithGoogle() {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } }
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      })

      if (error) {
        console.error('[Auth] Google sign-in error:', error)
      }

      return { data, error }
    } catch (err) {
      console.error('[Auth] Google sign-in exception:', err)
      return {
        data: null,
        error: { message: err instanceof Error ? err.message : 'Sign-in failed' }
      }
    }
  }

  // Sign out
  async function signOut() {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } }
    }

    try {
      const { error } = await supabase.auth.signOut()
      if (!error) {
        user.value = null
      }
      return { error }
    } catch (err) {
      console.error('[Auth] Sign-out exception:', err)
      return {
        error: { message: err instanceof Error ? err.message : 'Sign-out failed' }
      }
    }
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    init,
    signInWithGoogle,
    signOut
  }
}
