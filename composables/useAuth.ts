import type { User } from '@supabase/supabase-js'

export const useAuth = () => {
  /* --- State --- */
  const user = useState<User | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => true)
  const { fetchProfile, clearProfile } = useSubscription()

  const supabase = useSupabase()

  /* --- Methods --- */
  async function init() {
    if (!supabase) {
      loading.value = false
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      user.value = session?.user ?? null

      // Fetch profile if user is logged in
      if (session?.user) {
        fetchProfile(session.user.id)
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        user.value = session?.user ?? null
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          clearProfile()
        }
      })
    } catch {
      // Init failed silently
    } finally {
      loading.value = false
    }
  }

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

  async function signOut() {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } }
    }

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        return { error }
      }
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
