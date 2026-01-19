/**
 * GET /api/sets - List user's sets
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'
import { logger } from '~/server/utils/logger'
import type { DbSet, DbSetTrack, SetListItem, SetStatus } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const supabase = getSupabaseAdminClient()

  try {
    // Get user's sets
    const { data: sets, error: setsError } = await supabase
      .from('sets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (setsError) {
      throw new Error(setsError.message)
    }

    if (!sets || sets.length === 0) {
      return { sets: [] }
    }

    // Get all set tracks
    const setIds = sets.map(s => s.id)
    const { data: allTracks, error: tracksError } = await supabase
      .from('set_tracks')
      .select('*')
      .in('set_id', setIds)
      .order('position', { ascending: true })

    if (tracksError) {
      throw new Error(tracksError.message)
    }

    // Get track details for artworks and duration
    const soundcloudIds = [...new Set((allTracks || []).map(t => t.soundcloud_id))]

    let trackDetails: Map<number, { artwork: string | null; duration: number }> = new Map()

    if (soundcloudIds.length > 0) {
      const { data: tracks } = await supabase
        .from('tracks')
        .select('soundcloud_id, artwork, duration')
        .in('soundcloud_id', soundcloudIds)

      if (tracks) {
        trackDetails = new Map(tracks.map(t => [t.soundcloud_id, { artwork: t.artwork, duration: t.duration }]))
      }
    }

    // Build response
    const setList: SetListItem[] = sets.map((dbSet: DbSet) => {
      const setTracks = (allTracks || []).filter((t: DbSetTrack) => t.set_id === dbSet.id)
      const avgPlaytime = dbSet.avg_track_playtime || 70

      // Get first 4 artworks
      const artworks: (string | null)[] = []
      for (const st of setTracks.slice(0, 4)) {
        const track = trackDetails.get(st.soundcloud_id)
        artworks.push(track?.artwork || null)
      }

      // Calculate total effective duration
      let totalDuration = 0
      for (const st of setTracks) {
        const track = trackDetails.get(st.soundcloud_id)
        if (track) {
          totalDuration += track.duration * (avgPlaytime / 100)
        }
      }

      return {
        id: dbSet.id,
        name: dbSet.name,
        genre: dbSet.genre,
        trackCount: setTracks.length,
        totalDuration: Math.round(totalDuration),
        status: (dbSet.status || 'draft') as SetStatus,
        createdAt: new Date(dbSet.created_at || Date.now()),
        updatedAt: new Date(dbSet.updated_at || Date.now()),
        artworks
      }
    })

    return { sets: setList }
  } catch (error) {
    logger.db.error(`Failed to list sets for user ${user.id}: ${error}`)
    throw createError({
      statusCode: 500,
      message: 'Failed to list sets'
    })
  }
})
