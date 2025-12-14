<script setup lang="ts">
// OAuth callback page - closes popup after auth completes
import { createClient } from '@supabase/supabase-js'

/* --- States --- */
const config = useRuntimeConfig()

/* --- Lifecycle --- */
onMounted(async () => {
  const url = config.public.supabaseUrl
  const key = config.public.supabaseAnonKey

  if (!url || !key) {
    window.close()
    return
  }

  const supabase = createClient(url, key)

  // Supabase handles the hash fragment automatically when getting session
  // This exchanges the code/tokens from the URL for a valid session
  const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)

  if (error) {
    // Try getSession as fallback (for implicit grant flow)
    await supabase.auth.getSession()
  }

  // Small delay to ensure session is stored
  await new Promise(resolve => setTimeout(resolve, 100))

  // Close the popup - parent window will detect auth state change via onAuthStateChange
  window.close()
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-900">
    <div class="text-center">
      <div class="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
      <p class="text-gray-400">Connexion en cours...</p>
    </div>
  </div>
</template>
