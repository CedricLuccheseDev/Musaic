<script setup lang="ts">
import type { TrackEntry } from '~/types'

/* --- Props --- */
const props = defineProps<{
  track: TrackEntry | null
  currentTime: number
  duration: number
  deck: 'A' | 'B'
  waveformData: number[] | null
  isPlaying: boolean
  playbackRate: number
  beatOffsetCorrection?: number // Correction to align beat grid with other deck
}>()

/* --- Emits --- */
const emit = defineEmits<{
  scrubStart: []
  scrub: [time: number, velocity: number]
  scrubEnd: []
}>()

/* --- States --- */
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartTime = ref(0)
const lastDragX = ref(0)
const lastDragTimestamp = ref(0)
const animationFrame = ref<number | null>(null)
const canvasWidth = ref(0)
const canvasHeight = ref(0)

// For smooth playback: we predict time based on last known position
const lastKnownTime = ref(0)
const lastUpdateTimestamp = ref(0)
const displayTime = ref(0)

/* --- Constants --- */
const SAMPLES_PER_SECOND = 50
const BAR_WIDTH = 2
const BAR_GAP = 1

/* --- Computed --- */
// Beat interval in audio time (based on original BPM)
const beatInterval = computed(() => {
  if (props.track?.bpm_detected) {
    return 60 / props.track.bpm_detected
  }
  return 0
})

// Beat offset with correction
const beatOffset = computed(() => {
  const base = props.track?.beat_offset ?? 0
  const correction = props.beatOffsetCorrection ?? 0
  return base + correction
})
const highlightTime = computed(() => props.track?.highlight_time || 0)

// Base pixels per second
const basePixelsPerSecond = SAMPLES_PER_SECOND * (BAR_WIDTH + BAR_GAP)

// Pixels per second - scaled INVERSELY by playbackRate to stretch the waveform
// When playbackRate < 1 (track slowed down), we ZOOM IN (more px per audio second)
// This makes beat spacing visually identical between synced decks:
//
// For deck A (174 BPM, rate 1.0):
//   beatInterval = 60/174 = 0.345s
//   pixelsPerSecond = 150 / 1.0 = 150
//   visual spacing = 0.345 * 150 = 51.7 px
//
// For deck B (178 BPM, rate 174/178 = 0.978):
//   beatInterval = 60/178 = 0.337s
//   pixelsPerSecond = 150 / 0.978 = 153.4
//   visual spacing = 0.337 * 153.4 = 51.7 px ✓ SAME!
//
// The waveform scrolls faster (more px/s) but each audio second is stretched
// proportionally, so beats align visually
const pixelsPerSecond = computed(() => basePixelsPerSecond / props.playbackRate)

