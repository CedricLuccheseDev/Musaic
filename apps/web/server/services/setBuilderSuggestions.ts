/**
 * Set Builder Suggestions Service
 * V1: SQL-based scoring algorithm (no AI)
 */

import { getSupabaseClient } from '~/server/utils/supabase'
import { dbTrackToTrackEntry, type DbTrack, type TrackEntry, type SuggestionContext, type ScoredTrack } from '~/types'

// Camelot wheel for harmonic mixing
const CAMELOT_WHEEL: Record<string, string[]> = {
  // Minor keys
  '1A': ['1A', '12A', '2A', '1B'],
  '2A': ['2A', '1A', '3A', '2B'],
  '3A': ['3A', '2A', '4A', '3B'],
  '4A': ['4A', '3A', '5A', '4B'],
  '5A': ['5A', '4A', '6A', '5B'],
  '6A': ['6A', '5A', '7A', '6B'],
  '7A': ['7A', '6A', '8A', '7B'],
  '8A': ['8A', '7A', '9A', '8B'],
  '9A': ['9A', '8A', '10A', '9B'],
  '10A': ['10A', '9A', '11A', '10B'],
  '11A': ['11A', '10A', '12A', '11B'],
  '12A': ['12A', '11A', '1A', '12B'],
  // Major keys
  '1B': ['1B', '12B', '2B', '1A'],
  '2B': ['2B', '1B', '3B', '2A'],
  '3B': ['3B', '2B', '4B', '3A'],
  '4B': ['4B', '3B', '5B', '4A'],
  '5B': ['5B', '4B', '6B', '5A'],
  '6B': ['6B', '5B', '7B', '6A'],
  '7B': ['7B', '6B', '8B', '7A'],
  '8B': ['8B', '7B', '9B', '8A'],
  '9B': ['9B', '8B', '10B', '9A'],
  '10B': ['10B', '9B', '11B', '10A'],
  '11B': ['11B', '10B', '12B', '11A'],
  '12B': ['12B', '11B', '1B', '12A']
}

// Convert standard key notation to Camelot
const KEY_TO_CAMELOT: Record<string, string> = {
  'Ab minor': '1A', 'G# minor': '1A',
  'Eb minor': '2A', 'D# minor': '2A',
  'Bb minor': '3A', 'A# minor': '3A',
  'F minor': '4A',
  'C minor': '5A',
  'G minor': '6A',
  'D minor': '7A',
  'A minor': '8A',
  'E minor': '9A',
  'B minor': '10A',
  'F# minor': '11A', 'Gb minor': '11A',
  'Db minor': '12A', 'C# minor': '12A',
  'B major': '1B', 'Cb major': '1B',
  'F# major': '2B', 'Gb major': '2B',
  'Db major': '3B', 'C# major': '3B',
  'Ab major': '4B', 'G# major': '4B',
  'Eb major': '5B', 'D# major': '5B',
  'Bb major': '6B', 'A# major': '6B',
  'F major': '7B',
  'C major': '8B',
  'G major': '9B',
  'D major': '10B',
  'A major': '11B',
  'E major': '12B'
}

/**
 * Convert a key string to Camelot notation
 */
function toCamelot(key: string | null): string | null {
  if (!key) return null
  // Already in Camelot format
  if (/^\d{1,2}[AB]$/.test(key)) return key
  return KEY_TO_CAMELOT[key] || null
}

/**
 * Get compatible Camelot keys for a given set of keys
 */
function getCompatibleKeys(usedKeys: string[]): string[] {
  const camelotKeys = usedKeys.map(toCamelot).filter((k): k is string => k !== null)
  const compatibleSet = new Set<string>()

  for (const key of camelotKeys) {
    const compatible = CAMELOT_WHEEL[key]
    if (compatible) {
      compatible.forEach(k => compatibleSet.add(k))
    }
  }

  return Array.from(compatibleSet)
}

/**
 * Calculate similarity score for a track
 */
function calculateSimilarityScore(
  track: DbTrack,
  context: SuggestionContext
): number {
  let score = 0

  // BPM match (30%)
  if (track.bpm_detected && context.averageBpm > 0) {
    const bpmDiff = Math.abs(track.bpm_detected - context.averageBpm)
    const bpmScore = Math.max(0, 1 - bpmDiff / 10)
    score += bpmScore * 0.3
  }

  // Key match (25%)
  const trackCamelot = toCamelot(track.key_detected)
  if (trackCamelot) {
    const compatibleKeys = getCompatibleKeys(context.usedKeys)
    if (compatibleKeys.includes(trackCamelot)) {
      score += 0.25
    }
  }

  // Energy match (20%)
  if (track.energy !== null && context.averageEnergy > 0) {
    const energyDiff = Math.abs(track.energy - context.averageEnergy)
    const energyScore = Math.max(0, 1 - energyDiff / 0.3)
    score += energyScore * 0.2
  }

  // Genre match (15%) - already filtered by query
  score += 0.15

  // Popularity (10%)
  const playbackScore = Math.min((track.playback_count || 0) / 1000000, 1)
  score += playbackScore * 0.1

  return score
}

