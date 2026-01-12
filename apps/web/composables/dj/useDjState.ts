import type { DeckId, DeckState, DjPlayerState, DeckAudio } from './types'
import { createDeckState } from './types'

const state = reactive<DjPlayerState>({
  deckA: createDeckState(),
  deckB: createDeckState(),
  crossfader: 0,
  masterDeck: null,
  syncEnabled: true,
  quantizeEnabled: true,
  activeDeck: null
})

const audioNodes: { A: DeckAudio | null; B: DeckAudio | null } = {
  A: null,
  B: null
}

export function useDjState() {
  function getDeckState(deck: DeckId): DeckState {
    return deck === 'A' ? state.deckA : state.deckB
  }

  function getMasterBpm(): number {
    if (!state.masterDeck) return 0
    const masterDeckState = getDeckState(state.masterDeck)
    return masterDeckState.track?.bpm_detected ?? 0
  }

  function resetState() {
    state.deckA = createDeckState()
    state.deckB = createDeckState()
    state.crossfader = 0
    state.masterDeck = null
    state.activeDeck = null
  }

  return {
    state,
    audioNodes,
    getDeckState,
    getMasterBpm,
    resetState
  }
}
