import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { TrackEntry } from '~/types/track'

let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient

  const config = useRuntimeConfig()
  const url = config.supabaseUrl as string
  const key = config.supabaseKey as string

  console.log('[TrackStorage] Supabase config:', { url: url ? `${url.substring(0, 30)}...` : 'MISSING', key: key ? 'SET' : 'MISSING' })

  if (!url || !key) {
    console.warn('[TrackStorage] Supabase not configured, skipping')
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
  artist_id: number | null
  artwork: string | null
  duration: number
  genre: string | null
  description: string | null
  soundcloud_created_at: string | null
  label: string | null
  tags: string[]
  bpm: number | null
  key: string | null
  playback_count: number
  likes_count: number
  reposts_count: number
  comment_count: number
  download_status: string
  downloadable: boolean
  download_url: string | null
  purchase_url: string | null
  purchase_title: string | null
}

function trackEntryToDbTrack(track: TrackEntry, knownArtistIds: Set<number> = new Set()): DbTrack {
  // Only set artist_id if we know the artist exists in the database
  const artistId = track.artist_id && knownArtistIds.has(track.artist_id) ? track.artist_id : null

  return {
    soundcloud_id: track.id,
    urn: track.urn,
    permalink_url: track.permalink_url,
    title: track.title,
    artist: track.artist,
    artist_id: artistId,
    artwork: track.artwork,
    duration: track.duration,
    genre: track.genre,
    description: track.description,
    soundcloud_created_at: track.created_at,
    label: track.label,
    tags: track.tags,
    bpm: track.bpm,
    key: track.key,
    playback_count: track.playback_count,
    likes_count: track.likes_count,
    reposts_count: track.reposts_count,
    comment_count: track.comment_count,
    download_status: track.downloadStatus,
    downloadable: track.downloadable,
    download_url: track.download_url,
    purchase_url: track.purchase_url,
    purchase_title: track.purchase_title
  }
}

/**
 * Upsert a single track into the database
 * If track with same soundcloud_id exists, update it
 * Otherwise, insert a new record
 */
export async function upsertTrack(track: TrackEntry): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const dbTrack = trackEntryToDbTrack(track)

  const { error } = await supabase
    .from('tracks')
    .upsert(dbTrack, {
      onConflict: 'soundcloud_id',
      ignoreDuplicates: false
    })

  if (error) {
    console.error('[TrackStorage] Failed to upsert track:', error.message)
  }
}

/**
 * Upsert multiple tracks into the database
 * Uses batch upsert for efficiency
 * Deduplicates by soundcloud_id to avoid ON CONFLICT errors
 */
export async function upsertTracks(tracks: TrackEntry[], knownArtistIds: Set<number> = new Set()): Promise<void> {
  console.log(`[TrackStorage] upsertTracks called with ${tracks.length} tracks`)

  if (tracks.length === 0) {
    console.log('[TrackStorage] No tracks to upsert')
    return
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    console.log('[TrackStorage] Supabase client not available, skipping')
    return
  }

  // Get all unique artist IDs from tracks that we don't already know about
  const artistIdsToCheck = [...new Set(
    tracks
      .map(t => t.artist_id)
      .filter((id): id is number => id !== null && !knownArtistIds.has(id))
  )]

  // Check which artists exist in the database
  if (artistIdsToCheck.length > 0) {
    const { data: existingArtists } = await supabase
      .from('artists')
      .select('soundcloud_id')
      .in('soundcloud_id', artistIdsToCheck)

    if (existingArtists) {
      for (const artist of existingArtists) {
        knownArtistIds.add(artist.soundcloud_id)
      }
    }
  }

  // Deduplicate by soundcloud_id (keep last occurrence)
  const uniqueTracks = [...new Map(tracks.map(t => [t.id, t])).values()]
  const dbTracks = uniqueTracks.map(t => trackEntryToDbTrack(t, knownArtistIds))

  console.log(`[TrackStorage] Upserting ${uniqueTracks.length} unique tracks`)
  console.log('[TrackStorage] First track sample:', JSON.stringify(dbTracks[0], null, 2))

  const { error, data } = await supabase
    .from('tracks')
    .upsert(dbTracks, {
      onConflict: 'soundcloud_id',
      ignoreDuplicates: false
    })
    .select('soundcloud_id')

  if (error) {
    console.error('[TrackStorage] Failed to upsert tracks:', error.message, error.details, error.hint)
  } else {
    console.log(`[TrackStorage] Successfully upserted ${data?.length || uniqueTracks.length} tracks`)
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
      console.error('[TrackStorage] Failed to get track:', error.message)
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
    console.error('[TrackStorage] Failed to get tracks:', error.message)
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
    console.error('[TrackStorage] Failed to count tracks:', error.message)
    return 0
  }

  return count || 0
}
