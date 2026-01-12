<script setup lang="ts">
import type { TrackEntry } from '~/types'
import type { WaveformSample } from '~/composables/useDjPlayer'

/* --- Props --- */
const props = defineProps<{
  track: TrackEntry | null
  currentTime: number
  duration: number
  deck: 'A' | 'B'
  waveformData: WaveformSample[] | null
  isPlaying: boolean
  playbackRate: number // Tempo multiplier for visual scaling
  timeAdvanceRate: number // Actual rate at which currentTime advances (for smooth prediction)
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

// Animation state - plain JS variables to avoid Vue reactivity overhead in hot path
let displayTime = 0
let lastFrameTimestamp = 0

// Cached gradients (recreated only on canvas resize)
let gradientLeft: CanvasGradient | null = null
let gradientRight: CanvasGradient | null = null

/* --- Constants --- */
const SAMPLES_PER_SECOND = 100
const BAR_WIDTH = 1
const BAR_GAP = 1

// Rekordbox-style colors for frequency bands
const COLOR_LOW = { r: 30, g: 100, b: 220 } // Blue for bass
const COLOR_MID = { r: 50, g: 200, b: 100 } // Green for mids
const COLOR_HIGH = { r: 230, g: 80, b: 60 } // Red/orange for highs

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

  // Pre-create gradients (only on resize, not every frame)
  const ctx = canvas.getContext('2d')
  if (ctx) {
    gradientLeft = ctx.createLinearGradient(0, 0, 40, 0)
    gradientLeft.addColorStop(0, 'rgba(23, 23, 23, 1)')
    gradientLeft.addColorStop(1, 'rgba(23, 23, 23, 0)')

    gradientRight = ctx.createLinearGradient(width - 40, 0, width, 0)
    gradientRight.addColorStop(0, 'rgba(23, 23, 23, 0)')
    gradientRight.addColorStop(1, 'rgba(23, 23, 23, 1)')
  }

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

  // Cache all reactive/computed values ONCE at start to avoid reactivity overhead
  const pxPerSec = pixelsPerSecond.value
  const beatInt = beatInterval.value
  const beatOff = beatOffset.value
  const highlightT = highlightTime.value
  const duration = props.duration
  const waveformData = props.waveformData

  const dpr = window.devicePixelRatio || 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const centerX = width / 2
  const currentPos = displayTime * pxPerSec
  const startX = currentPos - centerX

  if (waveformData && waveformData.length > 0) {
    const barSpacing = BAR_WIDTH + BAR_GAP
    const startSample = Math.floor(startX / barSpacing)
    const visibleBars = Math.ceil(width / barSpacing) + 2
    const endSample = Math.min(waveformData.length, startSample + visibleBars)

    for (let i = Math.max(0, startSample); i < endSample; i++) {
      const sample = waveformData[i]
      if (!sample) continue

      const x = Math.floor(i * barSpacing - startX)
      const barHeight = Math.max(2, sample.total * (height - 4))
      const y = Math.floor((height - barHeight) / 2)

      // Use cached color or compute once
      const total = sample.low + sample.mid + sample.high
      if (total > 0.001) {
        const lowRatio = sample.low / total
        const midRatio = sample.mid / total
        const highRatio = sample.high / total
        const r = Math.round(COLOR_LOW.r * lowRatio + COLOR_MID.r * midRatio + COLOR_HIGH.r * highRatio)
        const g = Math.round(COLOR_LOW.g * lowRatio + COLOR_MID.g * midRatio + COLOR_HIGH.g * highRatio)
        const b = Math.round(COLOR_LOW.b * lowRatio + COLOR_MID.b * midRatio + COLOR_HIGH.b * highRatio)
        ctx.fillStyle = `rgb(${r},${g},${b})`
      }
      else {
        ctx.fillStyle = props.deck === 'A' ? 'rgb(6,182,212)' : 'rgb(249,115,22)'
      }
      ctx.fillRect(x, y, BAR_WIDTH, Math.floor(barHeight))
    }
  }

  // Draw beat grid lines
  if (beatInt > 0) {
    const visibleSeconds = width / pxPerSec
    const beatsFromOffset = (displayTime - beatOff) / beatInt
    const firstVisibleBeatIndex = Math.floor(beatsFromOffset - visibleSeconds / 2 / beatInt) - 1
    const lastVisibleBeatIndex = Math.ceil(beatsFromOffset + visibleSeconds / 2 / beatInt) + 1

    for (let i = firstVisibleBeatIndex; i <= lastVisibleBeatIndex; i++) {
      const beatTime = beatOff + i * beatInt
      if (beatTime < 0) continue
      if (beatTime > duration) break

      const x = (beatTime * pxPerSec) - startX
      const isDownbeat = i % 4 === 0

      if (isDownbeat) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillRect(Math.floor(x) - 1, 0, 2, height)
      }
      else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
        ctx.fillRect(Math.floor(x), 0, 1, height)
      }
    }
  }

  // Draw drop/highlight marker
  if (highlightT > 0) {
    const dropX = (highlightT * pxPerSec) - startX
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

  // Edge fade gradients (use pre-cached gradients)
  if (gradientLeft) {
    ctx.fillStyle = gradientLeft
    ctx.fillRect(0, 0, 40, height)
  }
  if (gradientRight) {
    ctx.fillStyle = gradientRight
    ctx.fillRect(width - 40, 0, 40, height)
  }
}

