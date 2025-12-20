import type { TrackEntry } from '~/types'

interface AudioPlayerState {
  currentTrack: TrackEntry | null
  isPlaying: boolean
  isLoading: boolean
  volume: number
  currentTime: number
  duration: number
  buffered: number
}

const state = reactive<AudioPlayerState>({
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  volume: 80,
  currentTime: 0,
  duration: 0,
  buffered: 0
})

let audioElement: HTMLAudioElement | null = null
let audioContext: AudioContext | null = null
let sourceNode: MediaElementAudioSourceNode | null = null
let gainNode: GainNode | null = null

export function useAudioPlayer() {
  function initAudio() {
    if (audioElement) return

    audioElement = new Audio()
    audioElement.crossOrigin = 'anonymous'
    audioElement.preload = 'metadata'
    audioElement.volume = state.volume / 100

    audioElement.addEventListener('loadstart', () => {
      state.isLoading = true
    })

    audioElement.addEventListener('canplay', () => {
      state.isLoading = false
    })

    audioElement.addEventListener('play', () => {
      state.isPlaying = true
    })

    audioElement.addEventListener('pause', () => {
      state.isPlaying = false
    })

    audioElement.addEventListener('ended', () => {
      state.isPlaying = false
      state.currentTime = 0
    })

    audioElement.addEventListener('timeupdate', () => {
      state.currentTime = audioElement?.currentTime || 0
    })

    audioElement.addEventListener('durationchange', () => {
      state.duration = audioElement?.duration || 0
    })

    audioElement.addEventListener('progress', () => {
      if (audioElement?.buffered.length) {
        state.buffered = audioElement.buffered.end(audioElement.buffered.length - 1)
      }
    })

    audioElement.addEventListener('error', (e) => {
      console.error('[AudioPlayer] Error:', e)
      state.isLoading = false
      state.isPlaying = false
    })
  }

  function initAudioContext() {
    if (audioContext || !audioElement) return

    try {
      audioContext = new AudioContext()
      sourceNode = audioContext.createMediaElementSource(audioElement)
      gainNode = audioContext.createGain()
      gainNode.gain.value = state.volume / 100

      sourceNode.connect(gainNode)
      gainNode.connect(audioContext.destination)
    }
    catch (e) {
      console.error('[AudioPlayer] AudioContext init error:', e)
    }
  }

  async function play(track: TrackEntry) {
    initAudio()

    if (state.currentTrack?.id === track.id) {
      if (state.isPlaying) {
        audioElement?.pause()
      }
      else {
        if (audioContext?.state === 'suspended') {
          await audioContext.resume()
        }
        await audioElement?.play()
      }
      return
    }

    state.currentTrack = track
    state.isLoading = true
    state.currentTime = 0
    state.duration = 0

    if (audioElement) {
      audioElement.src = `/api/stream/${track.id}`

      try {
        initAudioContext()
        if (audioContext?.state === 'suspended') {
          await audioContext.resume()
        }
        await audioElement.play()
      }
      catch (e) {
        console.error('[AudioPlayer] Play error:', e)
        state.isLoading = false
      }
    }
  }

  function pause() {
    audioElement?.pause()
  }

  function stop() {
    if (audioElement) {
      audioElement.pause()
      audioElement.src = ''
    }
    state.currentTrack = null
    state.isPlaying = false
    state.isLoading = false
    state.currentTime = 0
    state.duration = 0
  }

  function seek(time: number) {
    if (audioElement && isFinite(time) && time >= 0) {
      const duration = audioElement.duration
      if (isFinite(duration) && duration > 0) {
        const clampedTime = Math.min(time, duration)
        audioElement.currentTime = clampedTime
        state.currentTime = clampedTime
      }
    }
  }

  function seekPercent(percent: number) {
    if (audioElement) {
      const duration = audioElement.duration
      if (isFinite(duration) && duration > 0) {
        const time = (percent / 100) * duration
        seek(time)
      }
    }
  }

  function setVolume(volume: number) {
    state.volume = volume
    if (audioElement) {
      audioElement.volume = volume / 100
    }
    if (gainNode) {
      gainNode.gain.value = volume / 100
    }
  }

  function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isCurrentTrack = (trackId: number) => {
    return state.currentTrack?.id === trackId
  }

  const isTrackPlaying = (trackId: number) => {
    return isCurrentTrack(trackId) && state.isPlaying
  }

  const progress = computed(() => {
    if (!state.duration) return 0
    return (state.currentTime / state.duration) * 100
  })

  const bufferedPercent = computed(() => {
    if (!state.duration) return 0
    return (state.buffered / state.duration) * 100
  })

  return {
    currentTrack: computed(() => state.currentTrack),
    isPlaying: computed(() => state.isPlaying),
    isLoading: computed(() => state.isLoading),
    volume: computed(() => state.volume),
    currentTime: computed(() => state.currentTime),
    duration: computed(() => state.duration),
    progress,
    bufferedPercent,
    play,
    pause,
    stop,
    seek,
    seekPercent,
    setVolume,
    formatTime,
    isCurrentTrack,
    isTrackPlaying
  }
}
