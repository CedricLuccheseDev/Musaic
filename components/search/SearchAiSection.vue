<script setup lang="ts">
import type { TrackEntry } from '~/types/track'

const props = defineProps<{
  loading: boolean
  results: TrackEntry[]
  sql: string
}>()

const { t } = useI18n()

const collapsed = ref(false)

// Track collapsed state for each artist subsection
const artistCollapsed = ref<Record<string, boolean>>({})

function toggleArtist(artist: string) {
  artistCollapsed.value[artist] = !artistCollapsed.value[artist]
}

function isArtistCollapsed(artist: string): boolean {
  return artistCollapsed.value[artist] ?? false
}

// Always group results by artist
const resultsByArtist = computed(() => {
  const groups: Record<string, TrackEntry[]> = {}
  for (const track of props.results) {
    const artist = track.artist || 'Unknown'
    if (!groups[artist]) {
      groups[artist] = []
    }
    groups[artist].push(track)
  }
  return groups
})

const artistCount = computed(() => Object.keys(resultsByArtist.value).length)
</script>

<template>
  <section class="mb-8 rounded-xl border border-purple-500/20 bg-purple-900/10 px-3 md:px-4">
    <!-- AI Loading -->
    <div v-if="loading" class="flex items-center gap-3 py-4">
      <UIcon name="i-heroicons-sparkles" class="h-6 w-6 animate-pulse text-purple-400" />
      <span class="bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-lg font-semibold text-transparent">
        {{ t.aiGenerating }}
      </span>
      <div class="flex gap-1">
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500" style="animation-delay: 0ms" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400" style="animation-delay: 150ms" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-400" style="animation-delay: 300ms" />
      </div>
    </div>

    <!-- AI Results -->
    <template v-else-if="results.length">
      <!-- Header (clickable to collapse) -->
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-3 py-4 text-left"
        @click="collapsed = !collapsed"
      >
        <UIcon name="i-heroicons-sparkles" class="h-6 w-6 animate-magic text-purple-400" />
        <h2 class="animate-magic-text flex-1 text-lg font-semibold">
          {{ t.aiResults }}
        </h2>
        <span class="text-sm text-purple-400/60">{{ results.length }} tracks · {{ artistCount }} artistes</span>
        <UIcon
          name="i-heroicons-chevron-down"
          class="h-5 w-5 text-purple-400 transition-transform duration-200"
          :class="{ 'rotate-180': !collapsed }"
        />
      </button>

      <!-- Content (collapsible) -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-[2000px]"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 max-h-[2000px]"
        leave-to-class="opacity-0 max-h-0"
      >
        <div v-if="!collapsed" class="overflow-hidden border-t border-purple-500/10 pb-4 pt-4">
          <!-- SQL Query preview -->
          <details v-if="sql" class="mb-4">
            <summary class="cursor-pointer text-xs text-purple-400/60 hover:text-purple-300">
              {{ t.showSql }}
            </summary>
            <pre class="mt-2 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-purple-300/80"><code>{{ sql }}</code></pre>
          </details>

          <!-- Track list grouped by artist -->
          <div v-for="(tracks, artist) in resultsByArtist" :key="artist" class="mb-3 last:mb-0">
            <!-- Artist header (collapsible) -->
            <button
              type="button"
              class="flex w-full cursor-pointer items-center gap-2 rounded-lg py-2 text-left transition-colors hover:bg-purple-500/5"
              @click="toggleArtist(artist as string)"
            >
              <UIcon
                name="i-heroicons-chevron-right"
                class="h-4 w-4 text-purple-400/60 transition-transform duration-200"
                :class="{ 'rotate-90': !isArtistCollapsed(artist as string) }"
              />
              <UIcon name="i-heroicons-user-circle" class="h-5 w-5 text-purple-400/70" />
              <h3 class="flex-1 text-sm font-medium text-purple-300">{{ artist }}</h3>
              <span class="text-xs text-purple-400/50">{{ tracks.length }} tracks</span>
            </button>

            <!-- Tracks for this artist (collapsible) -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-[1000px]"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100 max-h-[1000px]"
              leave-to-class="opacity-0 max-h-0"
            >
              <div v-if="!isArtistCollapsed(artist as string)" class="mt-2 space-y-2 overflow-hidden pl-6">
                <SearchTrackCard
                  v-for="(track, index) in tracks"
                  :key="`ai-${track.id}`"
                  :track="track"
                  :index="index"
                />
              </div>
            </Transition>
          </div>
        </div>
      </Transition>
    </template>
  </section>
</template>
