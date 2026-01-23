<script setup lang="ts">
/* --- Meta --- */
definePageMeta({
  layout: false
})

/* --- States --- */
const { t } = useI18n()
const { user, signInWithSoundCloud } = useAuth()
const router = useRouter()
const isLoading = ref(false)
const showTerms = ref(false)

/* --- Methods --- */
async function handleSoundCloud() {
  isLoading.value = true
  await signInWithSoundCloud()
}

/* --- Watchers --- */
watch(user, (u) => {
  if (u) router.push('/app')
}, { immediate: true })
</script>

<template>
  <div class="flex flex-1 flex-col">
    <!-- Background effects -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <!-- Floating orbs -->
      <div class="absolute -left-20 top-1/4 h-64 w-64 animate-float rounded-full bg-orange-600/15 blur-3xl" />
      <div class="absolute -right-20 top-1/3 h-80 w-80 animate-float-delayed rounded-full bg-orange-500/10 blur-3xl" />
      <div class="absolute bottom-1/4 left-1/3 h-48 w-48 animate-float-slow rounded-full bg-amber-600/10 blur-3xl" />

      <!-- Animated rings around the center -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="absolute h-[280px] w-[280px] animate-spin-very-slow rounded-full border border-orange-500/10 sm:h-[400px] sm:w-[400px] md:h-[600px] md:w-[600px]" />
        <div class="absolute h-[200px] w-[200px] animate-spin-slow-reverse rounded-full border border-orange-400/10 sm:h-[300px] sm:w-[300px] md:h-[450px] md:w-[450px]" />
        <div class="absolute h-[120px] w-[120px] animate-spin-very-slow rounded-full border border-amber-500/5 sm:h-[200px] sm:w-[200px] md:h-[300px] md:w-[300px]" />
      </div>

      <!-- Music note particles -->
      <div class="absolute left-[15%] top-[20%] animate-float-particle text-orange-500/20">
        <UIcon name="i-heroicons-musical-note" class="h-6 w-6" />
      </div>
      <div class="absolute right-[20%] top-[30%] animate-float-particle-delayed text-orange-400/15">
        <UIcon name="i-heroicons-musical-note" class="h-8 w-8" />
      </div>
      <div class="absolute bottom-[25%] left-[25%] animate-float-particle-slow text-amber-500/15">
        <UIcon name="i-heroicons-musical-note" class="h-5 w-5" />
      </div>
      <div class="absolute bottom-[35%] right-[15%] animate-float-particle text-orange-500/10">
        <UIcon name="i-heroicons-musical-note" class="h-7 w-7" />
      </div>

      <!-- Gradient mesh -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.03)_0%,transparent_70%)]" />
    </div>

    <!-- Main content -->
    <main class="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
      <div class="w-full max-w-md">
        <!-- Card -->
        <div class="rounded-2xl border border-neutral-800/50 bg-neutral-900/50 p-8 backdrop-blur-xl">
          <!-- Icon -->
          <div class="mb-6 flex justify-center">
            <div class="relative">
              <div class="absolute inset-0 animate-pulse rounded-full bg-orange-500/20 blur-xl" />
              <div class="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
                <UIcon name="i-heroicons-musical-note" class="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <!-- Title -->
          <div class="mb-8 text-center">
            <h1 class="mb-2 text-2xl font-bold text-white">{{ t.loginTitle }}</h1>
            <p class="text-sm text-neutral-400">{{ t.loginSubtitle }}</p>
          </div>

          <!-- SoundCloud button -->
          <button
            type="button"
            :disabled="isLoading"
            class="group relative flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-orange-500 px-4 py-3.5 font-medium text-white transition-all duration-200 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleSoundCloud"
          >
            <UIcon v-if="isLoading" name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin" />
            <UIcon v-else name="i-simple-icons-soundcloud" class="h-5 w-5" />
            <span>{{ t.continueWithSoundCloud }}</span>
          </button>

          <!-- Benefits -->
          <div class="mt-6 space-y-2 text-sm text-neutral-400">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="h-4 w-4 text-orange-500" />
              <span>{{ t.benefit1 }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="h-4 w-4 text-orange-500" />
              <span>{{ t.benefit2 }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="h-4 w-4 text-orange-500" />
              <span>{{ t.benefit3 }}</span>
            </div>
          </div>

          <!-- Terms notice -->
          <p class="mt-6 text-center text-xs text-neutral-500">
            {{ t.termsNotice }}
            <button
              type="button"
              class="cursor-pointer text-orange-400 underline-offset-2 transition-colors hover:text-orange-300 hover:underline"
              @click="showTerms = true"
            >
              {{ t.termsLink }}
            </button>
          </p>
        </div>

        <!-- Back link -->
        <div class="mt-6 text-center">
          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
            @click="router.push('/')"
          >
            <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
            <span>{{ t.back }}</span>
          </button>
        </div>
      </div>
    </main>

    <!-- Terms Modal -->
    <TermsModal v-model="showTerms" />
  </div>
</template>
