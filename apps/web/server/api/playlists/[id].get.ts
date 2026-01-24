import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '~/server/utils/auth'

interface TrackData {
  soundcloud_id: number
  title: string
  artist: string
  artwork: string | null
  duration: number
  genre: string | null
  bpm_detected: number | null
  key_detected: string | null
  energy: number | null
  download_status: string
  permalink_url: string | null
}

interface FeedbackRow {
  soundcloud_id: number
  action: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const playlistId = getRouterParam(event, 'id')
  if (!playlistId) {
    throw createError({ statusCode: 400, message: 'Playlist ID required' })
  }

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.supabaseUrl as string,
    config.supabaseKey as string
  )

  // Get playlist
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', playlistId)
    .eq('user_id', user.id)
    .single()

  if (playlistError) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }

  // Get tracks
  const { data: playlistTracks, error: tracksError } = await supabase
    .from('playlist_tracks')
    .select(`
      position,
      added_at,
      tracks (
        soundcloud_id,
        title,
        artist,
        artwork,
        duration,
        genre,
        bpm_detected,
        key_detected,
        energy,
        download_status,
        permalink_url
      )
    `)
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true })

  if (tracksError) {
    throw createError({ statusCode: 500, message: tracksError.message })
  }

  // Get feedback
  const { data: feedback } = await supabase
    .from('playlist_feedback')
    .select('soundcloud_id, action')
    .eq('playlist_id', playlistId)

  const tracks = (playlistTracks || []).map((pt) => {
    const trackData = pt.tracks as unknown as TrackData | TrackData[] | null
    const track = Array.isArray(trackData) ? trackData[0] : trackData
    return {
      ...track,
      position: pt.position,
      added_at: pt.added_at
    }
  })

  return {
    ...playlist,
    tracks,
    feedback: (feedback || []) as FeedbackRow[]
  }
})
