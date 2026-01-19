/**
 * POST /api/sets/:id/tracks - Add a track to a set
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'
import { logger } from '~/server/utils/logger'
import { dbTrackToTrackEntry, type AddTrackRequest, type DbTrack, type DbSetTrack } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const setId = getRouterParam(event, 'id')
  const body = await readBody<AddTrackRequest>(event)
  const supabase = getSupabaseAdminClient()

  if (!setId) {
    throw createError({
      statusCode: 400,
      message: 'Set ID is required'
    })
  }

  if (!body.soundcloudId) {
    throw createError({
      statusCode: 400,
      message: 'soundcloudId is required'
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

    // Check if track exists in DB
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('soundcloud_id', body.soundcloudId)
      .single()

    if (trackError || !track) {
      throw createError({
        statusCode: 404,
        message: 'Track not found in database'
      })
    }

    // Get current max position
    const { data: existingTracks } = await supabase
      .from('set_tracks')
      .select('position')
      .eq('set_id', setId)
      .order('position', { ascending: false })
      .limit(1)

    const maxPosition = existingTracks?.[0]?.position ?? -1
    const position = body.position ?? maxPosition + 1

    // If position is specified and not at end, shift other tracks
    if (body.position !== undefined && body.position <= maxPosition) {
      // Update positions of tracks >= position
      await supabase.rpc('exec', {
        query: `UPDATE set_tracks SET position = position + 1 WHERE set_id = '${setId}' AND position >= ${position}`
      })
    }

    // Check for duplicate track in set
    const { data: duplicate } = await supabase
      .from('set_tracks')
      .select('id')
      .eq('set_id', setId)
      .eq('soundcloud_id', body.soundcloudId)
      .single()

    if (duplicate) {
      throw createError({
        statusCode: 409,
        message: 'Track already in set'
      })
    }

    // Add the track
    const { data: newSetTrack, error: insertError } = await supabase
      .from('set_tracks')
      .insert({
        set_id: setId,
        soundcloud_id: body.soundcloudId,
        position,
        transition_note: body.transitionNote || null
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(insertError.message)
    }

    const setTrack = newSetTrack as DbSetTrack

    return {
      setTrack: {
        id: setTrack.id,
        soundcloudId: setTrack.soundcloud_id,
        position: setTrack.position,
        track: dbTrackToTrackEntry(track as DbTrack),
        transitionNote: setTrack.transition_note || undefined
      }
    }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error
    }
    logger.db.error(`Failed to add track to set ${setId}: ${error}`)
    throw createError({
      statusCode: 500,
      message: 'Failed to add track to set'
    })
  }
})
