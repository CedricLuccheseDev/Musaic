import type { User } from '@supabase/supabase-js'

export const useAuth = () => {
  /* --- State --- */
  const user = useState<User | null>('auth-user', () => null)
  const loading = useState<boolean>('auth-loading', () => true)
  const { fetchProfile, clearProfile } = useProfile()

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
        await fetchProfile(session.user.id)
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

  async function signInWithSoundCloud() {
    console.log('[useAuth] signInWithSoundCloud called')

    try {
      // Call the init endpoint to get the authorization URL
      const { authUrl } = await $fetch<{ authUrl: string }>('/api/auth/soundcloud/init')

      console.log('[useAuth] Redirecting to SoundCloud:', authUrl)

      // Redirect to SoundCloud authorization
      window.location.href = authUrl

      return { error: null }
    } catch (err) {
      console.error('[useAuth] Exception during SoundCloud auth:', err)
      return { error: { message: String(err) } }
    }
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
    signInWithSoundCloud,
    signOut
  }
}
