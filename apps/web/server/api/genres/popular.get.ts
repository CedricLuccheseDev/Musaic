import { getTopGenres } from '~/server/services/database'

export default defineEventHandler(async (event) => {
  // Get limit from query params (default 8, max 20)
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 8, 20)

  const genres = await getTopGenres(limit)

  return { genres }
})
