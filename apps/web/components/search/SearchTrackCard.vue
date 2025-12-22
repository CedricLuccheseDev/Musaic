<script setup lang="ts">
import { AnalysisStatus, DownloadStatus, type TrackEntry } from '~/types'
import type { ArtistInfo } from '~/server/services/soundcloud'

/* --- Props --- */
const props = withDefaults(defineProps<{
  track: TrackEntry
  index?: number
  skipAnimation?: boolean
  detectedArtist?: ArtistInfo | null
}>(), {
  index: 0,
  skipAnimation: false,
  detectedArtist: null
})

/* --- States --- */
const { t } = useI18n()
const config = useRuntimeConfig()
const { formatKey, getKeyColor } = useKeyNotation()
const { loadToDeck, deckA, deckB, getTargetDeck, togglePlay, ejectDeck } = useDjPlayer()
const isVisible = ref(props.skipAnimation)
const showDetails = ref(false)
const showSimilar = ref(false)

/* --- Computed --- */
const hasAnalysis = computed(() => props.track.analysis_status === AnalysisStatus.Completed)
const isAnalyzing = computed(() =>
  !props.track.analysis_status ||
  props.track.analysis_status === AnalysisStatus.Pending ||
  props.track.analysis_status === AnalysisStatus.Processing
)

const isFromDetectedArtist = computed(() => {
  if (!props.detectedArtist) return false
  return props.track.artist.toLowerCase() === props.detectedArtist.username.toLowerCase()
})

const isFreeDownload = computed(() => props.track.downloadStatus !== DownloadStatus.No)
const isDirectDownload = computed(() => props.track.downloadStatus === DownloadStatus.FreeDirectLink)
const isOnDeckA = computed(() => deckA.value.track?.id === props.track.id)
const isOnDeckB = computed(() => deckB.value.track?.id === props.track.id)
const isPlaying = computed(() => (isOnDeckA.value && deckA.value.isPlaying) || (isOnDeckB.value && deckB.value.isPlaying))
const isCurrentlyLoading = computed(() => (isOnDeckA.value && deckA.value.isLoading) || (isOnDeckB.value && deckB.value.isLoading))
const isOnAnyDeck = computed(() => isOnDeckA.value || isOnDeckB.value)

const artistUrl = computed(() => {
  const url = props.track.permalink_url
  const match = url.match(/^(https:\/\/soundcloud\.com\/[^/]+)/)
  return match ? match[1] : `https://soundcloud.com/search?q=${encodeURIComponent(props.track.artist)}`
})

const mp3DownloadUrl = computed(() => {
  const query = encodeURIComponent(`${props.track.artist} ${props.track.title}`)
  return `https://soundcloudmp3.org/search?q=${query}`
})

const cardClass = computed(() => {
  if (isOnAnyDeck.value) {
    return 'bg-violet-950/50 hover:bg-violet-950/60 border-violet-500/50 ring-1 ring-violet-500/30'
  }
  if (props.track.downloadStatus === DownloadStatus.FreeDirectLink) {
    return 'bg-emerald-950/40 hover:bg-emerald-950/40 border-emerald-800/30'
  }
  if (props.track.downloadStatus === DownloadStatus.FreeExternalLink) {
    return 'bg-emerald-950/30 hover:bg-emerald-950/60 border-emerald-700/40'
  }
  return 'bg-neutral-900/80 hover:bg-neutral-800/80 border-neutral-800/50'
})

/* --- Methods --- */
function handleCardClick() {
  // If track is already on a deck, toggle play/pause
  if (isOnDeckA.value) {
    togglePlay('A')
    return
  }
  if (isOnDeckB.value) {
    togglePlay('B')
    return
  }

  // Otherwise load to appropriate deck
  const targetDeck = getTargetDeck()
  loadToDeck(props.track, targetDeck)
}

