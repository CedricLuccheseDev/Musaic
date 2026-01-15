import { searchWithArtistDetection, getTrackById, resolveTrackUrl, searchExactTrack, type SearchResult } from '~/server/services/soundcloud'
import { upsertTracks, enrichTracksWithAnalysis } from '~/server/services/trackStorage'
import { generateSqlAndPhrase, type ClarificationOption } from '~/server/services/aiQuery'
import { mergeAndRankTracks, groupTracksBySource } from '~/server/services/hybridSearch'
import { createClient } from '@supabase/supabase-js'
import { type DbTrackWithAnalysis, dbTrackToTrackEntry, type TrackEntry } from '~/types'
import { logger } from '~/server/utils/logger'

// Query type detection
type QueryType = 'url' | 'track' | 'artist' | 'genre' | 'id'

interface QueryAnalysis {
  type: QueryType
  soundcloudUrl?: string
  artistName?: string
  trackTitle?: string
  soundcloudId?: number
}

function analyzeQuery(query: string): QueryAnalysis {
  const q = query.trim()

  // 1. Direct SoundCloud ID (format: "id:123456")
  const idMatch = q.match(/^id:(\d+)$/i)
  if (idMatch) {
    return { type: 'id', soundcloudId: parseInt(idMatch[1], 10) }
  }

  // 2. SoundCloud URL
  const urlMatch = q.match(/soundcloud\.com\/([^/]+)\/([^/?\s]+)/)
  if (urlMatch) {
    return {
      type: 'url',
      soundcloudUrl: q.includes('http') ? q : `https://${q}`,
      artistName: urlMatch[1],
      trackTitle: urlMatch[2]
    }
  }

  // 3. Format "Artiste - Titre" (with various dash types)
  const trackMatch = q.match(/^(.+?)\s*[-–—]\s*(.+)$/)
  if (trackMatch && trackMatch[1].length > 1 && trackMatch[2].length > 1) {
    return {
      type: 'track',
      artistName: trackMatch[1].trim(),
      trackTitle: trackMatch[2].trim()
    }
  }

  // 4. Default to genre/mood search (AI will decide)
  return { type: 'genre' }
}

interface CascadeSearchResult extends SearchResult {
  source: 'database' | 'soundcloud'
  response?: string
  artistSearchAttempted?: boolean
  artistSearchFailed?: boolean
  wantsDownload?: boolean
  // New: query type and adaptive results
  queryType?: QueryType
  mainTrack?: TrackEntry
  similarTracks?: TrackEntry[]
  artistTracks?: TrackEntry[]
  // New: clarification
  needsClarification?: boolean
  clarificationQuestion?: string
  clarificationOptions?: ClarificationOption[]
  // Hybrid search metadata
  hybridStats?: {
    dbCount: number
    scCount: number
    analyzedCount: number
    toAnalyzeCount: number
  }
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

  // Analyze query type
  const analysis = analyzeQuery(q)

  // Handle direct ID search
  if (analysis.type === 'id' && analysis.soundcloudId) {
    return await handleIdSearch(analysis.soundcloudId)
  }

  // Handle SoundCloud URL
  if (analysis.type === 'url' && analysis.soundcloudUrl) {
    return await handleUrlSearch(analysis.soundcloudUrl)
  }

  // Handle "Artist - Title" format
  if (analysis.type === 'track' && analysis.artistName && analysis.trackTitle) {
    return await handleTrackSearch(analysis.artistName, analysis.trackTitle)
  }

  // For pagination (offset > 0), skip AI query and go directly to SoundCloud
  if (offsetNum > 0) {
    return await searchSoundCloud(q, offsetNum)
  }

  // Default: AI-powered search (genre/mood/artist)
  return await handleAiSearch(q, offsetNum)
})

