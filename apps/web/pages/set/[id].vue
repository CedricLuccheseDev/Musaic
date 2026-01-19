<script setup lang="ts">
/**
 * Set Builder Page - /set/[id]
 * Main builder interface for creating a DJ set
 */

import { DownloadStatus, type TrackEntry, type ScoredTrack } from '~/types'

/* --- Meta --- */
definePageMeta({
  middleware: ['auth']
})

/* --- Composables --- */
const { t } = useI18n()
const route = useRoute()
const { formatKey, getKeyColor } = useKeyNotation()
const { loadToDeck, deckA, deckB, hasAnyTrack } = useDjPlayer()
const {
  currentSet,
  suggestions,
  loading,
  suggestionsLoading,
  error,
  lastRemovedTrack,
  effectiveDuration,
  targetDuration,
  progress,
  fetchSet,
  addTrack,
  removeTrack,
  undoRemoveTrack,
  reorderTracks,
  fetchSuggestions,
  refreshSuggestions,
  exportSet,
  formatDuration
} = useSetBuilder()

/* --- State --- */
const setId = computed(() => route.params.id as string)
const showSearch = ref(false)
const searchQuery = ref('')
const searchResults = ref<TrackEntry[]>([])
const searchLoading = ref(false)
const showExportMenu = ref(false)

// Header state
const headerMounted = ref(false)
const globalSearchInput = ref('')
const showDownloadPanel = ref(false)

// Drag state
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null

/* --- Computed --- */
const isOnDeckA = (trackId: number) => deckA.value.track?.id === trackId
const isOnDeckB = (trackId: number) => deckB.value.track?.id === trackId
const isPlaying = (trackId: number) => (isOnDeckA(trackId) && deckA.value.isPlaying) || (isOnDeckB(trackId) && deckB.value.isPlaying)
const isLoading = (trackId: number) => (isOnDeckA(trackId) && deckA.value.isLoading) || (isOnDeckB(trackId) && deckB.value.isLoading)

// Download stats
const downloadableTracksCount = computed(() =>
  currentSet.value?.tracks.filter(t => t.track.downloadStatus !== DownloadStatus.No).length || 0
)
const directDownloadTracks = computed(() =>
  currentSet.value?.tracks.filter(t => t.track.downloadStatus === DownloadStatus.FreeDirectLink) || []
)
const externalDownloadTracks = computed(() =>
  currentSet.value?.tracks.filter(t => t.track.downloadStatus === DownloadStatus.FreeExternalLink) || []
)
const nonDownloadableTracks = computed(() =>
  currentSet.value?.tracks.filter(t => t.track.downloadStatus === DownloadStatus.No) || []
)

/* --- Methods --- */
async function handleAddTrack(track: TrackEntry | ScoredTrack) {
  await addTrack(track.id)
  // Clear search
  searchQuery.value = ''
  searchResults.value = []
}

// Load track to specific deck
function handleLoadToDeckA(track: TrackEntry) {
  loadToDeck(track, 'A')
}

function handleLoadToDeckB(track: TrackEntry) {
  loadToDeck(track, 'B')
}

async function handleRemoveTrack(trackId: string) {
  await removeTrack(trackId)
}

async function handleUndo() {
  await undoRemoveTrack()
}

/* --- Search Methods --- */
async function searchTracks() {
  if (!searchQuery.value.trim() || searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }

  searchLoading.value = true
  try {
    const response = await $fetch<{ tracks: TrackEntry[] }>('/api/tracks/search', {
      params: {
        q: searchQuery.value,
        genre: currentSet.value?.genre,
        limit: 10
      }
    })
    searchResults.value = response.tracks
  } catch (err) {
    console.error('[search] Error:', err)
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

function onSearchInput() {
  // Debounce search
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    searchTracks()
  }, 300)
}

// Global search - navigates to search page
function handleGlobalSearch() {
  if (!globalSearchInput.value.trim()) return
  navigateTo({ path: '/search', query: { q: globalSearchInput.value } })
}

function formatTimeAgo(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString)
  const diffMs = now - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffYears > 0) return `${diffYears}y`
  if (diffMonths > 0) return `${diffMonths}mo`
  if (diffWeeks > 0) return `${diffWeeks}w`
  if (diffDays > 0) return `${diffDays}d`
  return 'new'
}

