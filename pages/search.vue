<script setup lang="ts">
import { DownloadStatus, type TrackEntry } from '~/types/track'

type FilterType = 'all' | 'free' | 'paid'

const route = useRoute()
const query = computed(() => (route.query.q as string) || '')
const isArtistSearch = computed(() => route.query.searchArtist === '1')
const searchInput = ref(query.value)
const searchArtist = ref(isArtistSearch.value)

// Sync searchArtist when route changes
watch(isArtistSearch, (val) => {
  searchArtist.value = val
})

const PAGE_SIZE = 10

const { data: allResults, status } = await useFetch<TrackEntry[]>('/api/search', {
  query: { q: query, searchArtist: isArtistSearch },
  watch: [query, isArtistSearch],
  server: false
})

const isLoading = computed(() => status.value === 'pending')
const displayCount = ref(PAGE_SIZE)

// Filter state
const activeFilter = ref<FilterType>('all')

// Reset display count when query changes
watch(query, () => {
  displayCount.value = PAGE_SIZE
})

// Filtered results based on download status
const filteredResults = computed(() => {
  if (!allResults.value) return []
  if (activeFilter.value === 'all') return allResults.value
  if (activeFilter.value === 'free') {
    return allResults.value.filter(t => t.downloadStatus !== DownloadStatus.No)
  }
  // paid = not free
  return allResults.value.filter(t => t.downloadStatus === DownloadStatus.No)
})

const visibleResults = computed(() => {
  return filteredResults.value.slice(0, displayCount.value)
})

const hasMore = computed(() => {
  return displayCount.value < filteredResults.value.length
})

const isLoadingMore = ref(false)

function loadMore() {
  if (!hasMore.value || isLoadingMore.value) return
  isLoadingMore.value = true
  setTimeout(() => {
    displayCount.value += PAGE_SIZE
    isLoadingMore.value = false
  }, 300)
}

// Scroll-based infinite loading
function handleScroll() {
  if (import.meta.server) return

  const scrollTop = window.scrollY
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight

  // Load more when user is 200px from bottom
  if (scrollTop + windowHeight >= documentHeight - 200) {
    loadMore()
  }
}

// Check if we need to load more on initial render (when content doesn't fill the page)
function checkInitialLoad() {
  if (import.meta.server) return

  nextTick(() => {
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    // If page doesn't scroll and we have more results, load them
    if (documentHeight <= windowHeight && hasMore.value) {
      loadMore()
    }
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  // Check after initial render
  checkInitialLoad()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Also check when results change
watch(visibleResults, () => {
  checkInitialLoad()
})

function search() {
  if (!searchInput.value.trim()) return
  const queryParams: Record<string, string> = { q: searchInput.value }
  if (searchArtist.value) {
    queryParams.searchArtist = '1'
  }
  navigateTo({ path: '/search', query: queryParams })
}
</script>

<template>
  <div class="relative min-h-screen bg-neutral-950 p-8">
    <Background />
    <Header v-model="searchInput" v-model:search-artist="searchArtist" @search="search" />

    <!-- Results -->
    <main class="relative mx-auto max-w-4xl px-6 py-10">
      <ClientOnly>
        <!-- Loading -->
        <div v-if="isLoading" class="flex justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-muted" />
        </div>

        <!-- Results list -->
        <template v-else-if="allResults?.length">
          <!-- Search header -->
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-white">
              <template v-if="isArtistSearch">
                Tracks de <span class="text-violet-400">{{ query }}</span>
              </template>
              <template v-else>
                Résultats pour "<span class="text-violet-400">{{ query }}</span>"
              </template>
            </h1>
            <p class="mt-1 text-sm text-neutral-500">
              {{ filteredResults.length }} résultat{{ filteredResults.length > 1 ? 's' : '' }}
              <span v-if="activeFilter !== 'all'">
                ({{ allResults.length }} au total)
              </span>
            </p>
          </div>

          <!-- Filters -->
          <div class="mb-6 flex items-center gap-2">
            <button
              class="cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200"
              :class="activeFilter === 'all'
                ? 'bg-violet-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'"
              @click="activeFilter = 'all'"
            >
              Tous
            </button>
            <button
              class="cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200"
              :class="activeFilter === 'free'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'"
              @click="activeFilter = 'free'"
            >
              <span class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
                Gratuit
              </span>
            </button>
            <button
              class="cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200"
              :class="activeFilter === 'paid'
                ? 'bg-orange-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'"
              @click="activeFilter = 'paid'"
            >
              <span class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-shopping-cart" class="h-4 w-4" />
                Payant
              </span>
            </button>
          </div>

          <!-- Track list -->
          <div class="space-y-3">
            <TrackCard v-for="(track, index) in visibleResults" :key="track.id" :track="track" :index="index" />
          </div>

          <!-- No results after filter -->
          <div v-if="!visibleResults.length" class="py-12 text-center">
            <p class="text-neutral-500">Aucun résultat avec ce filtre</p>
          </div>

          <!-- Load more indicator -->
          <div v-else-if="hasMore" class="flex justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin text-muted" />
          </div>

          <!-- End of results -->
          <div v-else class="py-8 text-center text-sm text-neutral-500">
            Fin des résultats
          </div>
        </template>

        <!-- Empty state -->
        <div v-else-if="query" class="py-12 text-center">
          <p class="text-muted">Aucun résultat pour "{{ query }}"</p>
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