// Handler: Direct SoundCloud ID
async function handleIdSearch(soundcloudId: number): Promise<CascadeSearchResult> {
  logger.sc.search(`id:${soundcloudId}`, 1)

  const track = await getTrackById(soundcloudId)
  if (!track) {
    return { source: 'soundcloud', tracks: [], hasMore: false, queryType: 'id' }
  }

  const [enrichedTracks, similarTracks] = await Promise.all([
    enrichTracksWithAnalysis([track]),
    fetchSimilarTracks(soundcloudId)
  ])

  upsertTracks([track]).catch(err => {
    logger.db.error(err instanceof Error ? err.message : 'Failed to store track')
  })

  return {
    source: 'soundcloud',
    tracks: enrichedTracks,
    hasMore: false,
    queryType: 'id',
    mainTrack: enrichedTracks[0],
    similarTracks
  }
}

// Handler: SoundCloud URL resolution
async function handleUrlSearch(url: string): Promise<CascadeSearchResult> {
  logger.sc.search(`url:${url}`, 1)

  try {
    const track = await resolveTrackUrl(url)
    if (!track) {
      return { source: 'soundcloud', tracks: [], hasMore: false, queryType: 'url' }
    }

    const [enrichedTracks, similarTracks, artistTracks] = await Promise.all([
      enrichTracksWithAnalysis([track]),
      fetchSimilarTracks(track.id),
      fetchArtistTracks(track.artist)
    ])

    upsertTracks([track]).catch(err => {
      logger.db.error(err instanceof Error ? err.message : 'Failed to store track')
    })

    return {
      source: 'soundcloud',
      tracks: enrichedTracks,
      hasMore: false,
      queryType: 'url',
      mainTrack: enrichedTracks[0],
      similarTracks,
      artistTracks,
      response: `Track trouvée: ${track.title}`
    }
  } catch (err) {
    logger.sc.error(`URL resolution failed: ${err instanceof Error ? err.message : 'Unknown'}`)
    return { source: 'soundcloud', tracks: [], hasMore: false, queryType: 'url' }
  }
}

// Handler: "Artist - Title" format
async function handleTrackSearch(artistName: string, trackTitle: string): Promise<CascadeSearchResult> {
  logger.sc.search(`track:${artistName} - ${trackTitle}`, 1)

  try {
    const track = await searchExactTrack(artistName, trackTitle)
    if (!track) {
      // Fallback to regular search if exact match not found
      return await searchSoundCloud(`${artistName} ${trackTitle}`, 0)
    }

    const [enrichedTracks, similarTracks, artistTracks] = await Promise.all([
      enrichTracksWithAnalysis([track]),
      fetchSimilarTracks(track.id),
      fetchArtistTracks(artistName)
    ])

    upsertTracks([track]).catch(err => {
      logger.db.error(err instanceof Error ? err.message : 'Failed to store track')
    })

    return {
      source: 'soundcloud',
      tracks: enrichedTracks,
      hasMore: false,
      queryType: 'track',
      mainTrack: enrichedTracks[0],
      similarTracks,
      artistTracks,
      response: `"${trackTitle}" de ${artistName}`
    }
  } catch (err) {
    logger.sc.error(`Track search failed: ${err instanceof Error ? err.message : 'Unknown'}`)
    return await searchSoundCloud(`${artistName} ${trackTitle}`, 0)
  }
}

