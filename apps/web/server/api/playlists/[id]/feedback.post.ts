import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '~/server/utils/auth'

interface FeedbackBody {
  soundcloud_id: number
  action: 'like' | 'skip'
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const playlistId = getRouterParam(event, 'id')
  if (!playlistId) {
    throw createError({ statusCode: 400, message: 'Playlist ID required' })
  }

  const body = await readBody<FeedbackBody>(event)
  if (!body.soundcloud_id || !body.action) {
    throw createError({ statusCode: 400, message: 'soundcloud_id and action required' })
  }

  if (!['like', 'skip'].includes(body.action)) {
    throw createError({ statusCode: 400, message: 'action must be "like" or "skip"' })
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

  // Upsert feedback
  const { data, error } = await supabase
    .from('playlist_feedback')
    .upsert({
      playlist_id: playlistId,
      soundcloud_id: body.soundcloud_id,
      action: body.action
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
