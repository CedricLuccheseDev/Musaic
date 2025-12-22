<script setup lang="ts">
import { DownloadStatus } from '~/types'

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
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="currentTrack"
      class="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div class="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-neutral-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <!-- Main content -->
        <div class="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
          <!-- Artwork with play overlay -->
          <div
            class="group relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl shadow-lg sm:h-16 sm:w-16"
            @click="togglePlay"
          >
            <img
              v-if="currentTrack.artwork"
              :src="currentTrack.artwork"
              :alt="currentTrack.title"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            >
            <div v-else class="flex h-full w-full items-center justify-center bg-linear-to-br from-violet-600 to-fuchsia-600">
              <UIcon name="i-heroicons-musical-note" class="h-6 w-6 text-white/70" />
            </div>
            <!-- Play/Pause overlay -->
            <div
              class="absolute inset-0 flex items-center justify-center bg-black/40 transition-all"
              :class="isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
            >
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform group-hover:scale-110"
              >
                <UIcon v-if="isLoading" name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin text-white" />
                <UIcon v-else-if="isPlaying" name="i-heroicons-pause-solid" class="h-5 w-5 text-white" />
                <UIcon v-else name="i-heroicons-play-solid" class="ml-0.5 h-5 w-5 text-white" />
              </div>
            </div>
          </div>

          <!-- Track info + Progress -->
          <div class="min-w-0 flex-1">
            <div class="mb-2">
              <p class="truncate text-sm font-semibold text-white sm:text-base">
                {{ currentTrack.title }}
              </p>
              <p class="truncate text-xs text-neutral-400 sm:text-sm">
                {{ currentTrack.artist }}
              </p>
            </div>

            <!-- Progress bar -->
            <div class="flex items-center gap-2">
              <span class="w-9 text-[10px] tabular-nums text-neutral-500 sm:text-xs">{{ formatTime(currentTime) }}</span>
              <div
                ref="progressBarRef"
                class="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-neutral-800"
                @mousedown="handleProgressMouseDown"
              >
                <div
                  class="absolute left-0 top-0 h-full rounded-full bg-white/10"
                  :style="{ width: `${bufferedPercent}%` }"
                />
                <div
                  class="absolute left-0 top-0 h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500"
                  :style="{ width: `${progress}%` }"
                />
                <!-- Thumb -->
                <div
                  class="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                  :class="{ 'opacity-100': isDragging }"
                  :style="{ left: `calc(${progress}% - 6px)` }"
                />
              </div>
              <span class="w-9 text-[10px] tabular-nums text-neutral-500 sm:text-xs">{{ formatTime(duration) }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 items-center gap-1 sm:gap-2">
            <!-- Volume (desktop) -->
            <div
              class="relative hidden items-center sm:flex"
              @mouseenter="showVolume = true"
              @mouseleave="showVolume = false"
            >
              <button
                type="button"
                class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
                @click="toggleMute"
              >
                <UIcon :name="volumeIcon" class="h-4 w-4" />
              </button>
              <Transition
                enter-active-class="transition-all duration-150"
                enter-from-class="opacity-0 scale-95"
                enter-to-class="opacity-100 scale-100"
                leave-active-class="transition-all duration-100"
                leave-from-class="opacity-100 scale-100"
                leave-to-class="opacity-0 scale-95"
              >
                <div
                  v-if="showVolume"
                  class="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-xl bg-neutral-800 p-3 shadow-xl"
                >
                  <div class="relative flex h-24 w-6 items-center justify-center">
                    <!-- Track background -->
                    <div class="absolute h-full w-1 rounded-full bg-neutral-700" />
                    <!-- Track fill -->
                    <div
                      class="absolute bottom-0 w-1 rounded-full bg-linear-to-t from-violet-500 to-fuchsia-500"
                      :style="{ height: `${volume}%` }"
                    />
                    <!-- Input -->
                    <input
                      type="range"
                      min="0"
                      max="100"
                      :value="volume"
                      class="absolute h-full w-full cursor-pointer appearance-none bg-transparent [writing-mode:vertical-lr] [direction:rtl] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
                      @input="onVolumeChange"
                    >
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Download/Buy buttons -->
            <a
              v-if="isDirectDownload && downloadUrl"
              :href="downloadUrl"
              class="flex h-8 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-xs font-medium text-white transition-all hover:bg-emerald-500"
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
              class="flex h-8 items-center gap-1.5 rounded-full bg-emerald-600/80 px-3 text-xs font-medium text-white transition-all hover:bg-emerald-500"
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
              class="flex h-8 items-center gap-1.5 rounded-full border border-orange-500/40 px-3 text-xs font-medium text-orange-400 transition-all hover:bg-orange-500/10"
              @click.stop
            >
              <UIcon name="i-heroicons-shopping-cart" class="h-4 w-4" />
              <span class="hidden sm:inline">{{ t.buy }}</span>
            </a>

            <!-- Powered by SoundCloud -->
            <a
              :href="currentTrack.permalink_url"
              target="_blank"
              rel="noopener"
              class="hidden items-center gap-1.5 rounded-full bg-neutral-800 px-2.5 py-1.5 text-[10px] text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-orange-400 sm:flex"
            >
              <span>Powered by</span>
              <UIcon name="i-simple-icons-soundcloud" class="h-4 w-4 text-orange-500" />
            </a>

            <!-- Close -->
            <button
              type="button"
              class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
              @click="stop"
            >
              <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
