/**
 * PUT /api/sets/:id - Update a set
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'
import { logger } from '~/server/utils/logger'
import type { UpdateSetRequest, DbSetUpdate } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const setId = getRouterParam(event, 'id')
  const body = await readBody<UpdateSetRequest>(event)
  const supabase = getSupabaseAdminClient()

  if (!setId) {
    throw createError({
      statusCode: 400,
      message: 'Set ID is required'
    })
  }

  try {
    // Verify ownership
    const { data: existing, error: checkError } = await supabase
      .from('sets')
      .select('id')
      .eq('id', setId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existing) {
      throw createError({
        statusCode: 404,
        message: 'Set not found'
      })
    }

    // Build update object
    const update: DbSetUpdate = {}

    if (body.name !== undefined) update.name = body.name.trim()
    if (body.description !== undefined) update.description = body.description
    if (body.genre !== undefined) update.genre = body.genre
    if (body.targetDuration !== undefined) update.target_duration = body.targetDuration * 60
    if (body.avgTrackPlaytime !== undefined) update.avg_track_playtime = body.avgTrackPlaytime
    if (body.mood !== undefined) update.mood = body.mood
    if (body.status !== undefined) update.status = body.status

    if (Object.keys(update).length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No fields to update'
      })
    }

    // Update the set
    const { error: updateError } = await supabase
      .from('sets')
      .update(update)
      .eq('id', setId)
      .eq('user_id', user.id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return { success: true }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error
    }
    logger.db.error(`Failed to update set ${setId} for user ${user.id}: ${error}`)
    throw createError({
      statusCode: 500,
      message: 'Failed to update set'
    })
  }
})
