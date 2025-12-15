import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { TrackEntry } from '~/types/track'
import { logger } from '~/server/utils/logger'

let supabaseClient: SupabaseClient | null = null

// Track duration limits (in ms)
const MIN_TRACK_DURATION = 2 * 60 * 1000 // 2 minutes
const MAX_TRACK_DURATION = 8 * 60 * 1000 // 8 minutes

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

interface DbTrack {
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

function trackEntryToDbTrack(track: TrackEntry): DbTrack {
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
  }
}

/**
 * Upsert multiple tracks into the database
 * Uses batch upsert for efficiency
 * Deduplicates by soundcloud_id to avoid ON CONFLICT errors
 * Filters out tracks outside duration limits (1-8 minutes)
 */
export async function upsertTracks(tracks: TrackEntry[]): Promise<void> {
  if (tracks.length === 0) return

  const supabase = getSupabaseClient()
  if (!supabase) return

  // Filter by duration and deduplicate by soundcloud_id (keep last occurrence)
  const validTracks = tracks.filter(t => t.duration >= MIN_TRACK_DURATION && t.duration <= MAX_TRACK_DURATION)
  if (validTracks.length === 0) return

  const uniqueTracks = [...new Map(validTracks.map(t => [t.id, t])).values()]
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
  } else {
    const totalCount = await getTrackCount()
    logger.db.upsert(data?.length || uniqueTracks.length, totalCount)
    triggerAnalysis(uniqueTracks.map(t => t.id))
  }
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
