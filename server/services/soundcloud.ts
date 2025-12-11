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
    search: (params: { q: string; limit?: number; offset?: number }) => Promise<SoundcloudSearchResponse>
  }
  users: {
    search: (params: { q: string; limit?: number }) => Promise<SoundcloudUserSearchResponse>
    tracks: (userId: number) => Promise<SoundcloudTrack[]>
  }
}

interface SoundcloudSearchResponse {
  collection: SoundcloudTrack[]
  next_href: string | null
  total_results?: number
}

interface SoundcloudUserSearchResponse {
  collection: SoundcloudUser[]
}

interface SoundcloudUser {
  id: number
  username: string
  avatar_url: string
  followers_count: number
  track_count: number
  permalink_url: string
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

const SEARCH_LIMIT = 25
const ARTIST_TRACKS_LIMIT = 20
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

export interface ArtistInfo {
  id: number
  username: string
  avatar_url: string
  followers_count: number
  track_count: number
  permalink_url: string
  tracks: TrackEntry[]
}

export interface SearchResult {
  tracks: TrackEntry[]
  artist?: ArtistInfo
  hasMore?: boolean
  nextOffset?: number
}

export async function searchTracks(query: string, limit = SEARCH_LIMIT): Promise<TrackEntry[]> {
  const soundcloud = new Soundcloud()
  const response = await soundcloud.tracks.search({ q: query, limit })
  const tracks = response.collection || []

  return tracks.map(mapToTrackEntry)
}

export async function searchWithArtistDetection(query: string, limit = SEARCH_LIMIT, offset = 0): Promise<SearchResult> {
  const soundcloud = new Soundcloud()

  // Search tracks and users in parallel with error handling
  const [tracksResult, usersResult] = await Promise.allSettled([
    soundcloud.tracks.search({ q: query, limit, offset }),
    offset === 0 ? soundcloud.users.search({ q: query }) : Promise.resolve({ collection: [] })
  ])

  // Handle tracks search result
  const tracksResponse = tracksResult.status === 'fulfilled' ? tracksResult.value : { collection: [], next_href: null }
  const tracks = (tracksResponse.collection || []).map(mapToTrackEntry)
  const hasMore = !!tracksResponse.next_href
  const nextOffset = hasMore ? offset + limit : undefined

  // Handle users search result
  const usersResponse = usersResult.status === 'fulfilled' ? usersResult.value : { collection: [] }
  const users = usersResponse.collection || []

  // Normalize strings for comparison (remove spaces, lowercase)
  const normalizeForMatch = (s: string) => s.toLowerCase().replace(/\s+/g, '')
  const queryNorm = normalizeForMatch(query)

  // Find matching artist (exact match or normalized match)
  const matchingUser = users.find(user => {
    const usernameNorm = normalizeForMatch(user.username)
    return usernameNorm === queryNorm || user.username.toLowerCase() === query.toLowerCase()
  })

  if (matchingUser) {
    try {
      // Found matching artist, get their tracks
      const artistTracks = await soundcloud.users.tracks(matchingUser.id)
      const mappedArtistTracks = (artistTracks || []).slice(0, ARTIST_TRACKS_LIMIT).map(mapToTrackEntry)

      if (mappedArtistTracks.length > 0) {
        return {
          tracks,
          artist: {
            id: matchingUser.id,
            username: matchingUser.username,
            avatar_url: matchingUser.avatar_url,
            followers_count: matchingUser.followers_count,
            track_count: matchingUser.track_count,
            permalink_url: matchingUser.permalink_url,
            tracks: mappedArtistTracks
          },
          hasMore,
          nextOffset
        }
      }
    } catch {
      // Artist tracks fetch failed (404 is common), continue without artist section
    }
  }

  return { tracks, hasMore, nextOffset }
}
