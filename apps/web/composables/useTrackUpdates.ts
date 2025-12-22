import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { dbTrackToTrackEntry, type DbTrack, type TrackEntry } from '~/types'

type TrackUpdateCallback = (track: TrackEntry) => void

/* --- State --- */
const callbacks = new Map<number, Set<TrackUpdateCallback>>()
let channel: RealtimeChannel | null = null
let isSubscribed = false

export function useTrackUpdates() {
  const supabase = useSupabase()

  function subscribe() {
    if (!supabase || isSubscribed) return

    channel = supabase
      .channel('tracks-updates')
      .on<DbTrack>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tracks',
          filter: 'analysis_status=eq.completed'
        },
        (payload: RealtimePostgresChangesPayload<DbTrack>) => {
          if (payload.eventType !== 'UPDATE' || !payload.new) return

          const trackId = payload.new.soundcloud_id
          const trackCallbacks = callbacks.get(trackId)

          if (trackCallbacks && trackCallbacks.size > 0) {
            const updatedTrack = dbTrackToTrackEntry(payload.new as DbTrack)
            trackCallbacks.forEach(cb => cb(updatedTrack))
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribed = true
          console.log('[TrackUpdates] Realtime subscription active')
        }
      })
  }

  function unsubscribe() {
    if (channel) {
      channel.unsubscribe()
      channel = null
      isSubscribed = false
    }
  }

  function watchTrack(trackId: number, callback: TrackUpdateCallback) {
    if (!callbacks.has(trackId)) {
      callbacks.set(trackId, new Set())
    }
    callbacks.get(trackId)!.add(callback)

    // Start subscription if not already active
    if (!isSubscribed) {
      subscribe()
    }

    // Return cleanup function
    return () => {
      const trackCallbacks = callbacks.get(trackId)
      if (trackCallbacks) {
        trackCallbacks.delete(callback)
        if (trackCallbacks.size === 0) {
          callbacks.delete(trackId)
        }
      }
    }
  }

  function watchTracks(tracks: Ref<TrackEntry[]>) {
    const unwatchers: (() => void)[] = []

    // Watch for changes in tracks array
    const stopWatch = watch(
      tracks,
      (newTracks) => {
        // Clear old watchers
        unwatchers.forEach(fn => fn())
        unwatchers.length = 0

        // Watch tracks that are still analyzing
        newTracks.forEach((track) => {
          if (track.analysis_status !== 'completed') {
            const unwatch = watchTrack(track.id, (updatedTrack) => {
              // Update the track in the array
              const idx = tracks.value.findIndex(t => t.id === updatedTrack.id)
              if (idx !== -1) {
                tracks.value[idx] = updatedTrack
              }
            })
            unwatchers.push(unwatch)
          }
        })
      },
      { immediate: true, deep: false }
    )

    // Cleanup on unmount
    onUnmounted(() => {
      stopWatch()
      unwatchers.forEach(fn => fn())
    })
  }

  return {
    subscribe,
    unsubscribe,
    watchTrack,
    watchTracks
  }
}
