import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '~/server/utils/auth'

interface UpdatePlaylistBody {
  name?: string
  target_duration?: number
  style?: string
  free_download_only?: boolean
  is_draft?: boolean
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const playlistId = getRouterParam(event, 'id')
  if (!playlistId) {
    throw createError({ statusCode: 400, message: 'Playlist ID required' })
  }

  const body = await readBody<UpdatePlaylistBody>(event)

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.supabaseUrl as string,
    config.supabaseKey as string
  )

  const { data, error } = await supabase
    .from('playlists')
    .update({
      name: body.name,
      target_duration: body.target_duration,
      style: body.style,
      free_download_only: body.free_download_only,
      is_draft: body.is_draft
    })
    .eq('id', playlistId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
