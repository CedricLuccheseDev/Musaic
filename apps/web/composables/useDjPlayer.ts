import type { TrackEntry } from '~/types'

export type DeckId = 'A' | 'B'

// Waveform sample with frequency band data for colored display
export interface WaveformSample {
  low: number // Bass (20-250Hz)
  mid: number // Mids (250-4000Hz)
  high: number // Highs (4000-20000Hz)
  total: number // Overall amplitude
}

interface DeckState {
  track: TrackEntry | null
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  bassOn: boolean
  playbackRate: number // Tempo multiplier (for BPM sync display and visual scaling)
  timeAdvanceRate: number // Actual rate at which currentTime advances (1.0 with SoundTouch, playbackRate without)
  waveformData: WaveformSample[] | null
  beatOffsetCorrection: number // Correction to align beat grid with master deck
}

interface DjPlayerState {
  deckA: DeckState
  deckB: DeckState
  crossfader: number
  masterDeck: DeckId | null
  syncEnabled: boolean
  quantizeEnabled: boolean
  activeDeck: DeckId | null
}

const createDeckState = (): DeckState => ({
  track: null,
  isPlaying: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  bassOn: true,
  playbackRate: 1.0,
  timeAdvanceRate: 1.0,
  waveformData: null,
  beatOffsetCorrection: 0
})

const state = reactive<DjPlayerState>({
  deckA: createDeckState(),
  deckB: createDeckState(),
  crossfader: 0,
  masterDeck: null,
  syncEnabled: true,
  quantizeEnabled: true,
  activeDeck: null
})

interface DeckAudio {
  audioElement: HTMLAudioElement
  audioContext: AudioContext
  sourceNode: MediaElementAudioSourceNode
  gainNode: GainNode
  bassFilter: BiquadFilterNode
  soundTouchNode: AudioWorkletNode | null
}

const audioNodes: { A: DeckAudio | null; B: DeckAudio | null } = {
  A: null,
  B: null
}

// Waveform generation settings
const WAVEFORM_SAMPLES_PER_SECOND = 100 // 100 samples per second for detailed waveform

// Waveform cache
const waveformCache = new Map<number, WaveformSample[]>()

// Yield to main thread to prevent audio glitches
function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Simple IIR low-pass filter with periodic yielding
async function applyLowPassAsync(samples: Float32Array, cutoff: number, sampleRate: number): Promise<Float32Array> {
  const rc = 1 / (2 * Math.PI * cutoff)
  const dt = 1 / sampleRate
  const alpha = dt / (rc + dt)
  const output = new Float32Array(samples.length)
  output[0] = samples[0]

  const chunkSize = 50000 // Process in chunks to yield periodically
  for (let i = 1; i < samples.length; i++) {
    output[i] = output[i - 1] + alpha * (samples[i] - output[i - 1])
    if (i % chunkSize === 0) await yieldToMain()
  }
  return output
}

// Simple IIR high-pass filter with periodic yielding
async function applyHighPassAsync(samples: Float32Array, cutoff: number, sampleRate: number): Promise<Float32Array> {
  const rc = 1 / (2 * Math.PI * cutoff)
  const dt = 1 / sampleRate
  const alpha = rc / (rc + dt)
  const output = new Float32Array(samples.length)
  output[0] = samples[0]

  const chunkSize = 50000
  for (let i = 1; i < samples.length; i++) {
    output[i] = alpha * (output[i - 1] + samples[i] - samples[i - 1])
    if (i % chunkSize === 0) await yieldToMain()
  }
  return output
}

function computeRMS(samples: Float32Array, start: number, end: number): number {
  let sum = 0
  for (let i = start; i < end; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / (end - start))
}

