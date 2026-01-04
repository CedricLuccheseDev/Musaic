import { searchWithArtistDetection, type SearchResult } from '~/server/services/soundcloud'
import { upsertTracks, enrichTracksWithAnalysis } from '~/server/services/trackStorage'
import { generateSqlAndPhrase } from '~/server/services/aiQuery'
import { createClient } from '@supabase/supabase-js'
import { type DbTrackWithAnalysis, dbTrackToTrackEntry } from '~/types'
import { logger } from '~/server/utils/logger'

interface CascadeSearchResult extends SearchResult {
  source: 'database' | 'soundcloud'
  response?: string
}

export default defineEventHandler(async (event): Promise<CascadeSearchResult> => {
  const { q, offset } = getQuery(event)

  if (!q || typeof q !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Missing search query'
    })
  }

  const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0

  // For pagination (offset > 0), skip AI query and go directly to SoundCloud
  if (offsetNum > 0) {
    return await searchSoundCloud(q, offsetNum)
  }

  // Step 1: Generate AI query (SQL + SoundCloud query + filters)
  let aiResult
  try {
    aiResult = await generateSqlAndPhrase(q)
    logger.ai.query(q)
    logger.ai.sql(aiResult.sql)
  } catch (err) {
    logger.ai.error(err instanceof Error ? err.message : 'AI query generation failed')
    // Fallback to SoundCloud on AI error
    return await searchSoundCloud(q, offsetNum)
  }

  // Step 2: Try database search first
  const dbResults = await executeDbQuery(aiResult.sql)

  if (dbResults.length > 0) {
    logger.ai.result(dbResults.length, aiResult.phrase)
    return {
      source: 'database',
      tracks: dbResults,
      response: aiResult.phrase,
      hasMore: false
    }
  }

  // Step 3: Fallback to SoundCloud with AI-optimized query and filters
  logger.ai.result(0, 'No DB results, falling back to SoundCloud')
  return await searchSoundCloud(
    aiResult.soundcloudQuery,
    offsetNum,
    aiResult.soundcloudFilters,
    aiResult.phrase
  )
})

// Helper: Execute SQL query on database
async function executeDbQuery(sql: string): Promise<ReturnType<typeof dbTrackToTrackEntry>[]> {
  const cleanSql = sql.trim().replace(/;+$/, '')
  const sqlLower = cleanSql.toLowerCase()

  // Security check
  const forbidden = ['drop', 'delete', 'update', 'insert', 'alter', 'truncate', 'create']
  if (forbidden.some(word => sqlLower.includes(word)) || !sqlLower.startsWith('select')) {
    return []
  }

  const config = useRuntimeConfig()
  const supabaseUrl = config.supabaseUrl as string
  const supabaseKey = config.supabaseKey as string

  if (!supabaseUrl || !supabaseKey) {
    return []
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase.rpc('exec', { query: cleanSql })

    if (error) {
      logger.ai.error(error.message)
      return []
    }

    return (data || []).map((row: DbTrackWithAnalysis) => dbTrackToTrackEntry(row))
  } catch {
    return []
  }
}

// Helper: Search SoundCloud with optional filters
async function searchSoundCloud(
  query: string,
  offset: number,
  filters?: { genres?: string; bpm?: { from: number; to: number } },
  aiPhrase?: string
): Promise<CascadeSearchResult> {
  let result: SearchResult
  try {
    result = await searchWithArtistDetection(query, 25, offset, filters)
    logger.sc.search(query, result.tracks.length)
  } catch (err) {
    logger.sc.error(err instanceof Error ? err.message : 'Unknown error')
    throw createError({
      statusCode: 500,
      message: `SoundCloud API error: ${err instanceof Error ? err.message : 'Unknown error'}`
    })
  }

  // Collect all tracks for enrichment and storage
  const allTracks = [...result.tracks, ...(result.artist?.tracks || [])]

  // Enrich tracks with analysis data from Supabase (BPM, key, etc.)
  const [enrichedTracks, enrichedArtistTracks] = await Promise.all([
    enrichTracksWithAnalysis(result.tracks),
    result.artist?.tracks ? enrichTracksWithAnalysis(result.artist.tracks) : Promise.resolve([])
  ])

  // Store tracks in database (non-blocking, with quality filter)
  upsertTracks(allTracks).catch(err => {
    logger.db.error(err instanceof Error ? err.message : 'Failed to store tracks')
  })

  return {
    source: 'soundcloud',
    ...result,
    tracks: enrichedTracks,
    artist: result.artist ? { ...result.artist, tracks: enrichedArtistTracks } : undefined,
    response: aiPhrase
  }
}
