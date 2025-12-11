<script setup lang="ts">
const { signIn, signUp } = useAuth()
const router = useRouter()

const email = ref('')
const password = ref('')
const isSignUp = ref(false)
const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  console.log('[Login] Submitting form...', { isSignUp: isSignUp.value, email: email.value })

  const { data, error: authError } = isSignUp.value
    ? await signUp(email.value, password.value)
    : await signIn(email.value, password.value)

  console.log('[Login] Response received:', { data, error: authError })

  loading.value = false

  if (authError) {
    error.value = authError.message
    console.error('[Login] Auth error:', authError)
  } else if (data) {
    console.log('[Login] Success! Data:', data)

    if (isSignUp.value && data.user && !data.session) {
      error.value = 'Compte créé ! Vérifiez vos emails pour confirmer votre inscription (ou activez l\'auto-confirmation dans Supabase).'
    } else {
      router.push('/')
    }
  }
}

const toggleMode = () => {
  isSignUp.value = !isSignUp.value
  error.value = ''
}
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-gradient-to-b from-neutral-950 to-neutral-900">
    <!-- Animated Background -->
    <AuthBackground />

    <!-- Header with back button -->
    <div class="relative z-10 flex items-center justify-between p-4 md:p-6">
      <NuxtLink
        to="/"
        class="flex items-center gap-2 text-neutral-400 transition-colors hover:text-white"
      >
        <UIcon name="i-heroicons-arrow-left" class="h-5 w-5" />
        <span class="hidden sm:inline">Retour</span>
      </NuxtLink>
      <Logo size="sm" />
    </div>

    <!-- Main Content -->
    <div class="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
      <div class="w-full max-w-md">
        <!-- Glass Card -->
        <div class="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50 shadow-2xl backdrop-blur-xl">
          <!-- Header -->
          <div class="border-b border-white/5 p-8 pb-6">
            <h1 class="mb-2 text-center text-3xl font-bold text-white">
              {{ isSignUp ? 'Créer un compte' : 'Bienvenue' }}
            </h1>
            <p class="text-center text-sm text-neutral-400">
              {{ isSignUp ? 'Rejoignez Musaic aujourd\'hui' : 'Connectez-vous pour continuer' }}
            </p>
          </div>

          <!-- Form -->
          <form class="space-y-5 p-8" @submit.prevent="handleSubmit">
            <!-- Email Input -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-neutral-300">
                Email
              </label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <UIcon name="i-heroicons-envelope" class="h-5 w-5 text-neutral-500" />
                </div>
                <input
                  v-model="email"
                  type="email"
                  required
                  placeholder="votre@email.com"
                  class="w-full rounded-xl border border-white/10 bg-neutral-800/50 py-3 pl-12 pr-4 text-white placeholder-neutral-500 transition-all focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
              </div>
            </div>

            <!-- Password Input -->
            <div class="space-y-2">
              <label class="block text-sm font-medium text-neutral-300">
                Mot de passe
              </label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <UIcon name="i-heroicons-lock-closed" class="h-5 w-5 text-neutral-500" />
                </div>
                <input
                  v-model="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  class="w-full rounded-xl border border-white/10 bg-neutral-800/50 py-3 pl-12 pr-4 text-white placeholder-neutral-500 transition-all focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                >
              </div>
            </div>

            <!-- Error Message -->
            <div
              v-if="error"
              class="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400"
            >
              {{ error }}
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="loading"
              class="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="!loading">
                {{ isSignUp ? 'Créer mon compte' : 'Se connecter' }}
              </span>
              <span v-else class="flex items-center justify-center gap-2">
                <UIcon name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin" />
                Chargement...
              </span>
              <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>

            <!-- Forgot Password (only on login) -->
            <div v-if="!isSignUp" class="text-center">
              <button
                type="button"
                class="text-sm text-neutral-400 transition-colors hover:text-violet-400"
              >
                Mot de passe oublié ?
              </button>
            </div>
          </form>

          <!-- Footer -->
          <div class="border-t border-white/5 bg-neutral-900/30 p-6 text-center">
            <p class="text-sm text-neutral-400">
              {{ isSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?' }}
              <button
                type="button"
                class="ml-1 font-semibold text-violet-400 transition-colors hover:text-violet-300"
                @click="toggleMode"
              >
                {{ isSignUp ? 'Se connecter' : 'S\'inscrire' }}
              </button>
            </p>
          </div>
        </div>

        <!-- Social proof or additional info -->
        <div class="mt-6 text-center text-xs text-neutral-500">
          <p>En continuant, vous acceptez nos conditions d'utilisation</p>
        </div>
      </div>
    </div>
  </div>
</template>
