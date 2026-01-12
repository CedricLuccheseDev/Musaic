import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.supabaseUrl as string
  const supabaseKey = (config.supabaseServiceKey || config.supabaseKey) as string

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Database not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get limit from query params (default 8)
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 8, 20)

  // Fetch genres with count
  const { data: genreData } = await supabase
    .from('tracks')
    .select('genre')
    .not('genre', 'is', null)
    .limit(2000)

  if (!genreData) {
    return { genres: [] }
  }

  // Count genres with normalization (lowercase for grouping, keep best display name)
  const genreCounts: Record<string, { count: number; displayName: string }> = {}
  for (const track of genreData) {
    const genre = track.genre?.trim()
    if (!genre) continue

    // Normalize: lowercase, trim, collapse spaces
    const normalized = genre.toLowerCase().replace(/\s+/g, ' ')

    if (genreCounts[normalized]) {
      genreCounts[normalized].count++
      // Keep the version with better capitalization (more uppercase = likely better formatted)
      const currentUpperCount = (genreCounts[normalized].displayName.match(/[A-Z]/g) || []).length
      const newUpperCount = (genre.match(/[A-Z]/g) || []).length
      if (newUpperCount > currentUpperCount) {
        genreCounts[normalized].displayName = genre
      }
    } else {
      genreCounts[normalized] = { count: 1, displayName: genre }
    }
  }

  // Sort by count and return top genres
  const topGenres = Object.values(genreCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ displayName, count }) => ({ name: displayName, count }))

  return { genres: topGenres }
})
