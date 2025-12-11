<script setup lang="ts">
const { signIn, signUp, signInWithOAuth } = useAuth()
const router = useRouter()

const email = ref('')
const password = ref('')
const isSignUp = ref(false)
const loading = ref(false)
const oauthLoading = ref<'google' | 'apple' | null>(null)
const error = ref('')

const handleOAuth = async (provider: 'google' | 'apple') => {
  oauthLoading.value = provider
  error.value = ''

  const { error: authError } = await signInWithOAuth(provider)

  if (authError) {
    error.value = authError.message
    oauthLoading.value = null
  }
}

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

          <!-- OAuth Buttons -->
          <div class="space-y-3 p-8 pb-0">
            <button
              type="button"
              :disabled="oauthLoading !== null"
              class="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white py-3 font-medium text-neutral-900 transition-all hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleOAuth('google')"
            >
              <svg v-if="oauthLoading !== 'google'" class="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <UIcon v-else name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin text-neutral-900" />
              <span>Continuer avec Google</span>
            </button>

            <button
              type="button"
              :disabled="oauthLoading !== null"
              class="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-black py-3 font-medium text-white transition-all hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleOAuth('apple')"
            >
              <svg v-if="oauthLoading !== 'apple'" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <UIcon v-else name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin" />
              <span>Continuer avec Apple</span>
            </button>

            <!-- Divider -->
            <div class="relative py-2">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-white/10" />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="bg-neutral-900/50 px-4 text-neutral-500">ou</span>
              </div>
            </div>
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
