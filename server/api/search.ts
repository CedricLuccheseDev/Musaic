import { searchWithArtistDetection, type SearchResult } from '~/server/services/soundcloud'
import { upsertTracks } from '~/server/services/trackStorage'

export default defineEventHandler(async (event): Promise<SearchResult> => {
  const { q, offset } = getQuery(event)

  if (!q || typeof q !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Missing search query'
    })
  }

  const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0
  const result = await searchWithArtistDetection(q, 25, offsetNum)

  // Store tracks in database (non-blocking)
  const allTracks = [...result.tracks, ...(result.artist?.tracks || [])]

  upsertTracks(allTracks).catch(err => {
    console.error('[Search API] Failed to store tracks:', err)
  })

  return result
})
