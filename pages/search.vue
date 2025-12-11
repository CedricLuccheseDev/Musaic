<script setup lang="ts">
import { DownloadStatus, type TrackEntry } from '~/types/track'
import type { SearchResult } from '~/server/services/soundcloud'

const { t } = useI18n()

type FilterType = 'all' | 'free' | 'paid'
type SearchType = 'title' | 'artist'

const route = useRoute()
const query = computed(() => (route.query.q as string) || '')
const searchInput = ref(query.value)

// Filter state
const searchType = ref<SearchType>('title')
const activeFilter = ref<FilterType>('all')

// AI search state
const aiLoading = ref(false)
const aiSql = ref('')
const aiResults = ref<TrackEntry[]>([])

// Main search
const { data: searchResult, status, refresh: refreshSearch } = await useFetch<SearchResult>('/api/search', {
  query: { q: query },
  watch: [query],
  server: false
})

const isLoading = computed(() => status.value === 'pending')

// Pagination state
const allTracks = ref<TrackEntry[]>([])
const hasMoreFromApi = ref(false)
const nextOffset = ref<number | undefined>(undefined)
const isLoadingMore = ref(false)
const initialBatchSize = ref(0)

// Update tracks when search result changes
watch(searchResult, (result) => {
  if (result) {
    allTracks.value = result.tracks || []
    initialBatchSize.value = allTracks.value.length
    hasMoreFromApi.value = result.hasMore || false
    nextOffset.value = result.nextOffset
  }
}, { immediate: true })

// Extract artist from search result
const detectedArtist = computed(() => searchResult.value?.artist)

// Filter function
function applyFilter(tracks: TrackEntry[]): TrackEntry[] {
  if (activeFilter.value === 'all') return tracks
  if (activeFilter.value === 'free') {
    return tracks.filter(t => t.downloadStatus !== DownloadStatus.No)
  }
  return tracks.filter(t => t.downloadStatus === DownloadStatus.No)
}

// Filtered results
const filteredTracks = computed(() => applyFilter(allTracks.value))
const hasMore = computed(() => hasMoreFromApi.value)
const filteredArtistTracks = computed(() => {
  if (!detectedArtist.value) return []
  return applyFilter(detectedArtist.value.tracks)
})
const filteredAiResults = computed(() => applyFilter(aiResults.value))

// Reset when query changes
watch(query, () => {
  allTracks.value = []
  hasMoreFromApi.value = false
  nextOffset.value = undefined
  runAiSearch()
})

// Load more tracks from API
async function loadMore() {
  if (!hasMore.value || isLoadingMore.value || nextOffset.value === undefined) return

  isLoadingMore.value = true
  try {
    const response = await $fetch<SearchResult>('/api/search', {
      query: { q: query.value, offset: nextOffset.value }
    })

    // Append new tracks
    allTracks.value = [...allTracks.value, ...(response.tracks || [])]
    hasMoreFromApi.value = response.hasMore || false
    nextOffset.value = response.nextOffset
  } catch (err) {
    console.error('[Search] Failed to load more:', err)
  } finally {
    isLoadingMore.value = false
  }
}

// Scroll-based infinite loading (triggers at 60% of page)
function handleScroll() {
  if (import.meta.server) return

  const scrollTop = window.scrollY
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight

  const scrollPercent = (scrollTop + windowHeight) / documentHeight
  if (scrollPercent >= 0.6) {
    loadMore()
  }
}

