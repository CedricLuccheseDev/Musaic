<script setup lang="ts">
import type { TrackEntry } from '~/types/track'

const props = withDefaults(defineProps<{
  loading: boolean
  results: TrackEntry[]
  sql: string
  groupByArtist?: boolean
}>(), {
  groupByArtist: false
})

const { t } = useI18n()

const collapsed = ref(false)

// Group results by artist (only when groupByArtist is true)
const resultsByArtist = computed(() => {
  if (!props.groupByArtist) return {}
  const groups: Record<string, TrackEntry[]> = {}
  for (const track of props.results.slice(0, 10)) {
    const artist = track.artist || 'Unknown'
    if (!groups[artist]) {
      groups[artist] = []
    }
    groups[artist].push(track)
  }
  return groups
})

// Flat list for title mode
const flatResults = computed(() => props.results.slice(0, 10))
</script>

<template>
  <section class="mb-8">
    <!-- AI Loading -->
    <div v-if="loading" class="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-900/10 px-4 py-4">
      <UIcon name="i-heroicons-sparkles" class="h-5 w-5 animate-pulse text-purple-400" />
      <span class="bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-sm font-medium text-transparent">
        {{ t.aiGenerating }}
      </span>
      <div class="flex gap-1">
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500" style="animation-delay: 0ms" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400" style="animation-delay: 150ms" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-400" style="animation-delay: 300ms" />
      </div>
    </div>

    <!-- AI Results Card -->
    <div v-else-if="results.length" class="overflow-hidden rounded-xl border border-purple-500/20 bg-purple-900/10">
      <!-- Header (clickable to collapse) -->
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-purple-900/20"
        @click="collapsed = !collapsed"
      >
        <UIcon name="i-heroicons-sparkles" class="h-5 w-5 text-purple-400" />
        <h2 class="flex-1 bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-base font-semibold text-transparent">
          {{ t.aiResults }}
        </h2>
        <span class="text-xs text-purple-400/60">{{ results.slice(0, 10).length }} {{ t.results }}</span>
        <UIcon
          name="i-heroicons-chevron-down"
          class="h-4 w-4 text-purple-400 transition-transform duration-200"
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
        <div v-if="!collapsed" class="overflow-hidden border-t border-purple-500/10 px-4 py-4">
          <!-- SQL Query preview -->
          <details v-if="sql" class="mb-4">
            <summary class="cursor-pointer text-xs text-purple-400/60 hover:text-purple-300">
              {{ t.showSql }}
            </summary>
            <pre class="mt-2 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-purple-300/80"><code>{{ sql }}</code></pre>
          </details>

          <!-- Track list grouped by artist (artist mode) -->
          <template v-if="groupByArtist">
            <div v-for="(tracks, artist) in resultsByArtist" :key="artist" class="mb-5 last:mb-0">
              <!-- Artist header -->
              <div class="mb-2 flex items-center gap-2">
                <UIcon name="i-heroicons-user-circle" class="h-4 w-4 text-purple-400/70" />
                <h3 class="text-sm font-medium text-purple-300/80">{{ artist }}</h3>
                <span class="text-xs text-purple-400/40">({{ tracks.length }})</span>
              </div>
              <!-- Tracks for this artist -->
              <div class="space-y-2">
                <SearchTrackCard
                  v-for="(track, index) in tracks"
                  :key="`ai-${track.id}`"
                  :track="track"
                  :index="index"
                />
              </div>
            </div>
          </template>

          <!-- Flat track list (title mode) -->
          <div v-else class="space-y-2">
            <SearchTrackCard
              v-for="(track, index) in flatResults"
              :key="`ai-${track.id}`"
              :track="track"
              :index="index"
            />
          </div>
        </div>
      </Transition>
    </div>
  </section>
</template>
