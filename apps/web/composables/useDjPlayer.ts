import type { TrackEntry } from '~/types'

export type DeckId = 'A' | 'B'

interface DeckState {
  track: TrackEntry | null
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  bassOn: boolean
  playbackRate: number
  waveformData: number[] | null
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
}

const audioNodes: { A: DeckAudio | null; B: DeckAudio | null } = {
  A: null,
  B: null
}

// Waveform generation settings
const WAVEFORM_SAMPLES_PER_SECOND = 50 // 50 samples per second for smooth scrolling

async function generateWaveformData(url: string): Promise<number[]> {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()

    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const channelData = audioBuffer.getChannelData(0)
    const duration = audioBuffer.duration

    const totalSamples = Math.ceil(duration * WAVEFORM_SAMPLES_PER_SECOND)
    const samplesPerChunk = Math.floor(channelData.length / totalSamples)

    const waveform: number[] = []

    for (let i = 0; i < totalSamples; i++) {
      const start = i * samplesPerChunk
      const end = Math.min(start + samplesPerChunk, channelData.length)

      // Calculate RMS (root mean square) for this chunk
      let sum = 0
      for (let j = start; j < end; j++) {
        sum += channelData[j] * channelData[j]
      }
      const rms = Math.sqrt(sum / (end - start))

      // Normalize to 0-1 range (typical RMS values are 0-0.5)
      const normalized = Math.min(1, rms * 3)
      waveform.push(normalized)
    }

    await audioContext.close()
    return waveform
  }
  catch (error) {
    console.error('[DjPlayer] Waveform generation error:', error)
    return []
  }
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

    audioNodes[deck] = { audioElement, audioContext, sourceNode, gainNode, bassFilter }
    return audioNodes[deck]!
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

    // Generate waveform in background
    generateWaveformData(streamUrl).then((waveform) => {
      if (deckState.track?.id === track.id) {
        deckState.waveformData = waveform
      }
    })

    // If no master deck set yet and this track has BPM, set this as master
    if (!state.masterDeck && track.bpm_detected) {
      state.masterDeck = deck
    }

    // Apply sync if enabled
    const masterBpm = getMasterBpm()
    if (state.syncEnabled && track.bpm_detected && masterBpm > 0 && state.masterDeck !== deck) {
      const rate = masterBpm / track.bpm_detected
      const clampedRate = Math.max(0.92, Math.min(1.08, rate))
      deckState.playbackRate = clampedRate
      audio.audioElement.playbackRate = clampedRate
    }
    else {
      deckState.playbackRate = 1.0
      audio.audioElement.playbackRate = 1.0
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

    // Restore original playback rate
    audio.audioElement.playbackRate = deckState.playbackRate

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
      const bpm = deckState.track.bpm_detected
      const beatInterval = 60 / bpm
      const beats: number[] = []

      // Start from beat_offset (phase), default to 0 if not available
      const offset = deckState.track.beat_offset ?? 0
      for (let t = offset; t < deckState.duration; t += beatInterval) {
        beats.push(t)
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
      const audio = audioNodes[deck]
      const deckState = getDeckState(deck)

      if (audio && deckState.track?.bpm_detected) {
        if (deck === state.masterDeck) {
          // Master deck always plays at 1.0
          deckState.playbackRate = 1.0
          audio.audioElement.playbackRate = 1.0
        }
        else {
          const rate = masterBpm / deckState.track.bpm_detected
          const clampedRate = Math.max(0.92, Math.min(1.08, rate))
          deckState.playbackRate = clampedRate
          audio.audioElement.playbackRate = clampedRate
        }
      }
    }
  }

  function toggleSync() {
    state.syncEnabled = !state.syncEnabled

    if (!state.syncEnabled) {
      // Reset all decks to 1.0 playback rate
      for (const deck of ['A', 'B'] as DeckId[]) {
        const audio = audioNodes[deck]
        const deckState = getDeckState(deck)

        if (audio) {
          deckState.playbackRate = 1.0
          audio.audioElement.playbackRate = 1.0
        }
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
    getTargetDeck
  }
}
