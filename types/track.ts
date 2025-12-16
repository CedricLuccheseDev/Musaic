export enum DownloadStatus {
  FreeDirectLink = 'FreeDirectLink',
  FreeExternalLink = 'FreeExternalLink',
  No = 'No'
}

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

  // Audio analysis (from Essentia via musaic-analyzer)
  // Rhythm
  bpm_detected: number | null
  bpm_confidence: number | null
  // Tonal
  key_detected: string | null
  key_confidence: number | null
  // Dynamics
  energy: number | null
  loudness: number | null
  dynamic_complexity: number | null
  // Timbre
  spectral_centroid: number | null
  dissonance: number | null
  // High-level descriptors
  danceability: number | null
  speechiness: number | null
  instrumentalness: number | null
  acousticness: number | null
  valence: number | null
  liveness: number | null
  // Status
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed' | null
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
