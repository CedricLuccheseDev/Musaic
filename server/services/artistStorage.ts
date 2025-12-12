import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ArtistEntry } from '~/types/artist'

let supabaseClient: SupabaseClient | null = null

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

interface DbArtist {
  soundcloud_id: number
  permalink_url: string
  username: string
  full_name: string | null
  avatar_url: string | null
  banner_url: string | null
  description: string | null
  city: string | null
  country: string | null
  followers_count: number
  followings_count: number
  track_count: number
  playlist_count: number
  likes_count: number
  reposts_count: number
  website_url: string | null
  instagram_url: string | null
  twitter_url: string | null
  facebook_url: string | null
  spotify_url: string | null
  youtube_url: string | null
  genres: string[]
  labels: string[]
  artist_type: string | null
  verified: boolean
  pro_user: boolean
  soundcloud_created_at: string | null
}

function artistEntryToDbArtist(artist: ArtistEntry): DbArtist {
  return {
    soundcloud_id: artist.id,
    permalink_url: artist.permalink_url,
    username: artist.username,
    full_name: artist.full_name,
    avatar_url: artist.avatar_url,
    banner_url: artist.banner_url,
    description: artist.description,
    city: artist.city,
    country: artist.country,
    followers_count: artist.followers_count,
    followings_count: artist.followings_count,
    track_count: artist.track_count,
    playlist_count: artist.playlist_count,
    likes_count: artist.likes_count,
    reposts_count: artist.reposts_count,
    website_url: artist.website_url,
    instagram_url: artist.instagram_url,
    twitter_url: artist.twitter_url,
    facebook_url: artist.facebook_url,
    spotify_url: artist.spotify_url,
    youtube_url: artist.youtube_url,
    genres: artist.genres,
    labels: artist.labels,
    artist_type: artist.artist_type,
    verified: artist.verified,
    pro_user: artist.pro_user,
    soundcloud_created_at: artist.created_at
  }
}

/**
 * Upsert a single artist into the database
 */
export async function upsertArtist(artist: ArtistEntry): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const dbArtist = artistEntryToDbArtist(artist)

  const { error } = await supabase
    .from('artists')
    .upsert(dbArtist, {
      onConflict: 'soundcloud_id',
      ignoreDuplicates: false
    })

  if (error) {
    console.error('[ArtistStorage] Failed to upsert artist:', error.message)
  }
}

/**
 * Upsert multiple artists into the database
 */
export async function upsertArtists(artists: ArtistEntry[]): Promise<void> {
  if (artists.length === 0) return

  const supabase = getSupabaseClient()
  if (!supabase) return

  // Deduplicate by id
  const uniqueArtists = [...new Map(artists.map(a => [a.id, a])).values()]
  const dbArtists = uniqueArtists.map(artistEntryToDbArtist)

  const { error } = await supabase
    .from('artists')
    .upsert(dbArtists, {
      onConflict: 'soundcloud_id',
      ignoreDuplicates: false
    })

  if (error) {
    console.error('[ArtistStorage] Failed to upsert artists:', error.message)
  } else {
    console.log(`[ArtistStorage] Upserted ${uniqueArtists.length} artists`)
  }
}
