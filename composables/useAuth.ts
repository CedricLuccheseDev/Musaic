export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const signUp = async (email: string, password: string) => {
    try {
      console.log('[Auth] Starting signUp request...')

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: La requête a pris trop de temps')), 10000)
      })

      const signUpPromise = supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined
        }
      })

      const { data, error } = await Promise.race([signUpPromise, timeoutPromise]) as any

      if (error) {
        console.error('[Auth] SignUp error:', error)
      } else {
        console.log('[Auth] SignUp success:', data)
      }

      return { data, error }
    } catch (err) {
      console.error('[Auth] SignUp exception:', err)
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Erreur de connexion au serveur Supabase. Vérifiez votre configuration.',
          name: 'NetworkError',
          status: 0
        }
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[Auth] Starting signIn request...')

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: La requête a pris trop de temps')), 10000)
      })

      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password
      })

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as any

      if (error) {
        console.error('[Auth] SignIn error:', error)
      } else {
        console.log('[Auth] SignIn success:', data)
      }

      return { data, error }
    } catch (err) {
      console.error('[Auth] SignIn exception:', err)
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Erreur de connexion au serveur Supabase. Vérifiez votre configuration.',
          name: 'NetworkError',
          status: 0
        }
      }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (err) {
      console.error('[Auth] SignOut exception:', err)
      return {
        error: {
          message: err instanceof Error ? err.message : 'Erreur de déconnexion',
          name: 'NetworkError',
          status: 0
        }
      }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email)
      return { data, error }
    } catch (err) {
      console.error('[Auth] ResetPassword exception:', err)
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Erreur de réinitialisation',
          name: 'NetworkError',
          status: 0
        }
      }
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })
      return { data, error }
    } catch (err) {
      console.error('[Auth] UpdatePassword exception:', err)
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Erreur de mise à jour',
          name: 'NetworkError',
          status: 0
        }
      }
    }
  }

  return {
    user,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword
  }
}
