import { getSimilarTracks } from '~/server/services/database'
import { logger } from '~/server/utils/logger'

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

  try {
    const tracks = await getSimilarTracks(Number(id), limit)

    if (tracks.length === 0) {
      return { tracks: [], message: 'No similar tracks found' }
    }

    return { tracks }
  } catch (error) {
    logger.db.error(`Failed to get similar tracks for ${id}: ${error}`)
    throw createError({
      statusCode: 500,
      message: 'Failed to find similar tracks'
    })
  }
})