/* --- Drag & Drop --- */
function onDragStart(index: number) {
  draggedIndex.value = index
}

function onDragOver(index: number, e: DragEvent) {
  e.preventDefault()
  dragOverIndex.value = index
}

function onDragLeave() {
  dragOverIndex.value = null
}

async function onDrop(dropIndex: number) {
  if (draggedIndex.value === null || !currentSet.value) return

  const fromIndex = draggedIndex.value
  if (fromIndex === dropIndex) {
    draggedIndex.value = null
    dragOverIndex.value = null
    return
  }

  // Reorder locally first for instant feedback
  const tracks = [...currentSet.value.tracks]
  const [moved] = tracks.splice(fromIndex, 1)
  tracks.splice(dropIndex, 0, moved)

  // Update positions
  const reorderPayload = tracks.map((t, i) => ({ id: t.id, position: i }))

  draggedIndex.value = null
  dragOverIndex.value = null

  await reorderTracks(reorderPayload)
}

function onDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}

/* --- Export --- */
async function handleExport(format: 'json' | 'rekordbox' | 'm3u') {
  showExportMenu.value = false
  await exportSet(format)
}

/* --- Lifecycle --- */
onMounted(async () => {
  headerMounted.value = true
  await fetchSet(setId.value)
  if (currentSet.value) {
    await fetchSuggestions()
  }
})

watch(setId, async (newId) => {
  if (newId) {
    await fetchSet(newId)
    if (currentSet.value) {
      await fetchSuggestions()
    }
  }
})
</script>

