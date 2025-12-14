import SoundcloudModule from 'soundcloud.ts'
import { DownloadStatus, type TrackEntry } from '~/types/track'

// ============================================================================
// Types
// ============================================================================

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
  permalink_url: string
  avatar_url: string
  full_name?: string
  description?: string
  city?: string
  country_code?: string
  followers_count: number
  followings_count?: number
  track_count: number
  playlist_count?: number
  likes_count?: number
  reposts_count?: number
  visuals?: {
    visuals?: Array<{
      visual_url?: string
    }>
  }
  verified?: boolean
  creator_subscriptions?: Array<{ product?: { id?: string } }>
  created_at?: string
}

interface SoundcloudTrack {
  id: number
  urn: string
  title: string
  user?: { id: number; username: string }
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

const FREE_DOWNLOAD_DOMAINS = [
  'hypeddit.com',
  'toneden.io',
  'fanlink.to',
  'gate.fm',
  'bfrnd.link',
  'edmdisc.com'
]

const SMART_LINK_DOMAINS = [
  'smarturl.it',
  'ffm.to',
  'linktr.ee',
  'distrokid.com',
  'lnk.to',
  'found.ee',
  'song.link',
  'odesli.co'
]

const PURCHASE_DOMAINS = [
  'beatport.com',
  'bandcamp.com',
  'traxsource.com',
  'junodownload.com',
  'amazon.com',
  'itunes.apple.com',
  'music.apple.com',
  'spotify.com',
  'deezer.com'
]

// ============================================================================
// Client
// ============================================================================

// SoundCloud client ID - needed because the auto-fetch is blocked from production servers
// This ID may need to be updated periodically if SoundCloud invalidates it
// Use NUXT_SOUNDCLOUD_CLIENT_ID in production env vars

interface SoundcloudOptions {
  proxy?: string
}

interface SoundcloudConstructorWithClientId {
  new (clientId?: string, oauthToken?: string, options?: SoundcloudOptions): SoundcloudInstance
}

const Soundcloud = (
  (SoundcloudModule as { default?: SoundcloudConstructorWithClientId }).default ||
  SoundcloudModule
) as SoundcloudConstructorWithClientId

// Proxy URL for production (bypasses IP blocking from datacenters)
const PROXY_URL = 'https://corsproxy.io/?'

function createSoundcloudClient(): SoundcloudInstance {
  const config = useRuntimeConfig()
  const clientId = config.soundcloudClientId as string
  const useProxy = !!clientId // Use proxy in production (when client ID is set)

  console.log(`[SoundCloud] Client ID: ${clientId ? 'yes (' + clientId.slice(0, 8) + '...)' : 'NO'}, Proxy: ${useProxy ? 'yes' : 'no'}`)

  if (clientId) {
    return new Soundcloud(clientId, undefined, useProxy ? { proxy: PROXY_URL } : undefined)
  }
  // Fallback to auto-fetch (works in dev, may fail in prod)
  return new Soundcloud()
}

// ============================================================================
// Helpers
// ============================================================================

function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi
  return text.match(urlRegex) || []
}

function hasFreeDownloadLink(text: string): boolean {
  const urls = extractUrlsFromText(text)
  return urls.some(url =>
    FREE_DOWNLOAD_DOMAINS.some(domain => url.toLowerCase().includes(domain))
  )
}

const BUY_KEYWORDS = ['buy', 'purchase', 'acheter', 'get it', 'stream', 'out now', 'available']

function hasPurchaseLink(text: string): string | null {
  const urls = extractUrlsFromText(text)

  // First check for known purchase domains
  const purchaseUrl = urls.find(url =>
    PURCHASE_DOMAINS.some(domain => url.toLowerCase().includes(domain))
  )
  if (purchaseUrl) return purchaseUrl

  // Check for smart link domains (streaming/purchase aggregators)
  const smartLinkUrl = urls.find(url =>
    SMART_LINK_DOMAINS.some(domain => url.toLowerCase().includes(domain))
  )
  if (smartLinkUrl) return smartLinkUrl

  // Then check for "Buy" or similar keywords near a URL
  const textLower = text.toLowerCase()
  if (BUY_KEYWORDS.some(keyword => textLower.includes(keyword)) && urls.length > 0) {
    // Return the first URL found near a buy keyword
    return urls[0]
  }

  return null
}

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

  if (track.purchase_url && FREE_DOWNLOAD_DOMAINS.some(domain => track.purchase_url!.toLowerCase().includes(domain))) {
    return DownloadStatus.FreeExternalLink
  }

  if (track.description && hasFreeDownloadLink(track.description)) {
    return DownloadStatus.FreeExternalLink
  }

  return DownloadStatus.No
}

