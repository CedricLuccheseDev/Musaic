/**
 * Set Builder Types
 */

import type { TrackEntry } from './index'

// =============================================================================
// Enums
// =============================================================================

export type SetMood = 'energetic' | 'chill' | 'progressive' | 'mixed'

export const SetMood = {
  Energetic: 'energetic',
  Chill: 'chill',
  Progressive: 'progressive',
  Mixed: 'mixed'
} as const

export type SetStatus = 'draft' | 'completed'

export const SetStatus = {
  Draft: 'draft',
  Completed: 'completed'
} as const

// =============================================================================
// Database Types
// =============================================================================

export interface DbSet {
  id: string
  user_id: string
  name: string
  description: string | null
  genre: string | null
  target_duration: number | null
  avg_track_playtime: number | null
  mood: string | null
  status: string | null
  is_public: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface DbSetInsert {
  id?: string
  user_id: string
  name: string
  description?: string | null
  genre?: string | null
  target_duration?: number | null
  avg_track_playtime?: number | null
  mood?: string | null
  status?: string | null
  is_public?: boolean | null
}

export interface DbSetUpdate {
  name?: string
  description?: string | null
  genre?: string | null
  target_duration?: number | null
  avg_track_playtime?: number | null
  mood?: string | null
  status?: string | null
  is_public?: boolean | null
}

export interface DbSetTrack {
  id: string
  set_id: string
  soundcloud_id: number
  position: number
  transition_note: string | null
  added_at: string | null
}

export interface DbSetTrackInsert {
  id?: string
  set_id: string
  soundcloud_id: number
  position: number
  transition_note?: string | null
}

// =============================================================================
// Frontend Types
// =============================================================================

export interface SetConfig {
  name: string
  genre: string
  targetDuration: number // minutes
  avgTrackPlaytime: number // % of duration played (60-80, default: 70)
  mood: SetMood
  freeDownloadOnly: boolean
}

export interface SetTrack {
  id: string
  soundcloudId: number
  position: number
  track: TrackEntry
  transitionNote?: string
}

export interface DjSet {
  id: string
  userId: string
  name: string
  description: string | null
  genre: string | null
  targetDuration: number | null // seconds
  avgTrackPlaytime: number // %
  mood: SetMood
  tracks: SetTrack[]
  status: SetStatus
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

// Set list item (for /set page)
export interface SetListItem {
  id: string
  name: string
  genre: string | null
  trackCount: number
  totalDuration: number // effective duration in seconds
  status: SetStatus
  createdAt: Date
  updatedAt: Date
  // First 4 artworks for mosaic
  artworks: (string | null)[]
}

// =============================================================================
// Suggestion Types
// =============================================================================

export interface SuggestionContext {
  // Set config
  genre: string
  targetDuration: number
  freeDownloadOnly: boolean

  // Computed metrics from set tracks
  averageBpm: number
  averageEnergy: number
  usedKeys: string[]
  usedArtists: string[]
  usedTrackIds: number[]
  remainingDuration: number
}

export interface SuggestionRequest {
  setId: string
  count?: number // default: 5
}

export interface SuggestionResponse {
  tracks: TrackEntry[]
  // V1.5: reasoning: string
}

// Track with similarity score (for internal use)
export interface ScoredTrack extends TrackEntry {
  similarityScore: number
}

// =============================================================================
// API Types
// =============================================================================

export interface CreateSetRequest {
  name: string
  genre: string
  targetDuration: number // minutes
  avgTrackPlaytime?: number // default: 70
  mood?: SetMood // default: 'mixed'
  freeDownloadOnly?: boolean // default: false
}

export interface UpdateSetRequest {
  name?: string
  description?: string
  genre?: string
  targetDuration?: number
  avgTrackPlaytime?: number
  mood?: SetMood
  status?: SetStatus
}

export interface AddTrackRequest {
  soundcloudId: number
  position?: number // if not provided, append at end
  transitionNote?: string
}

export interface ReorderTracksRequest {
  tracks: { id: string; position: number }[]
}

// =============================================================================
// Conversion Functions
// =============================================================================

export function dbSetToSetListItem(
  dbSet: DbSet,
  tracks: DbSetTrack[],
  trackDetails: Map<number, TrackEntry>
): SetListItem {
  const artworks: (string | null)[] = []
  let totalDuration = 0
  const avgPlaytime = dbSet.avg_track_playtime || 70

  for (const st of tracks.slice(0, 4)) {
    const track = trackDetails.get(st.soundcloud_id)
    artworks.push(track?.artwork || null)
  }

  for (const st of tracks) {
    const track = trackDetails.get(st.soundcloud_id)
    if (track) {
      totalDuration += track.duration * (avgPlaytime / 100)
    }
  }

  return {
    id: dbSet.id,
    name: dbSet.name,
    genre: dbSet.genre,
    trackCount: tracks.length,
    totalDuration: Math.round(totalDuration),
    status: (dbSet.status || 'draft') as SetStatus,
    createdAt: new Date(dbSet.created_at || Date.now()),
    updatedAt: new Date(dbSet.updated_at || Date.now()),
    artworks
  }
}

export function dbSetToDjSet(
  dbSet: DbSet,
  tracks: DbSetTrack[],
  trackDetails: Map<number, TrackEntry>
): DjSet {
  const setTracks: SetTrack[] = tracks
    .sort((a, b) => a.position - b.position)
    .map(st => ({
      id: st.id,
      soundcloudId: st.soundcloud_id,
      position: st.position,
      track: trackDetails.get(st.soundcloud_id)!,
      transitionNote: st.transition_note || undefined
    }))
    .filter(st => st.track) // Filter out tracks not found

  return {
    id: dbSet.id,
    userId: dbSet.user_id,
    name: dbSet.name,
    description: dbSet.description,
    genre: dbSet.genre,
    targetDuration: dbSet.target_duration,
    avgTrackPlaytime: dbSet.avg_track_playtime || 70,
    mood: (dbSet.mood || 'mixed') as SetMood,
    tracks: setTracks,
    status: (dbSet.status || 'draft') as SetStatus,
    isPublic: dbSet.is_public || false,
    createdAt: new Date(dbSet.created_at || Date.now()),
    updatedAt: new Date(dbSet.updated_at || Date.now())
  }
}
