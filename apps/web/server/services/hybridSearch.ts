import type { TrackEntry } from '~/types'

/**
 * Calculate relevance score for a track
 * Used to rank and sort unified search results
 */
export function calculateTrackScore(
  track: TrackEntry,
  hasAnalysis: boolean,
  queryContext?: { wantsDownload?: boolean }
): number {
  let score = 0

  // Base score: logarithmic engagement (prevents huge tracks from dominating)
  score += Math.log10(track.playback_count + 1) * 100
  score += Math.log10(track.likes_count + 1) * 30
  score += Math.log10(track.reposts_count + 1) * 20

  // Major boost for analyzed tracks (we have audio features)
  if (hasAnalysis && track.bpm_detected) {
    score *= 1.5 // 50% boost
  }

  // Boost downloadable tracks (high value for users)
  if (track.downloadStatus === 'FreeDirectLink') {
    score *= 1.3 // Direct download
  } else if (track.downloadStatus === 'FreeExternalLink') {
    score *= 1.2 // External link
  }

  // Extra boost if user wants downloads
  if (queryContext?.wantsDownload && track.downloadStatus !== 'No') {
    score *= 1.4
  }

  // Slight penalty for very old tracks (> 5 years)
  if (track.created_at) {
    const ageYears = (Date.now() - new Date(track.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)
    if (ageYears > 5) {
      score *= 0.9
    }
  }

  // Penalty for suspicious duration (very short or very long)
  const durationMinutes = track.duration / 1000 / 60
  if (durationMinutes < 2 || durationMinutes > 8) {
    score *= 0.8
  }

  return Math.round(score)
}

export interface MergedTrack extends TrackEntry {
  source: 'database' | 'soundcloud'
  hasAnalysis: boolean
  score: number
  shouldAnalyze: boolean // Whether this track meets quality criteria for analysis
}

interface MergeOptions {
  wantsDownload?: boolean
  limit?: number
  minScore?: number // Minimum score threshold for inclusion
}

/**
 * Merge and rank tracks from database and SoundCloud
 * Deduplicates by soundcloud_id, prioritizes analyzed tracks
 * Returns the BEST tracks by score, regardless of source distribution
 */
export function mergeAndRankTracks(
  dbTracks: TrackEntry[],
  scTracks: TrackEntry[],
  options: MergeOptions = {}
): MergedTrack[] {
  const { wantsDownload, limit = 20, minScore } = options

  // Step 1: Calculate all scores and create merged tracks
  const allMergedTracks: MergedTrack[] = []

  // Add database tracks first (priority because they have analysis)
  for (const track of dbTracks) {
    const hasAnalysis = !!(track.bpm_detected || track.key_detected)
    const score = calculateTrackScore(track, hasAnalysis, { wantsDownload })

    allMergedTracks.push({
      ...track,
      source: 'database',
      hasAnalysis,
      score,
      shouldAnalyze: false
    })
  }

  // Add SoundCloud tracks (check for duplicates)
  const dbTrackIds = new Set(dbTracks.map(t => t.id))
  for (const track of scTracks) {
    if (!dbTrackIds.has(track.id)) {
      const score = calculateTrackScore(track, false, { wantsDownload })
      const shouldAnalyze = checkShouldAnalyze(track)

      allMergedTracks.push({
        ...track,
        source: 'soundcloud',
        hasAnalysis: false,
        score,
        shouldAnalyze
      })
    }
  }

  // Step 2: Determine minimum score threshold (if not provided)
  let effectiveMinScore = minScore ?? 0

  // If we have more tracks than limit, use dynamic threshold
  if (minScore === undefined && allMergedTracks.length > limit) {
    // Sort all tracks by score to find a good threshold
    const sortedScores = allMergedTracks
      .map(t => t.score)
      .sort((a, b) => b - a)

    // Use the score at position (limit * 1.5) as threshold
    // This ensures we only consider tracks that are competitive for top spots
    const thresholdIndex = Math.min(
      Math.floor(limit * 1.5),
      sortedScores.length - 1
    )
    effectiveMinScore = sortedScores[thresholdIndex]
  }

  // Step 3: Filter by minimum score and sort
  const qualifiedTracks = allMergedTracks
    .filter(t => t.score >= effectiveMinScore)
    .sort((a, b) => b.score - a.score)

  // Step 4: Return top N tracks (the BEST ones regardless of source)
  const finalTracks = qualifiedTracks.slice(0, limit)

  // Step 5: Mark all SoundCloud tracks in final results for analysis
  // (they have proven to be high-quality by making it to the top)
  return finalTracks.map(track => {
    if (track.source === 'soundcloud' && !track.hasAnalysis) {
      return { ...track, shouldAnalyze: true }
    }
    return track
  })
}

/**
 * Check if a track should be analyzed based on quality criteria
 * Matches the quality filter used in trackStorage.ts
 */
function checkShouldAnalyze(track: TrackEntry): boolean {
  // Duration check: 1-8 minutes
  const durationMinutes = track.duration / 1000 / 60
  if (durationMinutes < 1 || durationMinutes > 8) {
    return false
  }

  // Basic engagement threshold (avoid completely unknown tracks)
  if (track.playback_count < 100) {
    return false
  }

  // Title quality check (avoid obvious mixes/sets/podcasts)
  const title = track.title.toLowerCase()
  const rejectKeywords = [
    'mix', 'set', 'podcast', 'radio show', 'live set',
    'dj set', 'mixtape', 'compilation'
  ]
  if (rejectKeywords.some(keyword => title.includes(keyword))) {
    return false
  }

  return true
}

/**
 * Group tracks by source for debugging/analytics
 */
export function groupTracksBySource(tracks: MergedTrack[]) {
  const groups = {
    database: tracks.filter(t => t.source === 'database'),
    soundcloud: tracks.filter(t => t.source === 'soundcloud'),
    analyzed: tracks.filter(t => t.hasAnalysis),
    toAnalyze: tracks.filter(t => t.shouldAnalyze && !t.hasAnalysis)
  }

  return {
    ...groups,
    counts: {
      total: tracks.length,
      database: groups.database.length,
      soundcloud: groups.soundcloud.length,
      analyzed: groups.analyzed.length,
      toAnalyze: groups.toAnalyze.length
    }
  }
}
