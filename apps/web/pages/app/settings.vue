<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { t } = useI18n()
const router = useRouter()
const { signOut } = useAuth()
const { profile, aiGenerationsLeft } = useProfile()

/* --- State --- */
const isSyncing = ref(false)
const keyNotation = ref<'standard' | 'camelot'>('camelot')
const scConnection = ref<{
  connected: boolean
  username?: string
  avatar?: string
  lastSyncAt?: string
  likedTracksCount?: number
} | null>(null)
const syncResult = ref<{ imported: number; total: number } | null>(null)

/* --- Computed --- */
const isPremium = computed(() => profile.value?.is_premium ?? false)

/* --- Methods --- */
async function loadSoundCloudConnection() {
  try {
    scConnection.value = await $fetch('/api/soundcloud/connection')
  } catch {
    scConnection.value = { connected: false }
  }
}

async function handleSignOut() {
  await signOut()
  router.push('/')
}

async function syncSoundCloud() {
  isSyncing.value = true
  syncResult.value = null
  try {
    const result = await $fetch<{ imported: number; total: number }>('/api/soundcloud/sync-likes', {
      method: 'POST'
    })
    syncResult.value = result
    await loadSoundCloudConnection()
  } catch (error) {
    console.error('Failed to sync:', error)
  } finally {
    isSyncing.value = false
  }
}

/* --- Lifecycle --- */
onMounted(() => {
  loadSoundCloudConnection()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-neutral-950">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <button
          class="flex items-center gap-2 text-neutral-400 transition-colors hover:text-white"
          @click="router.push('/app')"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-5 w-5" />
          <span class="hidden sm:inline">{{ t.back }}</span>
        </button>

        <h1 class="text-lg font-medium text-white">{{ t.preferencesMenu }}</h1>

        <div class="w-20" />
      </div>
    </header>

    <!-- Main Content -->
    <main class="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <!-- Account Section -->
      <section class="mb-6 rounded-xl border border-neutral-800 bg-neutral-900">
        <div class="border-b border-neutral-800 px-4 py-3">
          <h2 class="font-medium text-white">{{ t.profileMenu }}</h2>
        </div>
        <div class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-400">{{ t.profileProvider }}</p>
              <p class="font-medium text-white">SoundCloud</p>
            </div>
            <button
              class="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20"
              @click="handleSignOut"
            >
              {{ t.profileSignOut }}
            </button>
          </div>
        </div>
      </section>

      <!-- SoundCloud Section -->
      <section class="mb-6 rounded-xl border border-neutral-800 bg-neutral-900">
        <div class="border-b border-neutral-800 px-4 py-3">
          <h2 class="font-medium text-white">SoundCloud</h2>
        </div>
        <div class="p-4 space-y-4">
          <div v-if="scConnection?.connected" class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-400">Connecté</p>
              <p class="font-medium text-white">@{{ scConnection.username }}</p>
              <p v-if="scConnection.likedTracksCount" class="text-xs text-neutral-500">
                {{ scConnection.likedTracksCount }} likes importés
              </p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500">
              <UIcon name="i-simple-icons-soundcloud" class="h-5 w-5 text-white" />
            </div>
          </div>
          <div v-else class="text-center py-2">
            <p class="text-sm text-neutral-400">Non connecté</p>
          </div>

          <div v-if="syncResult" class="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">
            {{ syncResult.imported }} tracks importées sur {{ syncResult.total }}
          </div>

          <button
            v-if="scConnection?.connected"
            :disabled="isSyncing"
            class="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-700 py-3 text-sm text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
            @click="syncSoundCloud"
          >
            <UIcon
              name="i-heroicons-arrow-path"
              class="h-4 w-4"
              :class="{ 'animate-spin': isSyncing }"
            />
            <span>{{ isSyncing ? 'Synchronisation...' : 'Synchroniser les likes' }}</span>
          </button>
        </div>
      </section>

      <!-- Subscription Section -->
      <section class="mb-6 rounded-xl border border-neutral-800 bg-neutral-900">
        <div class="border-b border-neutral-800 px-4 py-3">
          <h2 class="font-medium text-white">{{ t.profileSubscription }}</h2>
        </div>
        <div class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-neutral-400">{{ t.profileCurrentPlan }}</p>
              <p class="font-medium text-white">{{ isPremium ? t.planPremium : t.planFree }}</p>
            </div>
            <div
              v-if="!isPremium"
              class="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-400"
            >
              {{ aiGenerationsLeft }}/5 {{ t.aiGenerationsLeft }}
            </div>
          </div>

          <button
            v-if="!isPremium"
            class="mt-4 w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {{ t.upgradePlan }}
          </button>
        </div>
      </section>

      <!-- Preferences Section -->
      <section class="mb-6 rounded-xl border border-neutral-800 bg-neutral-900">
        <div class="border-b border-neutral-800 px-4 py-3">
          <h2 class="font-medium text-white">{{ t.preferencesMenu }}</h2>
        </div>
        <div class="p-4 space-y-4">
          <!-- Key Notation -->
          <div>
            <p class="mb-2 text-sm text-neutral-400">{{ t.keyNotation }}</p>
            <div class="flex gap-2">
              <button
                class="flex-1 rounded-lg border py-2 text-sm transition-colors"
                :class="keyNotation === 'standard'
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-neutral-700 text-neutral-400 hover:bg-neutral-800'"
                @click="keyNotation = 'standard'"
              >
                {{ t.keyNotationStandard }}
              </button>
              <button
                class="flex-1 rounded-lg border py-2 text-sm transition-colors"
                :class="keyNotation === 'camelot'
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-neutral-700 text-neutral-400 hover:bg-neutral-800'"
                @click="keyNotation = 'camelot'"
              >
                {{ t.keyNotationCamelot }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
