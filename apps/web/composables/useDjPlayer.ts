import type { TrackEntry } from '~/types'
import type { DeckId, DeckState, WaveformSample } from './dj/types'
import { useDjState } from './dj/useDjState'
import { useDeckAudio } from './dj/useDeckAudio'
import { useWaveformGeneration } from './dj/useWaveformGeneration'

export type { DeckId, WaveformSample }

export function useDjPlayer() {
  const { state, audioNodes, getDeckState, getMasterBpm, resetState } = useDjState()
  const { initDeckAudio, setupSoundTouch, setDeckTempo, updateCrossfaderGains, toggleBass, cleanupDeckAudio } = useDeckAudio()
  const { generateWaveformData, preloadWaveform } = useWaveformGeneration()

  function getDropTime(track: TrackEntry): number {
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

    setupSoundTouch(deck)

    generateWaveformData(streamUrl, track.id).then((waveform) => {
      if (deckState.track?.id === track.id) {
        deckState.waveformData = waveform
      }
    })

    if (!state.masterDeck && track.bpm_detected) {
      state.masterDeck = deck
    }

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

    const dropTime = getDropTime(track)
    let startTime = dropTime

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

      await new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          audio.audioElement.removeEventListener('canplay', onCanPlay)
          audio.audioElement.removeEventListener('error', onError)

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

      const otherDeck: DeckId = deck === 'A' ? 'B' : 'A'
      const otherAudio = audioNodes[otherDeck]
      const otherDeckState = getDeckState(otherDeck)

      if (state.syncEnabled && otherDeckState.isPlaying && otherAudio && otherDeckState.track?.bpm_detected && deckState.track?.bpm_detected) {
        const otherBpm = otherDeckState.track.bpm_detected
        const thisBpm = deckState.track.bpm_detected
        const otherOffset = otherDeckState.track.beat_offset ?? 0
        const thisOffset = deckState.track.beat_offset ?? 0

        const otherBeatInterval = 60 / otherBpm
        const thisBeatInterval = 60 / thisBpm
        const thisBarInterval = thisBeatInterval * 4

        const otherTime = otherAudio.audioElement.currentTime
        const otherBeatNumber = (otherTime - otherOffset) / otherBeatInterval
        const otherBeatPhase = ((otherBeatNumber % 4) + 4) % 4

        const thisTime = audio.audioElement.currentTime
        const thisBeatNumber = (thisTime - thisOffset) / thisBeatInterval
        const thisBarNumber = Math.floor(thisBeatNumber / 4)

        const targetBeatInBar = otherBeatPhase
        let targetTime = thisOffset + (thisBarNumber * 4 + targetBeatInBar) * thisBeatInterval

        if (targetTime < thisTime - 0.05) {
          targetTime += thisBarInterval
        }

        const duration = audio.audioElement.duration
        if (isFinite(duration) && duration > 0) {
          targetTime = Math.max(0, Math.min(targetTime, duration - 0.1))
        }

        audio.audioElement.currentTime = targetTime
        deckState.currentTime = targetTime

        if (deck === 'B') {
          const phaseA = ((otherTime - otherOffset) % otherBeatInterval + otherBeatInterval) % otherBeatInterval
          const phaseB = ((targetTime - thisOffset) % thisBeatInterval + thisBeatInterval) % thisBeatInterval
          deckState.beatOffsetCorrection = phaseA - phaseB
        }
        else {
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

  function getBeatGrid(deckState: DeckState): number[] {
    if (deckState.track?.bpm_detected && deckState.duration > 0) {
      const bpm = deckState.track.bpm_detected
      const beatInterval = 60 / bpm
      const beats: number[] = []
      const offset = deckState.track.beat_offset ?? 0
      const beatCount = Math.ceil((deckState.duration - offset) / beatInterval)
      for (let i = 0; i < beatCount; i++) {
        beats.push(offset + i * beatInterval)
      }
      return beats
    }
    return []
  }

  function snapToBeat(time: number, beatGrid: number[]): number {
    if (beatGrid.length === 0) return time
    return beatGrid.reduce((prev, curr) =>
      Math.abs(curr - time) < Math.abs(prev - time) ? curr : prev
    )
  }

  function seek(deck: DeckId, time: number, forceSnap = false) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)

    if (!audio) return

    let targetTime = time

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

  const scrubState: { A: { wasPlaying: boolean }; B: { wasPlaying: boolean } } = {
    A: { wasPlaying: false },
    B: { wasPlaying: false }
  }

  function startScrub(deck: DeckId) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)
    if (!audio) return

    scrubState[deck].wasPlaying = deckState.isPlaying
    audio.audioElement.pause()
  }

  function scrub(deck: DeckId, time: number, velocity: number) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)
    if (!audio) return

    const duration = audio.audioElement.duration
    if (!isFinite(duration) || duration <= 0) return

    const clampedTime = Math.max(0, Math.min(time, duration))
    audio.audioElement.currentTime = clampedTime
    deckState.currentTime = clampedTime

    if (Math.abs(velocity) > 0.01) {
      const rate = Math.max(0.25, Math.min(4, Math.abs(velocity) * 2))
      audio.audioElement.playbackRate = rate
      audio.audioElement.play().catch(() => {})
    }
    else {
      audio.audioElement.pause()
    }
  }

  function endScrub(deck: DeckId) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)
    if (!audio) return

    if (state.quantizeEnabled) {
      const beatGrid = getBeatGrid(deckState)
      if (beatGrid.length > 0) {
        const snappedTime = snapToBeat(deckState.currentTime, beatGrid)
        audio.audioElement.currentTime = snappedTime
        deckState.currentTime = snappedTime
      }
    }

    setDeckTempo(deck, deckState.playbackRate)

    if (scrubState[deck].wasPlaying) {
      audio.audioElement.play().catch(() => {})
    }
    else {
      audio.audioElement.pause()
    }
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
      for (const deck of ['A', 'B'] as DeckId[]) {
        setDeckTempo(deck, 1.0)
      }
    }
    else {
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
    const audioA = audioNodes.A
    const audioB = audioNodes.B
    const deckAState = state.deckA
    const deckBState = state.deckB

    if (!audioA?.audioElement || !audioB?.audioElement) return
    if (!deckAState.track || !deckBState.track) return

    audioA.audioElement.pause()
    audioB.audioElement.pause()

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

      const beatsFromOffsetA = Math.round((dropA - offsetA) / beatIntervalA)
      startA = offsetA + beatsFromOffsetA * beatIntervalA

      const beatsFromOffsetB = Math.round((dropB - offsetB) / beatIntervalB)
      startB = offsetB + beatsFromOffsetB * beatIntervalB

      const phaseA = ((startA - offsetA) % beatIntervalA + beatIntervalA) % beatIntervalA
      const phaseB = ((startB - offsetB) % beatIntervalB + beatIntervalB) % beatIntervalB
      deckBState.beatOffsetCorrection = phaseA - phaseB
    }

    if (isFinite(startA) && startA >= 0 && isFinite(audioA.audioElement.duration)) {
      audioA.audioElement.currentTime = Math.max(0, Math.min(startA, audioA.audioElement.duration - 0.1))
      deckAState.currentTime = audioA.audioElement.currentTime
    }

    if (isFinite(startB) && startB >= 0 && isFinite(audioB.audioElement.duration)) {
      audioB.audioElement.currentTime = Math.max(0, Math.min(startB, audioB.audioElement.duration - 0.1))
      deckBState.currentTime = audioB.audioElement.currentTime
    }

    if (audioA.audioContext.state === 'suspended') {
      await audioA.audioContext.resume()
    }
    if (audioB.audioContext.state === 'suspended') {
      await audioB.audioContext.resume()
    }

    await Promise.all([
      audioA.audioElement.play().catch(() => {}),
      audioB.audioElement.play().catch(() => {})
    ])
  }

  function ejectDeck(deck: DeckId) {
    const deckState = getDeckState(deck)
    cleanupDeckAudio(deck)

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
    for (const deck of ['A', 'B'] as DeckId[]) {
      cleanupDeckAudio(deck)
    }
    resetState()
  }

  function getTargetDeck(): DeckId {
    const hasA = state.deckA.track !== null
    const hasB = state.deckB.track !== null

    if (!hasA && !hasB) return 'A'
    if (!hasA) return 'A'
    if (!hasB) return 'B'

    if (state.masterDeck === 'A') return 'B'
    if (state.masterDeck === 'B') return 'A'

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
