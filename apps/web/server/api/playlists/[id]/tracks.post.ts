import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '~/server/utils/auth'

interface AddTrackBody {
  soundcloud_id: number
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const playlistId = getRouterParam(event, 'id')
  if (!playlistId) {
    throw createError({ statusCode: 400, message: 'Playlist ID required' })
  }

  const body = await readBody<AddTrackBody>(event)
  if (!body.soundcloud_id) {
    throw createError({ statusCode: 400, message: 'soundcloud_id required' })
  }

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.supabaseUrl as string,
    config.supabaseKey as string
  )

  // Verify playlist ownership
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('id')
    .eq('id', playlistId)
    .eq('user_id', user.id)
    .single()

  if (playlistError || !playlist) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }

  // Get current max position
  const { data: lastTrack } = await supabase
    .from('playlist_tracks')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const nextPosition = (lastTrack?.position || 0) + 1

  // Add track
  const { data, error } = await supabase
    .from('playlist_tracks')
    .insert({
      playlist_id: playlistId,
      soundcloud_id: body.soundcloud_id,
      position: nextPosition
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw createError({ statusCode: 409, message: 'Track already in playlist' })
    }
    throw createError({ statusCode: 500, message: error.message })
  }

  // Also record as 'like' feedback
  await supabase
    .from('playlist_feedback')
    .upsert({
      playlist_id: playlistId,
      soundcloud_id: body.soundcloud_id,
      action: 'like'
    })

  return data
})
