<script setup lang="ts">
import type { TrackEntry, DownloadStatus } from '~/types'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { play: playTrack, isTrackPlaying } = useSoundCloudEmbed()

/* --- State --- */
const playlistId = computed(() => route.params.id as string)
const isNewPlaylist = computed(() => playlistId.value === 'new')
const initialQuery = computed(() => route.query.q as string || '')

const playlist = ref<{
  id: string
  name: string | null
  target_duration: number | null
  style: string | null
  is_draft: boolean
} | null>(null)

interface PlaylistTrack {
  soundcloud_id: number
  title: string
  artist: string
  artwork: string | null
  duration: number
  bpm_detected: number | null
  key_detected: string | null
  genre: string | null
  permalink_url?: string | null
}

const tracks = ref<PlaylistTrack[]>([])
const currentSuggestion = ref<PlaylistTrack | null>(null)

const suggestions = ref<PlaylistTrack[]>([])
const isLoading = ref(true)
const isSearching = ref(false)
const aiQuery = ref('')
const showExportModal = ref(false)

/* --- Computed --- */
const totalDuration = computed(() =>
  tracks.value.reduce((acc, t) => acc + (t.duration || 0), 0) / 60000
)

const progressPercent = computed(() => {
  if (!playlist.value?.target_duration) return 0
  return Math.min((totalDuration.value / playlist.value.target_duration) * 100, 100)
})

const targetReached = computed(() =>
  playlist.value?.target_duration && totalDuration.value >= playlist.value.target_duration
)

/* --- Methods --- */
async function loadPlaylist() {
  try {
    if (isNewPlaylist.value) {
      // Create new draft via API
      const newPlaylist = await $fetch<typeof playlist.value>('/api/playlists', {
        method: 'POST',
        body: { target_duration: 60 }
      })
      playlist.value = newPlaylist

      if (initialQuery.value) {
        aiQuery.value = initialQuery.value
        await searchTracks()
      }
    } else {
      // Load existing playlist
      const data = await $fetch<{
        id: string
        name: string | null
        target_duration: number | null
        style: string | null
        is_draft: boolean
        tracks: PlaylistTrack[]
      }>(`/api/playlists/${playlistId.value}`)

      playlist.value = {
        id: data.id,
        name: data.name,
        target_duration: data.target_duration,
        style: data.style,
        is_draft: data.is_draft
      }
      tracks.value = data.tracks || []
    }
  } catch (error) {
    console.error('Failed to load playlist:', error)
  } finally {
    isLoading.value = false
  }
}

async function searchTracks() {
  if (!aiQuery.value.trim() || !playlist.value?.id) return

  isSearching.value = true
  try {
    const result = await $fetch<{
      tracks: PlaylistTrack[]
      sql: string
      reasoning: string
    }>(`/api/playlists/${playlist.value.id}/suggest`, {
      method: 'POST',
      body: { query: aiQuery.value }
    })

    if (result.tracks && result.tracks.length > 0) {
      currentSuggestion.value = result.tracks[0]
      suggestions.value = result.tracks.slice(1)
    } else {
      currentSuggestion.value = null
      suggestions.value = []
    }
  } catch (error: unknown) {
    console.error('Failed to search tracks:', error)
    const err = error as { statusCode?: number }
    if (err.statusCode === 429) {
      alert('Tu as atteint ta limite de 5 recherches IA par jour')
    }
    currentSuggestion.value = null
  } finally {
    isSearching.value = false
  }
}

async function addTrack() {
  if (!currentSuggestion.value || !playlist.value?.id) return

  const track = currentSuggestion.value
  tracks.value.push(track)

  try {
    // Save to playlist
    await $fetch(`/api/playlists/${playlist.value.id}/tracks`, {
      method: 'POST',
      body: { soundcloud_id: track.soundcloud_id }
    })
  } catch (error) {
    console.error('Failed to add track:', error)
    // Remove from local list if API failed
    tracks.value = tracks.value.filter(t => t.soundcloud_id !== track.soundcloud_id)
    return
  }

  // Get next suggestion from queue or search again
  if (suggestions.value.length > 0) {
    currentSuggestion.value = suggestions.value.shift() || null
  } else {
    currentSuggestion.value = null
    await searchTracks()
  }
}