/**
 * Get suggestions for a set
 */
export async function getSuggestions(
  context: SuggestionContext,
  count: number = 6,
  offset: number = 0
): Promise<ScoredTrack[]> {
  const supabase = getSupabaseClient()

  // Build the query
  let query = supabase
    .from('tracks')
    .select('*')
    .eq('analysis_status', 'completed')
    .not('soundcloud_id', 'in', `(${context.usedTrackIds.join(',') || 0})`)
    // Only suggest downloadable tracks (free or purchasable)
    .neq('download_status', 'No')

  // Genre filter
  if (context.genre) {
    query = query.ilike('genre', `%${context.genre}%`)
  }

  // BPM filter (if we have average)
  if (context.averageBpm > 0) {
    query = query
      .gte('bpm_detected', context.averageBpm - 10)
      .lte('bpm_detected', context.averageBpm + 10)
  }

  // Free download only filter (stricter than just downloadable)
  if (context.freeDownloadOnly) {
    query = query.in('download_status', ['FreeDirectLink', 'FreeExternalLink'])
  }

  // Exclude artists already in set
  if (context.usedArtists.length > 0) {
    // Supabase doesn't support NOT IN for text easily, we'll filter client-side
  }

  // Get more tracks than needed for filtering and use offset for refresh
  const { data: tracks, error } = await query
    .order('playback_count', { ascending: false })
    .range(offset, offset + 99)

  if (error || !tracks) {
    return []
  }

  // Filter out used artists and calculate scores
  const scoredTracks: ScoredTrack[] = (tracks as DbTrack[])
    .filter(t => !context.usedArtists.some(a =>
      t.artist.toLowerCase().includes(a.toLowerCase())
    ))
    .map(t => ({
      ...dbTrackToTrackEntry(t),
      similarityScore: calculateSimilarityScore(t, context)
    }))

  // Shuffle tracks with similar scores to add variety on refresh
  const shuffledTracks = scoredTracks
    .map(t => ({ ...t, sortKey: t.similarityScore + Math.random() * 0.1 }))
    .sort((a, b) => b.sortKey - a.sortKey)

  // Split into safe and discovery
  const safeCount = Math.ceil(count * 0.6) // 60% safe (4 out of 6)
  const discoveryCount = count - safeCount // 40% discovery (2 out of 6)

  const safeTracks = shuffledTracks
    .filter(t => t.similarityScore > 0.5)
    .slice(0, safeCount)

  const discoveryTracks = shuffledTracks
    .filter(t => t.similarityScore >= 0.3 && t.similarityScore <= 0.5)
    .slice(0, discoveryCount)

  // Combine and return
  const result = [...safeTracks, ...discoveryTracks]

  // If not enough tracks, fill with remaining
  if (result.length < count) {
    const remaining = shuffledTracks
      .filter(t => !result.includes(t))
      .slice(0, count - result.length)
    result.push(...remaining)
  }

  return result.slice(0, count)
}

/**
 * Get initial suggestions for an empty set (random tracks from genre)
 */
export async function getInitialSuggestions(
  genre: string,
  freeDownloadOnly: boolean,
  count: number = 6,
  offset: number = 0
): Promise<TrackEntry[]> {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('tracks')
    .select('*')
    .eq('analysis_status', 'completed')
    .ilike('genre', `%${genre}%`)
    // Only suggest downloadable tracks (free or purchasable)
    .neq('download_status', 'No')

  if (freeDownloadOnly) {
    query = query.in('download_status', ['FreeDirectLink', 'FreeExternalLink'])
  }

  // Get popular tracks from the genre with offset for refresh
  const { data: tracks, error } = await query
    .order('playback_count', { ascending: false })
    .range(offset, offset + count * 3 - 1)

  if (error || !tracks || tracks.length === 0) {
    return []
  }

  // Shuffle and pick top N for variety
  const shuffled = (tracks as DbTrack[])
    .sort(() => Math.random() - 0.5)
    .slice(0, count)

  return shuffled.map(t => dbTrackToTrackEntry(t))
}
