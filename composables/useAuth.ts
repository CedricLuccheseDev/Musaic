import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
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
    } catch {
      // Init failed silently
    } finally {
      loading.value = false
    }
  }

  // Sign in with Google (opens popup that closes after auth)
  async function signInWithGoogle() {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } }
    }

    const redirectUrl = `${window.location.origin}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true
      }
    })

    if (error) {
      return { data, error }
    }

    // Open OAuth in popup instead of redirect
    if (data?.url) {
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      window.open(
        data.url,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=true`
      )
    }

    return { data, error }
  }

  // Sign in with Apple (opens popup that closes after auth)
  async function signInWithApple() {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } }
    }

    const redirectUrl = `${window.location.origin}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true
      }
    })

    if (error) {
      return { data, error }
    }

    // Open OAuth in popup instead of redirect
    if (data?.url) {
      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      window.open(
        data.url,
        'apple-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=true`
      )
    }

    return { data, error }
  }

  // Sign out
  async function signOut() {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } }
    }

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        return { error }
      }
      // Force clear user state (onAuthStateChange should also trigger)
      user.value = null
      return { error: null }
    } catch {
      return { error: { message: 'Sign-out failed' } }
    }
  }

  return {
    user: readonly(user),
    loading: readonly(loading),
    init,
    signInWithGoogle,
    signInWithApple,
    signOut
  }
}
