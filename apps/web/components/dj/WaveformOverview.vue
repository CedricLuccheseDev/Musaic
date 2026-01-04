<script setup lang="ts">
import type { TrackEntry } from '~/types'

/* --- Props --- */
const props = defineProps<{
  track: TrackEntry | null
  currentTime: number
  duration: number
  waveformData: number[] | null
  deck: 'A' | 'B'
}>()

/* --- Emits --- */
const emit = defineEmits<{
  seek: [time: number]
}>()

/* --- States --- */
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref(0)
const canvasHeight = ref(0)

/* --- Computed --- */
const progress = computed(() => {
  if (!props.duration || props.duration <= 0) return 0
  return (props.currentTime / props.duration) * 100
})

const highlightProgress = computed(() => {
  if (!props.track?.highlight_time || !props.duration || props.duration <= 0) return null
  return (props.track.highlight_time / props.duration) * 100
})

/* --- Methods --- */
function setupCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const dpr = window.devicePixelRatio || 1
  const width = container.clientWidth
  const height = container.clientHeight

  if (width === 0 || height === 0) return

  canvasWidth.value = width
  canvasHeight.value = height

  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  drawWaveform()
}

function drawWaveform() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvasWidth.value
  const height = canvasHeight.value
  if (width === 0 || height === 0) return

  const dpr = window.devicePixelRatio || 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  if (!props.waveformData || props.waveformData.length === 0) return

  const waveColor = props.deck === 'A' ? 'rgba(6, 182, 212, 0.6)' : 'rgba(249, 115, 22, 0.6)'
  const playedColor = props.deck === 'A' ? 'rgba(6, 182, 212, 1)' : 'rgba(249, 115, 22, 1)'

  const barWidth = Math.max(1, width / props.waveformData.length)
  const progressX = (props.currentTime / props.duration) * width

  ctx.fillStyle = waveColor
  for (let i = 0; i < props.waveformData.length; i++) {
    const value = props.waveformData[i] || 0
    const x = (i / props.waveformData.length) * width
    const barHeight = Math.max(1, value * (height - 2))
    const y = (height - barHeight) / 2

    // Brighter color for played portion
    if (x < progressX) {
      ctx.fillStyle = playedColor
    }
    else {
      ctx.fillStyle = waveColor
    }

    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, barWidth - 0.5), Math.round(barHeight))
  }
}

function handleClick(event: MouseEvent) {
  if (!containerRef.value || !props.duration) return

  const rect = containerRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percentage = x / rect.width
  const time = percentage * props.duration

  emit('seek', Math.max(0, Math.min(props.duration, time)))
}

/* --- Lifecycle --- */
onMounted(() => {
  nextTick(() => {
    setupCanvas()
  })

  const resizeObserver = new ResizeObserver(() => {
    setupCanvas()
  })
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
})

watch(() => props.waveformData, () => {
  nextTick(() => setupCanvas())
})

watch(() => props.currentTime, () => {
  drawWaveform()
})
</script>

<template>
  <div
    v-if="track"
    ref="containerRef"
    class="relative h-3 cursor-pointer overflow-hidden rounded bg-neutral-800/50"
    @click="handleClick"
  >
    <canvas
      ref="canvasRef"
      class="absolute inset-0"
    />

    <!-- Drop marker -->
    <div
      v-if="highlightProgress !== null"
      class="absolute top-0 h-full w-0.5"
      :class="deck === 'A' ? 'bg-cyan-400' : 'bg-orange-400'"
      :style="{ left: `${highlightProgress}%` }"
    />

    <!-- Playhead -->
    <div
      class="absolute top-0 h-full w-0.5 bg-white shadow-sm shadow-white/50"
      :style="{ left: `${progress}%` }"
    />
  </div>
</template>
