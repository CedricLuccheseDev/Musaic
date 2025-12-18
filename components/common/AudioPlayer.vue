<script setup lang="ts">
import { DownloadStatus } from '~/types/track'

/* --- Composables --- */
const { t } = useI18n()
const {
  currentTrack,
  isPlaying,
  isLoading,
  volume,
  currentTime,
  duration,
  progress,
  bufferedPercent,
  play,
  pause,
  stop,
  seek,
  setVolume,
  formatTime
} = useAudioPlayer()

/* --- States --- */
const progressBarRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const showVolume = ref(false)

/* --- Computed --- */
const downloadUrl = computed(() => {
  if (!currentTrack.value) return null
  if (currentTrack.value.downloadStatus === DownloadStatus.FreeDirectLink) {
    return `/api/download/${currentTrack.value.id}`
  }
  if (currentTrack.value.downloadStatus === DownloadStatus.FreeExternalLink) {
    return currentTrack.value.purchase_url
  }
  return null
})

const isDirectDownload = computed(() => {
  return currentTrack.value?.downloadStatus === DownloadStatus.FreeDirectLink
})

const isFreeDownload = computed(() => {
  return currentTrack.value?.downloadStatus !== DownloadStatus.No
})

const hasPurchaseUrl = computed(() => {
  return currentTrack.value?.purchase_url && !isFreeDownload.value
})

const volumeIcon = computed(() => {
  if (volume.value === 0) return 'i-heroicons-speaker-x-mark'
  if (volume.value < 50) return 'i-heroicons-speaker-wave'
  return 'i-heroicons-speaker-wave'
})

/* --- Methods --- */
function togglePlay() {
  if (!currentTrack.value) return
  if (isPlaying.value) {
    pause()
  }
  else {
    play(currentTrack.value)
  }
}

function getSeekTimeFromEvent(event: MouseEvent | TouchEvent): number {
  if (!progressBarRef.value || !duration.value) return 0

  const rect = progressBarRef.value.getBoundingClientRect()
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  return percent * duration.value
}

function handleProgressMouseDown(event: MouseEvent) {
  event.preventDefault()
  isDragging.value = true
  const time = getSeekTimeFromEvent(event)
  seek(time)

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.value) {
      const time = getSeekTimeFromEvent(e)
      seek(time)
    }
  }

  const handleMouseUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function onVolumeChange(event: Event) {
  const target = event.target as HTMLInputElement
  setVolume(Number(target.value))
}

