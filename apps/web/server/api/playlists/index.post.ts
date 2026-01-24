import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '~/server/utils/auth'

interface CreatePlaylistBody {
  name?: string
  target_duration?: number
  style?: string
  free_download_only?: boolean
  reference_track_id?: number
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<CreatePlaylistBody>(event)

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.supabaseUrl as string,
    config.supabaseKey as string
  )

  // Try to insert new draft
  const { data, error } = await supabase
    .from('playlists')
    .insert({
      user_id: user.id,
      name: body.name || null,
      target_duration: body.target_duration || 60,
      style: body.style || null,
      free_download_only: body.free_download_only || false,
      reference_track_id: body.reference_track_id || null,
      is_draft: true
    })
    .select()
    .single()

  if (error) {
    // If unique constraint violation (draft already exists), get existing draft
    if (error.code === '23505') {
      const { data: existingDraft, error: fetchError } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_draft', true)
        .single()

      if (fetchError) {
        throw createError({ statusCode: 500, message: fetchError.message })
      }

      return existingDraft
    }

    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
