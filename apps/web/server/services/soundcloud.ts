import SoundcloudModule from 'soundcloud.ts'
import { DownloadStatus, type TrackEntry } from '~/types'
import type {
  SoundcloudTrack,
  SoundcloudInstance,
  SoundcloudConstructor
} from '~/types/soundcloud'
import {
  findBestMatchingUser,
  type MatchResult
} from '~/server/utils/stringMatch'
import { containsRejectKeyword } from '~/server/config/qualityRules'
import { logger } from '~/server/utils/logger'
import {
  fetchOdesliPurchaseLink,
  FREE_KEYWORDS,
  FREE_DOWNLOAD_DOMAINS,
  extractUrlsFromText,
  findPurchaseLink as odesli_findPurchaseLink
} from '~/server/services/odesli'

// ============================================================================
// Constants
// ============================================================================

const SEARCH_LIMIT = 25
const ARTIST_TRACKS_LIMIT = 20

// Duration filter: exclude tracks < 2 min and > 7 min (in milliseconds)
const DURATION_MIN_MS = 120000  // 2 minutes
const DURATION_MAX_MS = 420000  // 7 minutes

// Helper to check if a track duration is within acceptable range
function isValidDuration(durationMs: number | undefined): boolean {
  if (!durationMs) return false
  return durationMs >= DURATION_MIN_MS && durationMs <= DURATION_MAX_MS
}
// Constants imported from ~/server/services/odesli

// ============================================================================
// Client
// ============================================================================

// SoundCloud client ID - needed because the auto-fetch is blocked from production servers
// This ID may need to be updated periodically if SoundCloud invalidates it
// Use NUXT_SOUNDCLOUD_CLIENT_ID in production env vars

const Soundcloud = (
  (SoundcloudModule as { default?: SoundcloudConstructor }).default ||
  SoundcloudModule
) as SoundcloudConstructor

// Proxy URL for production (bypasses IP blocking from datacenters)
const PROXY_URL = 'https://corsproxy.io/?'

function createSoundcloudClient(): SoundcloudInstance {
  // Support both Nuxt runtime and standalone scripts
  let clientId: string | undefined
  try {
    const config = useRuntimeConfig()
    // Use public client ID for searches (works with old API), OAuth client ID is for auth only
    clientId = (config.soundcloudPublicClientId || config.soundcloudClientId) as string
  } catch {
    // Outside Nuxt context (scripts), use env directly
    clientId = process.env.SOUNDCLOUD_PUBLIC_CLIENT_ID || process.env.SOUNDCLOUD_CLIENT_ID
  }

  const isDev = process.env.NODE_ENV === 'development'
  const useProxy = !!clientId && !isDev // Use proxy in production only

  if (clientId) {
    return new Soundcloud(clientId, undefined, useProxy ? { proxy: PROXY_URL } : undefined)
  }
  // Fallback to auto-fetch (works in dev, may fail in prod)
  return new Soundcloud()
}

// ============================================================================
// Helpers
// ============================================================================

function hasFreeDownloadLink(text: string): boolean {
  const urls = extractUrlsFromText(text)
  return urls.some(url =>
    FREE_DOWNLOAD_DOMAINS.some(domain => url.toLowerCase().includes(domain))
  )
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
    return odesli_findPurchaseLink(track.description)
  }

  return null
}

/**
 * Enrich a single track with purchase link from Odesli if none exists
 */
export async function enrichTrackWithPurchaseLink(track: TrackEntry): Promise<TrackEntry> {
  if (track.purchase_url) {
    return track
  }

  const result = await fetchOdesliPurchaseLink(track.permalink_url)
  if (result.url) {
    return {
      ...track,
      purchase_url: result.url,
      purchase_title: result.title
    }
  }

  return track
}

/**
 * Enrich multiple tracks with purchase links from Odesli (parallel with rate limiting)
 */
