/**
 * GET /api/sets/:id - Get a specific set with tracks
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'
import { logger } from '~/server/utils/logger'
import { dbTrackToTrackEntry, type DbSet, type DbSetTrack, type DbTrack, type SetMood, type SetStatus, type SetTrack } from '~/types'

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
    // Get the set
    const { data: dbSet, error: setError } = await supabase
      .from('sets')
      .select('*')
      .eq('id', setId)
      .eq('user_id', user.id)
      .single()

    if (setError || !dbSet) {
      throw createError({
        statusCode: 404,
        message: 'Set not found'
      })
    }

    // Get set tracks
    const { data: setTracks, error: tracksError } = await supabase
      .from('set_tracks')
      .select('*')
      .eq('set_id', setId)
      .order('position', { ascending: true })

    if (tracksError) {
      throw new Error(tracksError.message)
    }

    // Get track details
    const soundcloudIds = (setTracks || []).map((t: DbSetTrack) => t.soundcloud_id)
    let trackDetails: Map<number, ReturnType<typeof dbTrackToTrackEntry>> = new Map()

    if (soundcloudIds.length > 0) {
      const { data: tracks } = await supabase
        .from('tracks')
        .select('*')
        .in('soundcloud_id', soundcloudIds)

      if (tracks) {
        trackDetails = new Map(
          tracks.map((t: DbTrack) => [t.soundcloud_id, dbTrackToTrackEntry(t)])
        )
      }
    }

    // Build set tracks with details
    const tracks: SetTrack[] = (setTracks || [])
      .map((st: DbSetTrack) => {
        const track = trackDetails.get(st.soundcloud_id)
        if (!track) return null
        return {
          id: st.id,
          soundcloudId: st.soundcloud_id,
          position: st.position,
          track,
          transitionNote: st.transition_note ?? undefined
        } as SetTrack
      })
      .filter((t): t is SetTrack => t !== null)

    const set = dbSet as DbSet

    return {
      set: {
        id: set.id,
        userId: set.user_id,
        name: set.name,
        description: set.description,
        genre: set.genre,
        targetDuration: set.target_duration,
        avgTrackPlaytime: set.avg_track_playtime || 70,
        mood: (set.mood || 'mixed') as SetMood,
        tracks,
        status: (set.status || 'draft') as SetStatus,
        isPublic: set.is_public || false,
        createdAt: new Date(set.created_at || Date.now()),
        updatedAt: new Date(set.updated_at || Date.now())
      }
    }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error
    }
    logger.db.error(`Failed to get set ${setId} for user ${user.id}: ${error}`)
    throw createError({
      statusCode: 500,
      message: 'Failed to get set'
    })
  }
})
