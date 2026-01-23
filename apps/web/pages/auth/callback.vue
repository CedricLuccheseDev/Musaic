<script setup lang="ts">
import { createClient } from '@supabase/supabase-js'

/* --- Meta --- */
definePageMeta({
  layout: false
})

/* --- States --- */
const config = useRuntimeConfig()
const router = useRouter()
const route = useRoute()
const error = ref<string | null>(null)

/* --- Lifecycle --- */
onMounted(async () => {
  const url = config.public.supabaseUrl
  const key = config.public.supabaseAnonKey

  if (!url || !key) {
    error.value = 'Configuration error'
    return
  }

  const supabase = createClient(url, key)

  // Check for token_hash in query (from magic link)
  const tokenHash = route.query.token_hash as string
  const type = route.query.type as string
  const next = (route.query.next as string) || '/app'

  if (tokenHash && type) {
    // Verify the magic link token
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'magiclink' | 'signup' | 'recovery' | 'email'
    })

    if (verifyError) {
      console.error('[Auth Callback] OTP verification failed:', verifyError)
      error.value = 'Authentication failed'
      return
    }

    // Small delay to ensure session is set
    await new Promise(resolve => setTimeout(resolve, 100))
    router.replace(next)
    return
  }

  // Fallback: try to exchange code for session (OAuth flow)
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    window.location.href
  )

  if (exchangeError) {
    // Try getting existing session
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      error.value = 'Authentication failed'
      return
    }
  }

  await new Promise(resolve => setTimeout(resolve, 100))
  router.replace(next)
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-950">
    <div class="text-center">
      <template v-if="error">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <UIcon name="i-heroicons-x-mark" class="h-6 w-6 text-red-400" />
        </div>
        <p class="text-red-400">{{ error }}</p>
        <NuxtLink to="/login" class="mt-4 inline-block text-sm text-orange-400 hover:underline">
          Retour à la connexion
        </NuxtLink>
      </template>
      <template v-else>
        <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        <p class="text-neutral-400">Connexion en cours...</p>
      </template>
    </div>
  </div>
</template>
