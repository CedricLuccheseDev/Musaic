export default defineNuxtRouteMiddleware(async () => {
  const { user, loading } = useAuth()

  // Wait for auth to initialize
  if (loading.value) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(loading, (isLoading) => {
        if (!isLoading) {
          unwatch()
          resolve()
        }
      }, { immediate: true })
    })
  }

  // Redirect to login if not authenticated
  if (!user.value) {
    return navigateTo('/login')
  }
})
