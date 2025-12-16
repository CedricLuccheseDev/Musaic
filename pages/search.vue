<script setup lang="ts">
import { until } from '@vueuse/core'
import { DownloadStatus, type TrackEntry } from '~/types/track'
import type { SearchResult } from '~/server/services/soundcloud'

/* --- Types --- */
type FilterType = 'all' | 'free' | 'paid'

/* --- Constants --- */
const MAX_RESULTS = 500

/* --- Meta --- */
definePageMeta({
  layoutConfig: {
    stickyFooter: true
  }
})

/* --- Composables --- */
const { t } = useI18n()
const { canUseAi, aiGenerationsLeft, isPremium, incrementAiUsage } = useProfile()
const route = useRoute()

/* --- Inject --- */
const authLoading = inject<Ref<boolean>>('authLoading', ref(false))

/* --- States --- */
const headerMounted = ref(false)
const searchInput = ref('')
const activeFilter = ref<FilterType>('all')
const aiLimitReached = ref(false)
const aiLoading = ref(false)
const aiSql = ref('')
const aiResults = ref<TrackEntry[]>([])
const aiResponse = ref('')
const allTracks = ref<TrackEntry[]>([])
const hasMoreFromApi = ref(false)
const nextOffset = ref<number | undefined>(undefined)
const isLoadingMore = ref(false)
const initialBatchSize = ref(0)
const searchError = ref<string | null>(null)

/* --- Data --- */
const { data: searchResult, status, refresh: refreshSearch } = useFetch<SearchResult>('/api/search', {
  query: { q: computed(() => (route.query.q as string) || '') },
  watch: [() => route.query.q],
  server: false,
  lazy: true,
  onResponseError({ response }) {
    const errorData = response._data as { message?: string } | undefined
    searchError.value = errorData?.message || `Error ${response.status}`
    console.error('[Search] API Error:', response.status, response._data)
  }
})

/* --- Computed --- */
const query = computed(() => (route.query.q as string) || '')
const isLoading = computed(() => status.value === 'pending')
const detectedArtist = computed(() => searchResult.value?.artist)
const filteredAiResults = computed(() => applyFilter(aiResults.value))
const aiTrackIds = computed(() => new Set(filteredAiResults.value.map(t => t.id)))
const filteredTracks = computed(() => {
  const filtered = applyFilter(allTracks.value)
  return filtered.filter(t => !aiTrackIds.value.has(t.id))
})
const hasMore = computed(() => hasMoreFromApi.value && allTracks.value.length < MAX_RESULTS)

/* --- Methods --- */
function applyFilter(tracks: TrackEntry[]): TrackEntry[] {
  if (activeFilter.value === 'all') return tracks
  if (activeFilter.value === 'free') {
    return tracks.filter(t => t.downloadStatus !== DownloadStatus.No)
  }
  return tracks.filter(t => t.downloadStatus === DownloadStatus.No)
}

async function loadMore() {
  if (!hasMore.value || isLoadingMore.value || nextOffset.value === undefined) return
  if (allTracks.value.length >= MAX_RESULTS) return

  isLoadingMore.value = true
  try {
    const response = await $fetch<SearchResult>('/api/search', {
      query: { q: query.value, offset: nextOffset.value }
    })
    allTracks.value = [...allTracks.value, ...(response.tracks || [])]
    hasMoreFromApi.value = response.hasMore || false
    nextOffset.value = response.nextOffset
  } catch (err) {
    console.error('[Search] Failed to load more:', err)
  } finally {
    isLoadingMore.value = false
  }
}

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

async function runAiSearch() {
  if (!searchInput.value.trim()) return

  if (!canUseAi.value) {
    aiLimitReached.value = true
    return
  }

  aiLimitReached.value = false
  aiLoading.value = true
  aiSql.value = ''
  aiResults.value = []
  aiResponse.value = ''

  try {
    const result = await $fetch<{ sql: string; results: TrackEntry[]; response: string }>('/api/aiQuery', {
      method: 'POST',
      body: { question: searchInput.value }
    })
    aiSql.value = result.sql
    aiResults.value = result.results || []
    aiResponse.value = result.response || ''
    incrementAiUsage()
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

/* --- Watchers --- */
watch(searchResult, (result) => {
  if (result) {
    allTracks.value = result.tracks || []
    initialBatchSize.value = allTracks.value.length
    hasMoreFromApi.value = result.hasMore || false
    nextOffset.value = result.nextOffset
  }
}, { immediate: true })

watch(query, (newQuery, oldQuery) => {
  searchInput.value = newQuery
  if (oldQuery !== undefined && newQuery !== oldQuery) {
    allTracks.value = []
    hasMoreFromApi.value = false
    nextOffset.value = undefined
    runAiSearch()
  }
}, { immediate: true })

watch(filteredTracks, () => {
  checkInitialLoad()
})

/* --- Lifecycle --- */
onMounted(async () => {
  headerMounted.value = true
  window.addEventListener('scroll', handleScroll, { passive: true })
  checkInitialLoad()
  if (query.value) {
    // Wait for auth to be loaded before running AI search
    if (authLoading.value) {
      await until(authLoading).toBe(false)
    }
    runAiSearch()
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="flex flex-1 flex-col">
    <SearchBackground />

    <!-- Teleport SearchBar to header center slots -->
    <Teleport v-if="headerMounted" to="#header-center-desktop">
      <div class="w-full max-w-xl">
        <SearchBar v-model="searchInput" :loading="isLoading" @search="search" />
      </div>
    </Teleport>
    <Teleport v-if="headerMounted" to="#header-center-mobile">
      <SearchBar v-model="searchInput" :loading="isLoading" @search="search" />
    </Teleport>

  <!-- Results -->
  <main class="relative mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-32 md:px-6 md:py-10">
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

        <!-- AI Limit CTA -->
        <section v-if="aiLimitReached" class="mt-4 rounded-xl border border-amber-500/30 bg-amber-900/10 p-4">
          <div class="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <UIcon name="i-heroicons-sparkles" class="h-6 w-6 text-amber-400" />
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-amber-400">{{ t.aiLimitReached }}</h3>
              <p class="text-sm text-neutral-400">{{ t.aiLimitMessage }}</p>
              <p class="text-sm text-neutral-300">{{ t.aiLimitCta }}</p>
            </div>
            <NuxtLink
              to="/subscription"
              class="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-linear-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500"
            >
              <UIcon name="i-heroicons-sparkles" class="h-4 w-4" />
              {{ t.upgradePlan }}
            </NuxtLink>
          </div>
        </section>

        <!-- AI Counter (for non-premium users) -->
        <div v-else-if="!isPremium && aiGenerationsLeft < Infinity" class="mt-4 flex items-center justify-end gap-2 text-xs text-neutral-500">
          <UIcon name="i-heroicons-sparkles" class="h-3.5 w-3.5" />
          <span>{{ aiGenerationsLeft }} {{ t.aiGenerationsLeft }}</span>
        </div>

        <!-- AI Section -->
        <SearchAiSection
          v-if="!aiLimitReached && (aiLoading || filteredAiResults.length)"
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

      <!-- Error state -->
      <div v-else-if="searchError" class="py-12 text-center">
        <UIcon name="i-heroicons-exclamation-triangle" class="mx-auto mb-4 h-12 w-12 text-red-500" />
        <p class="text-red-400">{{ searchError }}</p>
      </div>

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
  </div>
</template>
