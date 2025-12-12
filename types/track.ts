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

  // Audio metadata (extracted from description/tags/title)
  bpm: number | null
  key: string | null

  // Stats
  playback_count: number
  likes_count: number
  reposts_count: number
  comment_count: number

  // Download info
  downloadStatus: DownloadStatus
  downloadable: boolean
  download_url: string | null
  purchase_url: string | null
  purchase_title: string | null
}
