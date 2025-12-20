import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.supabaseUrl as string
  // Use service key to bypass RLS for admin stats
  const supabaseKey = (config.supabaseServiceKey || config.supabaseKey) as string

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Database not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Fetch all stats in parallel
  const [
    tracksCount,
    analyzedCount,
    pendingCount,
    failedCount,
    usersCount,
    premiumCount,
    genreStats,
    recentTracks,
    failedTracks
  ] = await Promise.all([
    // Total tracks
    supabase.from('tracks').select('*', { count: 'exact', head: true }),
    // Analyzed tracks
    supabase.from('tracks').select('*', { count: 'exact', head: true }).eq('analysis_status', 'completed'),
    // Pending analysis
    supabase.from('tracks').select('*', { count: 'exact', head: true }).is('analysis_status', null),
    // Failed analysis
    supabase.from('tracks').select('*', { count: 'exact', head: true }).eq('analysis_status', 'failed'),
    // Total users
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    // Premium users
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true),
    // Genre distribution (top 10)
    supabase.from('tracks').select('genre').not('genre', 'is', null).limit(1000),
    // Recent tracks (last 10)
    supabase.from('tracks').select('title, artist, genre, created_at, analysis_status').order('created_at', { ascending: false }).limit(10),
    // Failed tracks with error details
    supabase.from('tracks').select('soundcloud_id, title, artist, analysis_error').eq('analysis_status', 'failed').limit(50)
  ])

  // Process genre stats
  const genreCounts: Record<string, number> = {}
  if (genreStats.data) {
    for (const track of genreStats.data) {
      const genre = track.genre || 'Unknown'
      genreCounts[genre] = (genreCounts[genre] || 0) + 1
    }
  }
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  return {
    tracks: {
      total: tracksCount.count || 0,
      analyzed: analyzedCount.count || 0,
      pending: pendingCount.count || 0,
      failed: failedCount.count || 0
    },
    users: {
      total: usersCount.count || 0,
      premium: premiumCount.count || 0
    },
    genres: topGenres,
    recentTracks: recentTracks.data || [],
    failedTracks: failedTracks.data || []
  }
})
