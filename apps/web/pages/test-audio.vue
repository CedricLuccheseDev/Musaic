<script setup lang="ts">
/* --- States --- */
const trackId = ref('1399268798') // Example track ID
const status = ref('Ready')
const isPlaying = ref(false)
const lowCutEnabled = ref(false)
const audioContext = ref<AudioContext | null>(null)
const sourceNode = ref<MediaElementAudioSourceNode | null>(null)
const lowCutFilter = ref<BiquadFilterNode | null>(null)
const audioElement = ref<HTMLAudioElement | null>(null)

/* --- Computed --- */
const streamUrl = computed(() => `/api/stream/${trackId.value}`)

/* --- Methods --- */
async function initAudio() {
  if (!audioElement.value) return

  try {
    status.value = 'Creating AudioContext...'

    // Create AudioContext
    audioContext.value = new AudioContext()

    // Create source from audio element
    sourceNode.value = audioContext.value.createMediaElementSource(audioElement.value)

    // Create low-cut filter (high-pass to remove bass)
    lowCutFilter.value = audioContext.value.createBiquadFilter()
    lowCutFilter.value.type = 'highpass'
    lowCutFilter.value.frequency.value = 20 // Start with no cut
    lowCutFilter.value.Q.value = 0.7

    // Connect: source -> filter -> destination
    sourceNode.value.connect(lowCutFilter.value)
    lowCutFilter.value.connect(audioContext.value.destination)

    status.value = '✅ AudioContext ready! Web Audio API works!'
  }
  catch (error) {
    status.value = `❌ Error: ${error}`
    console.error('Audio init error:', error)
  }
}

async function play() {
  if (!audioElement.value) return

  // Initialize on first play (required for user gesture)
  if (!audioContext.value) {
    await initAudio()
  }

  // Resume if suspended
  if (audioContext.value?.state === 'suspended') {
    await audioContext.value.resume()
  }

  try {
    status.value = 'Loading audio...'
    await audioElement.value.play()
    isPlaying.value = true
    status.value = '▶️ Playing with Web Audio API!'
  }
  catch (error) {
    status.value = `❌ Play error: ${error}`
  }
}

function pause() {
  audioElement.value?.pause()
  isPlaying.value = false
  status.value = '⏸️ Paused'
}

function toggleLowCut() {
  if (!lowCutFilter.value) return

  lowCutEnabled.value = !lowCutEnabled.value

  // 300Hz cuts most bass frequencies
  lowCutFilter.value.frequency.value = lowCutEnabled.value ? 300 : 20

  status.value = lowCutEnabled.value
    ? '🔇 Bass cut enabled (300Hz highpass)'
    : '🔊 Bass restored'
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-900 p-8 text-white">
    <h1 class="text-2xl font-bold">Web Audio API Test</h1>

    <div class="rounded-lg bg-neutral-800 p-4 text-center">
      <p class="text-lg">{{ status }}</p>
    </div>

    <div class="flex items-center gap-4">
      <label class="text-sm text-neutral-400">Track ID:</label>
      <input
        v-model="trackId"
        type="text"
        class="rounded bg-neutral-700 px-3 py-2 text-white"
        placeholder="SoundCloud track ID"
      >
    </div>

    <!-- Hidden audio element -->
    <audio
      ref="audioElement"
      :src="streamUrl"
      crossorigin="anonymous"
      preload="none"
    />

    <div class="flex gap-4">
      <button
        v-if="!isPlaying"
        class="rounded-lg bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-500"
        @click="play"
      >
        ▶️ Play
      </button>
      <button
        v-else
        class="rounded-lg bg-neutral-600 px-6 py-3 font-semibold transition hover:bg-neutral-500"
        @click="pause"
      >
        ⏸️ Pause
      </button>

      <button
        :class="[
          'rounded-lg px-6 py-3 font-semibold transition',
          lowCutEnabled ? 'bg-red-600 hover:bg-red-500' : 'bg-cyan-600 hover:bg-cyan-500'
        ]"
        :disabled="!audioContext"
        @click="toggleLowCut"
      >
        {{ lowCutEnabled ? '🔇 Bass OFF' : '🔊 Cut Bass' }}
      </button>
    </div>

    <div class="mt-8 max-w-md text-center text-sm text-neutral-500">
      <p>Ce test vérifie si on peut :</p>
      <ul class="mt-2 list-inside list-disc text-left">
        <li>Streamer depuis l'API proxy</li>
        <li>Connecter à Web Audio API</li>
        <li>Appliquer des effets (filtre passe-haut)</li>
      </ul>
    </div>
  </div>
</template>