function extractPurchaseUrl(track: SoundcloudTrack): string | null {
  if (track.purchase_url) {
    return track.purchase_url
  }

  if (track.description) {
    return hasPurchaseLink(track.description)
  }

  return null
}

function parseTags(tagList?: string): string[] {
  if (!tagList) return []
  return tagList.split(' ').filter(tag => tag.length > 0)
}

const BPM_PATTERNS = [
  /(\d{2,3})\s*bpm/i,
  /bpm\s*[:|-]?\s*(\d{2,3})/i,
  /tempo\s*[:|-]?\s*(\d{2,3})/i,
  /(\d{2,3})\s*beats?\s*per\s*min/i
]

const KEY_PATTERNS = [
  /\b([A-G][#b]?)\s*(maj|min|major|minor|m)?\b/i,
  /key\s*[:|-]?\s*([A-G][#b]?)\s*(maj|min|major|minor|m)?/i,
  /\b(\d{1,2}[AB])\b/i
]

const VALID_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dbm', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm', 'Am', 'A#m', 'Bbm', 'Bm',
  '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B',
  '7A', '7B', '8A', '8B', '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B'
]

function extractBpm(text: string): number | null {
  for (const pattern of BPM_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const bpm = parseInt(match[1], 10)
      if (bpm >= 60 && bpm <= 200) {
        return bpm
      }
    }
  }
  return null
}

function extractKey(text: string): string | null {
  for (const pattern of KEY_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      let key = match[1]
      const modifier = match[2]?.toLowerCase()

      if (modifier === 'min' || modifier === 'minor' || modifier === 'm') {
        key = key + 'm'
      }

      if (VALID_KEYS.includes(key) || VALID_KEYS.includes(key.toUpperCase())) {
        return key.toUpperCase()
      }
    }
  }
  return null
}

function extractAudioMetadata(track: SoundcloudTrack): { bpm: number | null; key: string | null } {
  const searchText = [
    track.title || '',
    track.description || '',
    track.tag_list || ''
  ].join(' ')

  return {
    bpm: extractBpm(searchText),
    key: extractKey(searchText)
  }
}

function mapToTrackEntry(track: SoundcloudTrack): TrackEntry {
  const audioMetadata = extractAudioMetadata(track)

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
    bpm: audioMetadata.bpm,
    key: audioMetadata.key,
    playback_count: track.playback_count || 0,
    likes_count: track.likes_count || 0,
    reposts_count: track.reposts_count || 0,
    comment_count: track.comment_count || 0,
    downloadStatus: getDownloadStatus(track),
    downloadable: track.downloadable || false,
    download_url: track.download_url || null,
    purchase_url: extractPurchaseUrl(track),
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
  const soundcloud = createSoundcloudClient()
  const response = await soundcloud.tracks.search({ q: query, limit })
  const tracks = response.collection || []

  return tracks.map(mapToTrackEntry)
}

export async function searchWithArtistDetection(query: string, limit = SEARCH_LIMIT, offset = 0): Promise<SearchResult> {
  const soundcloud = createSoundcloudClient()

  // Search tracks and users in parallel with error handling
  const [tracksResult, usersResult] = await Promise.allSettled([
    soundcloud.tracks.search({ q: query, limit, offset }),
    offset === 0 ? soundcloud.users.search({ q: query }) : Promise.resolve({ collection: [] })
  ])

  // Handle tracks search result
  if (tracksResult.status === 'rejected') {
    console.error('[SoundCloud] Track search failed:', tracksResult.reason)
  }
  const tracksResponse = tracksResult.status === 'fulfilled' ? tracksResult.value : { collection: [], next_href: null }
  const tracks = (tracksResponse.collection || []).map(mapToTrackEntry)
  console.log(`[SoundCloud] Query: "${query}", Raw tracks: ${tracksResponse.collection?.length || 0}`)
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