async function skipTrack() {
  if (!currentSuggestion.value || !playlist.value?.id) return

  const track = currentSuggestion.value

  try {
    // Record skip feedback
    await $fetch(`/api/playlists/${playlist.value.id}/feedback`, {
      method: 'POST',
      body: { soundcloud_id: track.soundcloud_id, action: 'skip' }
    })
  } catch (error) {
    console.error('Failed to save feedback:', error)
  }

  // Get next suggestion
  if (suggestions.value.length > 0) {
    currentSuggestion.value = suggestions.value.shift() || null
  } else {
    currentSuggestion.value = null
    await searchTracks()
  }
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`
}

function toTrackEntry(track: PlaylistTrack): TrackEntry {
  return {
    id: track.soundcloud_id,
    urn: `soundcloud:tracks:${track.soundcloud_id}`,
    permalink_url: track.permalink_url || `https://soundcloud.com/track/${track.soundcloud_id}`,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork,
    duration: track.duration,
    genre: track.genre,
    description: null,
    created_at: null,
    label: null,
    tags: [],
    bpm_detected: track.bpm_detected,
    bpm_confidence: null,
    key_detected: track.key_detected,
    key_confidence: null,
    energy: null,
    loudness: null,
    dynamic_complexity: null,
    spectral_centroid: null,
    dissonance: null,
    danceability: null,
    speechiness: null,
    instrumentalness: null,
    acousticness: null,
    valence: null,
    liveness: null,
    beat_offset: null,
    highlight_time: null,
    analysis_status: null,
    analysis_error: null,
    analyzed_at: null,
    playback_count: 0,
    likes_count: 0,
    reposts_count: 0,
    comment_count: 0,
    downloadStatus: 'No' as DownloadStatus,
    downloadable: false,
    purchase_url: null,
    purchase_title: null
  }
}

function handlePreview(track: PlaylistTrack) {
  if (!track.permalink_url) return
  playTrack(toTrackEntry(track))
}

