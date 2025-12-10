import SoundcloudModule from 'soundcloud.ts'
import { DownloadStatus, type TrackEntry } from '~/types/track'

// ============================================================================
// Types
// ============================================================================

interface SoundcloudConstructor {
  new (): SoundcloudInstance
}

interface SoundcloudInstance {
  tracks: {
    search: (params: { q: string }) => Promise<SoundcloudSearchResponse>
  }
}

interface SoundcloudSearchResponse {
  collection: SoundcloudTrack[]
}

interface SoundcloudTrack {
  id: number
  urn: string
  title: string
  user?: { username: string }
  artwork_url?: string
  permalink_url: string
  duration: number
  genre?: string
  description?: string
  created_at?: string
  label_name?: string
  tag_list?: string
  playback_count?: number
  likes_count?: number
  reposts_count?: number
  comment_count?: number
  downloadable?: boolean
  download_url?: string
  purchase_url?: string
  purchase_title?: string
}

// ============================================================================
// Constants
// ============================================================================

const FREE_KEYWORDS = ['free download', 'free dl', 'freedl', 'free']

// ============================================================================
// Client
// ============================================================================

const Soundcloud = (
  (SoundcloudModule as { default?: SoundcloudConstructor }).default ||
  SoundcloudModule
) as SoundcloudConstructor

// ============================================================================
// Helpers
// ============================================================================

function getDownloadStatus(track: SoundcloudTrack): DownloadStatus {
  if (track.downloadable) {
    return DownloadStatus.FreeDirectLink
  }

  if (track.purchase_title) {
    const title = track.purchase_title.toLowerCase()
    if (FREE_KEYWORDS.some(keyword => title.includes(keyword))) {
      return DownloadStatus.FreeExternalLink
    }
  }

  return DownloadStatus.No
}

function parseTags(tagList?: string): string[] {
  if (!tagList) return []
  return tagList.split(' ').filter(tag => tag.length > 0)
}

function mapToTrackEntry(track: SoundcloudTrack): TrackEntry {
  return {
    id: track.id,
    urn: track.urn || `soundcloud:tracks:${track.id}`,
    permalink_url: track.permalink_url,
    title: track.title,
    artist: track.user?.username || 'Unknown',
    artwork: track.artwork_url?.replace('-large', '-t300x300') || null,
    duration: track.duration,
    genre: track.genre || null,
    description: track.description || null,
    created_at: track.created_at || null,
    label: track.label_name || null,
    tags: parseTags(track.tag_list),
    playback_count: track.playback_count || 0,
    likes_count: track.likes_count || 0,
    reposts_count: track.reposts_count || 0,
    comment_count: track.comment_count || 0,
    downloadStatus: getDownloadStatus(track),
    downloadable: track.downloadable || false,
    download_url: track.download_url || null,
    purchase_url: track.purchase_url || null,
    purchase_title: track.purchase_title || null
  }
}

// ============================================================================
// Public API
// ============================================================================

export async function searchTracks(query: string, limit = 20): Promise<TrackEntry[]> {
  const soundcloud = new Soundcloud()
  const response = await soundcloud.tracks.search({ q: query })
  const tracks = response.collection || []

  return tracks.slice(0, limit).map(mapToTrackEntry)
}
