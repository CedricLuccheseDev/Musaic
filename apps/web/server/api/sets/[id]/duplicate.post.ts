/**
 * POST /api/sets/:id/duplicate - Duplicate a set
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'
import { logger } from '~/server/utils/logger'
import type { DbSet, DbSetTrack } from '~/types'

const MAX_SETS_FREE = 1

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
    // Check user's premium status and set count
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    const isPremium = profile?.is_premium || false

    if (!isPremium) {
      const { count } = await supabase
        .from('sets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if ((count || 0) >= MAX_SETS_FREE) {
        throw createError({
          statusCode: 403,
          message: `Free users can create up to ${MAX_SETS_FREE} set. Upgrade to Premium for unlimited sets.`
        })
      }
    }

    // Get the original set
    const { data: originalSet, error: setError } = await supabase
      .from('sets')
      .select('*')
      .eq('id', setId)
      .eq('user_id', user.id)
      .single()

    if (setError || !originalSet) {
      throw createError({
        statusCode: 404,
        message: 'Set not found'
      })
    }

    const original = originalSet as DbSet

    // Create the duplicate set
    const { data: newSet, error: insertError } = await supabase
      .from('sets')
      .insert({
        user_id: user.id,
        name: `${original.name} (copy)`,
        description: original.description,
        genre: original.genre,
        target_duration: original.target_duration,
        avg_track_playtime: original.avg_track_playtime,
        mood: original.mood,
        status: 'draft',
        is_public: false
      })
      .select()
      .single()

    if (insertError || !newSet) {
      throw new Error(insertError?.message || 'Failed to create duplicate set')
    }

    // Get original tracks
    const { data: originalTracks } = await supabase
      .from('set_tracks')
      .select('*')
      .eq('set_id', setId)
      .order('position', { ascending: true })

    // Copy tracks to new set
    if (originalTracks && originalTracks.length > 0) {
      const tracksToInsert = (originalTracks as DbSetTrack[]).map(t => ({
        set_id: newSet.id,
        soundcloud_id: t.soundcloud_id,
        position: t.position,
        transition_note: t.transition_note
      }))

      await supabase.from('set_tracks').insert(tracksToInsert)
    }

    return {
      set: {
        id: newSet.id,
        name: newSet.name
      }
    }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error
    }
    logger.db.error(`Failed to duplicate set ${setId}: ${error}`)
    throw createError({
      statusCode: 500,
      message: 'Failed to duplicate set'
    })
  }
})
