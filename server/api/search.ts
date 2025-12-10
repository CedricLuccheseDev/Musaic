import type { TrackEntry } from '~/types/track'
import { searchTracks } from '~/server/services/soundcloud'

export default defineEventHandler(async (event): Promise<TrackEntry[]> => {
  const { q } = getQuery(event)

  if (!q || typeof q !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Missing search query'
    })
  }

  return searchTracks(q)
})
