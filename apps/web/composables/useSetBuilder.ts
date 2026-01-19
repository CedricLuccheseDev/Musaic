/**
 * Set Builder Composable
 * Manages state and operations for the DJ set builder
 */

import type {
  DjSet,
  SetTrack,
  SetListItem,
  CreateSetRequest,
  UpdateSetRequest,
  TrackEntry,
  ScoredTrack
} from '~/types'

export function useSetBuilder() {
  const supabase = useSupabase()

  /* --- State --- */
  const currentSet = ref<DjSet | null>(null)
  const sets = ref<SetListItem[]>([])
  const suggestions = ref<(TrackEntry | ScoredTrack)[]>([])
  const suggestionsOffset = ref(0)
  const loading = ref(false)
  const suggestionsLoading = ref(false)
  const error = ref<string | null>(null)

  // Undo state for track removal
  const lastRemovedTrack = ref<{ track: SetTrack; timeout: ReturnType<typeof setTimeout> } | null>(null)

  /* --- Computed --- */
  // All durations in milliseconds for consistency
  const effectiveDuration = computed(() => {
    if (!currentSet.value) return 0
    const avgPlaytime = currentSet.value.avgTrackPlaytime / 100
    // track.duration is in ms
    return currentSet.value.tracks.reduce(
      (sum, st) => sum + st.track.duration * avgPlaytime,
      0
    )
  })

  // targetDuration is stored in seconds in DB, convert to ms
  const targetDuration = computed(() => (currentSet.value?.targetDuration || 3600) * 1000)

  const progress = computed(() => {
    if (targetDuration.value === 0) return 0
    return Math.min(100, (effectiveDuration.value / targetDuration.value) * 100)
  })

  const remainingDuration = computed(() => {
    return Math.max(0, targetDuration.value - effectiveDuration.value)
  })

  /* --- Auth Helper --- */
  function getAuthHeaders(): HeadersInit {
    const session = supabase?.auth
    if (!session) return {}

    // Get current session synchronously from localStorage
    const storageKey = `sb-${useRuntimeConfig().public.supabaseUrl?.split('//')[1]?.split('.')[0]}-auth-token`
    const stored = localStorage.getItem(storageKey)
    if (!stored) return {}

    try {
      const parsed = JSON.parse(stored)
      const token = parsed?.access_token
      if (token) {
        return { Authorization: `Bearer ${token}` }
      }
    } catch {
      // Ignore parse errors
    }
    return {}
  }

  /* --- API Methods --- */

  async function fetchSets(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ sets: SetListItem[] }>('/api/sets', {
        headers: getAuthHeaders()
      })
      sets.value = response.sets
    } catch (err) {
      error.value = (err as Error).message || 'Failed to fetch sets'
      console.error('[useSetBuilder] fetchSets error:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchSet(id: string): Promise<DjSet | null> {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ set: DjSet }>(`/api/sets/${id}`, {
        headers: getAuthHeaders()
      })
      currentSet.value = response.set
      return response.set
    } catch (err) {
      error.value = (err as Error).message || 'Failed to fetch set'
      console.error('[useSetBuilder] fetchSet error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  async function createSet(request: CreateSetRequest): Promise<DjSet | null> {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ set: DjSet }>('/api/sets', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: request
      })
      currentSet.value = response.set
      return response.set
    } catch (err) {
      error.value = (err as Error).message || 'Failed to create set'
      console.error('[useSetBuilder] createSet error:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateSet(id: string, request: UpdateSetRequest): Promise<boolean> {
    error.value = null

    try {
      await $fetch(`/api/sets/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: request
      })

      // Update local state
      if (currentSet.value?.id === id) {
        if (request.name !== undefined) currentSet.value.name = request.name
        if (request.description !== undefined) currentSet.value.description = request.description
        if (request.genre !== undefined) currentSet.value.genre = request.genre
        if (request.targetDuration !== undefined) currentSet.value.targetDuration = request.targetDuration * 60
        if (request.avgTrackPlaytime !== undefined) currentSet.value.avgTrackPlaytime = request.avgTrackPlaytime
        if (request.mood !== undefined) currentSet.value.mood = request.mood
        if (request.status !== undefined) currentSet.value.status = request.status
      }

      return true
    } catch (err) {
      error.value = (err as Error).message || 'Failed to update set'
      console.error('[useSetBuilder] updateSet error:', err)
      return false
    }
  }

  async function deleteSet(id: string): Promise<boolean> {
    error.value = null

    try {
      await $fetch(`/api/sets/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      // Update local state
      sets.value = sets.value.filter(s => s.id !== id)
      if (currentSet.value?.id === id) {
        currentSet.value = null
      }

      return true
    } catch (err) {
      error.value = (err as Error).message || 'Failed to delete set'
      console.error('[useSetBuilder] deleteSet error:', err)
      return false
    }
  }

  async function duplicateSet(id: string): Promise<{ id: string; name: string } | null> {
    error.value = null

    try {
      const response = await $fetch<{ set: { id: string; name: string } }>(`/api/sets/${id}/duplicate`, {
        method: 'POST',
        headers: getAuthHeaders()
      })

      // Refresh sets list
      await fetchSets()

      return response.set
    } catch (err) {
      error.value = (err as Error).message || 'Failed to duplicate set'
      console.error('[useSetBuilder] duplicateSet error:', err)
      return null
    }
  }

  /* --- Track Methods --- */

  async function addTrack(soundcloudId: number, position?: number): Promise<SetTrack | null> {
    if (!currentSet.value) return null
    error.value = null

    try {
      const response = await $fetch<{ setTrack: SetTrack }>(`/api/sets/${currentSet.value.id}/tracks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { soundcloudId, position }
      })

      // Update local state
      const newTrack = response.setTrack
      if (position !== undefined) {
        // Insert at position, shift others
        currentSet.value.tracks.splice(position, 0, newTrack)
        // Update positions
        currentSet.value.tracks.forEach((t, i) => {
          t.position = i
        })
      } else {
        currentSet.value.tracks.push(newTrack)
      }

      // Refresh suggestions
      await fetchSuggestions()

      return newTrack
    } catch (err) {
      error.value = (err as Error).message || 'Failed to add track'
      console.error('[useSetBuilder] addTrack error:', err)
      return null
    }
  }

  async function removeTrack(trackId: string): Promise<boolean> {
    if (!currentSet.value) return false
    error.value = null

    // Find the track to remove (for undo)
    const trackIndex = currentSet.value.tracks.findIndex(t => t.id === trackId)
    if (trackIndex === -1) return false
    const removedTrack = currentSet.value.tracks[trackIndex]

    try {
      await $fetch(`/api/sets/${currentSet.value.id}/tracks`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: { trackId }
      })

      // Update local state
      currentSet.value.tracks.splice(trackIndex, 1)
      // Update positions
      currentSet.value.tracks.forEach((t, i) => {
        t.position = i
      })

      // Set up undo
      if (lastRemovedTrack.value?.timeout) {
        clearTimeout(lastRemovedTrack.value.timeout)
      }
      lastRemovedTrack.value = {
        track: removedTrack,
        timeout: setTimeout(() => {
          lastRemovedTrack.value = null
        }, 5000)
      }

      // Refresh suggestions
      await fetchSuggestions()

      return true
    } catch (err) {
      error.value = (err as Error).message || 'Failed to remove track'
      console.error('[useSetBuilder] removeTrack error:', err)
      return false
    }
  }

  async function undoRemoveTrack(): Promise<boolean> {
    if (!lastRemovedTrack.value || !currentSet.value) return false

    const { track, timeout } = lastRemovedTrack.value
    clearTimeout(timeout)
    lastRemovedTrack.value = null

    // Re-add the track at its original position
    const result = await addTrack(track.soundcloudId, track.position)
    return result !== null
  }

  async function reorderTracks(tracks: { id: string; position: number }[]): Promise<boolean> {
    if (!currentSet.value) return false
    error.value = null

    try {
      await $fetch(`/api/sets/${currentSet.value.id}/reorder`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: { tracks }
      })

      // Update local state
      const trackMap = new Map(currentSet.value.tracks.map(t => [t.id, t]))
      currentSet.value.tracks = tracks
        .sort((a, b) => a.position - b.position)
        .map(({ id, position }) => {
          const track = trackMap.get(id)!
          track.position = position
          return track
        })

      return true
    } catch (err) {
      error.value = (err as Error).message || 'Failed to reorder tracks'
      console.error('[useSetBuilder] reorderTracks error:', err)
      return false
    }
  }

  /* --- Suggestions Methods --- */

  async function fetchSuggestions(count: number = 6, resetOffset: boolean = true): Promise<void> {
    if (!currentSet.value) return
    suggestionsLoading.value = true

    // Reset offset if requested (e.g., after adding a track)
    if (resetOffset) {
      suggestionsOffset.value = 0
    }

    try {
      const response = await $fetch<{ tracks: (TrackEntry | ScoredTrack)[] }>(
        `/api/sets/${currentSet.value.id}/suggest`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: { count, offset: suggestionsOffset.value }
        }
      )
      suggestions.value = response.tracks
    } catch (err) {
      console.error('[useSetBuilder] fetchSuggestions error:', err)
      suggestions.value = []
    } finally {
      suggestionsLoading.value = false
    }
  }

  async function refreshSuggestions(): Promise<void> {
    // Increment offset to get new suggestions
    suggestionsOffset.value += 20
    await fetchSuggestions(6, false)

    // If no results, reset offset and try again from start
    if (suggestions.value.length === 0 && suggestionsOffset.value > 0) {
      suggestionsOffset.value = 0
      await fetchSuggestions(6, false)
    }
  }

  /* --- Export Methods --- */

  type ExportFormat = 'json' | 'rekordbox' | 'm3u'

  async function exportSet(format: ExportFormat = 'json'): Promise<void> {
    if (!currentSet.value) return

    try {
      const url = `/api/sets/export/${currentSet.value.id}?format=${format}`

      if (format === 'json') {
        // Download JSON as file
        const data = await $fetch(url, { headers: getAuthHeaders() })
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        downloadBlob(blob, `${currentSet.value.name}.json`)
      } else {
        // For XML and M3U, fetch as text and download
        const response = await fetch(url, { headers: getAuthHeaders() })
        const blob = await response.blob()
        const ext = format === 'rekordbox' ? 'xml' : 'm3u'
        downloadBlob(blob, `${currentSet.value.name}.${ext}`)
      }
    } catch (err) {
      console.error('[useSetBuilder] exportSet error:', err)
      error.value = 'Failed to export set'
    }
  }

  function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.replace(/[^a-z0-9_.-]/gi, '_')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /* --- Utility --- */

  function formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  function clearCurrentSet(): void {
    currentSet.value = null
    suggestions.value = []
    suggestionsOffset.value = 0
    error.value = null
  }

  return {
    // State
    currentSet: readonly(currentSet),
    sets: readonly(sets),
    suggestions: readonly(suggestions),
    loading: readonly(loading),
    suggestionsLoading: readonly(suggestionsLoading),
    error: readonly(error),
    lastRemovedTrack: readonly(lastRemovedTrack),

    // Computed
    effectiveDuration,
    targetDuration,
    progress,
    remainingDuration,

    // Methods
    fetchSets,
    fetchSet,
    createSet,
    updateSet,
    deleteSet,
    duplicateSet,
    addTrack,
    removeTrack,
    undoRemoveTrack,
    reorderTracks,
    fetchSuggestions,
    refreshSuggestions,
    exportSet,
    clearCurrentSet,
    formatDuration
  }
}
