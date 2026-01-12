import type { DeckId, DeckAudio } from './types'
import { useDjState } from './useDjState'

const workletRegistered = new WeakSet<AudioContext>()

export function useDeckAudio() {
  const { state, audioNodes, getDeckState } = useDjState()

  async function initSoundTouchWorklet(audioContext: AudioContext): Promise<AudioWorkletNode | null> {
    try {
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

  async function setupSoundTouch(deck: DeckId): Promise<void> {
    const audio = audioNodes[deck]
    if (!audio || audio.soundTouchNode) return

    const soundTouchNode = await initSoundTouchWorklet(audio.audioContext)
    if (soundTouchNode) {
      audio.sourceNode.disconnect()
      audio.sourceNode.connect(soundTouchNode)
      soundTouchNode.connect(audio.bassFilter)
      audio.soundTouchNode = soundTouchNode
      console.log(`[DjPlayer] SoundTouch worklet initialized for deck ${deck}`)
    }
  }

  function setDeckTempo(deck: DeckId, tempo: number): void {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)
    if (!audio) return

    deckState.playbackRate = tempo

    if (audio.soundTouchNode) {
      const tempoParam = audio.soundTouchNode.parameters.get('tempo')
      if (tempoParam) {
        tempoParam.setValueAtTime(tempo, audio.audioContext.currentTime)
      }
      audio.audioElement.playbackRate = 1.0
      deckState.timeAdvanceRate = 1.0
    }
    else {
      audio.audioElement.playbackRate = tempo
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

  function toggleBass(deck: DeckId) {
    const audio = audioNodes[deck]
    const deckState = getDeckState(deck)

    if (!audio) return

    deckState.bassOn = !deckState.bassOn
    audio.bassFilter.gain.value = deckState.bassOn ? 0 : -40
  }

  function cleanupDeckAudio(deck: DeckId) {
    const audio = audioNodes[deck]
    if (audio) {
      audio.audioElement.pause()
      audio.audioElement.src = ''
      audio.audioContext.close().catch(() => {})
      audioNodes[deck] = null
    }
  }

  return {
    initDeckAudio,
    setupSoundTouch,
    setDeckTempo,
    updateCrossfaderGains,
    toggleBass,
    cleanupDeckAudio
  }
}
