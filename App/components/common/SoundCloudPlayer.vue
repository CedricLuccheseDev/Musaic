<script setup lang="ts">
import { DownloadStatus } from '~/types/track'

/* --- States --- */
const { t } = useI18n()
const { currentTrack, stop, onWidgetReady, setWidget, setVolume, volume } = useSoundCloudEmbed()
const iframeRef = ref<HTMLIFrameElement | null>(null)
let widgetInstance: ReturnType<NonNullable<typeof window.SC>['Widget']> | null = null

/* --- Computed --- */
const embedUrl = computed(() => {
  if (!currentTrack.value) return ''
  const trackUrl = encodeURIComponent(currentTrack.value.permalink_url)
  return `https://w.soundcloud.com/player/?url=${trackUrl}&color=%238b5cf6&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`
})

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

/* --- Methods --- */
function initWidget() {
  if (!iframeRef.value || !window.SC?.Widget) return
  widgetInstance = window.SC.Widget(iframeRef.value)
  setWidget(widgetInstance)
  widgetInstance.bind(window.SC.Widget.Events.READY, () => {
    widgetInstance?.setVolume(volume.value)
  })
}

function handleIframeLoad() {
  onWidgetReady()
  const checkSC = setInterval(() => {
    if (window.SC?.Widget) {
      clearInterval(checkSC)
      initWidget()
    }
  }, 50)
  setTimeout(() => clearInterval(checkSC), 3000)
}

function onVolumeChange(event: Event) {
  const target = event.target as HTMLInputElement
  const newVolume = Number(target.value)
  setVolume(newVolume)
  widgetInstance?.setVolume(newVolume)
}

/* --- Lifecycle --- */
onMounted(() => {
  if (!document.getElementById('sc-widget-api')) {
    const script = document.createElement('script')
    script.id = 'sc-widget-api'
    script.src = 'https://w.soundcloud.com/player/api.js'
    document.head.appendChild(script)
  }
})
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
      class="fixed inset-x-0 bottom-0 z-50"
    >
      <div class="border-t border-white/10 bg-neutral-950/95 backdrop-blur-xl">
        <div class="flex items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
          <!-- Left: Track info (hidden on mobile) -->
          <div class="hidden shrink-0 items-center gap-3 sm:flex">
            <div class="h-10 w-10 shrink-0 overflow-hidden rounded-lg shadow-lg">
              <img
                v-if="currentTrack.artwork"
                :src="currentTrack.artwork"
                :alt="currentTrack.title"
                class="h-full w-full object-cover"
              >
              <div v-else class="flex h-full w-full items-center justify-center bg-neutral-800">
                <UIcon name="i-heroicons-musical-note" class="h-4 w-4 text-neutral-600" />
              </div>
            </div>
            <div class="min-w-0 sm:w-28 md:w-40 lg:w-48">
              <p class="truncate text-sm font-medium text-white">{{ currentTrack.title }}</p>
              <p class="truncate text-xs text-neutral-500">{{ currentTrack.artist }}</p>
            </div>
          </div>

          <!-- Center: SoundCloud Widget (max-w-xl like searchbar) -->
          <div class="mx-auto w-full max-w-xl flex-1 overflow-hidden rounded bg-neutral-900">
            <iframe
              ref="iframeRef"
              :src="embedUrl"
              width="100%"
              height="20"
              scrolling="no"
              frameborder="no"
              allow="autoplay"
              class="block invert hue-rotate-180 saturate-[0.8] brightness-[0.96]"
              @load="handleIframeLoad"
            />
          </div>

          <!-- Right: Action buttons (hidden on mobile, except close) -->
          <div class="flex shrink-0 items-center gap-2">
            <!-- Volume slider (desktop only) -->
            <div class="hidden items-center gap-2 sm:flex">
              <UIcon name="i-heroicons-speaker-wave" class="h-4 w-4 text-neutral-400" />
              <div class="relative h-1 w-20 rounded-full bg-neutral-700">
                <div
                  class="absolute left-0 top-0 h-full rounded-full bg-violet-500"
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

            <a
              v-if="isDirectDownload && downloadUrl"
              :href="downloadUrl"
              class="hidden h-8 items-center gap-1.5 rounded-full bg-emerald-600 px-3 text-xs font-medium text-white transition-all hover:bg-emerald-500 sm:flex"
              @click.stop
            >
              <UIcon name="i-heroicons-arrow-down-tray" class="h-4 w-4" />
              <span class="hidden md:inline">{{ t.download }}</span>
            </a>

            <a
              v-else-if="isFreeDownload && downloadUrl"
              :href="downloadUrl"
              target="_blank"
              rel="noopener"
              class="hidden h-8 items-center gap-1.5 rounded-full bg-emerald-600/80 px-3 text-xs font-medium text-white transition-all hover:bg-emerald-500 sm:flex"
              @click.stop
            >
              <UIcon name="i-heroicons-arrow-top-right-on-square" class="h-4 w-4" />
              <span class="hidden md:inline">{{ t.freeLink }}</span>
            </a>

            <a
              v-else-if="hasPurchaseUrl"
              :href="currentTrack.purchase_url!"
              target="_blank"
              rel="noopener"
              class="hidden h-8 items-center gap-1.5 rounded-full border border-orange-500/50 bg-orange-500/10 px-3 text-xs font-medium text-orange-400 transition-all hover:bg-orange-500/20 sm:flex"
              @click.stop
            >
              <UIcon name="i-heroicons-shopping-cart" class="h-4 w-4" />
              <span class="hidden md:inline">{{ t.buy }}</span>
            </a>

            <button
              type="button"
              class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-500 transition-all hover:bg-white/10 hover:text-white"
              @click="stop"
            >
              <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
