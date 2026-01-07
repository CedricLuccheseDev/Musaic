<script setup lang="ts">
import JSZip from 'jszip'
import { DownloadStatus, type TrackEntry } from '~/types'

/* --- Props --- */
const props = defineProps<{
  loading: boolean
  results: TrackEntry[]
  sql?: string
  response: string
  wantsDownload?: boolean
}>()

/* --- States --- */
const { t } = useI18n()
const collapsed = ref(false)
const artistCollapsed = ref<Record<string, boolean>>({})
const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadedCount = ref(0)

/* --- Computed --- */
const directDownloadTracks = computed(() =>
  props.results.filter(t => t.downloadStatus === DownloadStatus.FreeDirectLink)
)

const externalLinkTracks = computed(() =>
  props.results.filter(t => t.downloadStatus === DownloadStatus.FreeExternalLink && t.purchase_url)
)

const hasDownloadableTracks = computed(() =>
  directDownloadTracks.value.length > 0 || externalLinkTracks.value.length > 0
)

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

/* --- Methods --- */
function toggleArtist(artist: string) {
  artistCollapsed.value[artist] = !artistCollapsed.value[artist]
}

function isArtistCollapsed(artist: string): boolean {
  return artistCollapsed.value[artist] ?? false
}

async function downloadAsZip() {
  if (directDownloadTracks.value.length === 0) return

  isDownloading.value = true
  downloadProgress.value = 0
  downloadedCount.value = 0

  const zip = new JSZip()
  const tracks = directDownloadTracks.value

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i]
    try {
      const response = await $fetch<Blob>(`/api/download/${track.id}`, {
        responseType: 'blob'
      })

      const filename = `${track.artist} - ${track.title}.mp3`
        .replace(/[/\\?%*:|"<>]/g, '-')

      zip.file(filename, response)
      downloadedCount.value = i + 1
      downloadProgress.value = Math.round(((i + 1) / tracks.length) * 100)
    } catch (err) {
      console.error(`Failed to download ${track.title}:`, err)
    }
  }

  try {
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `musaic-tracks-${Date.now()}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Failed to generate ZIP:', err)
  } finally {
    isDownloading.value = false
  }
}
</script>

<template>
  <section class="mt-4 rounded-xl border border-purple-500/20 bg-purple-900/10 px-3 md:px-4">
    <!-- AI Loading -->
    <div v-if="loading" class="flex items-center gap-3 py-4">
      <UIcon name="i-heroicons-sparkles" class="h-5 w-5 animate-pulse text-purple-400" />
      <span class="bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-base font-medium text-transparent">
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
        class="group flex w-full cursor-pointer items-center gap-3 py-3 text-left"
        @click="collapsed = !collapsed"
      >
        <UIcon name="i-heroicons-sparkles" class="h-5 w-5 animate-magic text-purple-400 transition-all duration-200 group-hover:scale-110 group-hover:text-purple-300" />
        <h3 class="animate-magic-text flex-1 text-base font-medium transition-all duration-200 group-hover:brightness-125">
          {{ t.aiResults }}
        </h3>
        <span class="text-sm text-purple-400/60 transition-colors duration-200 group-hover:text-purple-300">{{ results.length }} tracks · {{ artistCount }} artistes</span>
        <UIcon
          name="i-heroicons-chevron-down"
          class="h-5 w-5 text-purple-400 transition-all duration-200 group-hover:scale-110 group-hover:text-purple-300"
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
          <!-- AI Response message -->
          <div v-if="props.response" class="mb-4 flex items-start gap-3">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
              <UIcon name="i-heroicons-sparkles" class="h-4 w-4 text-purple-400" />
            </div>
            <p class="flex-1 rounded-2xl rounded-tl-none bg-purple-500/10 px-4 py-2 text-sm text-purple-200">
              {{ props.response }}
            </p>
          </div>

          <!-- Download Section (when user wants to download) -->
          <div v-if="wantsDownload && hasDownloadableTracks" class="mb-5 space-y-3">
            <!-- ZIP Download Button -->
            <button
              v-if="directDownloadTracks.length > 0"
              type="button"
              :disabled="isDownloading"
              class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 transition-all hover:border-purple-400/50 hover:bg-purple-500/20 disabled:cursor-wait disabled:opacity-70"
              @click="downloadAsZip"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <UIcon
                    :name="isDownloading ? 'i-heroicons-arrow-path' : 'i-heroicons-archive-box-arrow-down'"
                    class="h-5 w-5 text-purple-400"
                    :class="{ 'animate-spin': isDownloading }"
                  />
                </div>
                <div class="text-left">
                  <div class="font-medium text-white">{{ t.downloadZip }}</div>
                  <div class="text-sm text-purple-300/70">{{ directDownloadTracks.length }} tracks MP3</div>
                </div>
              </div>
              <div v-if="isDownloading" class="text-sm text-purple-300">
                {{ downloadedCount }}/{{ directDownloadTracks.length }}
              </div>
              <UIcon v-else name="i-heroicons-arrow-down-tray" class="h-5 w-5 text-purple-400" />
            </button>

            <!-- Progress bar -->
            <div v-if="isDownloading" class="h-1 overflow-hidden rounded-full bg-purple-900/50">
              <div
                class="h-full bg-purple-500 transition-all duration-300"
                :style="{ width: `${downloadProgress}%` }"
              />
            </div>

            <!-- External Links List -->
            <div v-if="externalLinkTracks.length > 0" class="space-y-2">
              <div class="text-xs font-medium uppercase tracking-wide text-purple-400/60">
                {{ t.externalLinks }} ({{ externalLinkTracks.length }})
              </div>
              <div class="grid gap-2 sm:grid-cols-2">
                <a
                  v-for="track in externalLinkTracks"
                  :key="track.id"
                  :href="track.purchase_url!"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex cursor-pointer items-center gap-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 transition-all hover:border-purple-400/40 hover:bg-purple-500/15"
                >
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-purple-500/20">
                    <UIcon name="i-heroicons-link" class="h-4 w-4 text-purple-400" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-medium text-white">{{ track.title }}</div>
                    <div class="truncate text-xs text-purple-300/60">{{ track.artist }}</div>
                  </div>
                  <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4 shrink-0 text-purple-400/60" />
                </a>
              </div>
            </div>
          </div>

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
              class="group flex w-full cursor-pointer items-center gap-2 rounded-lg py-2 text-left"
              @click="toggleArtist(artist as string)"
            >
              <UIcon
                name="i-heroicons-chevron-right"
                class="h-4 w-4 text-purple-400/60 transition-all duration-200 group-hover:scale-110 group-hover:text-purple-300"
                :class="{ 'rotate-90': !isArtistCollapsed(artist as string) }"
              />
              <UIcon name="i-heroicons-user-circle" class="h-5 w-5 text-purple-400/70 transition-all duration-200 group-hover:scale-110 group-hover:text-purple-300" />
              <h3 class="flex-1 text-sm font-medium text-purple-300 transition-colors duration-200 group-hover:text-purple-200">{{ artist }}</h3>
              <span class="text-xs text-purple-400/50 transition-colors duration-200 group-hover:text-purple-300">{{ tracks.length }} tracks</span>
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
              <div v-if="!isArtistCollapsed(artist as string)" class="mt-2 space-y-2 overflow-hidden">
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
