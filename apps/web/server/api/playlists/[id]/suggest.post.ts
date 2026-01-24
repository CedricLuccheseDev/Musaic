import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '~/server/utils/auth'
import { generateSqlAndPhrase } from '~/server/services/aiQuery'

interface SuggestBody {
  query: string
}

interface TrackRow {
  soundcloud_id: number
  title: string
  artist: string
  artwork: string | null
  duration: number
  genre: string | null
  bpm_detected: number | null
  key_detected: string | null
  energy: number | null
  download_status: string
  permalink_url: string | null
}

interface FeedbackRow {
  soundcloud_id: number
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const playlistId = getRouterParam(event, 'id')
  if (!playlistId) {
    throw createError({ statusCode: 400, message: 'Playlist ID required' })
  }

  const body = await readBody<SuggestBody>(event)
  if (!body.query?.trim()) {
    throw createError({ statusCode: 400, message: 'Query required' })
  }

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.supabaseUrl as string,
    config.supabaseKey as string
  )

  // Check quota
  const today = new Date().toISOString().split('T')[0]
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium, daily_search_count, last_search_date')
    .eq('id', user.id)
    .single()

  const isPremium = profile?.is_premium || false
  const lastSearchDate = profile?.last_search_date
  const currentCount = lastSearchDate === today ? (profile?.daily_search_count || 0) : 0

  // Free users have 5 searches per day
  if (!isPremium && currentCount >= 5) {
    throw createError({ statusCode: 429, message: 'Daily quota exceeded' })
  }

  // Increment quota
  await supabase
    .from('profiles')
    .update({
      daily_search_count: currentCount + 1,
      last_search_date: today
    })
    .eq('id', user.id)

  // Verify playlist ownership
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('id, style, target_duration')
    .eq('id', playlistId)
    .eq('user_id', user.id)
    .single()

  if (playlistError || !playlist) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }

  // Get already seen tracks (liked + skipped)
  const { data: feedback } = await supabase
    .from('playlist_feedback')
    .select('soundcloud_id')
    .eq('playlist_id', playlistId)

  const seenIds = ((feedback || []) as FeedbackRow[]).map(f => f.soundcloud_id)

  // Get playlist tracks for context
  const { data: playlistTracks } = await supabase
    .from('playlist_tracks')
    .select('tracks(bpm_detected, key_detected, genre, energy)')
    .eq('playlist_id', playlistId)
    .limit(5)

  // Build context for AI
  type TrackContext = { bpm_detected: number | null; key_detected: string | null; genre: string | null; energy: number | null }
  const contextTracks: TrackContext[] = []
  for (const pt of playlistTracks || []) {
    const trackData = pt.tracks as unknown as TrackContext | TrackContext[] | null
    const track = Array.isArray(trackData) ? trackData[0] : trackData
    if (track) {
      contextTracks.push(track)
    }
  }

  let contextInfo = ''
  if (contextTracks.length > 0) {
    const avgBpm = contextTracks.reduce((acc, t) => acc + (t.bpm_detected || 0), 0) / contextTracks.length
    const genres = [...new Set(contextTracks.map(t => t.genre).filter(Boolean))]
    contextInfo = `Current playlist context: ~${Math.round(avgBpm)} BPM, genres: ${genres.join(', ')}`
  }

  // Generate AI query with context
  const enhancedQuery = contextInfo
    ? `${body.query}. ${contextInfo}`
    : body.query

  const aiResult = await generateSqlAndPhrase(enhancedQuery)

  if (!aiResult.sql) {
    throw createError({ statusCode: 500, message: 'AI query failed' })
  }

  // Modify query to exclude seen tracks
  let sqlQuery = aiResult.sql
  if (seenIds.length > 0) {
    const excludeClause = `soundcloud_id NOT IN (${seenIds.join(',')})`
    if (sqlQuery.toLowerCase().includes('where')) {
      sqlQuery = sqlQuery.replace(/where/i, `WHERE ${excludeClause} AND`)
    } else if (sqlQuery.toLowerCase().includes('order by')) {
      sqlQuery = sqlQuery.replace(/order by/i, `WHERE ${excludeClause} ORDER BY`)
    }
  }

  // Execute query
  const { data: tracks, error: queryError } = await supabase.rpc('exec', {
    query: sqlQuery
  })

  if (queryError) {
    throw createError({ statusCode: 500, message: queryError.message })
  }

  return {
    tracks: (tracks || []) as TrackRow[],
    sql: sqlQuery,
    reasoning: aiResult.phrase
  }
})
