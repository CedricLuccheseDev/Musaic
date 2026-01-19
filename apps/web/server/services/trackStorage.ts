import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { type TrackEntry, type DbTrack, type AnalysisData, trackEntryToDbTrack, DownloadStatus } from '~/types'
import { logger } from '~/server/utils/logger'
import {
  MIN_TRACK_DURATION,
  MAX_TRACK_DURATION,
  QUALITY_THRESHOLD,
  SCORING,
  ENGAGEMENT,
  containsRejectKeyword,
  isValidDuration,
  isIdealDuration,
  isRecent
} from '~/server/config/qualityRules'

let supabaseClient: SupabaseClient | null = null

/**
 * Calculate quality score for a track
 * Returns 0 if track fails hard filters (should be rejected)
 * Otherwise returns cumulative score based on quality criteria
 */
export function calculateQualityScore(track: TrackEntry): number {
  // === HARD FILTERS (score = 0 = rejected) ===

  // Contains mix/live keywords
  if (containsRejectKeyword(track.title)) return 0

  // Duration outside limits
  if (!isValidDuration(track.duration)) return 0

  // === POSITIVE SCORING ===
  let score = 0

  // Duration scoring
  if (isIdealDuration(track.duration)) score += SCORING.idealDuration
  else score += SCORING.acceptableDuration

  // Presentation
  if (track.artwork) score += SCORING.hasArtwork
  if (track.genre) score += SCORING.hasGenre
  if (track.description) score += SCORING.hasDescription

  // Engagement
  if (track.likes_count > ENGAGEMENT.minLikes) score += SCORING.minLikes
  if (track.likes_count > ENGAGEMENT.goodLikes) score += SCORING.goodLikes
  if (track.playback_count > ENGAGEMENT.minPlays) score += SCORING.minPlays
  if (track.comment_count > 0) score += SCORING.hasComments

  // Download availability
  if (track.downloadStatus !== DownloadStatus.No) score += SCORING.downloadable

  // Freshness
  if (isRecent(track.created_at)) score += SCORING.recent

  return score
}