function animate(timestamp: number) {
  // Calculate delta time since last frame
  const deltaTime = lastFrameTimestamp > 0 ? (timestamp - lastFrameTimestamp) / 1000 : 0
  lastFrameTimestamp = timestamp

  // Cache props ONCE at start to avoid repeated Vue reactivity access
  const isPlaying = props.isPlaying
  const currentTime = props.currentTime
  const duration = props.duration
  const timeAdvanceRate = props.timeAdvanceRate
  const dragging = isDragging.value

  if (!dragging) {
    if (isPlaying && deltaTime > 0) {
      // Advance display time based on playback rate
      displayTime += deltaTime * timeAdvanceRate

      // Smooth drift correction towards actual audio position
      const drift = currentTime - displayTime
      const blendFactor = Math.min(1, deltaTime * 3)
      displayTime += drift * blendFactor

      // Clamp to valid range
      displayTime = Math.max(0, Math.min(displayTime, duration || displayTime))
    }
    else if (!isPlaying) {
      displayTime = currentTime
    }
  }

  drawWaveform()
  animationFrame.value = requestAnimationFrame(animate)
}

function handleMouseDown(event: MouseEvent) {
  if (!containerRef.value || !props.duration) return

  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartTime.value = displayTime
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
  displayTime = newTime

  emit('scrub', newTime, velocity)
}

function handleMouseUp() {
  isDragging.value = false
  emit('scrubEnd')
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

function handleTouchStart(event: TouchEvent) {
  if (!containerRef.value || !props.duration || event.touches.length !== 1) return

  isDragging.value = true
  dragStartX.value = event.touches[0].clientX
  dragStartTime.value = displayTime
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
  displayTime = newTime

  emit('scrub', newTime, velocity)
}

function handleTouchEnd() {
  isDragging.value = false
  emit('scrubEnd')
}

/* --- Lifecycle --- */
onMounted(() => {
  displayTime = props.currentTime
  lastFrameTimestamp = 0

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

// When currentTime prop updates, handle seeks (big jumps)
watch(() => props.currentTime, (newTime) => {
  // If not playing, sync immediately
  // If big jump (>0.5s = seek), also snap
  if (!props.isPlaying || Math.abs(newTime - displayTime) > 0.5) {
    displayTime = newTime
  }
})

// When play state changes, sync immediately
watch(() => props.isPlaying, (isPlaying) => {
  if (isPlaying) {
    // Starting playback - sync to current time and reset frame counter
    displayTime = props.currentTime
    lastFrameTimestamp = 0
  }
})

watch(() => props.track?.id, () => {
  displayTime = props.currentTime
  lastFrameTimestamp = 0
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