function toggleMute() {
  if (volume.value > 0) {
    setVolume(0)
  }
  else {
    setVolume(80)
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-500 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="currentTrack"
      class="fixed inset-x-0 bottom-0 z-50 px-2 pb-2 sm:px-4 sm:pb-4"
    >
      <!-- Glassmorphism container -->
      <div class="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-neutral-900/80 shadow-2xl shadow-black/50 backdrop-blur-2xl">
        <!-- Progress bar on top -->
        <div
          ref="progressBarRef"
          class="group relative h-4 w-full cursor-pointer px-2"
          @mousedown="handleProgressMouseDown"
        >
          <!-- Track background -->
          <div class="absolute inset-x-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-800/80">
            <!-- Buffered -->
            <div
              class="absolute left-0 top-0 h-full rounded-full bg-white/10 transition-all"
              :style="{ width: `${bufferedPercent}%` }"
            />
            <!-- Progress gradient -->
            <div
              class="absolute left-0 top-0 h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 transition-all"
              :style="{ width: `${progress}%` }"
            />
            <!-- Glow effect -->
            <div
              class="absolute left-0 top-0 h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 blur-sm transition-all"
              :style="{ width: `${progress}%`, opacity: 0.6 }"
            />
          </div>
          <!-- Thumb -->
          <div
            class="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-lg shadow-violet-500/50 transition-all"
            :class="isDragging ? 'opacity-100 scale-125' : 'opacity-0 group-hover:opacity-100'"
            :style="{ left: `calc(8px + (100% - 16px) * ${progress / 100} - 7px)` }"
          />
        </div>

        <!-- Main content -->
        <div class="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
          <!-- Artwork with glow -->
          <div class="relative shrink-0">
            <div class="absolute -inset-1 rounded-xl bg-linear-to-br from-violet-500/30 to-fuchsia-500/30 blur-lg" />
            <div class="relative h-14 w-14 overflow-hidden rounded-xl shadow-lg sm:h-16 sm:w-16">
              <img
                v-if="currentTrack.artwork"
                :src="currentTrack.artwork"
                :alt="currentTrack.title"
                class="h-full w-full object-cover transition-transform duration-500"
                :class="{ 'scale-110': isPlaying }"
              >
              <div v-else class="flex h-full w-full items-center justify-center bg-linear-to-br from-violet-900 to-fuchsia-900">
                <UIcon name="i-heroicons-musical-note" class="h-6 w-6 text-white/50" />
              </div>
              <!-- Playing indicator overlay -->
              <div
                v-if="isPlaying"
                class="absolute inset-0 flex items-center justify-center bg-black/20"
              >
                <div class="flex items-end gap-0.5">
                  <div class="h-3 w-1 animate-pulse rounded-full bg-white" style="animation-delay: 0ms" />
                  <div class="h-4 w-1 animate-pulse rounded-full bg-white" style="animation-delay: 150ms" />
                  <div class="h-2 w-1 animate-pulse rounded-full bg-white" style="animation-delay: 300ms" />
                </div>
              </div>
            </div>
          </div>

          <!-- Track info & controls -->
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <!-- Top row: info + time -->
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-white sm:text-base">
                  {{ currentTrack.title }}
                </p>
                <p class="truncate text-xs text-neutral-400 sm:text-sm">
                  {{ currentTrack.artist }}
                </p>
              </div>
              <!-- Time -->
              <div class="shrink-0 rounded-full bg-white/5 px-2 py-1 text-xs tabular-nums text-neutral-400">
                {{ formatTime(currentTime) }} <span class="text-neutral-600">/</span> {{ formatTime(duration) }}
              </div>
            </div>

            <!-- Bottom row: controls -->
            <div class="flex items-center gap-2">
              <!-- Play/Pause -->
              <button
                type="button"
                class="group/btn relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 transition-all hover:shadow-violet-500/50 hover:scale-105 active:scale-95"
                :disabled="isLoading"
                @click="togglePlay"
              >
                <div class="absolute inset-0 rounded-full bg-white/20 opacity-0 transition-opacity group-hover/btn:opacity-100" />
                <UIcon
                  v-if="isLoading"
                  name="i-heroicons-arrow-path"
                  class="h-5 w-5 animate-spin"
                />
                <UIcon
                  v-else-if="isPlaying"
                  name="i-heroicons-pause-solid"
                  class="h-5 w-5"
                />
                <UIcon
                  v-else
                  name="i-heroicons-play-solid"
                  class="ml-0.5 h-5 w-5"
                />
              </button>

              <!-- Volume (desktop) -->
              <div
                class="relative hidden items-center sm:flex"
                @mouseenter="showVolume = true"
                @mouseleave="showVolume = false"
              >
                <button
                  type="button"
                  class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition-all hover:bg-white/5 hover:text-white"
                  @click="toggleMute"
                >
                  <UIcon :name="volumeIcon" class="h-4 w-4" />
                </button>
                <!-- Volume slider popup -->
                <Transition
                  enter-active-class="transition-all duration-200"
                  enter-from-class="opacity-0 -translate-x-2"
                  enter-to-class="opacity-100 translate-x-0"
                  leave-active-class="transition-all duration-150"
                  leave-from-class="opacity-100 translate-x-0"
                  leave-to-class="opacity-0 -translate-x-2"
                >
                  <div
                    v-if="showVolume"
                    class="absolute left-full ml-1 flex items-center rounded-full bg-neutral-800/90 px-3 py-1.5 backdrop-blur-sm"
                  >
                    <div class="relative h-1 w-20 rounded-full bg-neutral-700">
                      <div
                        class="absolute left-0 top-0 h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500"
                        :style="{ width: `${volume}%` }"
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        :value="volume"
                        class="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
                        @input="onVolumeChange"
                      >
                    </div>
                  </div>
                </Transition>
              </div>

              <!-- Spacer -->
              <div class="flex-1" />

              <!-- SoundCloud attribution -->
              <a
                :href="currentTrack.permalink_url"
                target="_blank"
                rel="noopener"
                class="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1.5 text-[10px] text-neutral-500 transition-all hover:bg-orange-500/10 hover:text-orange-400 sm:text-xs"
              >
                <span class="hidden sm:inline">Powered by</span>
                <UIcon name="i-simple-icons-soundcloud" class="h-4 w-4 text-orange-400" />
              </a>

              <!-- Download/Buy buttons -->
              <a
                v-if="isDirectDownload && downloadUrl"
                :href="downloadUrl"
                class="flex h-9 items-center gap-1.5 rounded-full bg-linear-to-r from-emerald-500 to-emerald-600 px-3 text-xs font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40 hover:scale-105"
                @click.stop
              >
                <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
                <span class="hidden sm:inline">{{ t.download }}</span>
              </a>

              <a
                v-else-if="isFreeDownload && downloadUrl"
                :href="downloadUrl"
                target="_blank"
                rel="noopener"
                class="flex h-9 items-center gap-1.5 rounded-full bg-linear-to-r from-emerald-500/80 to-emerald-600/80 px-3 text-xs font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40 hover:scale-105"
                @click.stop
              >
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4" />
                <span class="hidden sm:inline">{{ t.freeLink }}</span>
              </a>

              <a
                v-else-if="hasPurchaseUrl"
                :href="currentTrack.purchase_url!"
                target="_blank"
                rel="noopener"
                class="flex h-9 items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 text-xs font-medium text-orange-400 transition-all hover:bg-orange-500/20"
                @click.stop
              >
                <UIcon name="i-heroicons-shopping-cart" class="h-4 w-4" />
                <span class="hidden sm:inline">{{ t.buy }}</span>
              </a>

              <!-- Close -->
              <button
                type="button"
                class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition-all hover:bg-white/5 hover:text-white"
                @click="stop"
              >
                <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}
</style>
