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
const isReanalyzing = ref(false)
const showDownloadIframe = ref(false)

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
    return 'bg-violet-950/50 hover:bg-violet-950/70 border-violet-500/50 ring-1 ring-violet-500/30'
  }
  if (props.track.downloadStatus === DownloadStatus.FreeDirectLink) {
    return 'bg-emerald-950/30 hover:bg-emerald-950/50 border-emerald-700/40'
  }
  if (props.track.downloadStatus === DownloadStatus.FreeExternalLink) {
    return 'bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-800/30'
  }
  return 'bg-neutral-900/60 hover:bg-neutral-900/80 border-neutral-800/50'
})

/* --- Methods --- */
function handleCardClick() {
  if (isOnDeckA.value) {
    togglePlay('A')
    return
  }
  if (isOnDeckB.value) {
    togglePlay('B')
    return
  }
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

function formatTimeAgo(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString)
  const diffMs = now - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffYears > 0) {
    return `${diffYears}y`
  }
  if (diffMonths > 0) {
    return `${diffMonths}mo`
  }
  if (diffWeeks > 0) {
    return `${diffWeeks}w`
  }
  if (diffDays > 0) {
    return `${diffDays}d`
  }
  if (diffHours > 0) {
    return `${diffHours}h`
  }
  if (diffMinutes > 0) {
    return `${diffMinutes}m`
  }
  return 'now'
}

function handleDeckClick(deck: 'A' | 'B') {
  if (!hasAnalysis.value) return

  const isOnThisDeck = deck === 'A' ? isOnDeckA.value : isOnDeckB.value
  const isOnOtherDeck = deck === 'A' ? isOnDeckB.value : isOnDeckA.value
  const otherDeck = deck === 'A' ? 'B' : 'A'

  if (isOnThisDeck) {
    ejectDeck(deck)
  }
  else if (isOnOtherDeck) {
    ejectDeck(otherDeck)
    loadToDeck(props.track, deck)
  }
  else {
    loadToDeck(props.track, deck)
  }
}

async function reanalyzeTrack() {
  if (isReanalyzing.value) return
  isReanalyzing.value = true
  try {
    await $fetch('/api/dashboard/analyze-single', {
      method: 'POST',
      body: { soundcloud_id: props.track.id }
    })
  }
  catch (e) {
    console.error('Reanalysis failed:', e)
  }
  finally {
    isReanalyzing.value = false
  }
}

function openDownloadIframe(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  showDownloadIframe.value = !showDownloadIframe.value
}