/* --- Methods --- */
function setupCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return false

  const dpr = window.devicePixelRatio || 1
  const width = container.clientWidth
  const height = container.clientHeight

  if (width === 0 || height === 0) return false

  canvasWidth.value = width
  canvasHeight.value = height

  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  return true
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

  const centerX = width / 2
  const currentPos = displayTime.value * pixelsPerSecond.value
  const startX = currentPos - centerX

  // Deck colors
  const waveColor = props.deck === 'A' ? 'rgba(6, 182, 212, 0.85)' : 'rgba(249, 115, 22, 0.85)'

  // Draw waveform bars
  if (props.waveformData && props.waveformData.length > 0) {
    const startSample = Math.max(0, Math.floor(startX / (BAR_WIDTH + BAR_GAP)) - 1)
    const endSample = Math.min(props.waveformData.length, Math.ceil((currentPos + centerX) / (BAR_WIDTH + BAR_GAP)) + 1)

    ctx.fillStyle = waveColor
    for (let i = startSample; i < endSample; i++) {
      const value = props.waveformData[i] || 0
      const x = i * (BAR_WIDTH + BAR_GAP) - startX
      const barHeight = Math.max(2, value * (height - 4))
      const y = (height - barHeight) / 2
      ctx.fillRect(Math.round(x), Math.round(y), BAR_WIDTH, Math.round(barHeight))
    }
  }

  // Draw beat grid lines ON TOP of waveform
  // Calculate beats dynamically based on current position
  if (beatInterval.value > 0) {
    const visibleSeconds = width / pixelsPerSecond.value
    const offset = beatOffset.value

    // Calculate how many beats from the offset to the current time
    const beatsFromOffset = (displayTime.value - offset) / beatInterval.value
    // Find the first beat index that's visible (before current time by half screen)
    const firstVisibleBeatIndex = Math.floor(beatsFromOffset - visibleSeconds / 2 / beatInterval.value) - 1
    const lastVisibleBeatIndex = Math.ceil(beatsFromOffset + visibleSeconds / 2 / beatInterval.value) + 1

    for (let i = firstVisibleBeatIndex; i <= lastVisibleBeatIndex; i++) {
      const beatTime = offset + i * beatInterval.value
      if (beatTime < 0) continue
      if (beatTime > props.duration) break

      const x = (beatTime * pixelsPerSecond.value) - startX
      const isDownbeat = i % 4 === 0

      // Draw vertical line
      if (isDownbeat) {
        // Downbeat - bright white, thicker
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillRect(Math.round(x) - 1, 0, 2, height)
      }
      else {
        // Regular beat - dimmer, thinner
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
        ctx.fillRect(Math.round(x), 0, 1, height)
      }
    }
  }

  // Draw drop/highlight marker
  if (highlightTime.value > 0) {
    const dropX = (highlightTime.value * pixelsPerSecond.value) - startX
    if (dropX >= -10 && dropX <= width + 10) {
      ctx.fillStyle = props.deck === 'A' ? 'rgb(34, 211, 238)' : 'rgb(251, 146, 60)'
      ctx.fillRect(Math.round(dropX) - 1, 0, 3, height)

      // Triangle marker
      ctx.beginPath()
      ctx.moveTo(dropX - 6, 0)
      ctx.lineTo(dropX + 6, 0)
      ctx.lineTo(dropX, 10)
      ctx.closePath()
      ctx.fill()
    }
  }

  // Center playhead - red line
  ctx.fillStyle = 'rgb(239, 68, 68)'
  ctx.fillRect(Math.round(centerX) - 1, 0, 2, height)

  // Edge fade gradients
  const gradientLeft = ctx.createLinearGradient(0, 0, 40, 0)
  gradientLeft.addColorStop(0, 'rgba(23, 23, 23, 1)')
  gradientLeft.addColorStop(1, 'rgba(23, 23, 23, 0)')
  ctx.fillStyle = gradientLeft
  ctx.fillRect(0, 0, 40, height)

  const gradientRight = ctx.createLinearGradient(width - 40, 0, width, 0)
  gradientRight.addColorStop(0, 'rgba(23, 23, 23, 0)')
  gradientRight.addColorStop(1, 'rgba(23, 23, 23, 1)')
  ctx.fillStyle = gradientRight
  ctx.fillRect(width - 40, 0, 40, height)
}

function animate(timestamp: number) {
  if (!isDragging.value) {
    if (props.isPlaying) {
      // Predict current time based on elapsed time since last update
      const elapsed = (timestamp - lastUpdateTimestamp.value) / 1000
      const predicted = lastKnownTime.value + (elapsed * props.playbackRate)
      displayTime.value = Math.min(predicted, props.duration || predicted)
    }
    else {
      // Not playing - just use the prop value directly
      displayTime.value = props.currentTime
    }
  }

  drawWaveform()
  animationFrame.value = requestAnimationFrame(animate)
}

function handleMouseDown(event: MouseEvent) {
  if (!containerRef.value || !props.duration) return

  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartTime.value = displayTime.value
  lastDragX.value = event.clientX
  lastDragTimestamp.value = performance.now()

  emit('scrubStart')

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value || !props.duration) return

  const now = performance.now()
  const deltaX = event.clientX - dragStartX.value
  const deltaSeconds = -deltaX / pixelsPerSecond.value

  // Calculate velocity (pixels per second -> seconds of audio per real second)
  const moveDeltaX = event.clientX - lastDragX.value
  const timeDelta = (now - lastDragTimestamp.value) / 1000
  const velocity = timeDelta > 0 ? (-moveDeltaX / pixelsPerSecond.value) / timeDelta : 0

  lastDragX.value = event.clientX
  lastDragTimestamp.value = now

  const newTime = Math.max(0, Math.min(props.duration, dragStartTime.value + deltaSeconds))
  displayTime.value = newTime

  emit('scrub', newTime, velocity)
}

