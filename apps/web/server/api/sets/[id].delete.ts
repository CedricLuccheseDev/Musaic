/**
 * DELETE /api/sets/:id - Delete a set
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const setId = getRouterParam(event, 'id')
  const supabase = getSupabaseAdminClient()

  if (!setId) {
    throw createError({
      statusCode: 400,
      message: 'Set ID is required'
    })
  }

  try {
    // Delete the set (set_tracks will be deleted via CASCADE)
    const { error } = await supabase
      .from('sets')
      .delete()
      .eq('id', setId)
      .eq('user_id', user.id)

    if (error) {
      throw new Error(error.message)
    }

    return { success: true }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error
    }
    logger.db.error(`Failed to delete set ${setId} for user ${user.id}: ${error}`)
    throw createError({
      statusCode: 500,
      message: 'Failed to delete set'
    })
  }
})
