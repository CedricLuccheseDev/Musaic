/**
 * Auth middleware - redirects to login if not authenticated
 */
export default defineNuxtRouteMiddleware(() => {
  const { user, loading } = useAuth()

  // Wait for auth to be initialized
  if (loading.value) {
    return
  }

  // Redirect to login if not authenticated
  if (!user.value) {
    return navigateTo('/login')
  }
})
