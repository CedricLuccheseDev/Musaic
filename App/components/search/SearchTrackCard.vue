<script setup lang="ts">
import { DownloadStatus, type TrackEntry } from '~/types'
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
const { play, isTrackPlaying, isLoading, isCurrentTrack } = useAudioPlayer()
const isVisible = ref(props.skipAnimation)

/* --- Computed --- */
const isFromDetectedArtist = computed(() => {
  if (!props.detectedArtist) return false
  return props.track.artist.toLowerCase() === props.detectedArtist.username.toLowerCase()
})

const isFreeDownload = computed(() => props.track.downloadStatus !== DownloadStatus.No)
const isDirectDownload = computed(() => props.track.downloadStatus === DownloadStatus.FreeDirectLink)
const isPlaying = computed(() => isTrackPlaying(props.track.id))
const isCurrentlyLoading = computed(() => isCurrentTrack(props.track.id) && isLoading.value)

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
  if (isCurrentTrack(props.track.id)) {
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
  play(props.track)
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
    class="group relative overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-500 md:rounded-2xl"
    :class="[cardClass, isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0']"
  >
    <!-- Main clickable area - plays audio -->
    <div
      class="flex cursor-pointer items-center gap-3 p-3 md:gap-4 md:p-4"
      @click="handleCardClick"
    >
      <!-- Artist badge (when track is from detected artist) -->
      <UTooltip v-if="isFromDetectedArtist && props.detectedArtist" :text="`Track de ${props.detectedArtist.username}`">
        <div class="relative -mr-1 h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-cyan-500/50 md:-mr-2 md:h-10 md:w-10">
          <img
            v-if="props.detectedArtist.avatar_url"
            :src="props.detectedArtist.avatar_url"
            :alt="props.detectedArtist.username"
            class="h-full w-full object-cover"
          >
          <div v-else class="flex h-full w-full items-center justify-center bg-cyan-900">
            <UIcon name="i-heroicons-user" class="h-4 w-4 text-cyan-400" />
          </div>
        </div>
      </UTooltip>

      <!-- Artwork with play/pause overlay -->
      <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg shadow-lg md:h-16 md:w-16 md:rounded-xl">
        <img
          v-if="track.artwork"
          :src="track.artwork"
          :alt="track.title"
          class="h-full w-full object-cover transition-transform duration-300"
          :class="{ 'scale-105': isPlaying }"
        >
        <div v-else class="flex h-full w-full items-center justify-center bg-neutral-800">
          <UIcon name="i-heroicons-musical-note" class="h-5 w-5 text-neutral-500 md:h-6 md:w-6" />
        </div>
        <!-- Play/Pause/Loading icon overlay -->
        <div
          class="absolute inset-0 flex items-center justify-center transition-all duration-300"
          :class="isPlaying || isCurrentlyLoading ? 'bg-black/50 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'"
        >
          <UIcon v-if="isCurrentlyLoading" name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin text-white md:h-6 md:w-6" />
          <UIcon v-else-if="isPlaying" name="i-heroicons-pause-solid" class="h-5 w-5 text-white md:h-6 md:w-6" />
          <UIcon v-else name="i-heroicons-play-solid" class="h-5 w-5 text-white md:h-6 md:w-6" />
        </div>
      </div>

      <!-- Info -->
      <div class="min-w-0 flex-1 pr-14 sm:pr-28 md:pr-40">
        <!-- Title - opens SoundCloud -->
        <div class="truncate">
          <UTooltip :text="t.tooltipTrackPage">
            <a
              :href="track.permalink_url"
              target="_blank"
              rel="noopener"
              class="inline text-sm font-semibold text-white hover:text-violet-400 hover:underline md:text-base"
              @click.stop
            >
              {{ track.title }}
            </a>
          </UTooltip>
        </div>
        <div class="truncate">
          <UTooltip :text="t.tooltipArtistPage">
            <a
              :href="artistUrl"
              target="_blank"
              rel="noopener"
              class="inline text-xs text-neutral-400 hover:text-violet-400 hover:underline md:text-sm"
              @click.stop
            >
              {{ track.artist }}
            </a>
          </UTooltip>
        </div>
        <div class="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-neutral-500 md:mt-1 md:gap-3 md:text-xs">
          <span class="flex items-center gap-1">
            <UIcon name="i-heroicons-clock" class="h-3 w-3" />
            {{ formatDuration(track.duration) }}
          </span>
          <span v-if="track.playback_count" class="hidden items-center gap-1 sm:flex">
            <UIcon name="i-heroicons-play" class="h-3 w-3" />
            {{ track.playback_count.toLocaleString() }}
          </span>
          <!-- BPM (from audio analysis) -->
          <span v-if="track.bpm_detected" class="flex items-center gap-1 text-violet-400">
            <span class="font-medium">BPM:</span>
            {{ Math.round(track.bpm_detected) }}
          </span>
          <!-- Key (from audio analysis) -->
          <span v-if="track.key_detected" class="flex items-center gap-1 text-cyan-400">
            <span class="font-medium">Key:</span>
            {{ track.key_detected }}
          </span>
        </div>
      </div>
    </div>

    <!-- Action buttons - absolute positioned -->
    <div class="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 sm:right-3 sm:gap-1.5 md:right-4 md:gap-2" @click.stop>
      <!-- Free Direct Download -->
      <UTooltip v-if="isDirectDownload" :text="t.tooltipDirectDownload">
        <a
          :href="getDownloadUrl()!"
          class="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg transition-all duration-200 hover:bg-emerald-500 hover:shadow-emerald-500/25 md:gap-2 md:rounded-xl md:px-4 md:py-2"
          @click.stop
        >
          <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
          <span class="hidden text-sm sm:inline">{{ t.download }}</span>
        </a>
      </UTooltip>

      <!-- Free External Link -->
      <UTooltip v-else-if="isFreeDownload" :text="t.tooltipFreeLink">
        <a
          :href="getDownloadUrl() || track.permalink_url"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-1.5 rounded-lg bg-emerald-600/80 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg transition-all duration-200 hover:bg-emerald-500 hover:shadow-emerald-500/25 md:gap-2 md:rounded-xl md:px-4 md:py-2"
          @click.stop
        >
          <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4" />
          <span class="hidden text-sm sm:inline">{{ t.freeLink }}</span>
        </a>
      </UTooltip>

      <!-- Buy button -->
      <UTooltip v-else-if="track.purchase_url" :text="t.tooltipBuy">
        <a
          :href="track.purchase_url"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-1.5 rounded-lg border border-orange-500/50 bg-orange-500/10 px-2.5 py-1.5 text-xs font-medium text-orange-400 transition-all duration-200 hover:bg-orange-500/20 hover:text-orange-300 md:gap-2 md:rounded-xl md:px-4 md:py-2"
          @click.stop
        >
          <UIcon name="i-heroicons-shopping-cart" class="h-4 w-4" />
          <span class="hidden text-sm sm:inline">{{ t.buy }}</span>
        </a>
      </UTooltip>

      <!-- MP3 Download link for non-downloadable (dev only) -->
      <UTooltip v-else-if="config.public.isDev" :text="t.tooltipMp3">
        <a
          :href="mp3DownloadUrl"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-1.5 rounded-lg border border-violet-500/50 bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-400 transition-all duration-200 hover:bg-violet-500/20 hover:text-violet-300 md:gap-2 md:rounded-xl md:px-4 md:py-2"
          @click.stop
        >
          <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
          <span class="hidden text-sm sm:inline">MP3</span>
        </a>
      </UTooltip>

      <!-- SoundCloud link for non-downloadable (prod) -->
      <UTooltip v-else :text="t.tooltipSoundcloud">
        <a
          :href="track.permalink_url"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-2 py-1.5 text-neutral-400 transition-all duration-200 hover:bg-neutral-700/50 hover:text-white md:rounded-xl md:px-3 md:py-2"
          @click.stop
        >
          <UIcon name="i-simple-icons-soundcloud" class="h-4 w-4" />
        </a>
      </UTooltip>
    </div>
  </div>
</template>
