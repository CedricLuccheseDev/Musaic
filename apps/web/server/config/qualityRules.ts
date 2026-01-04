/**
 * Quality scoring rules for track filtering
 * Used by trackStorage.ts and cleanup scripts
 */

// Track duration limits (in ms)
export const MIN_TRACK_DURATION = 2 * 60 * 1000 // 2 minutes
export const MAX_TRACK_DURATION = 7 * 60 * 1000 // 7 minutes

// Quality scoring threshold
export const QUALITY_THRESHOLD = 40

// Keywords that indicate a mix/set (hard reject)
export const REJECT_KEYWORDS = [
  'mix',
  'set',
  'live at',
  'dj set',
  'podcast',
  'radio show',
  'b2b',
  'essential mix',
  'boiler room'
]

// Scoring weights
export const SCORING = {
  // Duration scoring
  idealDuration: 20,      // 2-5 minutes
  acceptableDuration: 10, // 5-7 minutes

  // Presentation
  hasArtwork: 10,
  hasGenre: 10,
  hasDescription: 5,

  // Engagement
  minLikes: 10,           // > 50 likes
  goodLikes: 10,          // > 500 likes (bonus)
  minPlays: 5,            // > 1000 plays
  hasComments: 5,         // > 0 comments

  // Download availability
  downloadable: 15,

  // Freshness (< 1 year old)
  recent: 5
}

// Duration thresholds (in ms)
export const DURATION = {
  ideal: 300000,          // 5 minutes (ideal max)
  max: MAX_TRACK_DURATION // 7 minutes (absolute max)
}

// Engagement thresholds
export const ENGAGEMENT = {
  minLikes: 50,
  goodLikes: 500,
  minPlays: 1000
}

// Time constants
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

/**
 * Check if a title contains reject keywords
 */
export function containsRejectKeyword(title: string): boolean {
  const lower = title.toLowerCase()
  return REJECT_KEYWORDS.some(kw => lower.includes(kw))
}

/**
 * Check if duration is within valid range
 */
export function isValidDuration(durationMs: number): boolean {
  return durationMs >= MIN_TRACK_DURATION && durationMs <= MAX_TRACK_DURATION
}

/**
 * Check if duration is ideal (2-5 minutes)
 */
export function isIdealDuration(durationMs: number): boolean {
  return durationMs >= MIN_TRACK_DURATION && durationMs <= DURATION.ideal
}

/**
 * Check if track was uploaded recently (within 1 year)
 */
export function isRecent(createdAt: string | Date | null): boolean {
  if (!createdAt) return false
  const uploadTime = new Date(createdAt).getTime()
  return uploadTime > Date.now() - ONE_YEAR_MS
}