async function generateWaveformData(url: string, trackId?: number): Promise<WaveformSample[]> {
  // Check cache first
  if (trackId && waveformCache.has(trackId)) {
    return waveformCache.get(trackId)!
  }

  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()

    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const sampleRate = audioBuffer.sampleRate
    const channelData = audioBuffer.getChannelData(0)
    const duration = audioBuffer.duration

    // Pre-filter with async versions that yield to main thread
    const lowBand = await applyLowPassAsync(channelData, 250, sampleRate)
    const highFiltered = await applyHighPassAsync(channelData, 250, sampleRate)
    const midBand = await applyLowPassAsync(highFiltered, 4000, sampleRate)
    const highBand = await applyHighPassAsync(channelData, 4000, sampleRate)

    const totalSamples = Math.ceil(duration * WAVEFORM_SAMPLES_PER_SECOND)
    const samplesPerChunk = Math.floor(channelData.length / totalSamples)

    const waveform: WaveformSample[] = []

    for (let i = 0; i < totalSamples; i++) {
      const start = i * samplesPerChunk
      const end = Math.min(start + samplesPerChunk, channelData.length)

      // RMS for each frequency band
      const lowRMS = computeRMS(lowBand, start, end)
      const midRMS = computeRMS(midBand, start, end)
      const highRMS = computeRMS(highBand, start, end)
      const totalRMS = computeRMS(channelData, start, end)

      // Normalize to 0-1 with band-specific scaling
      const total = Math.min(1, totalRMS * 3)
      const low = Math.min(1, lowRMS * 4)
      const mid = Math.min(1, midRMS * 4)
      const high = Math.min(1, highRMS * 6) // Highs are usually quieter

      waveform.push({ low, mid, high, total })

      // Yield every 500 samples to prevent blocking
      if (i % 500 === 0) await yieldToMain()
    }

    await audioContext.close()

    // Cache the result
    if (trackId) {
      waveformCache.set(trackId, waveform)
      // Limit cache size
      if (waveformCache.size > 20) {
        const firstKey = waveformCache.keys().next().value
        if (firstKey !== undefined) waveformCache.delete(firstKey)
      }
    }

    return waveform
  }
  catch (error) {
    console.error('[DjPlayer] Waveform generation error:', error)
    return []
  }
}

// Preload a track's waveform into cache
async function preloadWaveform(trackId: number): Promise<void> {
  if (waveformCache.has(trackId)) return
  const url = `/api/stream/${trackId}`
  await generateWaveformData(url, trackId)
}

