<script setup lang="ts">
import { createClient } from '@supabase/supabase-js'

/* --- Meta --- */
definePageMeta({
  layout: false
})

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

  const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)

  if (error) {
    await supabase.auth.getSession()
  }

  await new Promise(resolve => setTimeout(resolve, 100))

  window.close()
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
