<script setup lang="ts">
/* --- Meta --- */
definePageMeta({
  layout: false
})

/* --- States --- */
const router = useRouter()
const supabase = useSupabase()

/* --- Lifecycle --- */
onMounted(async () => {
  if (!supabase) {
    router.push('/login')
    return
  }

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)

    if (error) {
      console.error('[auth/callback] Error:', error)
      router.push('/login')
      return
    }

    // Redirect to home on success
    router.push('/')
  } catch (err) {
    console.error('[auth/callback] Exception:', err)
    router.push('/login')
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-950">
    <div class="text-center">
      <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      <p class="text-neutral-400">Connexion en cours...</p>
    </div>
  </div>
</template>
