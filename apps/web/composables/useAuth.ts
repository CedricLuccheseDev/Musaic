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

  async function signInWithSoundCloud(): Promise<{ error: { message: string } | null }> {
    try {
      // If on a different domain than musaic.fr, redirect to musaic.fr for auth
      // This is needed because SoundCloud OAuth callback is configured for musaic.fr only
      const currentHost = window.location.hostname
      if (currentHost !== 'musaic.fr' && currentHost !== 'localhost') {
        // Redirect to musaic.fr login page
        window.location.href = 'https://musaic.fr/login?autoconnect=1'
        return { error: null }
      }

      // Call the init endpoint to get the authorization URL
      const { authUrl } = await $fetch<{ authUrl: string }>('/api/auth/soundcloud/init')

      // Open auth in a popup window (not a tab) so window.close() works reliably
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      window.open(authUrl, 'musaic-auth', `width=${width},height=${height},left=${left},top=${top}`)

      // Listen for auth completion via BroadcastChannel
      return new Promise((resolve) => {
        const channel = new BroadcastChannel('musaic-auth')

        const timeout = setTimeout(() => {
          channel.close()
          resolve({ error: { message: 'Authentication timeout' } })
        }, 5 * 60 * 1000) // 5 minute timeout

        channel.onmessage = (event) => {
          if (event.data?.type === 'auth-success') {
            clearTimeout(timeout)
            channel.close()
            // Reload page to pick up the new session from localStorage
            window.location.reload()
          } else if (event.data?.type === 'auth-error') {
            clearTimeout(timeout)
            channel.close()
            resolve({ error: { message: event.data.message || 'Authentication failed' } })
          }
        }
      })
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
