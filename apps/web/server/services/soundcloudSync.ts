/**
 * SoundCloud Likes Sync Service
 * Syncs user's liked tracks from SoundCloud to Musaic database
 */

import { type TrackEntry, DownloadStatus } from '~/types'
import type { SoundcloudTrack } from '~/types/soundcloud'
import { upsertTracks } from '~/server/services/trackStorage'
import { logger } from '~/server/utils/logger'

// ============================================================================
// Constants
// ============================================================================

const MAX_TRACKS_TO_SYNC = 500
const PAGE_SIZE = 50
const SOUNDCLOUD_API_BASE = 'https://api.soundcloud.com'

// ============================================================================
// Types
// ============================================================================

interface SoundCloudLikeItem {
  track: SoundcloudTrack
  created_at: string
}

interface SoundCloudLikesResponse {
  collection: SoundCloudLikeItem[]
  next_href: string | null
}

export interface SyncResult {
  synced: number
  total: number
  skipped: number
}

// ============================================================================
// Helpers
// ============================================================================

function parseTags(tagList?: string): string[] {
  if (!tagList) return []
  return tagList.split(' ').filter(tag => tag.length > 0)
}

function getDownloadStatus(track: SoundcloudTrack): DownloadStatus {
  if (track.downloadable) {
    return DownloadStatus.FreeDirectLink
  }

  const FREE_KEYWORDS = ['free', 'gratuit', 'download', 'dl']
  const FREE_DOWNLOAD_DOMAINS = ['toneden.io', 'hypeddit.com', 'fanlink.to']

  if (track.purchase_title) {
    const title = track.purchase_title.toLowerCase()
    if (FREE_KEYWORDS.some(keyword => title.includes(keyword))) {
      return DownloadStatus.FreeExternalLink
    }
  }

  if (track.purchase_url && FREE_DOWNLOAD_DOMAINS.some(domain => track.purchase_url!.toLowerCase().includes(domain))) {
    return DownloadStatus.FreeExternalLink
  }

  return DownloadStatus.No
}

function mapLikedTrackToTrackEntry(likedItem: SoundCloudLikeItem): TrackEntry {
  const track = likedItem.track
  return {
    id: track.id,
    urn: track.urn || `soundcloud:tracks:${track.id}`,
    permalink_url: track.permalink_url,
    title: track.title,
    artist: track.user?.username || 'Unknown',
    artwork: track.artwork_url?.replace('-large', '-t300x300') || null,
    duration: track.duration,
    genre: track.genre || null,
    description: track.description || null,
    created_at: track.created_at || null,
    label: track.label_name || null,
    tags: parseTags(track.tag_list),
    // Audio analysis fields (populated by musaic-analyzer)
    bpm_detected: null,
    bpm_confidence: null,
    key_detected: null,
    key_confidence: null,
    highlight_time: null,
    analysis_status: null,
    analysis_error: null,
    analyzed_at: null,
    // Stats
    playback_count: track.playback_count || 0,
    likes_count: track.likes_count || 0,
    reposts_count: track.reposts_count || 0,
    comment_count: track.comment_count || 0,
    downloadStatus: getDownloadStatus(track),
    downloadable: track.downloadable || false,
    purchase_url: track.purchase_url || null,
    purchase_title: track.purchase_title || null
  }
}

// ============================================================================
// Main Sync Function
// ============================================================================

/**
 * Sync user's SoundCloud likes to the database
 * Used by both OAuth callback (auto-sync) and manual sync endpoint
 */
export async function syncUserLikes(
  accessToken: string,
  options?: { maxTracks?: number }
): Promise<SyncResult> {
  const maxTracks = options?.maxTracks || MAX_TRACKS_TO_SYNC

  logger.info('SYNC', `Starting SoundCloud likes sync (max ${maxTracks} tracks)`)

  const allTracks: TrackEntry[] = []
  const seenIds = new Set<number>()
  // Use linked_partitioning for cursor-based pagination (offset is deprecated)
  let nextUrl: string | null = `${SOUNDCLOUD_API_BASE}/me/likes/tracks?limit=${PAGE_SIZE}&linked_partitioning=1`

  try {
    // Paginate through likes using cursor-based pagination
    while (nextUrl && allTracks.length < maxTracks) {
      const likesResponse: SoundCloudLikesResponse = await $fetch(nextUrl, {
        headers: {
          Authorization: `OAuth ${accessToken}`
        }
      })

      const collection = likesResponse.collection || []

      if (collection.length === 0) {
        break
      }

      // Map liked tracks to TrackEntry format
      // Handle both formats: { track: ... } wrapper or direct track object
      const tracks = collection
        .map((item: SoundCloudLikeItem) => {
          // If item has .track property, use it; otherwise treat item as the track itself
          const track = item.track || (item as unknown as SoundcloudTrack)
          if (!track || !track.id) return null
          // Skip duplicates (shouldn't happen with cursor pagination, but just in case)
          if (seenIds.has(track.id)) return null
          seenIds.add(track.id)
          return mapLikedTrackToTrackEntry({ track, created_at: item.created_at || '' })
        })
        .filter((t): t is TrackEntry => t !== null)

      allTracks.push(...tracks)

      // Get next page URL from response (cursor-based)
      nextUrl = likesResponse.next_href || null

      // Stop if we've reached the limit
      if (allTracks.length >= maxTracks) {
        allTracks.splice(maxTracks)
        break
      }

      // Small delay between pages
      if (nextUrl) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    logger.info('SYNC', `Fetched ${allTracks.length} liked tracks from SoundCloud`)

    if (allTracks.length === 0) {
      return { synced: 0, total: 0, skipped: 0 }
    }

    // Upsert tracks with forceStore to bypass quality filter (user's personal likes)
    const { stored, rejected } = await upsertTracks(allTracks, { forceStore: true })

    logger.info('SYNC', `Synced ${stored} tracks to database (${rejected} rejected by duration filter)`)

    return {
      synced: stored,
      total: allTracks.length,
      skipped: rejected
    }
  } catch (error) {
    logger.error('SYNC', `Likes sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  }
}
