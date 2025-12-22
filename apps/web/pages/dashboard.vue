<script setup lang="ts">
/* --- Types --- */
interface FailedTrack {
  soundcloud_id: number
  title: string
  artist: string
  analysis_error: string | null
}

interface DashboardStats {
  tracks: {
    total: number
    analyzed: number
    pending: number
    failed: number
  }
  users: {
    total: number
    premium: number
  }
  genres: { name: string; count: number }[]
  recentTracks: {
    title: string
    artist: string
    genre: string | null
    created_at: string
    analysis_status: string | null
  }[]
  failedTracks: FailedTrack[]
}

/* --- Meta --- */
definePageMeta({
  layout: 'default'
})

/* --- Composables --- */
const { isAdmin } = useProfile()
const config = useRuntimeConfig()

/* --- Constants --- */
const isDev = config.public.isDev

/* --- States --- */
const batchLoading = ref(false)
const batchMessage = ref('')
const retryingIds = ref<Set<number>>(new Set())

/* --- Data --- */
const { data: stats, status } = useFetch<DashboardStats>('/api/dashboard/stats', {
  server: false,
  lazy: true
})

/* --- Computed --- */
const hasAccess = computed(() => isDev || isAdmin.value)
const isLoading = computed(() => status.value === 'pending')
const analysisProgress = computed(() => {
  if (!stats.value) return 0
  const { analyzed, total } = stats.value.tracks
  return total > 0 ? Math.round((analyzed / total) * 100) : 0
})

const freeUsersCount = computed(() => {
  if (!stats.value) return 0
  return stats.value.users.total - stats.value.users.premium
})

/* --- Methods --- */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusColor(status: string | null): string {
  if (status === 'completed') return 'text-emerald-400'
  if (status === 'failed') return 'text-red-400'
  return 'text-neutral-500'
}

function getStatusIcon(status: string | null): string {
  if (status === 'completed') return 'i-heroicons-check-circle'
  if (status === 'failed') return 'i-heroicons-x-circle'
  return 'i-heroicons-clock'
}

async function launchBatch() {
  batchLoading.value = true
  batchMessage.value = ''

  try {
    const result = await $fetch<{ message: string; sent: number }>('/api/dashboard/analyze-batch', {
      method: 'POST'
    })
    batchMessage.value = `${result.sent} tracks sent for analysis`
  } catch (err) {
    const error = err as { data?: { message?: string } }
    batchMessage.value = error.data?.message || 'Failed to launch batch'
  } finally {
    batchLoading.value = false
  }
}

async function retryAnalysis(soundcloudId: number) {
  retryingIds.value.add(soundcloudId)

  try {
    await $fetch('/api/dashboard/analyze-single', {
      method: 'POST',
      body: { soundcloud_id: soundcloudId }
    })
  } catch {
    // Silent fail - user can retry again
  } finally {
    retryingIds.value.delete(soundcloudId)
  }
}

</script>