export async function enrichTracksWithPurchaseLinks(
  tracks: TrackEntry[],
  concurrency = 5
): Promise<TrackEntry[]> {
  const tracksNeedingEnrichment = tracks.filter(t => !t.purchase_url)

  if (tracksNeedingEnrichment.length === 0) {
    return tracks
  }

  logger.info('SC', `Enriching ${tracksNeedingEnrichment.length} tracks with Odesli purchase links`)

  // Process in batches to avoid rate limiting
  const enrichedMap = new Map<number, TrackEntry>()

  for (let i = 0; i < tracksNeedingEnrichment.length; i += concurrency) {
    const batch = tracksNeedingEnrichment.slice(i, i + concurrency)
    const enrichedBatch = await Promise.all(
      batch.map(track => enrichTrackWithPurchaseLink(track))
    )
    enrichedBatch.forEach(t => enrichedMap.set(t.id, t))
  }

  // Merge enriched tracks back
  return tracks.map(t => enrichedMap.get(t.id) || t)
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
    // Audio analysis fields (populated by musaic-analyzer)
    bpm_detected: null,
    bpm_confidence: null,
    key_detected: null,
    key_confidence: null,
    highlight_time: null,
    analysis_status: null,
    analysis_error: null,
    analyzed_at: null,
    // Stats
    playback_count: track.playback_count || 0,
    likes_count: track.likes_count || 0,
    reposts_count: track.reposts_count || 0,
    comment_count: track.comment_count || 0,
    downloadStatus: getDownloadStatus(track),
    downloadable: track.downloadable || false,
    purchase_url: extractPurchaseUrl(track),
    purchase_title: track.purchase_title || null
  }
}

// ============================================================================
// Public API
// ============================================================================

export interface ArtistMatchInfo {
  type: MatchResult['type']
  score: number
  originalQuery: string
  matchedUsername: string
}

export interface ArtistInfo {
  id: number
  username: string
  avatar_url: string
  followers_count: number
  track_count: number
  permalink_url: string
  tracks: TrackEntry[]
  match?: ArtistMatchInfo
}

export interface SearchResult {
  tracks: TrackEntry[]
  artist?: ArtistInfo
  hasMore?: boolean
  nextOffset?: number
  artistSearchAttempted?: boolean
  artistSearchFailed?: boolean
}

export async function searchTracks(query: string, limit = SEARCH_LIMIT, enrichWithOdesli = true): Promise<TrackEntry[]> {
  const soundcloud = createSoundcloudClient()
  const response = await soundcloud.tracks.search({
    q: query,
    limit: limit + 10, // Fetch extra to compensate for filtered tracks
    'duration[from]': DURATION_MIN_MS,
    'duration[to]': DURATION_MAX_MS
  } as Parameters<typeof soundcloud.tracks.search>[0])
  const tracks = response.collection || []

  // Filter out mixes/sets and tracks outside 2-7 min range, then map to TrackEntry
  let mappedTracks = tracks
    .filter(t => !containsRejectKeyword(t.title) && isValidDuration(t.duration))
    .slice(0, limit)
    .map(mapToTrackEntry)

  // Enrich with Odesli purchase links if enabled
  if (enrichWithOdesli) {
    mappedTracks = await enrichTracksWithPurchaseLinks(mappedTracks)
  }

  return mappedTracks
}

export async function getTrackById(soundcloudId: number): Promise<TrackEntry | null> {
  const soundcloud = createSoundcloudClient()
  try {
    const track = await soundcloud.tracks.get(soundcloudId)
    if (!track) return null
    return mapToTrackEntry(track)
  } catch {
    return null
  }
}

export interface SearchFilters {
  genres?: string
  bpm?: { from: number; to: number }
  created_at?: 'last_hour' | 'last_day' | 'last_week' | 'last_month' | 'last_year'
  license?: 'to_modify_commercially' | 'to_share' | 'to_use_commercially'
}

// Known music genres to avoid false artist detection
const KNOWN_GENRES = [
  'dubstep', 'techno', 'house', 'trance', 'dnb', 'drum and bass', 'bass',
  'trap', 'edm', 'electronic', 'ambient', 'chill', 'lofi', 'hip hop', 'rap',
  'rock', 'metal', 'pop', 'jazz', 'classical', 'indie', 'folk', 'country',
  'reggae', 'ska', 'funk', 'soul', 'rnb', 'disco', 'synthwave', 'vaporwave',
  'future bass', 'melodic dubstep', 'riddim', 'brostep', 'glitch hop',
  'downtempo', 'trip hop', 'breakbeat', 'hardstyle', 'hardcore', 'gabber'
]