/* --- Lifecycle --- */
onMounted(() => {
  loadPlaylist()
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
          <span class="hidden sm:inline">Dashboard</span>
        </button>

        <h1 class="text-lg font-medium text-white">
          {{ playlist?.name || 'Nouvelle playlist' }}
        </h1>

        <div class="flex items-center gap-2">
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 transition-colors hover:bg-neutral-700"
            title="Paramètres"
          >
            <UIcon name="i-heroicons-cog-6-tooth" class="h-5 w-5 text-neutral-300" />
          </button>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 transition-colors hover:bg-orange-600"
            title="Exporter"
            @click="showExportModal = true"
          >
            <UIcon name="i-heroicons-arrow-up-tray" class="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <!-- AI Search Bar -->
      <div class="mb-6">
        <form class="relative" @submit.prevent="searchTracks">
          <div class="absolute left-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <div class="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500">
              <UIcon name="i-heroicons-sparkles" class="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <input
            v-model="aiQuery"
            type="text"
            placeholder="Dis à l'IA ce que tu cherches..."
            class="w-full rounded-xl border border-neutral-700 bg-neutral-900 py-3 pl-14 pr-4 text-white placeholder-neutral-500 transition-colors focus:border-orange-500 focus:outline-none"
            :disabled="isSearching"
          >
        </form>
      </div>

      <!-- Current Suggestion Card -->
      <div class="mb-6 flex justify-center">
        <div
          v-if="isSearching"
          class="flex h-80 w-72 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900"
        >
          <div class="text-center">
            <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-orange-500" />
            <p class="mt-4 text-sm text-neutral-400">L'IA cherche des tracks...</p>
          </div>
        </div>

        <div
          v-else-if="currentSuggestion"
          class="w-72 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
        >
          <!-- Artwork -->
          <div class="aspect-square bg-neutral-800">
            <img
              v-if="currentSuggestion.artwork"
              :src="currentSuggestion.artwork"
              :alt="currentSuggestion.title"
              class="h-full w-full object-cover"
            >
            <div v-else class="flex h-full items-center justify-center">
              <UIcon name="i-heroicons-musical-note" class="h-16 w-16 text-neutral-700" />
            </div>
          </div>

          <!-- Info -->
          <div class="p-4">
            <p class="font-medium text-white">{{ currentSuggestion.artist }}</p>
            <p class="text-sm text-neutral-400">{{ currentSuggestion.title }}</p>
            <div class="mt-2 flex items-center gap-2 text-xs text-neutral-500">
              <span v-if="currentSuggestion.bpm_detected">{{ Math.round(currentSuggestion.bpm_detected) }} BPM</span>
              <span v-if="currentSuggestion.key_detected">{{ currentSuggestion.key_detected }}</span>
              <span v-if="currentSuggestion.genre">{{ currentSuggestion.genre }}</span>
            </div>

            <!-- Preview button -->
            <button
              class="mt-4 w-full rounded-lg py-2 text-sm text-white transition-colors"
              :class="isTrackPlaying(currentSuggestion.soundcloud_id)
                ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-neutral-800 hover:bg-neutral-700'"
              :disabled="!currentSuggestion.permalink_url"
              @click="handlePreview(currentSuggestion)"
            >
              <UIcon
                :name="isTrackPlaying(currentSuggestion.soundcloud_id) ? 'i-heroicons-pause' : 'i-heroicons-play'"
                class="mr-1 inline h-4 w-4"
              />
              {{ isTrackPlaying(currentSuggestion.soundcloud_id) ? 'Playing' : 'Preview' }}
            </button>
          </div>

          <!-- Actions -->
          <div class="flex border-t border-neutral-800">
            <button
              class="flex flex-1 items-center justify-center gap-2 py-4 text-red-400 transition-colors hover:bg-red-500/10"
              @click="skipTrack"
            >
              <UIcon name="i-heroicons-x-mark" class="h-6 w-6" />
              <span>Skip</span>
            </button>
            <div class="w-px bg-neutral-800" />
            <button
              class="flex flex-1 items-center justify-center gap-2 py-4 text-green-400 transition-colors hover:bg-green-500/10"
              @click="addTrack"
            >
              <UIcon name="i-heroicons-plus" class="h-6 w-6" />
              <span>Add</span>
            </button>
          </div>
        </div>

        <div
          v-else
          class="flex h-80 w-72 items-center justify-center rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/50"
        >
          <div class="text-center">
            <UIcon name="i-heroicons-musical-note" class="mx-auto h-12 w-12 text-neutral-700" />
            <p class="mt-4 text-sm text-neutral-400">Tape une recherche IA pour commencer</p>
          </div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div
        v-if="playlist?.target_duration"
        class="mb-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4"
      >
        <div class="mb-2 flex items-center justify-between text-sm">
          <span class="text-neutral-400">Progression</span>
          <span class="text-white">
            {{ formatMinutes(totalDuration) }} / {{ formatMinutes(playlist.target_duration) }}
          </span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-neutral-800">
          <div
            class="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>

      <!-- Track List -->
      <div class="rounded-xl border border-neutral-800 bg-neutral-900">
        <div class="border-b border-neutral-800 px-4 py-3">
          <h2 class="font-medium text-white">Tracks ({{ tracks.length }})</h2>
        </div>

        <div v-if="tracks.length === 0" class="py-12 text-center">
          <p class="text-sm text-neutral-500">Aucune track pour l'instant</p>
        </div>

        <div v-else class="divide-y divide-neutral-800">
          <div
            v-for="(track, index) in tracks"
            :key="track.soundcloud_id"
            class="flex items-center gap-4 px-4 py-3"
          >
            <span class="w-6 text-center text-sm text-neutral-500">{{ index + 1 }}</span>
            <div class="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-neutral-800">
              <img
                v-if="track.artwork"
                :src="track.artwork"
                :alt="track.title"
                class="h-full w-full object-cover"
              >
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-white">{{ track.title }}</p>
              <p class="truncate text-xs text-neutral-400">{{ track.artist }}</p>
            </div>
            <div class="flex items-center gap-3 text-xs text-neutral-500">
              <span v-if="track.bpm_detected">{{ Math.round(track.bpm_detected) }}</span>
              <span v-if="track.key_detected">{{ track.key_detected }}</span>
              <span>{{ formatDuration(track.duration) }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- SoundCloud Player -->
    <SoundCloudPlayer />

    <!-- Target Reached Modal -->
    <Teleport to="body">
      <div
        v-if="targetReached"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      >
        <div class="w-full max-w-md rounded-2xl bg-neutral-900 p-6 text-center">
          <div class="mb-4 text-4xl">🎉</div>
          <h2 class="mb-2 text-xl font-bold text-white">Objectif atteint !</h2>
          <p class="mb-6 text-neutral-400">
            Ta playlist contient {{ tracks.length }} tracks ({{ formatMinutes(totalDuration) }})
          </p>
          <div class="flex gap-3">
            <button
              class="flex-1 rounded-lg border border-neutral-700 py-3 text-white transition-colors hover:bg-neutral-800"
              @click="targetReached && (playlist!.target_duration = null)"
            >
              Continuer
            </button>
            <button
              class="flex-1 rounded-lg bg-orange-500 py-3 text-white transition-colors hover:bg-orange-600"
              @click="showExportModal = true"
            >
              Exporter
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
