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
    class="group relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-500"
    :class="[cardClass, isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0']"
  >
    <!-- Main clickable area -->
    <a
      :href="track.permalink_url"
      target="_blank"
      rel="noopener"
      class="flex cursor-pointer items-center gap-4 p-4"
    >
      <!-- Artwork with play overlay -->
      <div class="relative shrink-0">
        <img
          v-if="track.artwork"
          :src="track.artwork"
          :alt="track.title"
          class="h-16 w-16 rounded-xl object-cover shadow-lg transition-transform duration-300 group-hover:scale-105"
        >
        <div v-else class="flex h-16 w-16 items-center justify-center rounded-xl bg-neutral-800 shadow-lg">
          <UIcon name="i-heroicons-musical-note" class="h-6 w-6 text-neutral-500" />
        </div>
        <!-- Play icon overlay -->
        <div class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <UIcon name="i-heroicons-play-solid" class="h-6 w-6 text-white" />
        </div>
      </div>

      <!-- Info -->
      <div class="min-w-0 flex-1">
        <p class="truncate text-base font-semibold text-white">{{ track.title }}</p>
        <NuxtLink
          :to="{ path: '/search', query: { q: track.artist, searchArtist: '1' } }"
          class="truncate text-sm text-neutral-400 hover:text-violet-400 hover:underline"
          @click.stop
        >
          {{ track.artist }}
        </NuxtLink>
        <div class="mt-1 flex items-center gap-3 text-xs text-neutral-500">
          <span class="flex items-center gap-1">
            <UIcon name="i-heroicons-clock" class="h-3 w-3" />
            {{ formatDuration(track.duration) }}
          </span>
          <span v-if="track.playback_count" class="flex items-center gap-1">
            <UIcon name="i-heroicons-play" class="h-3 w-3" />
            {{ track.playback_count.toLocaleString() }}
          </span>
        </div>
      </div>
    </a>

    <!-- Action buttons - absolute positioned -->
    <div class="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2" @click.stop>
      <!-- Free Direct Download -->
      <a
        v-if="isDirectDownload"
        :href="getDownloadUrl()!"
        class="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:bg-emerald-500 hover:shadow-emerald-500/25"
        @click.stop
      >
        <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
        <span class="text-sm">Télécharger</span>
      </a>

      <!-- Free External Link -->
      <a
        v-else-if="isFreeDownload"
        :href="getDownloadUrl() || track.permalink_url"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-2 rounded-xl bg-emerald-600/80 px-4 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:bg-emerald-500 hover:shadow-emerald-500/25"
        @click.stop
      >
        <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4" />
        <span class="text-sm">Lien gratuit</span>
      </a>

      <!-- Buy button -->
      <a
        v-else-if="track.purchase_url"
        :href="track.purchase_url"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-2 rounded-xl border border-orange-500/50 bg-orange-500/10 px-4 py-2 font-medium text-orange-400 transition-all duration-200 hover:bg-orange-500/20 hover:text-orange-300"
        @click.stop
      >
        <UIcon name="i-heroicons-shopping-cart" class="h-4 w-4" />
        <span class="text-sm">Acheter</span>
      </a>

      <!-- SoundCloud link for non-downloadable -->
      <a
        v-else
        :href="track.permalink_url"
        target="_blank"
        rel="noopener"
        class="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-neutral-400 transition-all duration-200 hover:bg-neutral-700/50 hover:text-white"
        @click.stop
      >
        <UIcon name="i-simple-icons-soundcloud" class="h-4 w-4" />
      </a>
    </div>
  </div>
</template>