<template>
  <div class="flex flex-1 flex-col">
    <!-- Teleport SearchBar to header center slots -->
    <Teleport v-if="headerMounted" to="#header-center-desktop">
      <div class="w-full max-w-xl">
        <SearchBar
          v-model="globalSearchInput"
          :loading="false"
          @search="handleGlobalSearch"
        />
      </div>
    </Teleport>
    <Teleport v-if="headerMounted" to="#header-center-mobile">
      <SearchBar
        v-model="globalSearchInput"
        :loading="false"
        @search="handleGlobalSearch"
      />
    </Teleport>

    <!-- Loading -->
    <div v-if="loading && !currentSet" class="flex flex-1 items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="h-10 w-10 animate-spin text-violet-400" />
    </div>

    <!-- Error -->
    <div v-else-if="error && !currentSet" class="flex flex-1 flex-col items-center justify-center px-4">
      <UIcon name="i-heroicons-exclamation-triangle" class="mb-4 h-12 w-12 text-red-400" />
      <p class="text-red-400">{{ error }}</p>
      <NuxtLink to="/set" class="mt-4 text-violet-400 hover:underline">
        {{ t.setMySets }}
      </NuxtLink>
    </div>

    <!-- Builder -->
    <template v-else-if="currentSet">
      <main
        class="mx-auto w-full max-w-4xl flex-1 px-4 py-6 transition-all md:px-6"
        :class="{ 'pb-52': hasAnyTrack }"
      >
        <!-- Header Card -->
        <div class="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <!-- Left: Back + Set Info -->
            <div class="flex items-start gap-4">
              <NuxtLink
                to="/set"
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <UIcon name="i-heroicons-arrow-left" class="h-5 w-5" />
              </NuxtLink>
              <div class="min-w-0">
                <h1 class="text-xl font-bold text-white">{{ currentSet.name }}</h1>
                <div class="mt-1 flex flex-wrap items-center gap-3 text-sm text-neutral-400">
                  <span class="flex items-center gap-1">
                    <UIcon name="i-heroicons-musical-note" class="h-4 w-4" />
                    {{ currentSet.genre }}
                  </span>
                  <span class="flex items-center gap-1">
                    <UIcon name="i-heroicons-queue-list" class="h-4 w-4" />
                    {{ currentSet.tracks.length }} tracks
                  </span>
                  <span class="flex items-center gap-1">
                    <UIcon name="i-heroicons-clock" class="h-4 w-4" />
                    {{ formatDuration(effectiveDuration) }} / {{ formatDuration(targetDuration) }}
                  </span>
                </div>
                <!-- Progress Bar -->
                <div class="mt-3 flex items-center gap-3">
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="progress >= 100 ? 'bg-green-500' : 'bg-violet-500'"
                      :style="{ width: `${Math.min(progress, 100)}%` }"
                    />
                  </div>
                  <span class="text-sm font-medium" :class="progress >= 100 ? 'text-green-400' : 'text-neutral-400'">
                    {{ Math.round(progress) }}%
                  </span>
                </div>
              </div>
            </div>

            <!-- Right: Actions -->
            <div class="flex items-center gap-2">
              <!-- Download All Button -->
              <button
                class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all"
                :class="downloadableTracksCount > 0
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'"
                :disabled="downloadableTracksCount === 0"
                @click="showDownloadPanel = true"
              >
                <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
                <span class="hidden sm:inline">{{ t.download }}</span>
                <span v-if="downloadableTracksCount > 0" class="rounded-full bg-white/20 px-1.5 text-xs">
                  {{ downloadableTracksCount }}
                </span>
              </button>

              <!-- Export Button -->
              <div class="relative">
                <button
                  class="flex cursor-pointer items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-300 transition-all hover:bg-neutral-700 hover:text-white"
                  @click="showExportMenu = !showExportMenu"
                >
                  <UIcon name="i-heroicons-document-arrow-down" class="h-4 w-4" />
                  {{ t.setExport }}
                </button>
                <!-- Export Dropdown -->
                <Transition
                  enter-active-class="transition-all duration-150"
                  enter-from-class="opacity-0 scale-95"
                  enter-to-class="opacity-100 scale-100"
                  leave-active-class="transition-all duration-150"
                  leave-from-class="opacity-100 scale-100"
                  leave-to-class="opacity-0 scale-95"
                >
                  <div
                    v-if="showExportMenu"
                    class="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-neutral-700 bg-neutral-800 py-1 shadow-xl"
                  >
                    <button
                      class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700"
                      @click="handleExport('json')"
                    >
                      <UIcon name="i-heroicons-document-text" class="h-4 w-4" />
                      JSON
                    </button>
                    <button
                      class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700"
                      @click="handleExport('rekordbox')"
                    >
                      <UIcon name="i-heroicons-circle-stack" class="h-4 w-4" />
                      Rekordbox XML
                    </button>
                    <button
                      class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-700"
                      @click="handleExport('m3u')"
                    >
                      <UIcon name="i-heroicons-play" class="h-4 w-4" />
                      M3U Playlist
                    </button>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </div>

        <!-- Track List -->
        <div class="space-y-2">
          <!-- Track Rows -->
          <div
            v-for="(setTrack, index) in currentSet.tracks"
            :key="setTrack.id"
            draggable="true"
            class="group overflow-hidden rounded-xl border transition-all"
            :class="{
              'border-violet-500 bg-violet-500/10': dragOverIndex === index,
              'border-neutral-800/50 bg-neutral-900/60 hover:bg-neutral-900/80': dragOverIndex !== index,
              'opacity-50': draggedIndex === index,
              'ring-1 ring-violet-500/30': isOnDeckA(setTrack.soundcloudId) || isOnDeckB(setTrack.soundcloudId)
            }"
            @dragstart="onDragStart(index)"
            @dragover="onDragOver(index, $event)"
            @dragleave="onDragLeave"
            @drop="onDrop(index)"
            @dragend="onDragEnd"
          >
            <div class="flex items-center gap-3 p-2.5">
              <!-- Position + Drag Handle -->
              <div class="flex items-center gap-2">
                <span class="w-5 text-center text-xs font-medium text-neutral-500">
                  {{ index + 1 }}
                </span>
                <div class="cursor-grab text-neutral-600 hover:text-neutral-400 active:cursor-grabbing">
                  <UIcon name="i-heroicons-bars-3" class="h-4 w-4" />
                </div>
              </div>

              <!-- Artwork with A/B deck buttons -->
              <div class="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg transition-transform duration-300 group-hover:scale-105">
                <img
                  v-if="setTrack.track.artwork"
                  :src="setTrack.track.artwork"
                  :alt="setTrack.track.title"
                  class="h-full w-full object-cover"
                >
                <div v-else class="flex h-full w-full items-center justify-center bg-neutral-800">
                  <UIcon name="i-heroicons-musical-note" class="h-6 w-6 text-neutral-600" />
                </div>
                <!-- Loading/Playing indicator -->
                <div
                  v-if="isPlaying(setTrack.soundcloudId) || isLoading(setTrack.soundcloudId)"
                  class="absolute inset-0 flex items-center justify-center bg-black/60"
                >
                  <UIcon v-if="isLoading(setTrack.soundcloudId)" name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-white" />
                  <UIcon v-else name="i-heroicons-pause-solid" class="h-6 w-6 text-white" />
                </div>
                <!-- A/B deck buttons overlay -->
                <div
                  v-else
                  class="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-all group-hover:opacity-100"
                >
                  <button
                    class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-xs font-bold transition-all"
                    :class="isOnDeckA(setTrack.soundcloudId) ? 'bg-cyan-500 text-white' : 'bg-white/90 text-black hover:bg-cyan-400 hover:text-white'"
                    @click.stop="handleLoadToDeckA(setTrack.track as TrackEntry)"
                  >
                    A
                  </button>
                  <button
                    class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-xs font-bold transition-all"
                    :class="isOnDeckB(setTrack.soundcloudId) ? 'bg-orange-500 text-white' : 'bg-white/90 text-black hover:bg-orange-400 hover:text-white'"
                    @click.stop="handleLoadToDeckB(setTrack.track as TrackEntry)"
                  >
                    B
                  </button>
                </div>
              </div>

              <!-- Track Info -->
              <div class="min-w-0 flex-1">
                <!-- Title row -->
                <div class="flex items-start gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-medium text-white">
                      {{ setTrack.track.title }}
                    </div>
                    <div class="truncate text-xs text-neutral-400">
                      {{ setTrack.track.artist }}
                    </div>
                  </div>
                  <!-- Duration -->
                  <span class="shrink-0 text-xs tabular-nums text-neutral-500">
                    {{ formatDuration(setTrack.track.duration) }}
                  </span>
                </div>

                <!-- Tags row -->
                <div class="mt-2 flex flex-wrap items-center gap-1.5">
                  <!-- Genre tag -->
                  <span
                    v-if="setTrack.track.genre"
                    class="rounded-md bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400"
                  >
                    {{ setTrack.track.genre }}
                  </span>
                  <!-- Age tag -->
                  <span
                    v-if="setTrack.track.created_at"
                    class="rounded-md bg-neutral-800/50 px-1.5 py-0.5 text-xs text-neutral-500"
                  >
                    {{ formatTimeAgo(setTrack.track.created_at) }}
                  </span>
                  <!-- BPM tag -->
                  <span
                    v-if="setTrack.track.bpm_detected"
                    class="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-xs font-medium text-violet-400"
                  >
                    {{ Math.round(setTrack.track.bpm_detected) }} BPM
                  </span>
                  <!-- Key tag with color -->
                  <span
                    v-if="setTrack.track.key_detected"
                    class="rounded-md px-1.5 py-0.5 text-xs font-medium"
                    :style="{
                      backgroundColor: `${getKeyColor(setTrack.track.key_detected)}20`,
                      color: getKeyColor(setTrack.track.key_detected)
                    }"
                  >
                    {{ formatKey(setTrack.track.key_detected) }}
                  </span>
                  <!-- Spacer -->
                  <div class="flex-1" />

                  <!-- Download buttons -->
                  <a
                    v-if="setTrack.track.downloadStatus === DownloadStatus.FreeDirectLink"
                    :href="`/api/download/${setTrack.track.id}`"
                    class="flex cursor-pointer items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                    @click.stop
                  >
                    <UIcon name="i-heroicons-arrow-down-tray" class="h-3 w-3" />
                    {{ t.download }}
                  </a>
                  <a
                    v-else-if="setTrack.track.downloadStatus === DownloadStatus.FreeExternalLink && setTrack.track.purchase_url"
                    :href="setTrack.track.purchase_url"
                    target="_blank"
                    rel="noopener"
                    class="flex cursor-pointer items-center gap-1 rounded-md bg-emerald-600/80 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                    @click.stop
                  >
                    <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-3 w-3" />
                    {{ t.freeLink }}
                  </a>
                  <a
                    v-else
                    :href="setTrack.track.permalink_url"
                    target="_blank"
                    rel="noopener"
                    class="flex cursor-pointer items-center gap-1 rounded-md bg-neutral-700 px-2 py-1 text-xs text-neutral-300 transition-colors hover:bg-neutral-600"
                    @click.stop
                  >
                    <UIcon name="i-simple-icons-soundcloud" class="h-3 w-3" />
                  </a>

                  <!-- Remove button -->
                  <button
                    class="cursor-pointer rounded-md p-1 text-neutral-500 opacity-0 transition-all hover:bg-neutral-800 hover:text-red-400 group-hover:opacity-100"
                    @click="handleRemoveTrack(setTrack.id)"
                  >
                    <UIcon name="i-heroicons-trash" class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Add Track Row -->
          <div class="rounded-xl border border-dashed border-neutral-700 bg-neutral-900/30 p-4">
            <!-- Search Toggle -->
            <button
              v-if="!showSearch"
              class="mb-4 flex w-full items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-2 text-neutral-400 transition-all hover:border-neutral-600 hover:text-white"
              @click="showSearch = true"
            >
              <UIcon name="i-heroicons-magnifying-glass" class="h-4 w-4" />
              <span>{{ t.setSearchPlaceholder }}</span>
            </button>

            <!-- Search Input -->
            <div v-else class="mb-4">
              <div class="relative">
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="t.setSearchPlaceholder"
                  class="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 py-2 pl-10 pr-10 text-white placeholder-neutral-500 focus:border-violet-500 focus:outline-none"
                  autofocus
                  @input="onSearchInput"
                >
                <UIcon
                  v-if="!searchLoading"
                  name="i-heroicons-magnifying-glass"
                  class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                />
                <UIcon
                  v-else
                  name="i-heroicons-arrow-path"
                  class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-violet-400"
                />
                <button
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                  @click="showSearch = false; searchQuery = ''; searchResults = []"
                >
                  <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- Search Results -->
            <div v-if="searchQuery && searchResults.length > 0" class="mb-6">
              <div class="mb-3 text-sm font-medium text-neutral-400">
                {{ t.setSearchResults }} ({{ searchResults.length }})
              </div>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div
                  v-for="result in searchResults"
                  :key="result.id"
                  class="group/card flex items-center gap-3 overflow-hidden rounded-lg border p-2 transition-all"
                  :class="[
                    result.downloadStatus && result.downloadStatus !== DownloadStatus.No
                      ? 'border-emerald-800/30 bg-emerald-950/20 hover:bg-emerald-950/40'
                      : 'border-neutral-800 bg-neutral-800/50 hover:bg-neutral-800',
                    { 'ring-1 ring-violet-500/30': isOnDeckA(result.id) || isOnDeckB(result.id) }
                  ]"
                >
                  <!-- Artwork with A/B deck buttons -->
                  <div class="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    <img
                      v-if="result.artwork"
                      :src="result.artwork"
                      :alt="result.title"
                      class="h-full w-full object-cover"
                    >
                    <div v-else class="flex h-full w-full items-center justify-center bg-neutral-700">
                      <UIcon name="i-heroicons-musical-note" class="h-5 w-5 text-neutral-500" />
                    </div>
                    <!-- Loading/Playing indicator -->
                    <div
                      v-if="isPlaying(result.id) || isLoading(result.id)"
                      class="absolute inset-0 flex items-center justify-center bg-black/60"
                    >
                      <UIcon v-if="isLoading(result.id)" name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin text-white" />
                      <UIcon v-else name="i-heroicons-pause-solid" class="h-5 w-5 text-white" />
                    </div>
                    <!-- A/B deck buttons overlay -->
                    <div
                      v-else
                      class="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-all group-hover/card:opacity-100"
                    >
                      <button
                        class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[10px] font-bold transition-all"
                        :class="isOnDeckA(result.id) ? 'bg-cyan-500 text-white' : 'bg-white/90 text-black hover:bg-cyan-400 hover:text-white'"
                        @click.stop="handleLoadToDeckA(result)"
                      >
                        A
                      </button>
                      <button
                        class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[10px] font-bold transition-all"
                        :class="isOnDeckB(result.id) ? 'bg-orange-500 text-white' : 'bg-white/90 text-black hover:bg-orange-400 hover:text-white'"
                        @click.stop="handleLoadToDeckB(result)"
                      >
                        B
                      </button>
                    </div>
                  </div>
                  <!-- Info -->
                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-xs font-medium text-white">{{ result.title }}</p>
                        <p class="truncate text-xs text-neutral-500">{{ result.artist }}</p>
                      </div>
                      <span class="shrink-0 text-xs tabular-nums text-neutral-600">
                        {{ formatDuration(result.duration) }}
                      </span>
                    </div>
                    <!-- Tags -->
                    <div class="mt-1 flex flex-wrap items-center gap-1">
                      <span
                        v-if="result.genre"
                        class="rounded bg-neutral-800 px-1 py-0.5 text-[10px] text-neutral-500"
                      >
                        {{ result.genre }}
                      </span>
                      <span
                        v-if="result.bpm_detected"
                        class="rounded bg-violet-500/20 px-1 py-0.5 text-[10px] font-medium text-violet-400"
                      >
                        {{ Math.round(result.bpm_detected) }}
                      </span>
                      <span
                        v-if="result.key_detected"
                        class="rounded px-1 py-0.5 text-[10px] font-medium"
                        :style="{
                          backgroundColor: `${getKeyColor(result.key_detected)}20`,
                          color: getKeyColor(result.key_detected)
                        }"
                      >
                        {{ formatKey(result.key_detected) }}
                      </span>
                      <span
                        v-if="result.downloadStatus && result.downloadStatus !== DownloadStatus.No"
                        class="flex items-center gap-0.5 rounded bg-emerald-500/20 px-1 py-0.5 text-[10px] font-medium text-emerald-400"
                      >
                        <UIcon name="i-heroicons-arrow-down-tray" class="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                  <!-- Add button -->
                  <button
                    class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-violet-600 text-white opacity-0 transition-all hover:bg-violet-500 group-hover/card:opacity-100"
                    @click.stop="handleAddTrack(result)"
                  >
                    <UIcon name="i-heroicons-plus" class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Suggestions Header -->
            <div class="mb-3 flex items-center justify-between">
              <span class="text-sm font-medium text-neutral-400">
                {{ t.setSuggestions }}
              </span>
              <button
                class="flex items-center gap-1 text-sm text-neutral-500 hover:text-violet-400"
                :disabled="suggestionsLoading"
                @click="refreshSuggestions"
              >
                <UIcon
                  name="i-heroicons-arrow-path"
                  class="h-4 w-4"
                  :class="{ 'animate-spin': suggestionsLoading }"
                />
                {{ t.setSuggestionsRefresh }}
              </button>
            </div>

            <!-- Suggestions Grid -->
            <div v-if="suggestionsLoading && suggestions.length === 0" class="flex justify-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-violet-400" />
            </div>

            <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div
                v-for="suggestion in suggestions"
                :key="suggestion.id"
                class="group/card flex items-center gap-3 overflow-hidden rounded-lg border p-2 transition-all"
                :class="[
                  suggestion.downloadStatus && suggestion.downloadStatus !== DownloadStatus.No
                    ? 'border-emerald-800/30 bg-emerald-950/20 hover:bg-emerald-950/40'
                    : 'border-neutral-800 bg-neutral-800/50 hover:bg-neutral-800',
                  { 'ring-1 ring-violet-500/30': isOnDeckA(suggestion.id) || isOnDeckB(suggestion.id) }
                ]"
              >
                <!-- Artwork with A/B deck buttons -->
                <div class="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                  <img
                    v-if="suggestion.artwork"
                    :src="suggestion.artwork"
                    :alt="suggestion.title"
                    class="h-full w-full object-cover"
                  >
                  <div v-else class="flex h-full w-full items-center justify-center bg-neutral-700">
                    <UIcon name="i-heroicons-musical-note" class="h-5 w-5 text-neutral-500" />
                  </div>
                  <!-- Loading/Playing indicator -->
                  <div
                    v-if="isPlaying(suggestion.id) || isLoading(suggestion.id)"
                    class="absolute inset-0 flex items-center justify-center bg-black/60"
                  >
                    <UIcon v-if="isLoading(suggestion.id)" name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin text-white" />
                    <UIcon v-else name="i-heroicons-pause-solid" class="h-5 w-5 text-white" />
                  </div>
                  <!-- A/B deck buttons overlay -->
                  <div
                    v-else
                    class="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-all group-hover/card:opacity-100"
                  >
                    <button
                      class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[10px] font-bold transition-all"
                      :class="isOnDeckA(suggestion.id) ? 'bg-cyan-500 text-white' : 'bg-white/90 text-black hover:bg-cyan-400 hover:text-white'"
                      @click.stop="handleLoadToDeckA(suggestion as TrackEntry)"
                    >
                      A
                    </button>
                    <button
                      class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[10px] font-bold transition-all"
                      :class="isOnDeckB(suggestion.id) ? 'bg-orange-500 text-white' : 'bg-white/90 text-black hover:bg-orange-400 hover:text-white'"
                      @click.stop="handleLoadToDeckB(suggestion as TrackEntry)"
                    >
                      B
                    </button>
                  </div>
                </div>
                <!-- Info -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-xs font-medium text-white">{{ suggestion.title }}</p>
                      <p class="truncate text-xs text-neutral-500">{{ suggestion.artist }}</p>
                    </div>
                    <span class="shrink-0 text-xs tabular-nums text-neutral-600">
                      {{ formatDuration(suggestion.duration) }}
                    </span>
                  </div>
                  <!-- Tags -->
                  <div class="mt-1 flex flex-wrap items-center gap-1">
                    <span
                      v-if="suggestion.genre"
                      class="rounded bg-neutral-800 px-1 py-0.5 text-[10px] text-neutral-500"
                    >
                      {{ suggestion.genre }}
                    </span>
                    <span
                      v-if="suggestion.bpm_detected"
                      class="rounded bg-violet-500/20 px-1 py-0.5 text-[10px] font-medium text-violet-400"
                    >
                      {{ Math.round(suggestion.bpm_detected) }}
                    </span>
                    <span
                      v-if="suggestion.key_detected"
                      class="rounded px-1 py-0.5 text-[10px] font-medium"
                      :style="{
                        backgroundColor: `${getKeyColor(suggestion.key_detected)}20`,
                        color: getKeyColor(suggestion.key_detected)
                      }"
                    >
                      {{ formatKey(suggestion.key_detected) }}
                    </span>
                    <span
                      v-if="suggestion.downloadStatus && suggestion.downloadStatus !== DownloadStatus.No"
                      class="flex items-center gap-0.5 rounded bg-emerald-500/20 px-1 py-0.5 text-[10px] font-medium text-emerald-400"
                    >
                      <UIcon name="i-heroicons-arrow-down-tray" class="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
                <!-- Add button -->
                <button
                  class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-violet-600 text-white opacity-0 transition-all hover:bg-violet-500 group-hover/card:opacity-100"
                  @click.stop="handleAddTrack(suggestion as TrackEntry)"
                >
                  <UIcon name="i-heroicons-plus" class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- Empty suggestions -->
            <div
              v-if="!suggestionsLoading && suggestions.length === 0"
              class="py-8 text-center text-neutral-500"
            >
              {{ t.setNoSuggestions }}
            </div>
          </div>
        </div>
      </main>

      <!-- Download Panel Modal -->
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showDownloadPanel"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          @click.self="showDownloadPanel = false"
        >
          <div class="mx-4 max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-neutral-700 px-4 py-3">
              <h3 class="font-semibold text-white">{{ t.setDownloadTracks }}</h3>
              <button
                class="cursor-pointer rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                @click="showDownloadPanel = false"
              >
                <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
              </button>
            </div>

            <!-- Content -->
            <div class="max-h-96 overflow-y-auto p-4">
              <!-- Direct Downloads -->
              <div v-if="directDownloadTracks.length > 0" class="mb-4">
                <div class="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-400">
                  <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
                  {{ t.setFreeDownloads }} ({{ directDownloadTracks.length }})
                </div>
                <div class="space-y-2">
                  <div
                    v-for="st in directDownloadTracks"
                    :key="st.id"
                    class="flex items-center gap-3 rounded-lg bg-emerald-500/10 p-2"
                  >
                    <img
                      v-if="st.track.artwork"
                      :src="st.track.artwork"
                      :alt="st.track.title"
                      class="h-10 w-10 rounded object-cover"
                    >
                    <div v-else class="flex h-10 w-10 items-center justify-center rounded bg-neutral-800">
                      <UIcon name="i-heroicons-musical-note" class="h-5 w-5 text-neutral-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-white">{{ st.track.title }}</p>
                      <p class="truncate text-xs text-neutral-400">{{ st.track.artist }}</p>
                    </div>
                    <a
                      :href="`/api/download/${st.track.id}`"
                      class="flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                    >
                      <UIcon name="i-heroicons-arrow-down-tray" class="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              <!-- External Downloads -->
              <div v-if="externalDownloadTracks.length > 0" class="mb-4">
                <div class="mb-2 flex items-center gap-2 text-sm font-medium text-blue-400">
                  <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4" />
                  {{ t.setExternalLinks }} ({{ externalDownloadTracks.length }})
                </div>
                <div class="space-y-2">
                  <div
                    v-for="st in externalDownloadTracks"
                    :key="st.id"
                    class="flex items-center gap-3 rounded-lg bg-blue-500/10 p-2"
                  >
                    <img
                      v-if="st.track.artwork"
                      :src="st.track.artwork"
                      :alt="st.track.title"
                      class="h-10 w-10 rounded object-cover"
                    >
                    <div v-else class="flex h-10 w-10 items-center justify-center rounded bg-neutral-800">
                      <UIcon name="i-heroicons-musical-note" class="h-5 w-5 text-neutral-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-white">{{ st.track.title }}</p>
                      <p class="truncate text-xs text-neutral-400">{{ st.track.artist }}</p>
                    </div>
                    <a
                      v-if="st.track.purchase_url"
                      :href="st.track.purchase_url"
                      target="_blank"
                      rel="noopener"
                      class="flex cursor-pointer items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
                    >
                      <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              <!-- Non-downloadable -->
              <div v-if="nonDownloadableTracks.length > 0">
                <div class="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-500">
                  <UIcon name="i-heroicons-no-symbol" class="h-4 w-4" />
                  {{ t.setNoFreeDownload }} ({{ nonDownloadableTracks.length }})
                </div>
                <div class="space-y-2">
                  <div
                    v-for="st in nonDownloadableTracks"
                    :key="st.id"
                    class="flex items-center gap-3 rounded-lg bg-neutral-800/50 p-2"
                  >
                    <img
                      v-if="st.track.artwork"
                      :src="st.track.artwork"
                      :alt="st.track.title"
                      class="h-10 w-10 rounded object-cover opacity-60"
                    >
                    <div v-else class="flex h-10 w-10 items-center justify-center rounded bg-neutral-800">
                      <UIcon name="i-heroicons-musical-note" class="h-5 w-5 text-neutral-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm text-neutral-400">{{ st.track.title }}</p>
                      <p class="truncate text-xs text-neutral-500">{{ st.track.artist }}</p>
                    </div>
                    <a
                      :href="st.track.permalink_url"
                      target="_blank"
                      rel="noopener"
                      class="flex cursor-pointer items-center gap-1 rounded-lg bg-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-600"
                    >
                      <UIcon name="i-simple-icons-soundcloud" class="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- DJ Player (reused from search page) -->
      <DjPreview />

      <!-- Undo Toast -->
      <Transition
        enter-active-class="transition-all duration-300"
        enter-from-class="translate-y-full opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition-all duration-300"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-full opacity-0"
      >
        <div
          v-if="lastRemovedTrack"
          class="fixed z-50 flex items-center gap-3 rounded-full bg-neutral-800 px-4 py-2 shadow-xl"
          :class="hasAnyTrack ? 'bottom-24 left-1/2 -translate-x-1/2' : 'bottom-6 left-1/2 -translate-x-1/2'"
        >
          <span class="text-sm text-neutral-300">{{ t.setTrackRemoved }}</span>
          <button
            class="cursor-pointer font-medium text-violet-400 hover:text-violet-300"
            @click="handleUndo"
          >
            {{ t.setUndo }}
          </button>
        </div>
      </Transition>
    </template>
  </div>
</template>
