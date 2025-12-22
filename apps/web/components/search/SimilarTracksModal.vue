<script setup lang="ts">
import type { TrackEntry } from '~/types'
import { AnalysisStatus } from '~/types'

/* --- Props --- */
const props = defineProps<{
  track: TrackEntry
  open: boolean
}>()

/* --- Emits --- */
const emit = defineEmits<{
  close: []
}>()

/* --- Composables --- */
const { t } = useI18n()
const { play } = useAudioPlayer()
const { formatKey, getKeyColor } = useKeyNotation()

/* --- States --- */
const similarTracks = ref<(TrackEntry & { similarity: number })[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

/* --- Computed --- */
const hasEmbedding = computed(() => props.track.analysis_status === AnalysisStatus.Completed)

/* --- Methods --- */
async function fetchSimilarTracks() {
  if (!hasEmbedding.value) return

  loading.value = true
  error.value = null

  try {
    const response = await $fetch<{ tracks: (TrackEntry & { similarity: number })[] }>(
      `/api/similar/${props.track.id}`,
      { query: { limit: 10 } }
    )
    similarTracks.value = response.tracks
  }
  catch (e) {
    error.value = 'Failed to load similar tracks'
    console.error('Similar tracks error:', e)
  }
  finally {
    loading.value = false
  }
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function handlePlayTrack(track: TrackEntry) {
  play(track)
}

/* --- Watchers --- */
watch(() => props.open, (isOpen) => {
  if (isOpen && similarTracks.value.length === 0) {
    fetchSimilarTracks()
  }
})
</script>

<template>
  <UModal :open="open" @close="emit('close')">
    <template #content>
      <div class="bg-neutral-900">
        <!-- Header -->
        <div class="relative">
          <div class="absolute inset-0 overflow-hidden">
            <img
              v-if="track.artwork"
              :src="track.artwork"
              :alt="track.title"
              class="h-full w-full object-cover opacity-30 blur-xl"
            >
          </div>
          <div class="relative flex items-center gap-4 p-4">
            <div class="h-14 w-14 shrink-0 overflow-hidden rounded-xl shadow-xl">
              <img
                v-if="track.artwork"
                :src="track.artwork"
                :alt="track.title"
                class="h-full w-full object-cover"
              >
              <div v-else class="flex h-full w-full items-center justify-center bg-neutral-800">
                <UIcon name="i-heroicons-musical-note" class="h-7 w-7 text-neutral-500" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-medium uppercase tracking-wider text-violet-400">{{ t.similarTo }}</p>
              <h2 class="truncate text-base font-bold text-white">{{ track.title }}</h2>
              <p class="truncate text-sm text-neutral-300">{{ track.artist }}</p>
            </div>
            <button
              type="button"
              class="cursor-pointer rounded-full bg-black/30 p-2 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
              @click="emit('close')"
            >
              <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="max-h-[60vh] overflow-y-auto p-4">
          <!-- No embedding state -->
          <div v-if="!hasEmbedding" class="flex flex-col items-center justify-center py-8 text-center">
            <UIcon name="i-heroicons-cube-transparent" class="mb-3 h-12 w-12 text-neutral-500" />
            <p class="text-neutral-400">{{ t.similarNotAnalyzed }}</p>
          </div>

          <!-- Loading state -->
          <div v-else-if="loading" class="flex flex-col items-center justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="mb-3 h-10 w-10 animate-spin text-violet-400" />
            <p class="text-neutral-400">{{ t.similarSearching }}</p>
          </div>

          <!-- Error state -->
          <div v-else-if="error" class="flex flex-col items-center justify-center py-8 text-center">
            <UIcon name="i-heroicons-exclamation-triangle" class="mb-3 h-12 w-12 text-red-400" />
            <p class="text-red-400">{{ error }}</p>
          </div>

          <!-- No results -->
          <div v-else-if="similarTracks.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
            <UIcon name="i-heroicons-magnifying-glass" class="mb-3 h-12 w-12 text-neutral-500" />
            <p class="text-neutral-400">{{ t.similarNoResults }}</p>
          </div>

          <!-- Similar tracks list -->
          <div v-else class="space-y-2">
            <div
              v-for="(similarTrack, index) in similarTracks"
              :key="similarTrack.id"
              class="group flex cursor-pointer items-center gap-3 rounded-lg bg-neutral-800/50 p-2 transition-colors hover:bg-neutral-800"
              @click="handlePlayTrack(similarTrack)"
            >
              <!-- Rank -->
              <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">
                {{ index + 1 }}
              </div>

              <!-- Artwork -->
              <div class="relative h-10 w-10 shrink-0 overflow-hidden rounded">
                <img
                  v-if="similarTrack.artwork"
                  :src="similarTrack.artwork"
                  :alt="similarTrack.title"
                  class="h-full w-full object-cover"
                >
                <div v-else class="flex h-full w-full items-center justify-center bg-neutral-700">
                  <UIcon name="i-heroicons-musical-note" class="h-4 w-4 text-neutral-500" />
                </div>
                <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <UIcon name="i-heroicons-play-solid" class="h-4 w-4 text-white" />
                </div>
              </div>

              <!-- Info -->
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-white">{{ similarTrack.title }}</p>
                <p class="truncate text-xs text-neutral-400">{{ similarTrack.artist }}</p>
              </div>

              <!-- Analysis info -->
              <div class="hidden items-center gap-2 text-xs sm:flex">
                <span v-if="similarTrack.bpm_detected" class="text-violet-400">
                  {{ Math.round(similarTrack.bpm_detected) }}
                </span>
                <span
                  v-if="similarTrack.key_detected"
                  class="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  :style="{
                    backgroundColor: `${getKeyColor(similarTrack.key_detected)}20`,
                    color: getKeyColor(similarTrack.key_detected)
                  }"
                >
                  {{ formatKey(similarTrack.key_detected) }}
                </span>
              </div>

              <!-- Similarity badge -->
              <div class="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">
                {{ similarTrack.similarity }}%
              </div>

              <!-- Duration -->
              <span class="shrink-0 text-xs text-neutral-500">
                {{ formatDuration(similarTrack.duration) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
