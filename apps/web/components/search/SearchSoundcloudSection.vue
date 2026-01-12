<script setup lang="ts">
import type { TrackEntry } from '~/types'
import type { ArtistInfo } from '~/server/services/soundcloud'
import { AD_INTERVAL } from '~/config/search'

/* --- Props --- */
const props = defineProps<{
  loading: boolean
  results: TrackEntry[]
  hasMore: boolean
  isLoadingMore: boolean
  initialBatchSize: number
  detectedArtist?: ArtistInfo
  artistSearchAttempted?: boolean
  artistSearchFailed?: boolean
  // Search more mode (when used after AI results)
  showSearchButton?: boolean
  searchButtonLoading?: boolean
}>()

/* --- Emits --- */
const emit = defineEmits<{
  'search-more': []
}>()

/* --- States --- */
const { t } = useI18n()
const collapsed = ref(false)
const artistCollapsed = ref(false)

/* --- Computed --- */
const matchScoreClass = computed(() => {
  const score = props.detectedArtist?.match?.score
  if (!score) return ''
  if (score >= 90) return 'bg-green-500/20 text-green-400'
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-orange-500/20 text-orange-400'
})

/* --- Methods --- */
function shouldShowAd(index: number): boolean {
  return index > 0 && (index + 1) % AD_INTERVAL === 0
}
</script>

<template>
  <section class="mt-4 px-3 md:px-4">
    <!-- Detected Artist Section -->
    <div v-if="detectedArtist" class="mb-4 overflow-hidden rounded-xl border border-cyan-500/30 bg-cyan-950/20">
      <button
        type="button"
        class="group flex w-full cursor-pointer items-center gap-3 p-4 text-left"
        @click="artistCollapsed = !artistCollapsed"
      >
        <img
          v-if="detectedArtist.avatar_url"
          :src="detectedArtist.avatar_url"
          :alt="detectedArtist.username"
          class="h-12 w-12 rounded-full ring-2 ring-cyan-500"
        >
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-cyan-400">{{ detectedArtist.username }}</h3>
            <span
              v-if="detectedArtist.match"
              class="rounded-full px-2 py-0.5 text-xs"
              :class="matchScoreClass"
            >
              {{ detectedArtist.match.score }}%
            </span>
          </div>
          <p class="text-sm text-neutral-400">
            {{ detectedArtist.followers_count.toLocaleString() }} followers
            · {{ detectedArtist.track_count }} tracks
          </p>
        </div>
        <a
          :href="detectedArtist.permalink_url"
          target="_blank"
          class="text-cyan-400 hover:text-cyan-300"
          @click.stop
        >
          <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-5 w-5" />
        </a>
        <UIcon
          name="i-heroicons-chevron-down"
          class="h-5 w-5 text-neutral-400 transition-transform duration-200"
          :class="{ 'rotate-180': !artistCollapsed }"
        />
      </button>

      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-[2000px]"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 max-h-[2000px]"
        leave-to-class="opacity-0 max-h-0"
      >
        <div v-if="!artistCollapsed" class="space-y-2 overflow-hidden px-4 pb-4">
          <SearchTrackCard
            v-for="(track, idx) in detectedArtist.tracks.slice(0, 10)"
            :key="track.id"
            :track="track"
            :index="idx"
            :detected-artist="detectedArtist"
          />
        </div>
      </Transition>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-3 py-4">
      <UIcon name="i-simple-icons-soundcloud" class="h-5 w-5 animate-pulse text-orange-400" />
      <span class="text-base font-medium text-orange-400">
        {{ t.searching }}
      </span>
      <div class="flex gap-1">
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-500" style="animation-delay: 0ms" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-400" style="animation-delay: 150ms" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400" style="animation-delay: 300ms" />
      </div>
    </div>

    <!-- Results list (collapsable) -->
    <template v-else-if="results.length">
      <button
        type="button"
        class="group flex w-full cursor-pointer items-center gap-3 py-3 text-left"
        @click="collapsed = !collapsed"
      >
        <UIcon name="i-simple-icons-soundcloud" class="h-5 w-5 text-orange-400 transition-all duration-200 group-hover:scale-110 group-hover:text-orange-300" />
        <h3 class="flex-1 text-base font-medium text-neutral-300 transition-colors duration-200 group-hover:text-orange-300">
          SoundCloud
        </h3>
        <span class="text-sm text-neutral-500 transition-colors duration-200 group-hover:text-orange-300/70">{{ results.length }} {{ t.results }}</span>
        <UIcon
          name="i-heroicons-chevron-down"
          class="h-5 w-5 text-neutral-400 transition-all duration-200 group-hover:scale-110 group-hover:text-orange-300"
          :class="{ 'rotate-180': !collapsed }"
        />
      </button>

      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-[5000px]"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 max-h-[5000px]"
        leave-to-class="opacity-0 max-h-0"
      >
        <div v-if="!collapsed" class="space-y-2 overflow-hidden pb-4 pt-2">
          <template v-for="(track, index) in results" :key="track.id">
            <SearchTrackCard
              :track="track"
              :index="index"
              :skip-animation="index >= props.initialBatchSize"
              :detected-artist="props.detectedArtist"
            />
            <AdBanner v-if="shouldShowAd(index)" />
          </template>

          <div v-if="hasMore || isLoadingMore" class="flex justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-muted" />
          </div>

          <div v-else class="py-8 text-center text-sm text-neutral-500">
            {{ t.endOfResults }}
          </div>
        </div>
      </Transition>
    </template>

    <!-- Search more button (when used after AI results with no SC results yet) -->
    <div v-else-if="showSearchButton" class="py-6">
      <button
        type="button"
        class="group flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 py-4 transition-all hover:border-orange-400/50 hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="searchButtonLoading"
        @click="emit('search-more')"
      >
        <UIcon
          v-if="searchButtonLoading"
          name="i-heroicons-arrow-path"
          class="h-5 w-5 animate-spin text-orange-400"
        />
        <UIcon
          v-else
          name="i-simple-icons-soundcloud"
          class="h-5 w-5 text-orange-400 transition-transform group-hover:scale-110"
        />
        <span class="font-medium text-orange-400 transition-colors group-hover:text-orange-300">
          {{ searchButtonLoading ? t.searching : 'Chercher plus sur SoundCloud' }}
        </span>
      </button>
    </div>

    <!-- No results after filter -->
    <div v-else class="py-12 text-center">
      <p class="text-neutral-500">{{ t.noFilterResults }}</p>
    </div>
  </section>
</template>