// Trigger analysis for new tracks via musaic-analyzer
export async function triggerAnalysis(soundcloudIds: number[]): Promise<void> {
  const config = useRuntimeConfig()
  const analyzerUrl = config.analyzerUrl as string

  if (!analyzerUrl || soundcloudIds.length === 0) return

  // Fire and forget - don't block the upsert
  fetch(`${analyzerUrl}/analyze/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ soundcloud_ids: soundcloudIds })
  }).catch(() => {
    // Silent fail - analyzer might be down
  })
}

// ============================================================================
// Odesli Purchase Link Enrichment (Background)
// ============================================================================

const ODESLI_API_URL = 'https://api.song.link/v1-alpha.1/links'

const PURCHASE_PLATFORM_PRIORITY = [
  'beatport', 'bandcamp', 'traxsource', 'itunes', 'appleMusic',
  'amazon', 'deezer', 'spotify', 'tidal', 'youtube', 'youtubeMusic'
] as const

interface OdesliPlatformLink {
  url: string
  entityUniqueId: string
}

interface OdesliResponse {
  pageUrl: string
  linksByPlatform: Record<string, OdesliPlatformLink>
}

async function fetchOdesliLink(soundcloudUrl: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${ODESLI_API_URL}?url=${encodeURIComponent(soundcloudUrl)}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      }
    )

    if (!response.ok) return null

    const data = await response.json() as OdesliResponse
    if (!data.linksByPlatform) return null

    for (const platform of PURCHASE_PLATFORM_PRIORITY) {
      const link = data.linksByPlatform[platform]
      if (link?.url) return link.url
    }

    return data.pageUrl || null
  } catch {
    return null
  }
}

/**
 * Enrich tracks with purchase links from Odesli (background, non-blocking)
 * Called after upsertTracks to fill in missing purchase_url
 */
export function triggerPurchaseLinkEnrichment(tracks: TrackEntry[]): void {
  // Filter tracks without purchase_url
  const tracksToEnrich = tracks.filter(t => !t.purchase_url)
  if (tracksToEnrich.length === 0) return

  // Fire and forget - run in background
  enrichPurchaseLinksBackground(tracksToEnrich).catch(() => {
    // Silent fail
  })
}

async function enrichPurchaseLinksBackground(tracks: TrackEntry[]): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return

  logger.info('DB', `Enriching ${tracks.length} tracks with Odesli links (background)`)

  // Process in small batches to avoid rate limiting
  const BATCH_SIZE = 3
  const DELAY_MS = 1000
  let enriched = 0

  for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
    const batch = tracks.slice(i, i + BATCH_SIZE)

    const results = await Promise.all(
      batch.map(async (track) => {
        const url = await fetchOdesliLink(track.permalink_url)
        return { track, url }
      })
    )

    // Update tracks that got a link
    for (const { track, url } of results) {
      if (url) {
        const { error } = await supabase
          .from('tracks')
          .update({
            purchase_url: url,
            purchase_title: 'Buy / Stream'
          })
          .eq('soundcloud_id', track.id)

        if (!error) enriched++
      }
    }

    // Rate limit delay
    if (i + BATCH_SIZE < tracks.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }

  if (enriched > 0) {
    logger.info('DB', `Enriched ${enriched}/${tracks.length} tracks with purchase links`)
  }
}

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient

  const config = useRuntimeConfig()
  const url = config.supabaseUrl as string
  const key = config.supabaseKey as string

  if (!url || !key) {
    return null
  }

  supabaseClient = createClient(url, key)
  return supabaseClient
}


/**
 * Upsert a single track into the database
 * If track with same soundcloud_id exists, update it
 * Otherwise, insert a new record
 * Skips tracks longer than 8 minutes
 */
export async function upsertTrack(track: TrackEntry): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return

  // Skip tracks outside duration limits (1-8 minutes)
  if (track.duration < MIN_TRACK_DURATION || track.duration > MAX_TRACK_DURATION) return

  const dbTrack = trackEntryToDbTrack(track)

  const { error } = await supabase
    .from('tracks')
    .upsert(dbTrack, {
      onConflict: 'soundcloud_id',
      ignoreDuplicates: false
    })

  if (error) {
    logger.db.error(error.message)
  } else {
    const totalCount = await getTrackCount()
    logger.db.upsert(1, totalCount)
    triggerAnalysis([track.id])
    triggerPurchaseLinkEnrichment([track])
  }
}

export interface UpsertOptions {
  forceStore?: boolean  // Skip quality filter (for user-saved tracks)
}

/**
 * Upsert multiple tracks into the database
 * Uses batch upsert for efficiency
 * Deduplicates by soundcloud_id to avoid ON CONFLICT errors
 * Filters out tracks that don't meet quality threshold (unless forceStore)
 */
export async function upsertTracks(tracks: TrackEntry[], options?: UpsertOptions): Promise<{ stored: number; rejected: number }> {
  if (tracks.length === 0) return { stored: 0, rejected: 0 }

  const supabase = getSupabaseClient()
  if (!supabase) return { stored: 0, rejected: 0 }

  // Filter by quality score (unless force storing)
  let qualityTracks: TrackEntry[]
  let rejectedCount: number

  if (options?.forceStore) {
    // Force store: only apply hard duration filter
    qualityTracks = tracks.filter(t => t.duration >= MIN_TRACK_DURATION && t.duration <= MAX_TRACK_DURATION)
    rejectedCount = tracks.length - qualityTracks.length
  } else {
    // Normal: apply full quality scoring
    qualityTracks = tracks.filter(t => calculateQualityScore(t) >= QUALITY_THRESHOLD)
    rejectedCount = tracks.length - qualityTracks.length
  }

  if (qualityTracks.length === 0) {
    if (rejectedCount > 0) {
      logger.db.quality(0, rejectedCount)
    }
    return { stored: 0, rejected: rejectedCount }
  }

  // Deduplicate by soundcloud_id (keep last occurrence)
  const uniqueTracks = [...new Map(qualityTracks.map(t => [t.id, t])).values()]
  const dbTracks = uniqueTracks.map(trackEntryToDbTrack)

  const { error, data } = await supabase
    .from('tracks')
    .upsert(dbTracks, {
      onConflict: 'soundcloud_id',
      ignoreDuplicates: false
    })
    .select('soundcloud_id')

  if (error) {
    logger.db.error(error.message)
    return { stored: 0, rejected: rejectedCount }
  }

  const storedCount = data?.length || uniqueTracks.length
  const totalCount = await getTrackCount()
  logger.db.upsert(storedCount, totalCount)
  if (rejectedCount > 0) {
    logger.db.quality(storedCount, rejectedCount)
  }

  // Trigger background jobs (non-blocking)
  triggerAnalysis(uniqueTracks.map(t => t.id))
  triggerPurchaseLinkEnrichment(uniqueTracks)

  return { stored: storedCount, rejected: rejectedCount }
}

/**
 * Get a track by its SoundCloud ID
 */
export async function getTrackBySoundcloudId(soundcloudId: number): Promise<DbTrack | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .eq('soundcloud_id', soundcloudId)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      logger.db.error(error.message)
    }
    return null
  }

  return data
}

/**
 * Get all stored tracks (with pagination)
 */
export async function getStoredTracks(limit = 50, offset = 0): Promise<DbTrack[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    logger.db.error(error.message)
    return []
  }

  return data || []
}

/**
 * Get track count
 */
export async function getTrackCount(): Promise<number> {
  const supabase = getSupabaseClient()
  if (!supabase) return 0

  const { count, error } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })

  if (error) {
    logger.db.error(error.message)
    return 0
  }

  return count || 0
}

/**
 * Get analysis data for multiple tracks by SoundCloud IDs
 * Returns a map of soundcloud_id -> analysis data
 */
export async function getAnalysisData(soundcloudIds: number[]): Promise<Map<number, AnalysisData>> {
  const supabase = getSupabaseClient()
  if (!supabase || soundcloudIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('tracks')
    .select('soundcloud_id, bpm_detected, bpm_confidence, key_detected, key_confidence, energy, loudness, dynamic_complexity, danceability, speechiness, instrumentalness, acousticness, valence, liveness, spectral_centroid, dissonance, analysis_status')
    .in('soundcloud_id', soundcloudIds)

  if (error) {
    logger.db.error(error.message)
    return new Map()
  }

  const map = new Map<number, AnalysisData>()
  for (const row of data || []) {
    map.set(row.soundcloud_id, row as AnalysisData)
  }
  return map
}

/**
 * Enrich tracks with analysis data from Supabase
 */
export async function enrichTracksWithAnalysis(tracks: TrackEntry[]): Promise<TrackEntry[]> {
  if (tracks.length === 0) return tracks

  const ids = tracks.map(t => t.id)
  const analysisMap = await getAnalysisData(ids)

  return tracks.map(track => {
    const analysis = analysisMap.get(track.id)
    if (!analysis) return track

    return {
      ...track,
      bpm_detected: analysis.bpm_detected,
      bpm_confidence: analysis.bpm_confidence,
      key_detected: analysis.key_detected,
      key_confidence: analysis.key_confidence,
      energy: analysis.energy,
      loudness: analysis.loudness,
      dynamic_complexity: analysis.dynamic_complexity,
      danceability: analysis.danceability,
      speechiness: analysis.speechiness,
      instrumentalness: analysis.instrumentalness,
      acousticness: analysis.acousticness,
      valence: analysis.valence,
      liveness: analysis.liveness,
      spectral_centroid: analysis.spectral_centroid,
      dissonance: analysis.dissonance,
      analysis_status: analysis.analysis_status as TrackEntry['analysis_status']
    }
  })
}
