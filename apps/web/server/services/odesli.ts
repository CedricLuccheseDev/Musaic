/**
 * Centralized Odesli API Service
 *
 * Provides purchase link enrichment using Odesli (song.link) API
 * with in-memory caching and retry mechanism.
 */

import { logger } from '~/server/utils/logger'

// ============================================================================
// Constants
// ============================================================================

const ODESLI_API_URL = 'https://api.song.link/v1-alpha.1/links'

/** Platform priority for purchase links (prefer dedicated music stores) */
export const PURCHASE_PLATFORM_PRIORITY = [
  'beatport',
  'bandcamp',
  'traxsource',
  'itunes',
  'appleMusic',
  'amazon',
  'deezer',
  'spotify',
  'tidal',
  'youtube',
  'youtubeMusic'
] as const

export type PurchasePlatform = typeof PURCHASE_PLATFORM_PRIORITY[number]

/** Free download domains */
export const FREE_DOWNLOAD_DOMAINS = [
  'hypeddit.com',
  'toneden.io',
  'fanlink.to',
  'gate.fm',
  'bfrnd.link',
  'edmdisc.com'
]

/** Free download keywords in purchase_title */
export const FREE_KEYWORDS = ['free download', 'free dl', 'freedl', 'free']

/** Known purchase domains */
export const PURCHASE_DOMAINS = [
  'beatport.com',
  'bandcamp.com',
  'traxsource.com',
  'junodownload.com',
  'amazon.com',
  'itunes.apple.com',
  'music.apple.com',
  'spotify.com',
  'deezer.com'
]

/** Smart link aggregator domains */
export const SMART_LINK_DOMAINS = [
  'smarturl.it',
  'ffm.to',
  'linktr.ee',
  'distrokid.com',
  'lnk.to',
  'found.ee',
  'song.link',
  'odesli.co'
]

// ============================================================================
// Types
// ============================================================================

export interface OdesliPlatformLink {
  url: string
  entityUniqueId: string
}

export interface OdesliResponse {
  entityUniqueId?: string
  pageUrl: string
  linksByPlatform: Record<string, OdesliPlatformLink>
}

export interface OdesliResult {
  url: string | null
  platform: PurchasePlatform | 'odesli' | null
  title: string
}

export interface TrackForEnrichment {
  id: number
  permalink_url: string
  purchase_url?: string | null
}

// ============================================================================
// Cache
// ============================================================================

interface CacheEntry {
  result: OdesliResult
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_CACHE_SIZE = 5000

function getCacheKey(soundcloudUrl: string): string {
  return soundcloudUrl.toLowerCase()
}

function getFromCache(soundcloudUrl: string): OdesliResult | null {
  const key = getCacheKey(soundcloudUrl)
  const entry = cache.get(key)

  if (!entry) return null

  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }

  return entry.result
}

function setInCache(soundcloudUrl: string, result: OdesliResult): void {
  // Evict oldest entries if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }

  cache.set(getCacheKey(soundcloudUrl), {
    result,
    timestamp: Date.now()
  })
}

/** Clear expired cache entries (call periodically if needed) */
export function cleanCache(): number {
  const now = Date.now()
  let cleaned = 0

  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key)
      cleaned++
    }
  }

  return cleaned
}

/** Get cache stats for debugging */
export function getCacheStats(): { size: number; maxSize: number; ttlHours: number } {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlHours: CACHE_TTL_MS / (60 * 60 * 1000)
  }
}

// ============================================================================
// API Functions
// ============================================================================

interface FetchOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
}

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  timeout: 8000,
  retries: 2,
  retryDelay: 1000
}

/**
 * Fetch purchase link from Odesli API with caching and retry
 */
export async function fetchOdesliPurchaseLink(
  soundcloudUrl: string,
  options: FetchOptions = {}
): Promise<OdesliResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Check cache first
  const cached = getFromCache(soundcloudUrl)
  if (cached) {
    return cached
  }

  // Try with retries
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      const result = await fetchOdesliInternal(soundcloudUrl, opts.timeout)
      setInCache(soundcloudUrl, result)
      return result
    } catch (error) {
      const _lastError = error as Error

      // Don't retry on client errors (4xx)
      if (error instanceof OdesliClientError) {
        const notFoundResult: OdesliResult = { url: null, platform: null, title: 'Buy / Stream' }
        setInCache(soundcloudUrl, notFoundResult)
        return notFoundResult
      }

      // Wait before retry (except on last attempt)
      if (attempt < opts.retries) {
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay))
      }
    }
  }

  // All retries failed - return null result but don't cache (might be temporary)
  logger.info('ODESLI', `Failed after ${opts.retries + 1} attempts: ${soundcloudUrl}`)
  return { url: null, platform: null, title: 'Buy / Stream' }
}

class OdesliClientError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OdesliClientError'
  }
}

