<script setup lang="ts">
/**
 * OAuth callback page - handles the auth completion
 * Verifies the token, establishes session, and redirects to home
 */

definePageMeta({
  layout: false
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabase()

const status = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref('')

onMounted(async () => {
  // Get token from URL (passed by the server callback)
  const token = route.query.token as string
  const email = route.query.email as string
  const error = route.query.error as string

  if (error) {
    status.value = 'error'
    errorMessage.value = decodeURIComponent(error)
    // Notify the main page of the error
    const channel = new BroadcastChannel('musaic-auth')
    channel.postMessage({ type: 'auth-error', message: errorMessage.value })
    channel.close()
    return
  }

  if (!token || !email || !supabase) {
    status.value = 'error'
    errorMessage.value = 'Missing authentication data'
    const channel = new BroadcastChannel('musaic-auth')
    channel.postMessage({ type: 'auth-error', message: errorMessage.value })
    channel.close()
    return
  }

  try {
    // Verify the OTP token to establish the session
    // The token is a hashed_token from generateLink, so use token_hash
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink'
    })

    if (verifyError) {
      status.value = 'error'
      errorMessage.value = verifyError.message
      const channel = new BroadcastChannel('musaic-auth')
      channel.postMessage({ type: 'auth-error', message: errorMessage.value })
      channel.close()
      return
    }

    status.value = 'success'

    // Notify the main page via BroadcastChannel
    const channel = new BroadcastChannel('musaic-auth')
    channel.postMessage({ type: 'auth-success' })
    channel.close()

    // Close this tab after a short delay
    setTimeout(() => {
      window.close()
      // Fallback: if window.close() doesn't work (not opened by script), redirect
      router.push('/')
    }, 1500)
  } catch (err) {
    status.value = 'error'
    errorMessage.value = String(err)
    const channel = new BroadcastChannel('musaic-auth')
    channel.postMessage({ type: 'auth-error', message: errorMessage.value })
    channel.close()
  }
})

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-950">
    <div class="text-center">
      <!-- Loading -->
      <div v-if="status === 'loading'" class="space-y-4">
        <div class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        <p class="text-neutral-400">Connexion en cours...</p>
      </div>

      <!-- Success -->
      <div v-else-if="status === 'success'" class="space-y-4">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
          <UIcon name="i-heroicons-check" class="h-6 w-6 text-green-500" />
        </div>
        <p class="text-white">Connexion réussie !</p>
        <p class="text-sm text-neutral-400">Cette fenêtre va se fermer...</p>
      </div>

      <!-- Error -->
      <div v-else class="space-y-4">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
          <UIcon name="i-heroicons-x-mark" class="h-6 w-6 text-red-500" />
        </div>
        <p class="text-white">Erreur de connexion</p>
        <p class="text-sm text-neutral-400">{{ errorMessage }}</p>
        <button
          type="button"
          class="mt-4 rounded-lg bg-neutral-800 px-4 py-2 text-sm text-white hover:bg-neutral-700"
          @click="goToLogin"
        >
          Retour à la connexion
        </button>
      </div>
    </div>
  </div>
</template>