<template>
  <div class="min-h-screen p-4 md:p-8">
    <!-- Access Denied -->
    <div v-if="!hasAccess" class="flex flex-col items-center justify-center py-20">
      <UIcon name="i-heroicons-lock-closed" class="mb-4 h-16 w-16 text-neutral-600" />
      <h1 class="text-xl font-semibold text-neutral-400">Access Denied</h1>
      <p class="mt-2 text-sm text-neutral-500">Admin access required</p>
      <NuxtLink to="/" class="mt-6 text-violet-400 hover:text-violet-300">
        Back to home
      </NuxtLink>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="mx-auto max-w-6xl">
      <!-- Header -->
      <div class="mb-8 flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
          <UIcon name="i-heroicons-chart-bar" class="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-white">Dashboard</h1>
          <p class="text-sm text-neutral-500">Admin overview</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-violet-400" />
      </div>

      <!-- Stats Grid -->
      <template v-else-if="stats">
        <!-- Main Stats Cards -->
        <div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Total Tracks -->
          <div class="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <div class="flex items-center justify-between">
              <span class="text-sm text-neutral-500">Total Tracks</span>
              <UIcon name="i-heroicons-musical-note" class="h-5 w-5 text-violet-400" />
            </div>
            <p class="mt-2 text-3xl font-bold text-white">{{ stats.tracks.total.toLocaleString() }}</p>
          </div>

          <!-- Analyzed -->
          <div class="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <div class="flex items-center justify-between">
              <span class="text-sm text-neutral-500">Analyzed</span>
              <UIcon name="i-heroicons-cpu-chip" class="h-5 w-5 text-emerald-400" />
            </div>
            <p class="mt-2 text-3xl font-bold text-emerald-400">{{ stats.tracks.analyzed.toLocaleString() }}</p>
            <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                class="h-full rounded-full bg-emerald-500 transition-all"
                :style="{ width: `${analysisProgress}%` }"
              />
            </div>
            <p class="mt-1 text-xs text-neutral-500">{{ analysisProgress }}% complete</p>
          </div>

          <!-- Pending -->
          <div class="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <div class="flex items-center justify-between">
              <span class="text-sm text-neutral-500">Pending Analysis</span>
              <UIcon name="i-heroicons-clock" class="h-5 w-5 text-amber-400" />
            </div>
            <p class="mt-2 text-3xl font-bold text-amber-400">{{ stats.tracks.pending.toLocaleString() }}</p>
            <button
              v-if="stats.tracks.pending > 0"
              :disabled="batchLoading"
              class="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              @click="launchBatch"
            >
              <UIcon
                :name="batchLoading ? 'i-heroicons-arrow-path' : 'i-heroicons-play'"
                :class="['h-4 w-4', { 'animate-spin': batchLoading }]"
              />
              {{ batchLoading ? 'Sending...' : 'Launch Batch' }}
            </button>
            <p v-if="batchMessage" class="mt-2 text-xs text-neutral-400">{{ batchMessage }}</p>
          </div>

          <!-- Failed -->
          <div class="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <div class="flex items-center justify-between">
              <span class="text-sm text-neutral-500">Failed</span>
              <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-red-400" />
            </div>
            <p class="mt-2 text-3xl font-bold text-red-400">{{ stats.tracks.failed.toLocaleString() }}</p>
          </div>
        </div>

        <!-- Users & Genres Row -->
        <div class="mb-8 grid gap-4 lg:grid-cols-2">
          <!-- Users Card -->
          <div class="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <div class="mb-4 flex items-center gap-2">
              <UIcon name="i-heroicons-users" class="h-5 w-5 text-violet-400" />
              <h2 class="font-semibold text-white">Users</h2>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div class="text-center">
                <p class="text-2xl font-bold text-white">{{ stats.users.total }}</p>
                <p class="text-xs text-neutral-500">Total</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-amber-400">{{ stats.users.premium }}</p>
                <p class="text-xs text-neutral-500">Premium</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-bold text-neutral-400">{{ freeUsersCount }}</p>
                <p class="text-xs text-neutral-500">Free</p>
              </div>
            </div>
          </div>

          <!-- Genres Card -->
          <div class="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <div class="mb-4 flex items-center gap-2">
              <UIcon name="i-heroicons-tag" class="h-5 w-5 text-violet-400" />
              <h2 class="font-semibold text-white">Top Genres</h2>
            </div>
            <div class="space-y-2">
              <div
                v-for="genre in stats.genres.slice(0, 5)"
                :key="genre.name"
                class="flex items-center justify-between"
              >
                <span class="truncate text-sm text-neutral-300">{{ genre.name }}</span>
                <span class="ml-2 text-sm font-medium text-violet-400">{{ genre.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Failed Tracks -->
        <div v-if="stats.failedTracks.length > 0" class="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
          <div class="mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-red-400" />
            <h2 class="font-semibold text-white">Failed Tracks</h2>
          </div>
          <div class="space-y-3">
            <div
              v-for="track in stats.failedTracks"
              :key="track.soundcloud_id"
              class="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-800/30 p-3"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-white">{{ track.title }}</p>
                <p class="truncate text-xs text-neutral-500">{{ track.artist }}</p>
                <p class="mt-1 truncate text-xs text-red-400/80">{{ track.analysis_error || 'Unknown error' }}</p>
              </div>
              <button
                :disabled="retryingIds.has(track.soundcloud_id)"
                class="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                @click="retryAnalysis(track.soundcloud_id)"
              >
                <UIcon
                  :name="retryingIds.has(track.soundcloud_id) ? 'i-heroicons-arrow-path' : 'i-heroicons-arrow-path-rounded-square'"
                  :class="['h-4 w-4', { 'animate-spin': retryingIds.has(track.soundcloud_id) }]"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Recent Tracks -->
        <div class="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
          <div class="mb-4 flex items-center gap-2">
            <UIcon name="i-heroicons-clock" class="h-5 w-5 text-violet-400" />
            <h2 class="font-semibold text-white">Recent Tracks</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-neutral-800 text-left text-neutral-500">
                  <th class="pb-3 pr-4">Title</th>
                  <th class="pb-3 pr-4">Artist</th>
                  <th class="pb-3 pr-4">Genre</th>
                  <th class="pb-3 pr-4">Added</th>
                  <th class="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(track, i) in stats.recentTracks"
                  :key="i"
                  class="border-b border-neutral-800/50 last:border-0"
                >
                  <td class="max-w-[200px] truncate py-3 pr-4 text-white">{{ track.title }}</td>
                  <td class="py-3 pr-4 text-neutral-400">{{ track.artist }}</td>
                  <td class="py-3 pr-4 text-neutral-500">{{ track.genre || '-' }}</td>
                  <td class="py-3 pr-4 text-neutral-500">{{ formatDate(track.created_at) }}</td>
                  <td class="py-3">
                    <UIcon
                      :name="getStatusIcon(track.analysis_status)"
                      :class="['h-4 w-4', getStatusColor(track.analysis_status)]"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
