/**
 * GET /api/tracks/search - Search tracks by title or artist
 * Query params: q (query), genre (optional), limit (optional, max 20)
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'
import type { TrackEntry } from '~/types'
import { dbTrackToTrackEntry } from '~/types'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchTerm = (query.q as string)?.trim()
  const genre = query.genre as string | undefined
  const limit = Math.min(Number(query.limit) || 10, 20)

  if (!searchTerm || searchTerm.length < 2) {
    return { tracks: [] }
  }

  const supabase = getSupabaseAdminClient()

  // Build query
  let dbQuery = supabase
    .from('tracks')
    .select('*')
    .eq('analysis_status', 'completed')
    .or(`title.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%`)
    .order('playback_count', { ascending: false })
    .limit(limit)

  if (genre) {
    dbQuery = dbQuery.ilike('genre', `%${genre}%`)
  }

  const { data: tracks, error } = await dbQuery

  if (error) {
    console.error('[search] Error:', error)
    return { tracks: [] }
  }

  const results: TrackEntry[] = (tracks || []).map(dbTrackToTrackEntry)

  return { tracks: results }
})