async function fetchOdesliInternal(soundcloudUrl: string, timeout: number): Promise<OdesliResult> {
  const response = await fetch(
    `${ODESLI_API_URL}?url=${encodeURIComponent(soundcloudUrl)}`,
    {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeout)
    }
  )

  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      throw new OdesliClientError(`HTTP ${response.status}`)
    }
    throw new Error(`HTTP ${response.status}`)
  }

  const data = await response.json() as OdesliResponse

  if (!data.linksByPlatform) {
    return { url: null, platform: null, title: 'Buy / Stream' }
  }

  // Find best purchase link based on priority
  for (const platform of PURCHASE_PLATFORM_PRIORITY) {
    const link = data.linksByPlatform[platform]
    if (link?.url) {
      return {
        url: link.url,
        platform,
        title: 'Buy / Stream'
      }
    }
  }

  // Fallback: return the Odesli page URL
  if (data.pageUrl) {
    return {
      url: data.pageUrl,
      platform: 'odesli',
      title: 'Buy / Stream'
    }
  }

  return { url: null, platform: null, title: 'Buy / Stream' }
}

// ============================================================================
// Batch Processing
// ============================================================================

export interface EnrichmentOptions {
  /** Number of concurrent requests (default: 3) */
  concurrency?: number
  /** Delay between batches in ms (default: 1000) */
  batchDelay?: number
  /** Timeout per request in ms (default: 8000) */
  timeout?: number
}

const DEFAULT_ENRICHMENT_OPTIONS: Required<EnrichmentOptions> = {
  concurrency: 3,
  batchDelay: 1000,
  timeout: 8000
}

export interface EnrichmentResult<T extends TrackForEnrichment> {
  track: T
  url: string | null
  platform: PurchasePlatform | 'odesli' | null
}

/**
 * Enrich multiple tracks with purchase links (parallel with rate limiting)
 * Only processes tracks that don't already have a purchase_url
 */
export async function enrichTracksWithPurchaseLinks<T extends TrackForEnrichment>(
  tracks: T[],
  options: EnrichmentOptions = {}
): Promise<EnrichmentResult<T>[]> {
  const opts = { ...DEFAULT_ENRICHMENT_OPTIONS, ...options }

  const tracksToEnrich = tracks.filter(t => !t.purchase_url)

  if (tracksToEnrich.length === 0) {
    return tracks.map(track => ({ track, url: track.purchase_url || null, platform: null }))
  }

  logger.info('ODESLI', `Enriching ${tracksToEnrich.length} tracks with purchase links`)

  const results: EnrichmentResult<T>[] = []

  // Process in batches
  for (let i = 0; i < tracksToEnrich.length; i += opts.concurrency) {
    const batch = tracksToEnrich.slice(i, i + opts.concurrency)

    const batchResults = await Promise.all(
      batch.map(async (track) => {
        const result = await fetchOdesliPurchaseLink(track.permalink_url, { timeout: opts.timeout })
        return { track, url: result.url, platform: result.platform }
      })
    )

    results.push(...batchResults)

    // Rate limit delay (except for last batch)
    if (i + opts.concurrency < tracksToEnrich.length) {
      await new Promise(resolve => setTimeout(resolve, opts.batchDelay))
    }
  }

  // Add tracks that already had purchase_url
  const enrichedIds = new Set(results.map(r => r.track.id))
  for (const track of tracks) {
    if (!enrichedIds.has(track.id)) {
      results.push({ track, url: track.purchase_url || null, platform: null })
    }
  }

  const enrichedCount = results.filter(r => r.url).length
  logger.info('ODESLI', `Enriched ${enrichedCount}/${tracksToEnrich.length} tracks with purchase links`)

  return results
}

// ============================================================================
// URL Helpers
// ============================================================================

/** Extract URLs from text (description, etc.) */
export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi
  return text.match(urlRegex) || []
}

/** Check if text contains a free download link */
export function findFreeDownloadLink(text: string): string | null {
  const urls = extractUrlsFromText(text)
  return urls.find(url =>
    FREE_DOWNLOAD_DOMAINS.some(domain => url.toLowerCase().includes(domain))
  ) || null
}

/** Find purchase link in text */
export function findPurchaseLink(text: string): string | null {
  const urls = extractUrlsFromText(text)

  // Check for known purchase domains first
  const purchaseUrl = urls.find(url =>
    PURCHASE_DOMAINS.some(domain => url.toLowerCase().includes(domain))
  )
  if (purchaseUrl) return purchaseUrl

  // Check for smart link domains
  const smartLinkUrl = urls.find(url =>
    SMART_LINK_DOMAINS.some(domain => url.toLowerCase().includes(domain))
  )
  if (smartLinkUrl) return smartLinkUrl

  // Check for buy keywords near a URL
  const BUY_KEYWORDS = ['buy', 'purchase', 'acheter', 'get it', 'stream', 'out now', 'available']
  const textLower = text.toLowerCase()
  if (BUY_KEYWORDS.some(keyword => textLower.includes(keyword)) && urls.length > 0) {
    return urls[0]
  }

  return null
}

/** Check if purchase title indicates free download */
export function isFreeDownloadTitle(purchaseTitle: string | null | undefined): boolean {
  if (!purchaseTitle) return false
  const title = purchaseTitle.toLowerCase()
  return FREE_KEYWORDS.some(keyword => title.includes(keyword))
}

/** Check if URL is a free download domain */
export function isFreeDownloadUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return FREE_DOWNLOAD_DOMAINS.some(domain => url.toLowerCase().includes(domain))
}
