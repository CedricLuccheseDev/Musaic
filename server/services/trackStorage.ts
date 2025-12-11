import { createClient } from '@supabase/supabase-js'
import type { TrackEntry } from '~/types/track'

function getSupabaseClient() {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabase.url
  const supabaseKey = config.public.supabase.key

  if (!supabaseUrl || !supabaseKey) {
    console.error('[TrackStorage] Config:', JSON.stringify(config.public.supabase))
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey)
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
  download_url: string | null
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
 */
export async function upsertTracks(tracks: TrackEntry[]): Promise<void> {
  if (tracks.length === 0) return

  const supabase = getSupabaseClient()
  const dbTracks = tracks.map(trackEntryToDbTrack)

  const { error } = await supabase
    .from('tracks')
    .upsert(dbTracks, {
      onConflict: 'soundcloud_id',
      ignoreDuplicates: false
    })

  if (error) {
    console.error('[TrackStorage] Failed to upsert tracks:', error.message)
  } else {
    console.log(`[TrackStorage] Upserted ${tracks.length} tracks`)
  }
}

/**
 * Get a track by its SoundCloud ID
 */
export async function getTrackBySoundcloudId(soundcloudId: number): Promise<DbTrack | null> {
  const supabase = getSupabaseClient()

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

  const { count, error } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('[TrackStorage] Failed to count tracks:', error.message)
    return 0
  }

  return count || 0
}