function getDownloadUrl(): string | null {
  if (props.track.downloadStatus === DownloadStatus.FreeDirectLink) {
    return `/api/download/${props.track.id}`
  }
  if (props.track.downloadStatus === DownloadStatus.FreeExternalLink) {
    return props.track.purchase_url
  }
  return null
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function handleDeckClick(deck: 'A' | 'B') {
  if (!hasAnalysis.value) return

  const isOnThisDeck = deck === 'A' ? isOnDeckA.value : isOnDeckB.value
  const isOnOtherDeck = deck === 'A' ? isOnDeckB.value : isOnDeckA.value
  const otherDeck = deck === 'A' ? 'B' : 'A'

  if (isOnThisDeck) {
    // Track is already on this deck - eject it
    ejectDeck(deck)
  }
  else if (isOnOtherDeck) {
    // Track is on the other deck - move it to this deck
    ejectDeck(otherDeck)
    loadToDeck(props.track, deck)
  }
  else {
    // Track is not loaded anywhere - load to deck
    loadToDeck(props.track, deck)
  }
}

/* --- Lifecycle --- */
onMounted(() => {
  if (props.skipAnimation) return
  setTimeout(() => {
    isVisible.value = true
  }, props.index * 50)
})
</script>

<template>
  <div
    class="group relative overflow-hidden rounded-lg border transition-all duration-300"
    :class="[cardClass, isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0']"
  >
    <!-- Main clickable area -->
    <div
      class="flex cursor-pointer items-center gap-2.5 p-2 sm:gap-3 sm:p-2.5"
      @click="handleCardClick"
    >
      <!-- Artist badge -->
      <UTooltip v-if="isFromDetectedArtist && props.detectedArtist" :text="`Track de ${props.detectedArtist.username}`">
        <div class="relative -mr-1 h-6 w-6 shrink-0 overflow-hidden rounded-full ring-2 ring-cyan-500/50">
          <img
            v-if="props.detectedArtist.avatar_url"
            :src="props.detectedArtist.avatar_url"
            :alt="props.detectedArtist.username"
            class="h-full w-full object-cover"
          >
          <div v-else class="flex h-full w-full items-center justify-center bg-cyan-900">
            <UIcon name="i-heroicons-user" class="h-3 w-3 text-cyan-400" />
          </div>
        </div>
      </UTooltip>

      <!-- Artwork -->
      <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-md sm:h-12 sm:w-12">
        <img
          v-if="track.artwork"
          :src="track.artwork"
          :alt="track.title"
          class="h-full w-full object-cover"
        >
        <div v-else class="flex h-full w-full items-center justify-center bg-neutral-800">
          <UIcon name="i-heroicons-musical-note" class="h-5 w-5 text-neutral-600" />
        </div>
        <!-- Play overlay -->
        <div
          class="absolute inset-0 flex items-center justify-center transition-all"
          :class="isPlaying || isCurrentlyLoading ? 'bg-black/50 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'"
        >
          <UIcon v-if="isCurrentlyLoading" name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin text-white" />
          <UIcon v-else-if="isPlaying" name="i-heroicons-pause-solid" class="h-5 w-5 text-white" />
          <UIcon v-else name="i-heroicons-play-solid" class="h-5 w-5 text-white" />
        </div>
      </div>

      <!-- Info -->
      <div class="min-w-0 flex-1 overflow-hidden pr-20 sm:pr-24">
        <a
          :href="track.permalink_url"
          target="_blank"
          rel="noopener"
          class="block truncate text-sm font-medium text-white hover:text-violet-400 sm:text-base"
          @click.stop
        >
          {{ track.title }}
        </a>
        <a
          :href="artistUrl"
          target="_blank"
          rel="noopener"
          class="block truncate text-xs text-neutral-400 hover:text-violet-400 sm:text-sm"
          @click.stop
        >
          {{ track.artist }}
        </a>
        <!-- Meta row -->
        <div class="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500 sm:text-xs">
          <span>{{ formatDuration(track.duration) }}</span>
          <span v-if="track.playback_count" class="hidden sm:inline">{{ track.playback_count.toLocaleString() }} plays</span>
          <!-- Analysis -->
          <template v-if="isAnalyzing">
            <span class="flex items-center gap-1 text-neutral-500">
              <UIcon name="i-heroicons-arrow-path" class="h-2.5 w-2.5 animate-spin" />
              {{ t.analysisProcessing }}
            </span>
          </template>
          <template v-else-if="hasAnalysis">
            <span v-if="track.bpm_detected" class="text-violet-400">{{ Math.round(track.bpm_detected) }} BPM</span>
            <span
              v-if="track.key_detected"
              class="rounded px-1 py-0.5 text-[9px] font-semibold"
              :style="{
                backgroundColor: `${getKeyColor(track.key_detected)}20`,
                color: getKeyColor(track.key_detected)
              }"
            >
              {{ formatKey(track.key_detected) }}
            </span>
            <button
              type="button"
              class="cursor-pointer text-violet-400 hover:text-violet-300"
              @click.stop="showDetails = true"
            >
              {{ t.analysisDetails }}
            </button>
            <button
              type="button"
              class="cursor-pointer text-cyan-400 hover:text-cyan-300"
              @click.stop="showSimilar = true"
            >
              ≈
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5" @click.stop>
      <!-- Free Direct Download -->
      <a
        v-if="isDirectDownload"
        :href="getDownloadUrl()!"
        class="flex h-7 items-center gap-1 rounded-full bg-emerald-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
        @click.stop
      >
        <UIcon name="i-heroicons-arrow-down-tray" class="h-3.5 w-3.5" />
        <span class="hidden sm:inline">{{ t.download }}</span>
      </a>

      <!-- Free External Link -->
      <a
        v-else-if="isFreeDownload"
        :href="getDownloadUrl() || track.permalink_url"
        target="_blank"
        rel="noopener"
        class="flex h-7 items-center gap-1 rounded-full bg-emerald-600/80 px-2.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
        @click.stop
      >
        <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-3.5 w-3.5" />
        <span class="hidden sm:inline">{{ t.freeLink }}</span>
      </a>

      <!-- Buy button -->
      <a
        v-else-if="track.purchase_url"
        :href="track.purchase_url"
        target="_blank"
        rel="noopener"
        class="flex h-7 items-center gap-1 rounded-full border border-orange-500/40 px-2.5 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-500/10"
        @click.stop
      >
        <UIcon name="i-heroicons-shopping-cart" class="h-3.5 w-3.5" />
        <span class="hidden sm:inline">{{ t.buy }}</span>
      </a>

      <!-- MP3 Download (dev only) -->
      <a
        v-else-if="config.public.isDev"
        :href="mp3DownloadUrl"
        target="_blank"
        rel="noopener"
        class="flex h-7 items-center gap-1 rounded-full border border-violet-500/40 px-2.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/10"
        @click.stop
      >
        <UIcon name="i-heroicons-arrow-down-tray" class="h-3.5 w-3.5" />
        <span class="hidden sm:inline">MP3</span>
      </a>

      <!-- SoundCloud link -->
      <a
        v-else
        :href="track.permalink_url"
        target="_blank"
        rel="noopener"
        class="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-orange-400"
        @click.stop
      >
        <UIcon name="i-simple-icons-soundcloud" class="h-4 w-4" />
      </a>

      <!-- DJ Deck buttons -->
      <div class="flex items-center gap-1">
        <UTooltip :text="hasAnalysis ? (isOnDeckA ? t.djEjectFromA : t.djLoadToA) : t.djTrackNotAnalyzed">
          <button
            type="button"
            class="rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors"
            :class="[
              isOnDeckA
                ? 'bg-cyan-500 text-white cursor-pointer'
                : hasAnalysis
                  ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 cursor-pointer'
                  : 'bg-neutral-700/30 text-neutral-500 cursor-not-allowed'
            ]"
            :disabled="!hasAnalysis"
            @click.stop="handleDeckClick('A')"
          >
            A
          </button>
        </UTooltip>
        <UTooltip :text="hasAnalysis ? (isOnDeckB ? t.djEjectFromB : t.djLoadToB) : t.djTrackNotAnalyzed">
          <button
            type="button"
            class="rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors"
            :class="[
              isOnDeckB
                ? 'bg-orange-500 text-white cursor-pointer'
                : hasAnalysis
                  ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 cursor-pointer'
                  : 'bg-neutral-700/30 text-neutral-500 cursor-not-allowed'
            ]"
            :disabled="!hasAnalysis"
            @click.stop="handleDeckClick('B')"
          >
            B
          </button>
        </UTooltip>
      </div>
    </div>

    <!-- Details Modal -->
    <TrackDetailsModal
      :track="track"
      :open="showDetails"
      @close="showDetails = false"
    />

    <!-- Similar Tracks Modal -->
    <SimilarTracksModal
      :track="track"
      :open="showSimilar"
      @close="showSimilar = false"
    />
  </div>
</template>
