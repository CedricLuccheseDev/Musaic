<script setup lang="ts">
import { DownloadStatus, type TrackEntry } from '~/types/track'

const props = defineProps<{
  track: TrackEntry
  index?: number
}>()

const isVisible = ref(false)

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true
  }, (props.index || 0) * 50)
})

function getDownloadUrl(): string | null {
  if (props.track.downloadStatus === DownloadStatus.FreeDirectLink) {
    return `/api/download/${props.track.id}`
  }
  if (props.track.downloadStatus === DownloadStatus.FreeExternalLink) {
    return props.track.purchase_url
  }
  return null
}

const isFreeDownload = computed(() => props.track.downloadStatus !== DownloadStatus.No)
const isDirectDownload = computed(() => props.track.downloadStatus === DownloadStatus.FreeDirectLink)

const cardClass = computed(() => {
  if (props.track.downloadStatus === DownloadStatus.FreeDirectLink) {
    return 'bg-emerald-950/40 hover:bg-emerald-950/40 border-emerald-800/30'
  }
  if (props.track.downloadStatus === DownloadStatus.FreeExternalLink) {
    return 'bg-emerald-950/30 hover:bg-emerald-950/60 border-emerald-700/40'
  }
  return 'bg-neutral-900/80 hover:bg-neutral-800/80 border-neutral-800/50'
})

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
</script>

<template>
  <div
    class="group relative overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-500 md:rounded-2xl"
    :class="[cardClass, isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0']"
  >
    <!-- Main clickable area -->
    <a
      :href="track.permalink_url"
      target="_blank"
      rel="noopener"
      class="flex cursor-pointer items-center gap-3 p-3 md:gap-4 md:p-4"
    >
      <!-- Artwork with play overlay -->
      <div class="relative shrink-0">
        <img
          v-if="track.artwork"
          :src="track.artwork"
          :alt="track.title"
          class="h-12 w-12 rounded-lg object-cover shadow-lg transition-transform duration-300 group-hover:scale-105 md:h-16 md:w-16 md:rounded-xl"
        >
        <div v-else class="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-800 shadow-lg md:h-16 md:w-16 md:rounded-xl">
          <UIcon name="i-heroicons-musical-note" class="h-5 w-5 text-neutral-500 md:h-6 md:w-6" />
        </div>
        <!-- Play icon overlay -->
        <div class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:rounded-xl">
          <UIcon name="i-heroicons-play-solid" class="h-5 w-5 text-white md:h-6 md:w-6" />
        </div>
      </div>

      <!-- Info -->
      <div class="min-w-0 flex-1 pr-12 md:pr-40">
        <p class="truncate text-sm font-semibold text-white md:text-base">{{ track.title }}</p>
        <NuxtLink
          :to="{ path: '/search', query: { q: track.artist, searchArtist: '1' } }"
          class="block truncate text-xs text-neutral-400 hover:text-violet-400 hover:underline md:text-sm"
          @click.stop
        >
          {{ track.artist }}
        </NuxtLink>
        <div class="mt-0.5 flex items-center gap-2 text-[10px] text-neutral-500 md:mt-1 md:gap-3 md:text-xs">
          <span class="flex items-center gap-1">
            <UIcon name="i-heroicons-clock" class="h-3 w-3" />
            {{ formatDuration(track.duration) }}
          </span>
          <span v-if="track.playback_count" class="hidden items-center gap-1 sm:flex">
            <UIcon name="i-heroicons-play" class="h-3 w-3" />
            {{ track.playback_count.toLocaleString() }}
          </span>
        </div>
      </div>
    </a>

    <!-- Action buttons - absolute positioned -->
    <div class="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 md:right-4 md:gap-2" @click.stop>
      <!-- Free Direct Download -->
      <a
        v-if="isDirectDownload"
        :href="getDownloadUrl()!"
        class="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg transition-all duration-200 hover:bg-emerald-500 hover:shadow-emerald-500/25 md:gap-2 md:rounded-xl md:px-4 md:py-2"
        @click.stop
      >
        <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
        <span class="hidden text-sm sm:inline">Télécharger</span>
      </a>

      <!-- Free External Link -->
      <a
        v-else-if="isFreeDownload"
        :href="getDownloadUrl() || track.permalink_url"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-1.5 rounded-lg bg-emerald-600/80 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg transition-all duration-200 hover:bg-emerald-500 hover:shadow-emerald-500/25 md:gap-2 md:rounded-xl md:px-4 md:py-2"
        @click.stop
      >
        <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4" />
        <span class="hidden text-sm sm:inline">Lien gratuit</span>
      </a>

      <!-- Buy button -->
      <a
        v-else-if="track.purchase_url"
        :href="track.purchase_url"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-1.5 rounded-lg border border-orange-500/50 bg-orange-500/10 px-2.5 py-1.5 text-xs font-medium text-orange-400 transition-all duration-200 hover:bg-orange-500/20 hover:text-orange-300 md:gap-2 md:rounded-xl md:px-4 md:py-2"
        @click.stop
      >
        <UIcon name="i-heroicons-shopping-cart" class="h-4 w-4" />
        <span class="hidden text-sm sm:inline">Acheter</span>
      </a>

      <!-- SoundCloud link for non-downloadable -->
      <a
        v-else
        :href="track.permalink_url"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-2 py-1.5 text-neutral-400 transition-all duration-200 hover:bg-neutral-700/50 hover:text-white md:rounded-xl md:px-3 md:py-2"
        @click.stop
      >
        <UIcon name="i-simple-icons-soundcloud" class="h-4 w-4" />
      </a>
    </div>
  </div>
</template>
