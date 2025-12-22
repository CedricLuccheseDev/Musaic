import { createClient } from '@supabase/supabase-js'
import { type DbTrack, dbTrackToTrackEntry } from '~/types'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50)

  if (!id || isNaN(Number(id))) {
    throw createError({
      statusCode: 400,
      message: 'Invalid track ID'
    })
  }

  const config = useRuntimeConfig()
  const supabaseUrl = config.supabaseUrl as string
  const supabaseKey = config.supabaseKey as string

  if (!supabaseUrl || !supabaseKey) {
    throw createError({
      statusCode: 500,
      message: 'Supabase not configured'
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.rpc('find_similar_tracks', {
    source_track_id: Number(id),
    limit_count: limit
  })

  if (error) {
    console.error('Similar tracks error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to find similar tracks'
    })
  }

  if (!data || data.length === 0) {
    return { tracks: [], message: 'No similar tracks found' }
  }

  const tracks = (data as (DbTrack & { distance: number })[]).map((row) => ({
    ...dbTrackToTrackEntry(row),
    similarity: Math.round((1 - row.distance) * 100)
  }))

  return { tracks }
})
