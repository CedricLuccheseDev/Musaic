<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { t } = useI18n()
const router = useRouter()

/* --- State --- */
const playlists = ref<Array<{
  id: string
  name: string | null
  is_draft: boolean
  target_duration: number | null
  style: string | null
  track_count: number
  total_duration: number
  created_at: string
}>>([])
const isLoading = ref(true)
const searchQuery = ref('')
const aiSearchQuery = ref('')
const isAiSearching = ref(false)

/* --- Computed --- */
const filteredPlaylists = computed(() => {
  if (!searchQuery.value) return playlists.value
  const query = searchQuery.value.toLowerCase()
  return playlists.value.filter(p =>
    p.name?.toLowerCase().includes(query) ||
    p.style?.toLowerCase().includes(query)
  )
})

const draftPlaylist = computed(() =>
  playlists.value.find(p => p.is_draft)
)

const savedPlaylists = computed(() =>
  filteredPlaylists.value.filter(p => !p.is_draft)
)

/* --- Methods --- */
async function loadPlaylists() {
  isLoading.value = true
  try {
    const data = await $fetch<typeof playlists.value>('/api/playlists')
    playlists.value = data
  } catch (error) {
    console.error('Failed to load playlists:', error)
    playlists.value = []
  } finally {
    isLoading.value = false
  }
}

async function handleAiSearch() {
  if (!aiSearchQuery.value.trim()) return

  isAiSearching.value = true
  try {
    // Create or get draft playlist
    const playlist = await $fetch<{ id: string }>('/api/playlists', {
      method: 'POST',
      body: { target_duration: 60 }
    })
    // Redirect to playlist with query
    router.push(`/app/playlist/${playlist.id}?q=${encodeURIComponent(aiSearchQuery.value)}`)
  } catch (error) {
    console.error('Failed to create playlist:', error)
    isAiSearching.value = false
  }
}

function handleCreate() {
  router.push('/app/playlist/new')
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`
}

/* --- Lifecycle --- */
onMounted(() => {
  loadPlaylists()
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-neutral-950">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <NuxtLink to="/app" class="text-xl font-bold text-white">
          musaic
        </NuxtLink>
        <NuxtLink
          to="/app/settings"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 transition-colors hover:bg-neutral-700"
        >
          <UIcon name="i-heroicons-user" class="h-5 w-5 text-neutral-300" />
        </NuxtLink>
      </div>
    </header>

    <!-- Main Content -->
    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
      <!-- Search in playlists -->
      <div class="mb-6">
        <div class="relative">
          <UIcon
            name="i-heroicons-magnifying-glass"
            class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t.searchPlaceholder"
            class="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-3 pl-12 pr-4 text-white placeholder-neutral-500 transition-colors focus:border-orange-500 focus:outline-none"
          >
        </div>
      </div>

      <!-- Playlists Grid -->
      <div class="mb-8">
        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-orange-500" />
        </div>

        <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <!-- Create Button -->
          <button
            class="group flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-900/50 transition-all hover:border-orange-500 hover:bg-neutral-900"
            @click="handleCreate"
          >
            <div class="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800 transition-colors group-hover:bg-orange-500">
              <UIcon name="i-heroicons-plus" class="h-6 w-6 text-neutral-400 transition-colors group-hover:text-white" />
            </div>
            <span class="text-sm font-medium text-neutral-400 transition-colors group-hover:text-white">CREATE</span>
          </button>

          <!-- Draft Playlist (if exists) -->
          <NuxtLink
            v-if="draftPlaylist"
            :to="`/app/playlist/${draftPlaylist.id}`"
            class="group relative flex aspect-square flex-col justify-end overflow-hidden rounded-2xl border-2 border-dashed border-orange-500/50 bg-gradient-to-br from-orange-500/20 to-neutral-900 p-4 transition-all hover:border-orange-500"
          >
            <div class="absolute right-3 top-3 rounded-full bg-orange-500 px-2 py-0.5 text-xs font-medium text-white">
              Brouillon
            </div>
            <div class="mt-auto">
              <p class="text-sm font-medium text-white">{{ draftPlaylist.name || 'Nouveau' }}</p>
              <p class="text-xs text-neutral-400">
                {{ draftPlaylist.track_count }} tracks
                <span v-if="draftPlaylist.total_duration"> · {{ formatDuration(draftPlaylist.total_duration) }}</span>
              </p>
            </div>
          </NuxtLink>

          <!-- Saved Playlists -->
          <NuxtLink
            v-for="playlist in savedPlaylists"
            :key="playlist.id"
            :to="`/app/playlist/${playlist.id}`"
            class="group relative flex aspect-square flex-col justify-end overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-800 to-neutral-900 p-4 transition-all hover:border-neutral-700"
          >
            <div class="mt-auto">
              <p class="text-sm font-medium text-white">{{ playlist.name }}</p>
              <p class="text-xs text-neutral-400">
                {{ playlist.track_count }} tracks
                <span v-if="playlist.total_duration"> · {{ formatDuration(playlist.total_duration) }}</span>
              </p>
            </div>
          </NuxtLink>
        </div>

        <!-- Empty State -->
        <div
          v-if="!isLoading && playlists.length === 0"
          class="mt-8 text-center"
        >
          <UIcon name="i-heroicons-musical-note" class="mx-auto h-12 w-12 text-neutral-700" />
          <p class="mt-4 text-neutral-400">Aucune playlist pour l'instant</p>
          <p class="text-sm text-neutral-500">Utilise la recherche IA ci-dessous pour commencer</p>
        </div>
      </div>
    </main>

    <!-- AI Search Bar (Fixed Bottom) -->
    <div class="sticky bottom-0 border-t border-neutral-800 bg-neutral-950/95 px-4 py-4 backdrop-blur-xl">
      <div class="mx-auto max-w-2xl">
        <form class="relative" @submit.prevent="handleAiSearch">
          <div class="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <div class="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500">
              <UIcon name="i-heroicons-sparkles" class="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <input
            v-model="aiSearchQuery"
            type="text"
            placeholder="Techno dark 125bpm pour warm up..."
            class="w-full rounded-xl border border-neutral-700 bg-neutral-900 py-4 pl-14 pr-24 text-white placeholder-neutral-500 transition-colors focus:border-orange-500 focus:outline-none"
            :disabled="isAiSearching"
          >
          <button
            type="submit"
            :disabled="!aiSearchQuery.trim() || isAiSearching"
            class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UIcon v-if="isAiSearching" name="i-heroicons-arrow-path" class="h-4 w-4 animate-spin" />
            <span v-else>{{ t.search }}</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