function handleMouseUp() {
  isDragging.value = false
  // Sync our prediction with actual position after drag
  lastKnownTime.value = props.currentTime
  lastUpdateTimestamp.value = performance.now()

  emit('scrubEnd')

  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

function handleTouchStart(event: TouchEvent) {
  if (!containerRef.value || !props.duration || event.touches.length !== 1) return

  isDragging.value = true
  dragStartX.value = event.touches[0].clientX
  dragStartTime.value = displayTime.value
  lastDragX.value = event.touches[0].clientX
  lastDragTimestamp.value = performance.now()

  emit('scrubStart')
}

function handleTouchMove(event: TouchEvent) {
  if (!isDragging.value || !props.duration || event.touches.length !== 1) return
  event.preventDefault()

  const now = performance.now()
  const deltaX = event.touches[0].clientX - dragStartX.value
  const deltaSeconds = -deltaX / pixelsPerSecond.value

  // Calculate velocity
  const moveDeltaX = event.touches[0].clientX - lastDragX.value
  const timeDelta = (now - lastDragTimestamp.value) / 1000
  const velocity = timeDelta > 0 ? (-moveDeltaX / pixelsPerSecond.value) / timeDelta : 0

  lastDragX.value = event.touches[0].clientX
  lastDragTimestamp.value = now

  const newTime = Math.max(0, Math.min(props.duration, dragStartTime.value + deltaSeconds))
  displayTime.value = newTime

  emit('scrub', newTime, velocity)
}

function handleTouchEnd() {
  isDragging.value = false
  lastKnownTime.value = props.currentTime
  lastUpdateTimestamp.value = performance.now()

  emit('scrubEnd')
}

/* --- Lifecycle --- */
onMounted(() => {
  displayTime.value = props.currentTime
  lastKnownTime.value = props.currentTime
  lastUpdateTimestamp.value = performance.now()

  nextTick(() => {
    setupCanvas()
    animationFrame.value = requestAnimationFrame(animate)
  })

  const resizeObserver = new ResizeObserver(() => {
    setupCanvas()
  })
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})

// When currentTime prop updates (from timeupdate event), sync our prediction
watch(() => props.currentTime, (newTime) => {
  lastKnownTime.value = newTime
  lastUpdateTimestamp.value = performance.now()

  // If not playing, always sync immediately to avoid jumps on play
  // If big jump while playing, also snap
  if (!props.isPlaying) {
    displayTime.value = newTime
  }
  else if (Math.abs(newTime - displayTime.value) > 0.5) {
    displayTime.value = newTime
  }
})

// When play state changes, sync immediately
watch(() => props.isPlaying, (isPlaying) => {
  if (isPlaying) {
    // Starting playback - sync to current time
    displayTime.value = props.currentTime
    lastKnownTime.value = props.currentTime
    lastUpdateTimestamp.value = performance.now()
  }
})

watch(() => props.track?.id, () => {
  displayTime.value = props.currentTime
  lastKnownTime.value = props.currentTime
  lastUpdateTimestamp.value = performance.now()
})

watch(() => props.waveformData, () => {
  if (props.waveformData && props.waveformData.length > 0) {
    nextTick(() => setupCanvas())
  }
})
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-16 cursor-grab overflow-hidden rounded-lg bg-neutral-900/80 select-none touch-none"
    :class="{ 'cursor-grabbing': isDragging }"
    @mousedown="handleMouseDown"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <canvas
      ref="canvasRef"
      class="absolute inset-0"
    />

    <!-- Deck label -->
    <div
      class="absolute left-2 top-1 text-[10px] font-bold px-1.5 py-0.5 rounded z-10"
      :class="deck === 'A' ? 'bg-cyan-500/30 text-cyan-300' : 'bg-orange-500/30 text-orange-300'"
    >
      {{ deck }}
    </div>

    <!-- Track title -->
    <div
      v-if="track"
      class="absolute right-2 top-1 text-[10px] text-white/50 truncate max-w-[40%] z-10"
    >
      {{ track.title }}
    </div>

    <!-- Time display -->
    <div
      v-if="track"
      class="absolute left-2 bottom-1 text-[10px] font-mono text-white/70 z-10"
    >
      {{ formatTime(currentTime) }}
    </div>

    <!-- Empty state -->
    <div
      v-if="!track"
      class="absolute inset-0 flex items-center justify-center"
    >
      <span class="text-neutral-600 text-sm">Deck {{ deck }}</span>
    </div>
  </div>
</template>

<script lang="ts">
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>