function closeDownloadIframe() {
  showDownloadIframe.value = false
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
    class="group overflow-hidden rounded-xl border transition-all duration-300"
    :class="[cardClass, isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0']"
  >
    <!-- Main content -->
    <div
      class="flex cursor-pointer items-center gap-3 p-2.5"
      @click="handleCardClick"
    >
      <!-- Artwork -->
      <div class="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg transition-transform duration-300 group-hover:scale-105">
        <!-- Artist badge overlay -->
        <div
          v-if="isFromDetectedArtist && detectedArtist"
          class="absolute -left-1 -top-1 z-10 h-5 w-5 overflow-hidden rounded-full ring-2 ring-cyan-500"
        >
          <img
            v-if="detectedArtist.avatar_url"
            :src="detectedArtist.avatar_url"
            :alt="detectedArtist.username"
            class="h-full w-full object-cover"
          >
        </div>

        <img
          v-if="track.artwork"
          :src="track.artwork"
          :alt="track.title"
          class="h-full w-full object-cover"
        >
        <div v-else class="flex h-full w-full items-center justify-center bg-neutral-800">
          <UIcon name="i-heroicons-musical-note" class="h-6 w-6 text-neutral-600" />
        </div>

        <!-- Play overlay -->
        <div
          class="absolute inset-0 flex items-center justify-center transition-all"
          :class="isPlaying || isCurrentlyLoading ? 'bg-black/60 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'"
        >
          <UIcon v-if="isCurrentlyLoading" name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-white" />
          <UIcon v-else-if="isPlaying" name="i-heroicons-pause-solid" class="h-6 w-6 text-white" />
          <UIcon v-else name="i-heroicons-play-solid" class="h-6 w-6 text-white" />
        </div>
      </div>

      <!-- Track info -->
      <div class="min-w-0 flex-1">
        <!-- Title row -->
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <div class="truncate">
              <a
                :href="track.permalink_url"
                target="_blank"
                rel="noopener"
                class="text-sm font-medium text-white hover:text-violet-400"
                @click.stop
              >
                {{ track.title }}
              </a>
            </div>
            <div class="truncate">
              <a
                :href="artistUrl"
                target="_blank"
                rel="noopener"
                class="text-xs text-neutral-400 hover:text-violet-400"
                @click.stop
              >
                {{ track.artist }}
              </a>
            </div>
          </div>

          <!-- Duration + Deck buttons -->
          <div class="flex shrink-0 items-center gap-2" @click.stop>
            <span class="text-xs tabular-nums text-neutral-500">
              {{ formatDuration(track.duration) }}
            </span>

            <!-- Deck A -->
            <button
              type="button"
              class="rounded-md px-2 py-1 text-xs font-bold transition-colors"
              :class="[
                isOnDeckA
                  ? 'bg-cyan-500 text-white cursor-pointer'
                  : hasAnalysis
                    ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 cursor-pointer'
                    : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
              ]"
              :disabled="!hasAnalysis"
              @click.stop="handleDeckClick('A')"
            >
              A
            </button>

            <!-- Deck B -->
            <button
              type="button"
              class="rounded-md px-2 py-1 text-xs font-bold transition-colors"
              :class="[
                isOnDeckB
                  ? 'bg-orange-500 text-white cursor-pointer'
                  : hasAnalysis
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 cursor-pointer'
                    : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
              ]"
              :disabled="!hasAnalysis"
              @click.stop="handleDeckClick('B')"
            >
              B
            </button>
          </div>
        </div>

        <!-- Tags row -->
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <!-- Genre tag -->
          <span
            v-if="track.genre"
            class="rounded-md bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400"
          >
            {{ track.genre }}
          </span>

          <!-- Age tag -->
          <span
            v-if="track.created_at"
            class="rounded-md bg-neutral-800/50 px-2 py-0.5 text-xs text-neutral-500"
          >
            {{ formatTimeAgo(track.created_at) }}
          </span>

          <!-- Analysis tags -->
          <template v-if="hasAnalysis">
            <span
              v-if="track.bpm_detected"
              class="rounded-md bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-400"
            >
              {{ Math.round(track.bpm_detected) }} BPM
            </span>
            <span
              v-if="track.key_detected"
              class="rounded-md px-2 py-0.5 text-xs font-medium"
              :style="{
                backgroundColor: `${getKeyColor(track.key_detected)}20`,
                color: getKeyColor(track.key_detected)
              }"
            >
              {{ formatKey(track.key_detected) }}
            </span>
          </template>

          <!-- Analyzing indicator -->
          <span v-else-if="isAnalyzing" class="flex items-center gap-1 text-xs text-neutral-500">
            <UIcon name="i-heroicons-arrow-path" class="h-3 w-3 animate-spin" />
          </span>

          <!-- Spacer -->
          <div class="flex-1" />

          <!-- Action buttons -->
          <div class="flex items-center gap-1.5" @click.stop>
            <!-- Reanalyze (dev only) -->
            <button
              v-if="config.public.isDev && hasAnalysis"
              type="button"
              class="cursor-pointer rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-yellow-400"
              :disabled="isReanalyzing"
              @click.stop="reanalyzeTrack"
            >
              <UIcon
                name="i-heroicons-arrow-path"
                class="h-4 w-4"
                :class="{ 'animate-spin': isReanalyzing }"
              />
            </button>

            <!-- Details -->
            <button
              v-if="hasAnalysis"
              type="button"
              class="cursor-pointer rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
              @click.stop="showDetails = true"
            >
              <UIcon name="i-heroicons-chart-bar" class="h-4 w-4" />
            </button>

            <!-- Similar -->
            <button
              v-if="hasAnalysis"
              type="button"
              class="cursor-pointer rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-cyan-400"
              @click.stop="showSimilar = true"
            >
              <UIcon name="i-heroicons-squares-2x2" class="h-4 w-4" />
            </button>

            <!-- Download / Link -->
            <a
              v-if="isDirectDownload"
              :href="getDownloadUrl()!"
              class="flex h-7 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
              @click.stop
            >
              <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
              <span>{{ t.download }}</span>
            </a>
            <button
              v-else-if="isFreeDownload"
              type="button"
              class="flex h-7 items-center gap-1.5 rounded-md bg-emerald-600/80 px-2.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
              @click="openDownloadIframe"
            >
              <UIcon :name="showDownloadIframe ? 'i-heroicons-x-mark' : 'i-heroicons-arrow-top-right-on-square'" class="h-4 w-4" />
              <span>{{ showDownloadIframe ? t.close : t.freeLink }}</span>
            </button>
            <a
              v-else-if="track.purchase_url"
              :href="track.purchase_url"
              target="_blank"
              rel="noopener"
              class="flex h-7 items-center gap-1.5 rounded-md border border-orange-500/50 px-2.5 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-500/10"
              @click.stop
            >
              <UIcon name="i-heroicons-shopping-cart" class="h-4 w-4" />
              <span>{{ t.buy }}</span>
            </a>
            <a
              v-else-if="config.public.isDev"
              :href="mp3DownloadUrl"
              target="_blank"
              rel="noopener"
              class="flex h-7 items-center gap-1.5 rounded-md border border-violet-500/50 px-2.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/10"
              @click.stop
            >
              <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
              <span>MP3</span>
            </a>
            <a
              v-else
              :href="track.permalink_url"
              target="_blank"
              rel="noopener"
              class="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-white/10 hover:text-orange-400"
              @click.stop
            >
              <UIcon name="i-simple-icons-soundcloud" class="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Download iframe -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-[600px] opacity-100"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="max-h-[600px] opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div
        v-if="showDownloadIframe && isFreeDownload && getDownloadUrl()"
        class="overflow-hidden border-t border-neutral-800/50"
      >
        <div class="relative bg-neutral-950/80 p-3">
          <!-- Close button -->
          <button
            type="button"
            class="absolute right-3 top-3 z-10 rounded-md bg-neutral-900/80 p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            @click="closeDownloadIframe"
          >
            <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
          </button>

          <!-- Iframe -->
          <div class="overflow-hidden rounded-lg border border-neutral-800/50 bg-white">
            <iframe
              :src="getDownloadUrl()!"
              class="h-125 w-full"
              frameborder="0"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          </div>

          <!-- Direct link fallback -->
          <div class="mt-3 flex items-center justify-center gap-2">
            <span class="text-xs text-neutral-500">{{ t.openInNewTab }}</span>
            <a
              :href="getDownloadUrl()!"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-1.5 rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
              @click.stop
            >
              <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-3.5 w-3.5" />
              <span>{{ t.openExternal }}</span>
            </a>
          </div>
        </div>
      </div>
    </Transition>

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