// Check if query is primarily a genre search
function isGenreQuery(query: string): boolean {
  const queryLower = query.toLowerCase()
  return KNOWN_GENRES.some(genre => {
    const genreWords = genre.split(' ')
    // Check if all words of the genre are in the query
    return genreWords.every(word => queryLower.includes(word))
  })
}

export async function searchWithArtistDetection(
  query: string,
  limit = SEARCH_LIMIT,
  offset = 0,
  filters?: SearchFilters,
  enrichWithOdesli = false
): Promise<SearchResult> {
  const soundcloud = createSoundcloudClient()

  // Build search params with optional filters
  const baseParams = { q: query, limit, offset }
  const extraParams: Record<string, unknown> = {
    // Default duration filter: 2-7 minutes (exclude very short/long tracks)
    'duration[from]': DURATION_MIN_MS,
    'duration[to]': DURATION_MAX_MS
  }

  // Genre filter - prefer genre_or_tag for better coverage
  if (filters?.genres) {
    extraParams['filter.genre_or_tag'] = filters.genres
  }

  // BPM range filter
  if (filters?.bpm) {
    extraParams['bpm[from]'] = filters.bpm.from
    extraParams['bpm[to]'] = filters.bpm.to
  }

  // Recent tracks filter
  if (filters?.created_at) {
    extraParams['filter.created_at'] = filters.created_at
  }

  // License filter (for free downloads)
  if (filters?.license) {
    extraParams['filter.license'] = filters.license
  }

  // Search tracks and users in parallel with error handling
  const [tracksResult, usersResult] = await Promise.allSettled([
    soundcloud.tracks.search({ ...baseParams, ...extraParams } as Parameters<typeof soundcloud.tracks.search>[0]),
    offset === 0 ? soundcloud.users.search({ q: query }) : Promise.resolve({ collection: [] })
  ])

  // Handle tracks search result
  if (tracksResult.status === 'rejected') {
    logger.sc.error('Track search failed')
  }
  const tracksResponse = tracksResult.status === 'fulfilled' ? tracksResult.value : { collection: [], next_href: null }
  // Filter out mixes/sets and tracks outside 2-7 min range
  let tracks = (tracksResponse.collection || [])
    .filter(t => !containsRejectKeyword(t.title) && isValidDuration(t.duration))
    .map(mapToTrackEntry)
  const hasMore = !!tracksResponse.next_href
  const nextOffset = hasMore ? offset + limit : undefined

  // Enrich with Odesli purchase links if enabled
  if (enrichWithOdesli) {
    tracks = await enrichTracksWithPurchaseLinks(tracks)
  }

  // Handle users search result - only attempt artist detection on first page
  if (offset !== 0) {
    return { tracks, hasMore, nextOffset, artistSearchAttempted: false }
  }

  // Skip artist detection if query is primarily a genre search
  if (isGenreQuery(query)) {
    return { tracks, hasMore, nextOffset, artistSearchAttempted: false }
  }

  const usersResponse = usersResult.status === 'fulfilled' ? usersResult.value : { collection: [] }
  const users = usersResponse.collection || []

  if (users.length === 0) {
    return {
      tracks,
      hasMore,
      nextOffset,
      artistSearchAttempted: true,
      artistSearchFailed: usersResult.status === 'rejected'
    }
  }

  // Find best matching user using improved matching algorithm
  const bestMatch = findBestMatchingUser(query, users, 50) // Minimum score of 50

  if (!bestMatch) {
    return { tracks, hasMore, nextOffset, artistSearchAttempted: true }
  }

  const { user: matchingUser, match: matchInfo } = bestMatch

  try {
    // Found matching artist, get their tracks
    const artistTracks = await soundcloud.users.tracks(matchingUser.id)
    // Filter out mixes/sets and tracks outside 2-7 min range
    let mappedArtistTracks = (artistTracks || [])
      .filter(t => !containsRejectKeyword(t.title) && isValidDuration(t.duration))
      .slice(0, ARTIST_TRACKS_LIMIT)
      .map(mapToTrackEntry)

    // Enrich artist tracks with Odesli purchase links if enabled
    if (enrichWithOdesli && mappedArtistTracks.length > 0) {
      mappedArtistTracks = await enrichTracksWithPurchaseLinks(mappedArtistTracks)
    }

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
          tracks: mappedArtistTracks,
          match: {
            type: matchInfo.type,
            score: matchInfo.score,
            originalQuery: query,
            matchedUsername: matchingUser.username
          }
        },
        hasMore,
        nextOffset,
        artistSearchAttempted: true
      }
    }
  } catch {
    // Artist tracks fetch failed (404 is common)
    logger.sc.error(`Artist "${matchingUser.username}" tracks failed`)
    return {
      tracks,
      hasMore,
      nextOffset,
      artistSearchAttempted: true,
      artistSearchFailed: true
    }
  }

  return { tracks, hasMore, nextOffset, artistSearchAttempted: true }
}

