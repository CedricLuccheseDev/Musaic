/**
 * PUT /api/sets/:id/reorder - Reorder tracks in a set
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'
import { logger } from '~/server/utils/logger'
import type { ReorderTracksRequest } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const setId = getRouterParam(event, 'id')
  const body = await readBody<ReorderTracksRequest>(event)
  const supabase = getSupabaseAdminClient()

  if (!setId) {
    throw createError({
      statusCode: 400,
      message: 'Set ID is required'
    })
  }

  if (!body.tracks || !Array.isArray(body.tracks) || body.tracks.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'tracks array is required'
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

    // Update each track's position
    // Use negative positions first to avoid unique constraint conflicts
    for (let i = 0; i < body.tracks.length; i++) {
      const { id, position } = body.tracks[i]
      await supabase
        .from('set_tracks')
        .update({ position: -(position + 1000) }) // Temporary negative position
        .eq('id', id)
        .eq('set_id', setId)
    }

    // Now set the correct positions
    for (const { id, position } of body.tracks) {
      await supabase
        .from('set_tracks')
        .update({ position })
        .eq('id', id)
        .eq('set_id', setId)
    }

    return { success: true }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error
    }
    logger.db.error(`Failed to reorder tracks in set ${setId}: ${error}`)
    throw createError({
      statusCode: 500,
      message: 'Failed to reorder tracks'
    })
  }
})
