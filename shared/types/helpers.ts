/**
 * Type conversion helpers
 */

import type { Database } from './generated/database'
import type { DownloadStatus, AnalysisStatus } from './enums'

// =============================================================================
// Database Row Types (from generated types)
// =============================================================================

export type DbTrack = Database['public']['Tables']['tracks']['Row']
export type DbTrackInsert = Database['public']['Tables']['tracks']['Insert']
export type DbTrackUpdate = Database['public']['Tables']['tracks']['Update']

export type DbProfile = Database['public']['Tables']['profiles']['Row']

// Database track with analysis data (for AI queries)
export type DbTrackWithAnalysis = DbTrack

// Analysis data subset (for enrichment)
export interface AnalysisData {
  soundcloud_id: number
  bpm_detected: number | null
  bpm_confidence: number | null
  key_detected: string | null
  key_confidence: number | null
  energy: number | null
  loudness: number | null
  dynamic_complexity: number | null
  danceability: number | null
  speechiness: number | null
  instrumentalness: number | null
  acousticness: number | null
  valence: number | null
  liveness: number | null
  spectral_centroid: number | null
  dissonance: number | null
  analysis_status: string | null
}

// =============================================================================
// Frontend Track Entry (used in UI)
// =============================================================================

export interface TrackEntry {
  // Identifiers
  id: number
  urn: string
  permalink_url: string

  // Basic info
  title: string
  artist: string
  artwork: string | null

  // Metadata
  duration: number
  genre: string | null
  description: string | null
  created_at: string | null
  label: string | null
  tags: string[]

  // Audio analysis
  bpm_detected: number | null
  bpm_confidence: number | null
  key_detected: string | null
  key_confidence: number | null
  energy: number | null
  loudness: number | null
  dynamic_complexity: number | null
  spectral_centroid: number | null
  dissonance: number | null
  danceability: number | null
  speechiness: number | null
  instrumentalness: number | null
  acousticness: number | null
  valence: number | null
  liveness: number | null
  analysis_status: AnalysisStatus | null
  analysis_error: string | null
  analyzed_at: string | null

  // Stats
  playback_count: number
  likes_count: number
  reposts_count: number
  comment_count: number

  // Download info
  downloadStatus: DownloadStatus
  downloadable: boolean
  purchase_url: string | null
  purchase_title: string | null
}

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Convert frontend TrackEntry to database format for insertion
 */
export function trackEntryToDbTrack(track: TrackEntry): DbTrackInsert {
  return {
    soundcloud_id: track.id,
    urn: track.urn,
    permalink_url: track.permalink_url,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork,
    duration: track.duration,
    genre: track.genre,
    description: track.description,
    soundcloud_created_at: track.created_at,
    label: track.label,
    tags: track.tags,
    playback_count: track.playback_count,
    likes_count: track.likes_count,
    reposts_count: track.reposts_count,
    comment_count: track.comment_count,
    download_status: track.downloadStatus,
    downloadable: track.downloadable,
    purchase_url: track.purchase_url,
    purchase_title: track.purchase_title
  }
}

/**
 * Convert database row to frontend TrackEntry format
 */
export function dbTrackToTrackEntry(db: DbTrack): TrackEntry {
  return {
    id: db.soundcloud_id,
    urn: db.urn,
    permalink_url: db.permalink_url,
    title: db.title,
    artist: db.artist,
    artwork: db.artwork,
    duration: db.duration,
    genre: db.genre,
    description: db.description,
    created_at: db.soundcloud_created_at,
    label: db.label,
    tags: db.tags || [],
    playback_count: db.playback_count || 0,
    likes_count: db.likes_count || 0,
    reposts_count: db.reposts_count || 0,
    comment_count: db.comment_count || 0,
    downloadStatus: (db.download_status || 'No') as DownloadStatus,
    downloadable: db.downloadable || false,
    purchase_url: db.purchase_url,
    purchase_title: db.purchase_title,
    // Analysis fields
    bpm_detected: db.bpm_detected,
    bpm_confidence: db.bpm_confidence,
    key_detected: db.key_detected,
    key_confidence: db.key_confidence,
    energy: db.energy,
    loudness: db.loudness,
    dynamic_complexity: db.dynamic_complexity,
    spectral_centroid: db.spectral_centroid,
    dissonance: db.dissonance,
    danceability: db.danceability,
    speechiness: db.speechiness,
    instrumentalness: db.instrumentalness,
    acousticness: db.acousticness,
    valence: db.valence,
    liveness: db.liveness,
    analysis_status: db.analysis_status as AnalysisStatus | null,
    analysis_error: db.analysis_error,
    analyzed_at: db.analyzed_at
  }
}
