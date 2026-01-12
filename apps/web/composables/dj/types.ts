import type { TrackEntry } from '~/types'

export type DeckId = 'A' | 'B'

export interface WaveformSample {
  low: number // Bass (20-250Hz)
  mid: number // Mids (250-4000Hz)
  high: number // Highs (4000-20000Hz)
  total: number // Overall amplitude
}

export interface DeckState {
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

export interface DjPlayerState {
  deckA: DeckState
  deckB: DeckState
  crossfader: number
  masterDeck: DeckId | null
  syncEnabled: boolean
  quantizeEnabled: boolean
  activeDeck: DeckId | null
}

export interface DeckAudio {
  audioElement: HTMLAudioElement
  audioContext: AudioContext
  sourceNode: MediaElementAudioSourceNode
  gainNode: GainNode
  bassFilter: BiquadFilterNode
  soundTouchNode: AudioWorkletNode | null
}

export function createDeckState(): DeckState {
  return {
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
  }
}
