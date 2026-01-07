/**
 * String matching utilities for artist name detection
 */

/**
 * Levenshtein distance for fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Normalize string for comparison (remove spaces, special chars, lowercase)
 */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_\-\s.]+/g, '') // Remove underscores, hyphens, spaces, dots
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
}

export type MatchType = 'exact' | 'contains' | 'prefix' | 'fuzzy' | 'partial' | 'none'

export interface MatchResult {
  type: MatchType
  score: number // 0-100, higher is better
  distance?: number // Levenshtein distance for fuzzy matches
}

/**
 * Calculate match quality between query and username
 */
export function calculateMatchScore(query: string, username: string): MatchResult {
  const queryNorm = normalizeForMatch(query)
  const usernameNorm = normalizeForMatch(username)
  const queryLower = query.toLowerCase()
  const usernameLower = username.toLowerCase()

  // Exact match (after normalization)
  if (usernameNorm === queryNorm || usernameLower === queryLower) {
    return { type: 'exact', score: 100 }
  }

  // Username starts with query (e.g., "Quyver" matches "Quyver Music")
  if (usernameNorm.startsWith(queryNorm)) {
    const ratio = queryNorm.length / usernameNorm.length
    return { type: 'prefix', score: 70 + Math.round(ratio * 25) }
  }

  // Username contains query
  if (usernameNorm.includes(queryNorm)) {
    const ratio = queryNorm.length / usernameNorm.length
    return { type: 'contains', score: 50 + Math.round(ratio * 30) }
  }

  // Query contains username (e.g., "Quyver tracks" matches "Quyver")
  if (queryNorm.includes(usernameNorm)) {
    const ratio = usernameNorm.length / queryNorm.length
    return { type: 'partial', score: 40 + Math.round(ratio * 30) }
  }

  // Fuzzy match using Levenshtein distance
  const distance = levenshteinDistance(queryNorm, usernameNorm)
  const maxLen = Math.max(queryNorm.length, usernameNorm.length)
  const similarity = 1 - distance / maxLen

  // Only consider fuzzy match if similarity > 70%
  if (similarity > 0.7) {
    return {
      type: 'fuzzy',
      score: Math.round(similarity * 60), // Max 60 for fuzzy matches
      distance
    }
  }

  return { type: 'none', score: 0 }
}

/**
 * Find best matching user from a list
 */
export function findBestMatchingUser<T extends { username: string }>(
  query: string,
  users: T[],
  minScore = 50 // Minimum score threshold
): { user: T; match: MatchResult } | null {
  let bestMatch: { user: T; match: MatchResult } | null = null

  for (const user of users) {
    const match = calculateMatchScore(query, user.username)

    if (match.score >= minScore) {
      if (!bestMatch || match.score > bestMatch.match.score) {
        bestMatch = { user, match }
      }
    }
  }

  return bestMatch
}