// Resolve a SoundCloud URL to a track
export async function resolveTrackUrl(url: string): Promise<TrackEntry | null> {
  const soundcloud = createSoundcloudClient()

  // Extract username and track slug from URL
  const urlMatch = url.match(/soundcloud\.com\/([^/]+)\/([^/?\s]+)/)
  if (!urlMatch) return null

  const [, username, trackSlug] = urlMatch

  // Search for the track by combining username and slug
  // This is more reliable than trying to resolve the URL directly
  const searchQuery = `${username} ${trackSlug.replace(/-/g, ' ')}`
  try {
    const response = await soundcloud.tracks.search({ q: searchQuery, limit: 10 })
    const tracks = response.collection || []

    // Find the track that matches the URL
    const matchingTrack = tracks.find(track => {
      const trackUrl = track.permalink_url.toLowerCase()
      return trackUrl.includes(username.toLowerCase()) &&
             trackUrl.includes(trackSlug.toLowerCase())
    })

    if (matchingTrack) {
      return mapToTrackEntry(matchingTrack)
    }

    // If no exact match, return the first result if it's from the same user
    const firstResult = tracks[0]
    if (firstResult?.user?.username.toLowerCase() === username.toLowerCase()) {
      return mapToTrackEntry(firstResult)
    }

    return null
  } catch {
    logger.sc.error('URL resolution failed')
    return null
  }
}

// Search for an exact track by artist and title
export async function searchExactTrack(artistName: string, trackTitle: string): Promise<TrackEntry | null> {
  const soundcloud = createSoundcloudClient()

  // Search with both artist and title
  const searchQuery = `${artistName} ${trackTitle}`
  try {
    const response = await soundcloud.tracks.search({ q: searchQuery, limit: 20 })
    const tracks = response.collection || []

    // Normalize strings for comparison
    const normalizeStr = (s: string) => s.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    const normalizedArtist = normalizeStr(artistName)
    const normalizedTitle = normalizeStr(trackTitle)

    // Find best matching track
    let bestMatch: typeof tracks[0] | null = null
    let bestScore = 0

    for (const track of tracks) {
      const trackArtist = normalizeStr(track.user?.username || '')
      const trackTitle = normalizeStr(track.title)

      // Calculate match score
      let score = 0

      // Artist match
      if (trackArtist === normalizedArtist) score += 50
      else if (trackArtist.includes(normalizedArtist) || normalizedArtist.includes(trackArtist)) score += 30

      // Title match
      if (trackTitle === normalizedTitle) score += 50
      else if (trackTitle.includes(normalizedTitle) || normalizedTitle.includes(trackTitle)) score += 30

      if (score > bestScore) {
        bestScore = score
        bestMatch = track
      }
    }

    // Require at least a reasonable match score
    if (bestMatch && bestScore >= 60) {
      return mapToTrackEntry(bestMatch)
    }

    // Fallback: return first result if search terms appear in it
    if (tracks.length > 0) {
      const first = tracks[0]
      const firstArtist = normalizeStr(first.user?.username || '')
      const firstTitle = normalizeStr(first.title)

      if (
        (firstArtist.includes(normalizedArtist) || normalizedArtist.includes(firstArtist)) &&
        (firstTitle.includes(normalizedTitle) || normalizedTitle.includes(firstTitle))
      ) {
        return mapToTrackEntry(first)
      }
    }

    return null
  } catch {
    logger.sc.error('Exact track search failed')
    return null
  }
}