export function useDjPlayer() {
  function getDeckState(deck: DeckId): DeckState {
    return deck === 'A' ? state.deckA : state.deckB
  }

  // Master BPM is derived from the master deck's track BPM
  function getMasterBpm(): number {
    if (!state.masterDeck) return 0
    const masterDeckState = getDeckState(state.masterDeck)
    return masterDeckState.track?.bpm_detected ?? 0
  }

  // Track which audio contexts have registered the worklet
  const workletRegistered = new WeakSet<AudioContext>()

  async function initSoundTouchWorklet(audioContext: AudioContext): Promise<AudioWorkletNode | null> {
    try {
      // Only register once per context
      if (!workletRegistered.has(audioContext)) {
        await audioContext.audioWorklet.addModule('/js/soundtouch-worklet.js')
        workletRegistered.add(audioContext)
      }
      return new AudioWorkletNode(audioContext, 'soundtouch-processor')
    }
    catch (error) {
      console.warn('[DjPlayer] AudioWorklet not supported, falling back to native playbackRate:', error)
      return null
    }
  }

  function initDeckAudio(deck: DeckId): DeckAudio {
    if (audioNodes[deck]) return audioNodes[deck]!

    const audioElement = new Audio()
    audioElement.crossOrigin = 'anonymous'
    audioElement.preload = 'metadata'

    const audioContext = new AudioContext()
    const sourceNode = audioContext.createMediaElementSource(audioElement)
    const gainNode = audioContext.createGain()
    const bassFilter = audioContext.createBiquadFilter()

    bassFilter.type = 'lowshelf'
    bassFilter.frequency.value = 200
    bassFilter.gain.value = 0

    // Initial connection without SoundTouch (will be reconnected after worklet loads)
    sourceNode.connect(bassFilter)
    bassFilter.connect(gainNode)
    gainNode.connect(audioContext.destination)

    const deckState = getDeckState(deck)

    audioElement.addEventListener('loadstart', () => {
      deckState.isLoading = true
    })

    audioElement.addEventListener('canplay', () => {
      deckState.isLoading = false
    })

    audioElement.addEventListener('play', () => {
      deckState.isPlaying = true
    })

    audioElement.addEventListener('pause', () => {
      deckState.isPlaying = false
    })

    audioElement.addEventListener('ended', () => {
      deckState.isPlaying = false
      deckState.currentTime = 0
    })

    audioElement.addEventListener('timeupdate', () => {
      deckState.currentTime = audioElement.currentTime || 0
    })

    audioElement.addEventListener('durationchange', () => {
      deckState.duration = audioElement.duration || 0
    })

    audioElement.addEventListener('error', (e) => {
      console.error(`[DjPlayer] Deck ${deck} error:`, e)
      deckState.isLoading = false
      deckState.isPlaying = false
    })

    audioNodes[deck] = { audioElement, audioContext, sourceNode, gainNode, bassFilter, soundTouchNode: null }
    return audioNodes[deck]!
  }

  // Initialize SoundTouch worklet and reconnect audio chain
  async function setupSoundTouch(deck: DeckId): Promise<void> {
    const audio = audioNodes[deck]
    if (!audio || audio.soundTouchNode) return // Already initialized

    // TEMPORARY: Disable SoundTouch to test if it's causing visual stuttering
    const ENABLE_SOUNDTOUCH = false

    if (!ENABLE_SOUNDTOUCH) {
      console.log(`[DjPlayer] SoundTouch disabled for testing - using native playbackRate for deck ${deck}`)
      return
    }

    const soundTouchNode = await initSoundTouchWorklet(audio.audioContext)
    if (soundTouchNode) {
      // Disconnect current chain
      audio.sourceNode.disconnect()

      // Reconnect with SoundTouch: source → soundtouch → bassFilter → gain → destination
      audio.sourceNode.connect(soundTouchNode)
      soundTouchNode.connect(audio.bassFilter)

      audio.soundTouchNode = soundTouchNode
      console.log(`[DjPlayer] SoundTouch worklet initialized for deck ${deck}`)
    }
  }

  // Set tempo using SoundTouch (with fallback to native playbackRate)
  function setDeckTempo(deck: DeckId, tempo: number): void {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)
    if (!audio) return

    deckState.playbackRate = tempo

    if (audio.soundTouchNode) {
      // Use SoundTouch for high-quality pitch-preserved time-stretching
      const tempoParam = audio.soundTouchNode.parameters.get('tempo')
      if (tempoParam) {
        tempoParam.setValueAtTime(tempo, audio.audioContext.currentTime)
      }
      // Keep native playbackRate at 1.0 when using SoundTouch
      audio.audioElement.playbackRate = 1.0
      // currentTime advances at normal speed (1.0) with SoundTouch
      deckState.timeAdvanceRate = 1.0
    }
    else {
      // Fallback to native playbackRate (causes pitch shift)
      audio.audioElement.playbackRate = tempo
      // currentTime advances at tempo speed without SoundTouch
      deckState.timeAdvanceRate = tempo
    }
  }

  function updateCrossfaderGains() {
    const gainA = (1 - state.crossfader) / 2
    const gainB = (1 + state.crossfader) / 2

    if (audioNodes.A?.gainNode) {
      audioNodes.A.gainNode.gain.value = gainA
    }
    if (audioNodes.B?.gainNode) {
      audioNodes.B.gainNode.gain.value = gainB
    }
  }

  function getDropTime(track: TrackEntry): number {
    // Use highlight_time (drop) if available, otherwise first beat offset or 0
    if (track.highlight_time && track.highlight_time > 0) {
      return track.highlight_time
    }
    if (track.beat_offset != null && track.beat_offset > 0) {
      return track.beat_offset
    }
    return 0
  }

  async function loadToDeck(track: TrackEntry, deck: DeckId) {
    const audio = initDeckAudio(deck)
    const deckState = getDeckState(deck)

    if (deckState.track?.id === track.id) {
      return
    }

    deckState.track = track
    deckState.isLoading = true
    deckState.currentTime = 0
    deckState.duration = 0
    deckState.waveformData = null

    const streamUrl = `/api/stream/${track.id}`
    audio.audioElement.src = streamUrl

    // Initialize SoundTouch worklet (async, non-blocking)
    setupSoundTouch(deck)

    // DEBUG: Skip waveform generation to test if it's causing stuttering
    const SKIP_WAVEFORM_GENERATION = true
    if (!SKIP_WAVEFORM_GENERATION) {
      // Generate waveform in background (with caching)
      generateWaveformData(streamUrl, track.id).then((waveform) => {
        if (deckState.track?.id === track.id) {
          deckState.waveformData = waveform
        }
      })
    }

    // If no master deck set yet and this track has BPM, set this as master
    if (!state.masterDeck && track.bpm_detected) {
      state.masterDeck = deck
    }

    // Apply sync if enabled
    const masterBpm = getMasterBpm()
    if (state.syncEnabled && track.bpm_detected && masterBpm > 0 && state.masterDeck !== deck) {
      const rate = masterBpm / track.bpm_detected
      const clampedRate = Math.max(0.92, Math.min(1.08, rate))
      setDeckTempo(deck, clampedRate)
    }
    else {
      setDeckTempo(deck, 1.0)
    }

    state.activeDeck = deck
    updateCrossfaderGains()

    // Calculate start position - start at the nearest beat to the drop
    const dropTime = getDropTime(track)
    let startTime = dropTime

    // Snap to nearest beat
    const newBpm = track.bpm_detected
    const newOffset = track.beat_offset ?? 0
    if (newBpm) {
      const beatInterval = 60 / newBpm
      const beatsFromOffset = Math.round((dropTime - newOffset) / beatInterval)
      startTime = newOffset + beatsFromOffset * beatInterval
    }

    try {
      if (audio.audioContext.state === 'suspended') {
        await audio.audioContext.resume()
      }

      // Wait for audio to be ready, then seek to start position and play
      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          audio.audioElement.removeEventListener('canplay', onCanPlay)
          audio.audioElement.removeEventListener('error', onError)

          // Seek to drop/synced position
          if (startTime > 0 && isFinite(audio.audioElement.duration)) {
            const clampedTime = Math.min(startTime, audio.audioElement.duration - 0.1)
            audio.audioElement.currentTime = Math.max(0, clampedTime)
            deckState.currentTime = Math.max(0, clampedTime)
          }
          resolve()
        }
        const onError = () => {
          audio.audioElement.removeEventListener('canplay', onCanPlay)
          audio.audioElement.removeEventListener('error', onError)
          reject(new Error('Audio load error'))
        }
        audio.audioElement.addEventListener('canplay', onCanPlay)
        audio.audioElement.addEventListener('error', onError)
      })

      await audio.audioElement.play()
    }
    catch (e) {
      console.error(`[DjPlayer] Play error on deck ${deck}:`, e)
      deckState.isLoading = false
    }
  }

  async function play(deck: DeckId) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)

    if (!audio || !deckState.track) return

    try {
      if (audio.audioContext.state === 'suspended') {
        await audio.audioContext.resume()
      }

      // If sync is enabled and the other deck is playing, align to nearest bar
      const otherDeck: DeckId = deck === 'A' ? 'B' : 'A'
      const otherAudio = audioNodes[otherDeck]
      const otherDeckState = getDeckState(otherDeck)

      if (state.syncEnabled && otherDeckState.isPlaying && otherAudio && otherDeckState.track?.bpm_detected && deckState.track?.bpm_detected) {
        const otherBpm = otherDeckState.track.bpm_detected
        const thisBpm = deckState.track.bpm_detected
        const otherOffset = otherDeckState.track.beat_offset ?? 0
        const thisOffset = deckState.track.beat_offset ?? 0

        // Beat interval for each track (in their own audio time)
        const otherBeatInterval = 60 / otherBpm
        const thisBeatInterval = 60 / thisBpm

        // Bar = 4 beats
        const thisBarInterval = thisBeatInterval * 4

        // Current position in other deck
        const otherTime = otherAudio.audioElement.currentTime

        // Calculate which beat the other deck is on (as a fraction)
        const otherBeatNumber = (otherTime - otherOffset) / otherBeatInterval
        // Get the fractional part (phase within beat cycle, 0 to 1)
        const otherBeatPhase = ((otherBeatNumber % 4) + 4) % 4 // Phase within a bar (0-4 beats)

        // Current position in this deck
        const thisTime = audio.audioElement.currentTime

        // Find which bar we're in for this deck
        const thisBeatNumber = (thisTime - thisOffset) / thisBeatInterval
        const thisBarNumber = Math.floor(thisBeatNumber / 4)

        // Target: same beat phase as other deck, in the nearest bar
        const targetBeatInBar = otherBeatPhase
        let targetTime = thisOffset + (thisBarNumber * 4 + targetBeatInBar) * thisBeatInterval

        // If target is behind current time, use next bar
        if (targetTime < thisTime - 0.05) {
          targetTime += thisBarInterval
        }

        // Clamp to valid range
        const duration = audio.audioElement.duration
        if (isFinite(duration) && duration > 0) {
          targetTime = Math.max(0, Math.min(targetTime, duration - 0.1))
        }

        audio.audioElement.currentTime = targetTime
        deckState.currentTime = targetTime

        // Calculate beat offset correction for visual grid alignment
        // We need deck B's grid to visually align with deck A's
        // The correction shifts the visual beat_offset so grids overlap
        if (deck === 'B') {
          // After positioning, calculate the visual offset needed
          // Both decks should show their beat lines at the same screen position
          // Deck A beat phase (in its audio time)
          const phaseA = ((otherTime - otherOffset) % otherBeatInterval + otherBeatInterval) % otherBeatInterval
          // Deck B beat phase (in its audio time)
          const phaseB = ((targetTime - thisOffset) % thisBeatInterval + thisBeatInterval) % thisBeatInterval
          deckState.beatOffsetCorrection = phaseA - phaseB
        }
        else {
          // Starting deck A while B is playing
          const phaseB = ((otherTime - otherOffset) % otherBeatInterval + otherBeatInterval) % otherBeatInterval
          const phaseA = ((targetTime - thisOffset) % thisBeatInterval + thisBeatInterval) % thisBeatInterval
          state.deckB.beatOffsetCorrection = phaseA - phaseB
        }
      }

      await audio.audioElement.play()
    }
    catch (e) {
      console.error(`[DjPlayer] Play error:`, e)
    }
  }

  function pause(deck: DeckId) {
    const audio = audioNodes[deck]
    if (audio) {
      audio.audioElement.pause()
    }
  }

  function togglePlay(deck: DeckId) {
    const deckState = getDeckState(deck)
    if (deckState.isPlaying) {
      pause(deck)
    }
    else {
      play(deck)
    }
  }

  function seek(deck: DeckId, time: number, forceSnap = false) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)

    if (!audio) return

    let targetTime = time

    // Snap to beat if quantize is enabled or forced
    if (state.quantizeEnabled || forceSnap) {
      const beatGrid = getBeatGrid(deckState)
      if (beatGrid.length > 0) {
        targetTime = snapToBeat(time, beatGrid)
      }
    }

    if (isFinite(targetTime) && targetTime >= 0) {
      const duration = audio.audioElement.duration
      if (isFinite(duration) && duration > 0) {
        const clampedTime = Math.min(targetTime, duration)
        audio.audioElement.currentTime = clampedTime
        deckState.currentTime = clampedTime
      }
    }
  }

  function toggleQuantize() {
    state.quantizeEnabled = !state.quantizeEnabled
  }

  // Scrubbing state per deck
  const scrubState: { A: { wasPlaying: boolean }; B: { wasPlaying: boolean } } = {
    A: { wasPlaying: false },
    B: { wasPlaying: false }
  }

  function startScrub(deck: DeckId) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)
    if (!audio) return

    // Remember if it was playing
    scrubState[deck].wasPlaying = deckState.isPlaying

    // Pause playback
    audio.audioElement.pause()
  }

  function scrub(deck: DeckId, time: number, velocity: number) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)
    if (!audio) return

    // Clamp time
    const duration = audio.audioElement.duration
    if (!isFinite(duration) || duration <= 0) return

    const clampedTime = Math.max(0, Math.min(time, duration))
    audio.audioElement.currentTime = clampedTime
    deckState.currentTime = clampedTime

    // Play scratch sound based on velocity
    // velocity > 0 means moving forward, < 0 means backward
    if (Math.abs(velocity) > 0.01) {
      // Set playback rate based on velocity (clamped)
      const rate = Math.max(0.25, Math.min(4, Math.abs(velocity) * 2))
      audio.audioElement.playbackRate = velocity > 0 ? rate : -rate

      // Note: Negative playback rate doesn't work in most browsers
      // For now, we just play forward at varying speeds
      audio.audioElement.playbackRate = rate

      // Play briefly
      audio.audioElement.play().catch(() => {})
    }
    else {
      // No movement - pause
      audio.audioElement.pause()
    }
  }

  function endScrub(deck: DeckId) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)
    if (!audio) return

    // Snap to nearest beat if quantize is enabled
    if (state.quantizeEnabled) {
      const beatGrid = getBeatGrid(deckState)
      if (beatGrid.length > 0) {
        const snappedTime = snapToBeat(deckState.currentTime, beatGrid)
        audio.audioElement.currentTime = snappedTime
        deckState.currentTime = snappedTime
      }
    }

    // Restore original playback rate/tempo
    setDeckTempo(deck, deckState.playbackRate)

    // Resume if was playing
    if (scrubState[deck].wasPlaying) {
      audio.audioElement.play().catch(() => {})
    }
    else {
      audio.audioElement.pause()
    }
  }

  function snapToBeat(time: number, beatGrid: number[]): number {
    if (beatGrid.length === 0) return time

    return beatGrid.reduce((prev, curr) =>
      Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev
    )
  }

  function getBeatGrid(deckState: DeckState): number[] {
    // Generate beat grid from BPM and beat_offset
    if (deckState.track?.bpm_detected && deckState.duration > 0) {
      // Use BPM with decimal precision to avoid drift over long tracks
      const bpm = deckState.track.bpm_detected
      const beatInterval = 60 / bpm
      const beats: number[] = []

      // Start from beat_offset (phase), default to 0 if not available
      const offset = deckState.track.beat_offset ?? 0

      // Calculate each beat position directly to avoid floating point accumulation
      // Using multiplication instead of repeated addition prevents micro-drifts
      const beatCount = Math.ceil((deckState.duration - offset) / beatInterval)
      for (let i = 0; i < beatCount; i++) {
        beats.push(offset + i * beatInterval)
      }
      return beats
    }
    return []
  }

  function toggleBass(deck: DeckId) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)

    if (!audio) return

    deckState.bassOn = !deckState.bassOn
    audio.bassFilter.gain.value = deckState.bassOn ? 0 : -40
  }

  function setCrossfader(value: number) {
    state.crossfader = Math.max(-1, Math.min(1, value))
    updateCrossfaderGains()
  }

  function setMaster(deck: DeckId) {
    const deckState = getDeckState(deck)
    if (!deckState.track?.bpm_detected) return

    state.masterDeck = deck
    applySync()
  }

  function applySync() {
    const masterBpm = getMasterBpm()
    if (!state.syncEnabled || masterBpm <= 0) return

    for (const deck of ['A', 'B'] as DeckId[]) {
      const deckState = getDeckState(deck)

      if (deckState.track?.bpm_detected) {
        if (deck === state.masterDeck) {
          // Master deck always plays at 1.0
          setDeckTempo(deck, 1.0)
        }
        else {
          const rate = masterBpm / deckState.track.bpm_detected
          const clampedRate = Math.max(0.92, Math.min(1.08, rate))
          setDeckTempo(deck, clampedRate)
        }
      }
    }
  }

  function toggleSync() {
    state.syncEnabled = !state.syncEnabled

    if (!state.syncEnabled) {
      // Reset all decks to 1.0 playback rate
      for (const deck of ['A', 'B'] as DeckId[]) {
        setDeckTempo(deck, 1.0)
      }
    }
    else {
      // Re-apply sync
      applySync()
    }
  }

  function jumpToDrop(deck: DeckId) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)
    if (!audio || !deckState.track) return

    const dropTime = getDropTime(deckState.track)
    if (isFinite(dropTime) && dropTime >= 0) {
      const duration = audio.audioElement.duration
      if (isFinite(duration) && duration > 0) {
        const clampedTime = Math.min(dropTime, duration - 0.1)
        audio.audioElement.currentTime = Math.max(0, clampedTime)
        deckState.currentTime = Math.max(0, clampedTime)
      }
    }
  }

  async function syncStart() {
    // Start both tracks at beat-aligned positions near their drop points
    // The key is: when both play, their beats must align in real-time
    const audioA = audioNodes.A
    const audioB = audioNodes.B
    const deckAState = state.deckA
    const deckBState = state.deckB

    if (!audioA?.audioElement || !audioB?.audioElement) return
    if (!deckAState.track || !deckBState.track) return

    // Pause both
    audioA.audioElement.pause()
    audioB.audioElement.pause()

    // Get drop times and beat info
    const dropA = getDropTime(deckAState.track)
    const dropB = getDropTime(deckBState.track)
    const bpmA = deckAState.track.bpm_detected
    const bpmB = deckBState.track.bpm_detected
    const offsetA = deckAState.track.beat_offset ?? 0
    const offsetB = deckBState.track.beat_offset ?? 0

    let startA = dropA
    let startB = dropB

    if (bpmA && bpmB) {
      const beatIntervalA = 60 / bpmA
      const beatIntervalB = 60 / bpmB

      // Snap A to nearest beat near drop
      const beatsFromOffsetA = Math.round((dropA - offsetA) / beatIntervalA)
      startA = offsetA + beatsFromOffsetA * beatIntervalA

      // Snap B to nearest beat near drop
      const beatsFromOffsetB = Math.round((dropB - offsetB) / beatIntervalB)
      startB = offsetB + beatsFromOffsetB * beatIntervalB

      // Calculate the beat offset correction for B to visually align grids
      // Both tracks start on a beat, but their beat_offset values differ
      // We need to shift B's grid so its beat lines align with A's
      // The correction is the difference in phase at the start positions
      const phaseA = ((startA - offsetA) % beatIntervalA + beatIntervalA) % beatIntervalA
      const phaseB = ((startB - offsetB) % beatIntervalB + beatIntervalB) % beatIntervalB
      // Since both are snapped to beats, phases should be ~0, but we still compute correction
      // The visual correction needed: shift B's offset so grids align
      deckBState.beatOffsetCorrection = phaseA - phaseB
    }

    // Apply positions
    if (isFinite(startA) && startA >= 0 && isFinite(audioA.audioElement.duration)) {
      audioA.audioElement.currentTime = Math.max(0, Math.min(startA, audioA.audioElement.duration - 0.1))
      deckAState.currentTime = audioA.audioElement.currentTime
    }

    if (isFinite(startB) && startB >= 0 && isFinite(audioB.audioElement.duration)) {
      audioB.audioElement.currentTime = Math.max(0, Math.min(startB, audioB.audioElement.duration - 0.1))
      deckBState.currentTime = audioB.audioElement.currentTime
    }

    // Resume audio contexts if suspended
    if (audioA.audioContext.state === 'suspended') {
      await audioA.audioContext.resume()
    }
    if (audioB.audioContext.state === 'suspended') {
      await audioB.audioContext.resume()
    }

    // Play both at the same time
    await Promise.all([
      audioA.audioElement.play().catch(() => {}),
      audioB.audioElement.play().catch(() => {})
    ])
  }

  function ejectDeck(deck: DeckId) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)

    if (audio) {
      audio.audioElement.pause()
      audio.audioElement.src = ''
    }

    deckState.track = null
    deckState.isPlaying = false
    deckState.isLoading = false
    deckState.currentTime = 0
    deckState.duration = 0
    deckState.bassOn = true
    deckState.playbackRate = 1.0
    deckState.timeAdvanceRate = 1.0
    deckState.waveformData = null
    deckState.beatOffsetCorrection = 0

    if (state.activeDeck === deck) {
      state.activeDeck = deck === 'A' ? 'B' : 'A'
      const otherDeckState = getDeckState(state.activeDeck)
      if (!otherDeckState.track) {
        state.activeDeck = null
      }
    }
  }

  function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function cleanup() {
    // Stop and cleanup all audio
    for (const deck of ['A', 'B'] as DeckId[]) {
      const audio = audioNodes[deck]
      if (audio) {
        audio.audioElement.pause()
        audio.audioElement.src = ''
        audio.audioContext.close().catch(() => {})
        audioNodes[deck] = null
      }
    }

    // Reset state
    state.deckA = createDeckState()
    state.deckB = createDeckState()
    state.crossfader = 0
    state.masterDeck = null
    state.activeDeck = null
  }

  function getTargetDeck(): DeckId {
    // Priority:
    // 1. If no tracks loaded, use A
    // 2. If only one deck has a track, use the empty one
    // 3. If both have tracks, use the non-master deck
    const hasA = state.deckA.track !== null
    const hasB = state.deckB.track !== null

    if (!hasA && !hasB) return 'A'
    if (!hasA) return 'A'
    if (!hasB) return 'B'

    // Both have tracks - replace non-master
    if (state.masterDeck === 'A') return 'B'
    if (state.masterDeck === 'B') return 'A'

    // No master set - use A by default
    return 'A'
  }

  const hasAnyTrack = computed(() => state.deckA.track !== null || state.deckB.track !== null)

  const deckAProgress = computed(() => {
    if (!state.deckA.duration) return 0
    return (state.deckA.currentTime / state.deckA.duration) * 100
  })

  const deckBProgress = computed(() => {
    if (!state.deckB.duration) return 0
    return (state.deckB.currentTime / state.deckB.duration) * 100
  })

  return {
    deckA: computed(() => state.deckA),
    deckB: computed(() => state.deckB),
    crossfader: computed(() => state.crossfader),
    masterDeck: computed(() => state.masterDeck),
    masterBpm: computed(() => getMasterBpm()),
    syncEnabled: computed(() => state.syncEnabled),
    quantizeEnabled: computed(() => state.quantizeEnabled),
    activeDeck: computed(() => state.activeDeck),
    hasAnyTrack,
    deckAProgress,
    deckBProgress,
    loadToDeck,
    play,
    pause,
    togglePlay,
    seek,
    startScrub,
    scrub,
    endScrub,
    toggleBass,
    setCrossfader,
    setMaster,
    toggleSync,
    toggleQuantize,
    jumpToDrop,
    syncStart,
    ejectDeck,
    formatTime,
    cleanup,
    getTargetDeck,
    preloadWaveform
  }
}
