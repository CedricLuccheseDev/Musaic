<script setup lang="ts">
/* --- Composables --- */
const { t } = useI18n()
const {
  hasAnyTrack,
  deckA,
  deckB,
  crossfader,
  masterBpm,
  syncEnabled,
  quantizeEnabled,
  setCrossfader,
  toggleSync,
  toggleQuantize,
  togglePlay,
  syncStart,
  startScrub,
  scrub,
  endScrub,
  cleanup
} = useDjPlayer()

/* --- Keyboard shortcuts --- */
function handleKeydown(event: KeyboardEvent) {
  // Ignore if user is typing in an input
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return
  }

  if (event.key.toLowerCase() === 'a') {
    event.preventDefault()
    if (deckA.value.track) {
      togglePlay('A')
    }
  }
  else if (event.key.toLowerCase() === 'b') {
    event.preventDefault()
    if (deckB.value.track) {
      togglePlay('B')
    }
  }
}

/* --- Lifecycle --- */
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  cleanup()
})

/* --- Computed --- */
const bothTracksLoaded = computed(() => deckA.value.track !== null && deckB.value.track !== null)

/* --- Methods --- */
function handleCrossfaderInput(event: Event) {
  const target = event.target as HTMLInputElement
  setCrossfader(Number(target.value))
}

function handleScrubStartA() {
  startScrub('A')
}

function handleScrubA(time: number, velocity: number) {
  scrub('A', time, velocity)
}

function handleScrubEndA() {
  endScrub('A')
}

function handleScrubStartB() {
  startScrub('B')
}

function handleScrubB(time: number, velocity: number) {
  scrub('B', time, velocity)
}

function handleScrubEndB() {
  endScrub('B')
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
      v-if="hasAnyTrack"
      class="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4"
    >
      <div class="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-neutral-950/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-4">
        <!-- Waveforms stacked -->
        <div class="mb-3 space-y-1">
          <DjWaveform
            :track="deckA.track"
            :duration="deckA.duration"
            :waveform-data="deckA.waveformData"
            :is-playing="deckA.isPlaying"
            :playback-rate="deckA.playbackRate"
            :time-advance-rate="deckA.timeAdvanceRate"
            :initial-time="deckA.currentTime"
            deck="A"
            @scrub-start="handleScrubStartA"
            @scrub="handleScrubA"
            @scrub-end="handleScrubEndA"
          />
          <DjWaveform
            :track="deckB.track"
            :duration="deckB.duration"
            :waveform-data="deckB.waveformData"
            :is-playing="deckB.isPlaying"
            :playback-rate="deckB.playbackRate"
            :time-advance-rate="deckB.timeAdvanceRate"
            :beat-offset-correction="deckB.beatOffsetCorrection"
            :initial-time="deckB.currentTime"
            deck="B"
            @scrub-start="handleScrubStartB"
            @scrub="handleScrubB"
            @scrub-end="handleScrubEndB"
          />
        </div>

        <!-- Controls row -->
        <div class="flex min-w-0 items-center gap-3 overflow-hidden sm:gap-4">
          <!-- Deck A controls -->
          <DjDeck deck="A" />

          <!-- Center Controls -->
          <div class="flex w-24 shrink-0 flex-col items-center justify-center gap-2 sm:w-28">
            <!-- Sync & Quantize row -->
            <div class="flex w-full gap-1">
              <button
                type="button"
                class="flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all"
                :class="syncEnabled
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'"
                @click="toggleSync"
              >
                SYNC
              </button>
              <button
                type="button"
                class="flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all"
                :class="quantizeEnabled
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'"
                @click="toggleQuantize"
              >
                Q
              </button>
            </div>

            <!-- Drop button - starts both tracks at drop -->
            <button
              v-if="bothTracksLoaded"
              type="button"
              class="w-full cursor-pointer rounded-lg bg-amber-500 px-2 py-1.5 text-[10px] font-bold text-black shadow-lg shadow-amber-500/30 transition-all hover:bg-amber-400"
              @click="syncStart"
            >
              DROP
            </button>

            <!-- Master BPM info -->
            <div v-if="syncEnabled && masterBpm > 0" class="w-full text-center">
              <p class="text-[10px] text-neutral-500">{{ t.djMasterBpm }}</p>
              <p class="text-sm font-bold text-violet-400">{{ Math.round(masterBpm) }}</p>
            </div>

            <!-- Crossfader -->
            <div class="w-full">
              <div class="mb-1 flex justify-between text-[10px] text-neutral-500">
                <span class="text-cyan-400">A</span>
                <span class="text-orange-400">B</span>
              </div>
              <input
                type="range"
                :value="crossfader"
                min="-1"
                max="1"
                step="0.01"
                class="w-full cursor-pointer accent-violet-500"
                @input="handleCrossfaderInput"
              >
            </div>
          </div>

          <!-- Deck B controls -->
          <DjDeck deck="B" />
        </div>
      </div>
    </div>
  </Transition>
</template>
