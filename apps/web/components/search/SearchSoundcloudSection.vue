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
}>()

/* --- States --- */
const { t } = useI18n()
const collapsed = ref(false)

/* --- Methods --- */
function shouldShowAd(index: number): boolean {
  return index > 0 && (index + 1) % AD_INTERVAL === 0
}
</script>

<template>
  <section class="mt-4 px-3 md:px-4">
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

    <!-- No results after filter -->
    <div v-else class="py-12 text-center">
      <p class="text-neutral-500">{{ t.noFilterResults }}</p>
    </div>
  </section>
</template>
