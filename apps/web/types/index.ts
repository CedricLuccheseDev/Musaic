/**
 * Musaic Types
 */

// Re-export SoundCloud types
export * from './soundcloud'

// =============================================================================
// Enums
// =============================================================================

export type DownloadStatus = 'FreeDirectLink' | 'FreeExternalLink' | 'No'

export const DownloadStatus = {
  FreeDirectLink: 'FreeDirectLink',
  FreeExternalLink: 'FreeExternalLink',
  No: 'No'
} as const

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

export const AnalysisStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed'
} as const

// =============================================================================
// Database Types
// =============================================================================

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
  tags: string[] | null
  playback_count: number | null
  likes_count: number | null
  reposts_count: number | null
  comment_count: number | null
  bpm_detected: number | null
  bpm_confidence: number | null
  key_detected: string | null
  key_confidence: number | null
  highlight_time: number | null
  analysis_status: string | null
  analysis_error: string | null
  analyzed_at: string | null
  download_status: string
  downloadable: boolean | null
  purchase_url: string | null
  purchase_title: string | null
  download_count: number | null
  embedding: number[] | null
  created_at: string | null
  updated_at: string | null
}

export interface DbTrackInsert {
  soundcloud_id: number
  urn: string
  permalink_url: string
  title: string
  artist: string
  artwork?: string | null
  duration?: number
  genre?: string | null
  description?: string | null
  soundcloud_created_at?: string | null
  label?: string | null
  tags?: string[] | null
  playback_count?: number | null
  likes_count?: number | null
  reposts_count?: number | null
  comment_count?: number | null
  bpm_detected?: number | null
  bpm_confidence?: number | null
  key_detected?: string | null
  key_confidence?: number | null
  highlight_time?: number | null
  analysis_status?: string | null
  analysis_error?: string | null
  analyzed_at?: string | null
  download_status?: string
  downloadable?: boolean | null
  purchase_url?: string | null
  purchase_title?: string | null
  download_count?: number | null
  embedding?: number[] | null
}

export interface DbTrackUpdate {
  soundcloud_id?: number
  urn?: string
  permalink_url?: string
  title?: string
  artist?: string
  artwork?: string | null
  duration?: number
  genre?: string | null
  description?: string | null
  soundcloud_created_at?: string | null
  label?: string | null
  tags?: string[] | null
  playback_count?: number | null
  likes_count?: number | null
  reposts_count?: number | null
  comment_count?: number | null
  bpm_detected?: number | null
  bpm_confidence?: number | null
  key_detected?: string | null
  key_confidence?: number | null
  highlight_time?: number | null
  analysis_status?: string | null
  analysis_error?: string | null
  analyzed_at?: string | null
  download_status?: string
  downloadable?: boolean | null
  purchase_url?: string | null
  purchase_title?: string | null
  download_count?: number | null
  embedding?: number[] | null
}

export interface DbProfile {
  id: string
  is_premium: boolean | null
  is_admin: boolean | null
  premium_until: string | null
  created_at: string | null
}

// =============================================================================
// Analysis Data (subset of DbTrack for analysis queries)
// =============================================================================

export interface AnalysisData {
  soundcloud_id: number
  bpm_detected: number | null
  bpm_confidence: number | null
  key_detected: string | null
  key_confidence: number | null
  analysis_status: string | null
}

// Alias for compatibility (DbTrack includes analysis fields)
export type DbTrackWithAnalysis = DbTrack

// =============================================================================
// Frontend Types
// =============================================================================

export interface TrackEntry {
  id: number
  urn: string
  permalink_url: string
  title: string
  artist: string
  artwork: string | null
  duration: number
  genre: string | null
  description: string | null
  created_at: string | null
  label: string | null
  tags: string[]
  bpm_detected: number | null
  bpm_confidence: number | null
  key_detected: string | null
  key_confidence: number | null
  highlight_time: number | null
  analysis_status: AnalysisStatus | null
  analysis_error: string | null
  analyzed_at: string | null
  playback_count: number
  likes_count: number
  reposts_count: number
  comment_count: number
  downloadStatus: DownloadStatus
  downloadable: boolean
  purchase_url: string | null
  purchase_title: string | null
  // Hybrid search metadata (optional, added by mergeAndRankTracks)
  source?: 'database' | 'soundcloud'
  hasAnalysis?: boolean
  score?: number
  shouldAnalyze?: boolean
}

// =============================================================================
// Conversion Functions
// =============================================================================

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
    bpm_detected: db.bpm_detected,
    bpm_confidence: db.bpm_confidence,
    key_detected: db.key_detected,
    key_confidence: db.key_confidence,
    highlight_time: db.highlight_time,
    analysis_status: db.analysis_status as AnalysisStatus | null,
    analysis_error: db.analysis_error,
    analyzed_at: db.analyzed_at
  }
}
