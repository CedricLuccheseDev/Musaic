<script setup lang="ts">
/* --- Meta --- */
definePageMeta({
  layoutConfig: {
    showBackButton: true
  }
})

/* --- States --- */
const { t } = useI18n()
const { user, loading, signOut } = useAuth()
const { isPremium, profile } = useSubscription()
const router = useRouter()
const version = __APP_VERSION__
const showTerms = ref(false)
type Tab = 'profile' | 'subscription' | 'contact'
const activeTab = ref<Tab>('profile')

/* --- Computed --- */
const memberSince = computed(() => {
  if (!user.value?.created_at) return ''
  return new Date(user.value.created_at).toLocaleDateString()
})

const provider = computed(() => {
  return user.value?.app_metadata?.provider || 'email'
})

const premiumUntil = computed(() => {
  if (!profile.value?.premium_until) return null
  return new Date(profile.value.premium_until).toLocaleDateString()
})

/* --- Methods --- */
async function handleSignOut() {
  await signOut()
  router.push('/')
}

/* --- Watchers --- */
watch(user, (u) => {
  if (!loading.value && !u) router.push('/login')
}, { immediate: true })
</script>

<template>
  <div class="flex flex-1 flex-col">
    <!-- Background -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
    <div class="absolute -left-20 top-1/4 h-64 w-64 animate-float rounded-full bg-violet-600/10 blur-3xl" />
    <div class="absolute -right-20 bottom-1/4 h-80 w-80 animate-float-delayed rounded-full bg-purple-600/8 blur-3xl" />
  </div>

  <!-- Main -->
  <main class="relative z-10 flex flex-1 items-start justify-center px-4 py-8 md:pt-16">
    <div v-if="loading" class="flex items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-violet-500" />
    </div>

    <div v-else-if="user" class="mx-auto w-full max-w-3xl">
      <div class="flex flex-col gap-6 md:flex-row md:items-stretch md:gap-8">
        <!-- Sidebar Menu -->
        <nav class="flex flex-row justify-center gap-2 md:w-52 md:shrink-0 md:flex-col md:justify-between">
          <div class="flex w-full flex-row gap-1 overflow-x-auto rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-1.5 backdrop-blur-sm md:flex-col md:gap-1 md:overflow-visible">
            <button
              type="button"
              class="group relative flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 md:gap-3 md:px-4 md:py-3"
              :class="activeTab === 'profile' ? 'bg-violet-600/20 text-white shadow-lg shadow-violet-500/10' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'"
              @click="activeTab = 'profile'"
            >
              <div
                v-if="activeTab === 'profile'"
                class="absolute bottom-0 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-violet-500 md:bottom-auto md:left-0 md:top-1/2 md:h-6 md:w-1 md:translate-x-0 md:-translate-y-1/2"
              />
              <UIcon name="i-heroicons-user" class="h-5 w-5" :class="activeTab === 'profile' ? 'text-violet-400' : 'text-neutral-500 group-hover:text-neutral-300'" />
              <span class="whitespace-nowrap">{{ t.profileMenu }}</span>
            </button>
            <button
              type="button"
              class="group relative flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 md:gap-3 md:px-4 md:py-3"
              :class="activeTab === 'subscription' ? 'bg-violet-600/20 text-white shadow-lg shadow-violet-500/10' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'"
              @click="activeTab = 'subscription'"
            >
              <div
                v-if="activeTab === 'subscription'"
                class="absolute bottom-0 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-violet-500 md:bottom-auto md:left-0 md:top-1/2 md:h-6 md:w-1 md:translate-x-0 md:-translate-y-1/2"
              />
              <UIcon name="i-heroicons-sparkles" class="h-5 w-5" :class="activeTab === 'subscription' ? 'text-amber-400' : 'text-amber-500'" />
              <span class="whitespace-nowrap">{{ t.profileSubscription }}</span>
            </button>
            <button
              type="button"
              class="group relative flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 md:gap-3 md:px-4 md:py-3"
              :class="activeTab === 'contact' ? 'bg-violet-600/20 text-white shadow-lg shadow-violet-500/10' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'"
              @click="activeTab = 'contact'"
            >
              <div
                v-if="activeTab === 'contact'"
                class="absolute bottom-0 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-violet-500 md:bottom-auto md:left-0 md:top-1/2 md:h-6 md:w-1 md:translate-x-0 md:-translate-y-1/2"
              />
              <UIcon name="i-heroicons-envelope" class="h-5 w-5" :class="activeTab === 'contact' ? 'text-violet-400' : 'text-neutral-500 group-hover:text-neutral-300'" />
              <span class="whitespace-nowrap">{{ t.contactTitle }}</span>
            </button>
          </div>

          <!-- Footer links in sidebar -->
          <div class="hidden flex-col gap-3 pt-4 md:flex">
            <button
              type="button"
              class="group flex cursor-pointer items-center gap-2 px-2 text-xs text-neutral-500 transition-colors hover:text-violet-400"
              @click="showTerms = true"
            >
              <UIcon name="i-heroicons-document-text" class="h-3.5 w-3.5" />
              <span>{{ t.termsLink }}</span>
            </button>
            <p class="px-2 text-xs text-neutral-600">
              v{{ version }}
            </p>
          </div>
        </nav>

        <!-- Vertical Divider -->
        <div class="hidden w-px bg-linear-to-b from-transparent via-violet-500/30 to-transparent md:block" />

        <!-- Content Section -->
        <div class="min-h-[400px] flex-1 rounded-2xl border border-neutral-800/50 bg-neutral-900/30 p-6 backdrop-blur-sm md:max-w-md">
          <!-- Profile Section -->
          <div v-if="activeTab === 'profile'">
            <!-- Avatar -->
            <div class="mb-6 flex justify-start">
              <div class="relative">
                <div class="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-xl" />
                <div class="relative h-24 w-24 overflow-hidden rounded-full border-2 border-violet-500/50">
                  <img
                    v-if="user.user_metadata?.avatar_url"
                    :src="user.user_metadata.avatar_url"
                    :alt="user.user_metadata?.full_name || 'Avatar'"
                    class="h-full w-full object-cover"
                    referrerpolicy="no-referrer"
                  >
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center bg-violet-600 text-3xl font-bold text-white"
                  >
                    {{ (user.email?.[0] || 'U').toUpperCase() }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Name -->
            <h1 class="mb-1 text-xl font-bold text-white">
              {{ user.user_metadata?.full_name || user.email?.split('@')[0] }}
            </h1>

            <!-- Email -->
            <p class="mb-6 text-sm text-neutral-400">
              {{ user.email }}
            </p>

            <!-- Info -->
            <div class="mb-6 space-y-3">
              <!-- Provider -->
              <div class="flex items-center justify-between rounded-xl bg-neutral-800/30 px-4 py-3">
                <span class="text-sm text-neutral-400">{{ t.profileProvider }}</span>
                <div class="flex items-center gap-2">
                  <UIcon
                    :name="provider === 'google' ? 'i-simple-icons-google' : provider === 'apple' ? 'i-simple-icons-apple' : 'i-heroicons-envelope'"
                    class="h-4 w-4 text-neutral-300"
                  />
                  <span class="text-sm font-medium capitalize text-white">{{ provider }}</span>
                </div>
              </div>

              <!-- Member since -->
              <div class="flex items-center justify-between rounded-xl bg-neutral-800/30 px-4 py-3">
                <span class="text-sm text-neutral-400">{{ t.profileMemberSince }}</span>
                <span class="text-sm font-medium text-white">{{ memberSince }}</span>
              </div>
            </div>

            <!-- Sign out -->
            <button
              type="button"
              class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 transition-all duration-200 hover:border-red-500/50 hover:bg-red-500/20"
              @click="handleSignOut"
            >
              <UIcon name="i-heroicons-arrow-right-on-rectangle" class="h-5 w-5" />
              <span>{{ t.profileSignOut }}</span>
            </button>
          </div>

          <!-- Subscription Section -->
          <div v-else-if="activeTab === 'subscription'">
            <!-- Current Plan -->
            <div class="mb-6">
              <h3 class="mb-3 text-sm font-medium text-neutral-400">{{ t.profileCurrentPlan }}</h3>
              <div class="flex items-center justify-between rounded-xl bg-neutral-800/30 px-4 py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 items-center justify-center rounded-full"
                    :class="isPremium ? 'bg-amber-500/20' : 'bg-neutral-700/50'"
                  >
                    <UIcon
                      :name="isPremium ? 'i-heroicons-sparkles-solid' : 'i-heroicons-user'"
                      class="h-5 w-5"
                      :class="isPremium ? 'text-amber-400' : 'text-neutral-400'"
                    />
                  </div>
                  <div>
                    <p class="font-medium text-white">{{ isPremium ? t.planPremium : t.planFree }}</p>
                    <p v-if="isPremium && premiumUntil" class="text-xs text-neutral-400">
                      {{ t.profilePremiumUntil }} {{ premiumUntil }}
                    </p>
                  </div>
                </div>
                <NuxtLink
                  v-if="!isPremium"
                  to="/subscription"
                  class="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black transition-all hover:bg-amber-400"
                >
                  {{ t.upgradePlan }}
                </NuxtLink>
              </div>
            </div>

            <!-- History -->
            <div class="mb-6">
              <h3 class="mb-3 text-sm font-medium text-neutral-400">{{ t.profileHistory }}</h3>
              <div class="rounded-xl border border-neutral-800/50 bg-neutral-800/20 p-4 text-center text-sm text-neutral-500">
                {{ t.profileNoHistory }}
              </div>
            </div>

            <!-- Actions -->
            <div v-if="isPremium" class="space-y-3">
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-sm font-medium text-neutral-300 transition-all hover:border-neutral-600 hover:bg-neutral-800"
              >
                <UIcon name="i-heroicons-cog-6-tooth" class="h-5 w-5" />
                <span>{{ t.profileManageSubscription }}</span>
              </button>
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 transition-all hover:border-red-500/50 hover:bg-red-500/20"
              >
                <UIcon name="i-heroicons-x-circle" class="h-5 w-5" />
                <span>{{ t.profileCancelSubscription }}</span>
              </button>
            </div>
          </div>

          <!-- Contact Section -->
          <div v-else-if="activeTab === 'contact'">
            <ContactForm />
          </div>
        </div>
      </div>

      <!-- Mobile footer links -->
      <div class="mt-6 flex flex-col items-start gap-3 md:hidden">
        <button
          type="button"
          class="inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-violet-400"
          @click="showTerms = true"
        >
          <UIcon name="i-heroicons-document-text" class="h-4 w-4" />
          <span>{{ t.termsLink }}</span>
        </button>
        <p class="text-xs text-neutral-600">
          v{{ version }}
        </p>
      </div>
    </div>
  </main>

    <!-- Terms Modal -->
    <TermsModal v-model="showTerms" />
  </div>
</template>
