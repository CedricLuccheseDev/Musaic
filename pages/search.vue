<script setup lang="ts">
import { DownloadStatus, type TrackEntry } from '~/types/track'
import type { SearchResult } from '~/server/services/soundcloud'

const { t } = useI18n()

type FilterType = 'all' | 'free' | 'paid'

const MAX_RESULTS = 500

const route = useRoute()
const query = computed(() => (route.query.q as string) || '')
const searchInput = ref(query.value)

// Filter state
const activeFilter = ref<FilterType>('all')

// AI search state
const aiLoading = ref(false)
const aiSql = ref('')
const aiResults = ref<TrackEntry[]>([])
const aiResponse = ref('')

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

// Filtered results with deduplication
// Priority: AI > Artist > SoundCloud (each section excludes tracks from previous sections)
const filteredAiResults = computed(() => applyFilter(aiResults.value))
const aiTrackIds = computed(() => new Set(filteredAiResults.value.map(t => t.id)))


const filteredTracks = computed(() => {
  const filtered = applyFilter(allTracks.value)
  // Exclude tracks already in AI results
  return filtered.filter(t => !aiTrackIds.value.has(t.id))
})
const hasMore = computed(() => hasMoreFromApi.value && allTracks.value.length < MAX_RESULTS)

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
  if (allTracks.value.length >= MAX_RESULTS) return

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
  aiResponse.value = ''

  try {
    const result = await $fetch<{ sql: string; results: TrackEntry[]; response: string }>('/api/ai-query', {
      method: 'POST',
      body: { question: searchInput.value }
    })

    aiSql.value = result.sql
    aiResults.value = result.results || []
    aiResponse.value = result.response || ''
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
        <!-- Main results container -->
        <template v-if="query && (aiLoading || filteredAiResults.length || isLoading || filteredTracks.length)">
          <!-- Main title with filters -->
          <div class="flex items-center gap-3 pb-2">
            <UIcon name="i-heroicons-magnifying-glass" class="h-6 w-6 text-violet-400" />
            <h2 class="flex-1 text-lg font-semibold text-white">
              {{ t.resultsFor }} "{{ query }}"
            </h2>
            <SearchFilters v-model:filter="activeFilter" />
          </div>

          <!-- AI Section -->
          <SearchAiSection
            v-if="aiLoading || filteredAiResults.length"
            :loading="aiLoading"
            :results="filteredAiResults"
            :sql="aiSql"
            :response="aiResponse"
          />

          <!-- SoundCloud Section -->
          <SearchSoundcloudSection
            v-if="isLoading || filteredTracks.length || (allTracks.length && !filteredTracks.length)"
            :loading="isLoading"
            :results="filteredTracks"
            :has-more="hasMore"
            :is-loading-more="isLoadingMore"
            :initial-batch-size="initialBatchSize"
            :detected-artist="detectedArtist"
          />
        </template>

        <!-- Empty state (when no results at all) -->
        <div v-else-if="query && !isLoading && !aiLoading" class="py-12 text-center">
          <p class="text-muted">{{ t.noResults }} "{{ query }}"</p>
        </div>

        <!-- Fallback on server -->
        <template #fallback>
          <div class="flex justify-center py-12">
            <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-muted" />
          </div>
        </template>
      </ClientOnly>
    </main>
    <AppFooter />
  </div>
</template>
