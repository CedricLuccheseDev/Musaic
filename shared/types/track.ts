/**
 * Shared track types between App and Analyzer
 */

import type { AnalysisData, AnalysisStatus } from './analysis'

// =============================================================================
// Enums
// =============================================================================

/**
 * Download availability status
 */
export type DownloadStatus = 'FreeDirectLink' | 'FreeExternalLink' | 'No'

export const DownloadStatusValues = {
  FREE_DIRECT: 'FreeDirectLink' as const,
  FREE_EXTERNAL: 'FreeExternalLink' as const,
  NO: 'No' as const
}

// =============================================================================
// Track Types
// =============================================================================

/**
 * Track entry as used in the frontend
 */
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

/**
 * Database track record (snake_case matching Supabase schema)
 */
export interface DbTrack {
  soundcloud_id: number
  urn: string
  permalink_url: string
  title: string
  artist: string
  artwork: string | null
  duration: number
  genre: string | null
  description: string | null
  soundcloud_created_at: string | null
  label: string | null
  tags: string[]
  playback_count: number
  likes_count: number
  reposts_count: number
  comment_count: number
  download_status: string
  downloadable: boolean
  purchase_url: string | null
  purchase_title: string | null
}

/**
 * Database track with analysis fields
 */
export interface DbTrackWithAnalysis extends DbTrack, AnalysisData {}

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Convert TrackEntry to DbTrack format for insertion
 */
export function trackEntryToDbTrack(track: TrackEntry): DbTrack {
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
 * Convert DbTrackWithAnalysis to TrackEntry format
 */
export function dbTrackToTrackEntry(db: DbTrackWithAnalysis): TrackEntry {
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
    playback_count: db.playback_count,
    likes_count: db.likes_count,
    reposts_count: db.reposts_count,
    comment_count: db.comment_count,
    downloadStatus: db.download_status as DownloadStatus,
    downloadable: db.downloadable,
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
