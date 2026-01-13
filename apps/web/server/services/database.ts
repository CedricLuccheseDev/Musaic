/**
 * Centralized database service functions
 * Provides reusable query methods to avoid code duplication across API routes
 */

import { type DbTrack, dbTrackToTrackEntry } from '~/types'
import { getSupabaseClient, getSupabaseAdminClient } from '~/server/utils/supabase'
import { logger } from '~/server/utils/logger'

export interface GenreWithCount {
  name: string
  count: number
}

export interface IssueData {
  email: string
  subject: string
  message: string
  user_agent?: string | null
  url?: string | null
}

export interface DashboardStats {
  totalTracks: number
  analyzedTracks: number
  pendingTracks: number
  failedTracks: number
  avgBpm?: number
  topGenres: GenreWithCount[]
}

/**
 * Get popular genres with counts
 * @param limit Maximum number of genres to return (capped at 20)
 * @returns Array of genres with their occurrence counts
 */
export async function getTopGenres(limit = 8): Promise<GenreWithCount[]> {
  const supabase = getSupabaseClient()
  const cappedLimit = Math.min(limit, 20)

  // Fetch genres
  const { data: genreData, error } = await supabase
    .from('tracks')
    .select('genre')
    .not('genre', 'is', null)
    .limit(2000)

  if (error) {
    logger.db.error(`Failed to fetch genres: ${error.message}`)
    return []
  }

  if (!genreData || genreData.length === 0) {
    return []
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
  return Object.values(genreCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, cappedLimit)
    .map(({ displayName, count }) => ({ name: displayName, count }))
}

/**
 * Get similar tracks using pgvector similarity search
 * @param trackId Soundcloud ID of the source track
 * @param limit Maximum number of similar tracks to return (capped at 50)
 * @returns Array of similar tracks with similarity percentage
 */
export async function getSimilarTracks(
  trackId: number,
  limit = 10
): Promise<Array<ReturnType<typeof dbTrackToTrackEntry> & { similarity: number }>> {
  const supabase = getSupabaseClient()
  const cappedLimit = Math.min(Math.max(limit, 1), 50)

  const { data, error } = await supabase.rpc('find_similar_tracks', {
    source_track_id: trackId,
    limit_count: cappedLimit
  })

  if (error) {
    logger.db.error(`Failed to find similar tracks for ${trackId}: ${error.message}`)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  return (data as (DbTrack & { distance: number })[]).map(row => ({
    ...dbTrackToTrackEntry(row),
    similarity: Math.round((1 - row.distance) * 100)
  }))
}

/**
 * Search tracks by artist name (case-insensitive, partial match)
 * @param artistName Artist name to search for
 * @param limit Maximum number of tracks to return
 * @returns Array of matching tracks
 */
export async function searchTracksByArtist(artistName: string, limit = 50): Promise<ReturnType<typeof dbTrackToTrackEntry>[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .ilike('artist', `%${artistName}%`)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.db.error(`Failed to search tracks by artist "${artistName}": ${error.message}`)
    return []
  }

  if (!data) return []

  return data.map(track => dbTrackToTrackEntry(track as DbTrack))
}

/**
 * Save a bug report/issue to the database
 * @param issue Issue data to save
 * @returns Success status
 */
export async function saveIssue(issue: IssueData): Promise<boolean> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('issues')
    .insert({
      email: issue.email,
      subject: issue.subject,
      message: issue.message,
      user_agent: issue.user_agent || null,
      url: issue.url || null
    })

  if (error) {
    logger.db.error(`Failed to save issue: ${error.message}`)
    return false
  }

  return true
}

/**
 * Get dashboard statistics (admin only - uses service key)
 * @returns Dashboard statistics object
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabaseAdminClient()

  // Get track counts by analysis status
  const { data: statusData, error: statusError } = await supabase
    .from('tracks')
    .select('analysis_status')

  if (statusError) {
    logger.db.error(`Failed to fetch dashboard stats: ${statusError.message}`)
    return {
      totalTracks: 0,
      analyzedTracks: 0,
      pendingTracks: 0,
      failedTracks: 0,
      topGenres: []
    }
  }

  const totalTracks = statusData?.length || 0
  const analyzedTracks = statusData?.filter(t => t.analysis_status === 'completed').length || 0
  const pendingTracks = statusData?.filter(t => t.analysis_status === 'pending').length || 0
  const failedTracks = statusData?.filter(t => t.analysis_status === 'failed').length || 0

  // Get average BPM (only from analyzed tracks)
  const { data: bpmData } = await supabase
    .from('tracks')
    .select('bpm_detected')
    .eq('analysis_status', 'completed')
    .not('bpm_detected', 'is', null)

  const avgBpm = bpmData && bpmData.length > 0
    ? bpmData.reduce((sum, t) => sum + (t.bpm_detected || 0), 0) / bpmData.length
    : undefined

  // Get top genres
  const topGenres = await getTopGenres(10)

  return {
    totalTracks,
    analyzedTracks,
    pendingTracks,
    failedTracks,
    avgBpm: avgBpm ? Math.round(avgBpm) : undefined,
    topGenres
  }
}

/**
 * Execute a raw SQL query (admin only - for AI query feature)
 * @param sql SQL query to execute (must be SELECT only)
 * @returns Query results
 */
export async function executeRawQuery(sql: string): Promise<unknown[]> {
  const supabase = getSupabaseAdminClient()

  const { data, error } = await supabase.rpc('exec', { query: sql })

  if (error) {
    logger.db.error(`Failed to execute raw query: ${error.message}`)
    throw new Error(error.message)
  }

  return data || []
}
