/**
 * DELETE /api/sets/:id/tracks - Remove a track from a set
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'
import { logger } from '~/server/utils/logger'

interface DeleteTrackRequest {
  trackId: string // set_track id
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const setId = getRouterParam(event, 'id')
  const body = await readBody<DeleteTrackRequest>(event)
  const supabase = getSupabaseAdminClient()

  if (!setId) {
    throw createError({
      statusCode: 400,
      message: 'Set ID is required'
    })
  }

  if (!body.trackId) {
    throw createError({
      statusCode: 400,
      message: 'trackId is required'
    })
  }

  try {
    // Verify set ownership
    const { data: set, error: setError } = await supabase
      .from('sets')
      .select('id')
      .eq('id', setId)
      .eq('user_id', user.id)
      .single()

    if (setError || !set) {
      throw createError({
        statusCode: 404,
        message: 'Set not found'
      })
    }

    // Get the track to delete (to know its position)
    const { data: trackToDelete, error: trackError } = await supabase
      .from('set_tracks')
      .select('position')
      .eq('id', body.trackId)
      .eq('set_id', setId)
      .single()

    if (trackError || !trackToDelete) {
      throw createError({
        statusCode: 404,
        message: 'Track not found in set'
      })
    }

    const deletedPosition = trackToDelete.position

    // Delete the track
    const { error: deleteError } = await supabase
      .from('set_tracks')
      .delete()
      .eq('id', body.trackId)
      .eq('set_id', setId)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    // Shift positions of tracks after the deleted one
    await supabase.rpc('exec', {
      query: `UPDATE set_tracks SET position = position - 1 WHERE set_id = '${setId}' AND position > ${deletedPosition}`
    })

    return { success: true }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error
    }
    logger.db.error(`Failed to remove track from set ${setId}: ${error}`)
    throw createError({
      statusCode: 500,
      message: 'Failed to remove track from set'
    })
  }
})
