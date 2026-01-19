/**
 * POST /api/sets/:id/suggest - Get track suggestions for a set
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'
import { logger } from '~/server/utils/logger'
import { getSuggestions, getInitialSuggestions } from '~/server/services/setBuilderSuggestions'
import type { DbSet, DbSetTrack, DbTrack, SuggestionContext } from '~/types'

interface SuggestRequest {
  count?: number
  offset?: number
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const setId = getRouterParam(event, 'id')
  const body = await readBody<SuggestRequest>(event)
  const supabase = getSupabaseAdminClient()

  if (!setId) {
    throw createError({
      statusCode: 400,
      message: 'Set ID is required'
    })
  }

  const count = Math.min(Math.max(body?.count || 6, 1), 12)
  const offset = Math.max(body?.offset || 0, 0)

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

    const set = dbSet as DbSet

    // Get set tracks
    const { data: setTracks } = await supabase
      .from('set_tracks')
      .select('*')
      .eq('set_id', setId)
      .order('position', { ascending: true })

    const tracks = (setTracks || []) as DbSetTrack[]

    // If no tracks yet, return initial suggestions
    if (tracks.length === 0) {
      const suggestions = await getInitialSuggestions(
        set.genre || '',
        false, // We don't have freeDownloadOnly in the set config yet
        count,
        offset
      )
      return { tracks: suggestions }
    }

    // Get track details for context calculation
    const soundcloudIds = tracks.map(t => t.soundcloud_id)
    const { data: trackDetails } = await supabase
      .from('tracks')
      .select('*')
      .in('soundcloud_id', soundcloudIds)

    const trackMap = new Map<number, DbTrack>(
      (trackDetails || []).map((t: DbTrack) => [t.soundcloud_id, t])
    )

    // Build context from set tracks
    const validTracks = tracks
      .map(st => trackMap.get(st.soundcloud_id))
      .filter((t): t is DbTrack => t !== undefined)

    const avgBpm = validTracks.length > 0
      ? validTracks.reduce((sum, t) => sum + (t.bpm_detected || 0), 0) / validTracks.length
      : 0

    const avgEnergy = validTracks.length > 0
      ? validTracks.reduce((sum, t) => sum + (t.energy || 0), 0) / validTracks.length
      : 0

    const usedKeys = validTracks
      .map(t => t.key_detected)
      .filter((k): k is string => k !== null)

    const usedArtists = [...new Set(validTracks.map(t => t.artist))]
    const usedTrackIds = soundcloudIds

    // Calculate remaining duration
    const avgPlaytime = set.avg_track_playtime || 70
    const currentDuration = validTracks.reduce(
      (sum, t) => sum + t.duration * (avgPlaytime / 100),
      0
    )
    const remainingDuration = (set.target_duration || 3600) - currentDuration

    const context: SuggestionContext = {
      genre: set.genre || '',
      targetDuration: set.target_duration || 3600,
      freeDownloadOnly: false,
      averageBpm: avgBpm,
      averageEnergy: avgEnergy,
      usedKeys,
      usedArtists,
      usedTrackIds,
      remainingDuration
    }

    const suggestions = await getSuggestions(context, count, offset)

    return { tracks: suggestions }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error
    }
    logger.db.error(`Failed to get suggestions for set ${setId}: ${error}`)
    throw createError({
      statusCode: 500,
      message: 'Failed to get suggestions'
    })
  }
})