// Handler: AI-powered hybrid search (DB + SoundCloud)
async function handleAiSearch(query: string, offset: number): Promise<CascadeSearchResult> {
  let aiResult
  try {
    aiResult = await generateSqlAndPhrase(query)
    logger.ai.query(query)
    if (aiResult.sql) logger.ai.sql(aiResult.sql)
  } catch (err) {
    logger.ai.error(err instanceof Error ? err.message : 'AI query generation failed')
    return await searchSoundCloud(query, offset)
  }

  // Handle clarification needed
  if (aiResult.needsClarification) {
    return {
      source: 'database',
      tracks: [],
      hasMore: false,
      queryType: 'genre',
      needsClarification: true,
      clarificationQuestion: aiResult.clarificationQuestion,
      clarificationOptions: aiResult.clarificationOptions
    }
  }

  // HYBRID SEARCH: Execute DB + SoundCloud in parallel
  const [dbTracksResult, scResult] = await Promise.allSettled([
    executeDbQuery(aiResult.sql),
    searchWithArtistDetection(
      aiResult.soundcloudQuery,
      50, // Fetch MORE tracks to maximize quality options for merge
      0,
      aiResult.soundcloudFilters
    )
  ])

  // Extract results
  const dbTracks = dbTracksResult.status === 'fulfilled' ? dbTracksResult.value : []
  const scTracks = scResult.status === 'fulfilled' ? scResult.value.tracks : []

  // Merge and rank (limit 20 for initial load)
  const mergedTracks = mergeAndRankTracks(dbTracks, scTracks, {
    wantsDownload: aiResult.wantsDownload,
    limit: 20
  })

  // Analytics logging
  const stats = groupTracksBySource(mergedTracks)
  logger.ai.result(
    mergedTracks.length,
    `${aiResult.phrase} (DB: ${stats.counts.database}, SC: ${stats.counts.soundcloud}, analyzed: ${stats.counts.analyzed})`
  )

  // If no results from both sources, try SoundCloud with relaxed query
  if (mergedTracks.length === 0) {
    logger.ai.result(0, 'No hybrid results, trying relaxed SoundCloud search')
    return await searchSoundCloud(
      aiResult.soundcloudQuery,
      offset,
      undefined, // No filters to maximize results
      aiResult.phrase,
      aiResult.wantsDownload
    )
  }

  // Auto-analyze new tracks that meet quality criteria (non-blocking)
  const tracksToAnalyze = mergedTracks
    .filter(t => t.shouldAnalyze && t.source === 'soundcloud')
    .map(t => ({ ...t } as TrackEntry)) // Remove extra fields for upsert

  if (tracksToAnalyze.length > 0) {
    upsertTracks(tracksToAnalyze).catch(err => {
      logger.db.error(`Failed to store ${tracksToAnalyze.length} tracks: ${err instanceof Error ? err.message : 'Unknown'}`)
    })
  }

  // Return unified results
  return {
    source: 'database', // Hybrid source
    tracks: mergedTracks as TrackEntry[], // Cast back to TrackEntry for compatibility
    response: aiResult.phrase,
    hasMore: true, // Always enable pagination for more SoundCloud results
    wantsDownload: aiResult.wantsDownload,
    queryType: 'genre',
    hybridStats: {
      dbCount: stats.counts.database,
      scCount: stats.counts.soundcloud,
      analyzedCount: stats.counts.analyzed,
      toAnalyzeCount: stats.counts.toAnalyze
    }
  }
}

// Helper: Fetch similar tracks from database
async function fetchSimilarTracks(trackId: number): Promise<TrackEntry[]> {
  const config = useRuntimeConfig()
  const supabaseUrl = config.supabaseUrl as string
  const supabaseKey = config.supabaseKey as string

  if (!supabaseUrl || !supabaseKey) return []

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase.rpc('find_similar_tracks', {
      source_track_id: trackId,
      limit_count: 10
    })

    if (error || !data) return []
    return data.map((row: DbTrackWithAnalysis) => dbTrackToTrackEntry(row))
  } catch {
    return []
  }
}

// Helper: Fetch artist tracks from database
async function fetchArtistTracks(artistName: string): Promise<TrackEntry[]> {
  const config = useRuntimeConfig()
  const supabaseUrl = config.supabaseUrl as string
  const supabaseKey = config.supabaseKey as string

  if (!supabaseUrl || !supabaseKey) return []

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .ilike('artist', `%${artistName}%`)
      .order('playback_count', { ascending: false })
      .limit(10)

    if (error || !data) return []
    return data.map((row: DbTrackWithAnalysis) => dbTrackToTrackEntry(row))
  } catch {
    return []
  }
}

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
  aiPhrase?: string,
  wantsDownload?: boolean
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
    response: aiPhrase,
    artistSearchAttempted: result.artistSearchAttempted,
    artistSearchFailed: result.artistSearchFailed,
    wantsDownload
  }
}
