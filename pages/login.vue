<script setup lang="ts">
const { t } = useI18n()
const { user, signInWithGoogle, signInWithApple } = useAuth()
const router = useRouter()

const isLoadingGoogle = ref(false)
const isLoadingApple = ref(false)
const showTerms = ref(false)

// Redirect if already logged in
watch(user, (u) => {
  if (u) router.push('/')
}, { immediate: true })

async function handleGoogle() {
  isLoadingGoogle.value = true
  await signInWithGoogle()
  isLoadingGoogle.value = false
}

async function handleApple() {
  isLoadingApple.value = true
  await signInWithApple()
  isLoadingApple.value = false
}
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-neutral-950">
    <!-- Background effects -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <!-- Floating orbs -->
      <div class="absolute -left-20 top-1/4 h-64 w-64 animate-float rounded-full bg-violet-600/15 blur-3xl" />
      <div class="absolute -right-20 top-1/3 h-80 w-80 animate-float-delayed rounded-full bg-purple-600/10 blur-3xl" />
      <div class="absolute bottom-1/4 left-1/3 h-48 w-48 animate-float-slow rounded-full bg-pink-600/10 blur-3xl" />

      <!-- Animated rings around the center -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="absolute h-[600px] w-[600px] animate-spin-very-slow rounded-full border border-violet-500/10" />
        <div class="absolute h-[450px] w-[450px] animate-spin-slow-reverse rounded-full border border-purple-500/10" />
        <div class="absolute h-[300px] w-[300px] animate-spin-very-slow rounded-full border border-pink-500/5" />
      </div>

      <!-- Music note particles -->
      <div class="absolute left-[15%] top-[20%] animate-float-particle text-violet-500/20">
        <UIcon name="i-heroicons-musical-note" class="h-6 w-6" />
      </div>
      <div class="absolute right-[20%] top-[30%] animate-float-particle-delayed text-purple-500/15">
        <UIcon name="i-heroicons-musical-note" class="h-8 w-8" />
      </div>
      <div class="absolute bottom-[25%] left-[25%] animate-float-particle-slow text-pink-500/15">
        <UIcon name="i-heroicons-musical-note" class="h-5 w-5" />
      </div>
      <div class="absolute bottom-[35%] right-[15%] animate-float-particle text-violet-500/10">
        <UIcon name="i-heroicons-musical-note" class="h-7 w-7" />
      </div>

      <!-- Gradient mesh -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.03)_0%,transparent_70%)]" />
    </div>

    <!-- Header -->
    <header class="relative z-10 flex items-center justify-between px-4 py-4 md:px-6">
      <NuxtLink to="/" class="transition-opacity hover:opacity-80">
        <AppLogo size="sm" />
      </NuxtLink>
      <LangSwitch />
    </header>

    <!-- Main content -->
    <main class="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
      <div class="w-full max-w-md">
        <!-- Card -->
        <div class="rounded-2xl border border-neutral-800/50 bg-neutral-900/50 p-8 backdrop-blur-xl">
          <!-- Icon -->
          <div class="mb-6 flex justify-center">
            <div class="relative">
              <div class="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-xl" />
              <div class="relative flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-purple-600 shadow-lg shadow-purple-500/30">
                <UIcon name="i-heroicons-musical-note" class="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <!-- Title -->
          <div class="mb-8 text-center">
            <h1 class="mb-2 text-2xl font-bold text-white">{{ t.loginTitle }}</h1>
            <p class="text-sm text-neutral-400">{{ t.loginSubtitle }}</p>
          </div>

          <!-- Auth buttons -->
          <div class="space-y-3">
            <!-- Google -->
            <button
              type="button"
              :disabled="isLoadingGoogle || isLoadingApple"
              class="group relative flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 font-medium text-neutral-900 transition-all duration-200 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleGoogle"
            >
              <UIcon v-if="isLoadingGoogle" name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin" />
              <UIcon v-else name="i-simple-icons-google" class="h-5 w-5" />
              <span>{{ t.continueWithGoogle }}</span>
            </button>

            <!-- Apple -->
            <button
              type="button"
              :disabled="isLoadingGoogle || isLoadingApple"
              class="group relative flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-neutral-800 px-4 py-3.5 font-medium text-white transition-all duration-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              @click="handleApple"
            >
              <UIcon v-if="isLoadingApple" name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin" />
              <UIcon v-else name="i-simple-icons-apple" class="h-5 w-5" />
              <span>{{ t.continueWithApple }}</span>
            </button>
          </div>

          <!-- Terms notice -->
          <p class="mt-6 text-center text-xs text-neutral-500">
            {{ t.termsNotice }}
            <button
              type="button"
              class="cursor-pointer text-violet-400 underline-offset-2 transition-colors hover:text-violet-300 hover:underline"
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
            @click="router.back()"
          >
            <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
            <span>Retour</span>
          </button>
        </div>
      </div>
    </main>

    <!-- Terms Modal -->
    <UModal v-model:open="showTerms">
      <template #content>
        <div class="max-h-[80vh] overflow-y-auto rounded-2xl border border-neutral-800/50 bg-neutral-900 p-6">
          <!-- Header -->
          <div class="mb-6 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
                <UIcon name="i-heroicons-document-text" class="h-5 w-5 text-violet-400" />
              </div>
              <h2 class="text-xl font-bold text-white">{{ t.termsTitle }}</h2>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
              @click="showTerms = false"
            >
              <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
            </button>
          </div>

          <!-- Intro -->
          <p class="mb-6 text-sm text-neutral-400">{{ t.termsIntro }}</p>

          <!-- Sections -->
          <div class="space-y-5">
            <div>
              <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-xs text-violet-400">1</span>
                {{ t.termsSection1Title }}
              </h3>
              <p class="pl-7 text-sm text-neutral-400">{{ t.termsSection1Content }}</p>
            </div>

            <div>
              <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-xs text-purple-400">2</span>
                {{ t.termsSection2Title }}
              </h3>
              <p class="pl-7 text-sm text-neutral-400">{{ t.termsSection2Content }}</p>
            </div>

            <div>
              <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500/20 text-xs text-pink-400">3</span>
                {{ t.termsSection3Title }}
              </h3>
              <p class="pl-7 text-sm text-neutral-400">{{ t.termsSection3Content }}</p>
            </div>

            <div>
              <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-xs text-violet-400">4</span>
                {{ t.termsSection4Title }}
              </h3>
              <p class="pl-7 text-sm text-neutral-400">{{ t.termsSection4Content }}</p>
            </div>

            <div>
              <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-xs text-purple-400">5</span>
                {{ t.termsSection5Title }}
              </h3>
              <p class="pl-7 text-sm text-neutral-400">{{ t.termsSection5Content }}</p>
            </div>
          </div>

          <!-- Close button -->
          <div class="mt-8 flex justify-end">
            <button
              type="button"
              class="cursor-pointer rounded-xl bg-violet-600 px-6 py-2.5 font-medium text-white transition-all duration-200 hover:bg-violet-500"
              @click="showTerms = false"
            >
              {{ t.termsClose }}
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