function checkInitialLoad() {
  if (import.meta.server) return

  nextTick(() => {
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    if (documentHeight <= windowHeight && hasMore.value) {
      loadMore()
    }
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  checkInitialLoad()
  // Run AI search on mount if we have a query
  if (query.value) {
    runAiSearch()
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

watch(filteredTracks, () => {
  checkInitialLoad()
})

// AI Search (always runs)
async function runAiSearch() {
  if (!searchInput.value.trim()) return

  aiLoading.value = true
  aiSql.value = ''
  aiResults.value = []

  try {
    const response = await $fetch<{ sql: string; results: TrackEntry[] }>('/api/ai-query', {
      method: 'POST',
      body: { question: searchInput.value }
    })

    aiSql.value = response.sql
    aiResults.value = response.results || []
  } catch (err) {
    console.error('[AI Search] Error:', err)
  } finally {
    aiLoading.value = false
  }
}

async function search() {
  if (!searchInput.value.trim()) return
  navigateTo({ path: '/search', query: { q: searchInput.value } })
  runAiSearch()
  refreshSearch()
}
</script>

<template>
  <div class="relative min-h-screen bg-neutral-950 lg:p-8">
    <SearchBackground />
    <SearchHeader v-model="searchInput" :loading="isLoading" @search="search" />

    <!-- Results -->
    <main class="relative mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-10">
      <ClientOnly>
        <!-- Filters -->
        <SearchFilters v-model:search-type="searchType" v-model:filter="activeFilter" />

        <!-- AI Section -->
        <SearchAiSection
          v-if="aiLoading || filteredAiResults.length"
          :loading="aiLoading"
          :results="filteredAiResults"
          :sql="aiSql"
          :group-by-artist="searchType === 'artist'"
        />

        <!-- Artist Section (if detected) -->
        <SearchArtistSection
          v-if="detectedArtist && filteredArtistTracks.length"
          :artist="{ ...detectedArtist, tracks: filteredArtistTracks }"
        />

        <!-- SoundCloud Results Section -->
        <section>
          <!-- Loading -->
          <div v-if="isLoading" class="flex flex-col items-center justify-center gap-4 py-16">
            <!-- Animated rings -->
            <div class="relative flex items-center justify-center">
              <div class="absolute h-16 w-16 animate-ping rounded-full bg-violet-500/20" />
              <div class="absolute h-12 w-12 animate-pulse rounded-full bg-purple-500/30" />
              <div class="relative flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-r from-violet-600 to-purple-600 shadow-lg shadow-purple-500/30">
                <UIcon name="i-heroicons-musical-note" class="h-5 w-5 animate-bounce text-white" />
              </div>
            </div>
            <!-- Loading text -->
            <div class="flex items-center gap-2">
              <span class="text-sm text-neutral-400">{{ t.searching }}</span>
              <span class="flex gap-1">
                <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500" style="animation-delay: 0ms" />
                <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500" style="animation-delay: 150ms" />
                <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-500" style="animation-delay: 300ms" />
              </span>
            </div>
          </div>

          <!-- Results list -->
          <template v-else-if="filteredTracks.length">
            <!-- Section header (clickable to collapse) -->
            <div class="flex items-center gap-3 py-3">
              <UIcon name="i-heroicons-magnifying-glass" class="h-5 w-5 text-violet-400" />
              <h2 class="flex-1 text-base font-semibold text-white">
                {{ t.resultsFor }} "{{ query }}"
              </h2>
              <span class="text-xs text-neutral-500">{{ filteredTracks.length }} {{ t.results }}</span>
            </div>

            <!-- Track list -->
            <div class="space-y-2">
              <SearchTrackCard
                v-for="(track, index) in filteredTracks"
                :key="track.id"
                :track="track"
                :index="index"
                :skip-animation="index >= initialBatchSize"
              />
            </div>

            <!-- Load more indicator -->
            <div v-if="hasMore || isLoadingMore" class="flex justify-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-muted" />
            </div>

            <!-- End of results -->
            <div v-else class="py-8 text-center text-sm text-neutral-500">
              {{ t.endOfResults }}
            </div>
          </template>

          <!-- No results after filter -->
          <div v-else-if="allTracks.length && !filteredTracks.length" class="py-12 text-center">
            <p class="text-neutral-500">{{ t.noFilterResults }}</p>
          </div>

          <!-- Empty state -->
          <div v-else-if="query && !isLoading" class="py-12 text-center">
            <p class="text-muted">{{ t.noResults }} "{{ query }}"</p>
          </div>
        </section>

        <!-- Fallback on server -->
        <template #fallback>
          <div class="flex justify-center py-12">
            <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-muted" />
          </div>
        </template>
      </ClientOnly>
    </main>
    <Footer />
  </div>
</template>
