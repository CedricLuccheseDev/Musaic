import { searchWithArtistDetection, type SearchResult } from '~/server/services/soundcloud'
import { upsertTracks, enrichTracksWithAnalysis } from '~/server/services/trackStorage'
import { logger } from '~/server/utils/logger'

export default defineEventHandler(async (event): Promise<SearchResult> => {
  const { q, offset } = getQuery(event)

  if (!q || typeof q !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Missing search query'
    })
  }

  const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0

  let result: SearchResult
  try {
    result = await searchWithArtistDetection(q, 25, offsetNum)
    logger.sc.search(q, result.tracks.length)
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

  // Store tracks in database (non-blocking)
  upsertTracks(allTracks).catch(err => {
    logger.db.error(err instanceof Error ? err.message : 'Failed to store tracks')
  })

  return {
    ...result,
    tracks: enrichedTracks,
    artist: result.artist ? { ...result.artist, tracks: enrichedArtistTracks } : undefined
  }
})
