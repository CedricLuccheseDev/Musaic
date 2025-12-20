import type { TrackEntry } from '~/types'

interface EmbedState {
  currentTrack: TrackEntry | null
  isPlaying: boolean
  isLoading: boolean
  volume: number
  widget: unknown | null
}

const state = reactive<EmbedState>({
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  volume: 80,
  widget: null
})

export const useSoundCloudEmbed = () => {
  function play(track: TrackEntry) {
    // If same track, just toggle (widget handles this internally)
    if (state.currentTrack?.id === track.id) {
      state.currentTrack = null
      state.isPlaying = false
      return
    }

    state.currentTrack = track
    state.isLoading = true
    state.isPlaying = true
  }

  function stop() {
    state.currentTrack = null
    state.isPlaying = false
    state.isLoading = false
  }

  function onWidgetReady() {
    state.isLoading = false
  }

  function setWidget(widget: unknown) {
    state.widget = widget
  }

  function setVolume(volume: number) {
    state.volume = volume
    if (state.widget && typeof (state.widget as { setVolume: (v: number) => void }).setVolume === 'function') {
      (state.widget as { setVolume: (v: number) => void }).setVolume(volume)
    }
  }

  function onWidgetPlay() {
    state.isPlaying = true
  }

  function onWidgetPause() {
    state.isPlaying = false
  }

  const isCurrentTrack = (trackId: number) => {
    return state.currentTrack?.id === trackId
  }

  const isTrackPlaying = (trackId: number) => {
    return isCurrentTrack(trackId) && state.isPlaying
  }

  return {
    currentTrack: computed(() => state.currentTrack),
    isPlaying: computed(() => state.isPlaying),
    isLoading: computed(() => state.isLoading),
    volume: computed(() => state.volume),
    play,
    stop,
    onWidgetReady,
    onWidgetPlay,
    onWidgetPause,
    setWidget,
    setVolume,
    isCurrentTrack,
    isTrackPlaying
  }
}
