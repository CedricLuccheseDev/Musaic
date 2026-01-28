/**
 * Enrich tracks without purchase links and check for free downloads
 *
 * Strategy:
 * 1. First check SoundCloud for updated purchase_url or free download link
 * 2. If not found, fallback to Odesli API
 * 3. Also update download_status and downloadable fields
 *
 * Usage: bun scripts/enrichPurchaseLinks.ts [--limit N] [--dry-run]
 *
 * Options:
 *   --limit N    Process only N tracks (default: all)
 *   --dry-run    Don't update the database, just show what would be done
 */

import { createClient } from '@supabase/supabase-js'
import SoundcloudModule from 'soundcloud.ts'
import * as dotenv from 'dotenv'
import {
  fetchOdesliPurchaseLink,
  FREE_KEYWORDS,
  FREE_DOWNLOAD_DOMAINS,
  PURCHASE_DOMAINS,
  SMART_LINK_DOMAINS,
  extractUrlsFromText
} from '../server/services/odesli'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const soundcloudClientId = process.env.SOUNDCLOUD_CLIENT_ID

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// SoundCloud client
const Soundcloud = (
  (SoundcloudModule as { default?: typeof SoundcloudModule }).default || SoundcloudModule
) as typeof SoundcloudModule

function createSoundcloudClient() {
  if (soundcloudClientId) {
    return new Soundcloud(soundcloudClientId)
  }
  return new Soundcloud()
}

interface TrackRow {
  soundcloud_id: number
  title: string
  artist: string
  permalink_url: string
  download_status: string
  downloadable: boolean
}

type DownloadStatus = 'FreeDirectLink' | 'FreeExternalLink' | 'No'

interface EnrichResult {
  source: 'soundcloud' | 'odesli' | 'none'
  url: string | null
  title: string | null
  downloadStatus?: DownloadStatus
  downloadable?: boolean
  platform?: string
}

function findFreeDownloadLink(text: string): string | null {
  const urls = extractUrlsFromText(text)
  return urls.find(url =>
    FREE_DOWNLOAD_DOMAINS.some(domain => url.toLowerCase().includes(domain))
  ) || null
}

function findPurchaseLink(text: string): string | null {
  const urls = extractUrlsFromText(text)

  // Check for known purchase domains
  const purchaseUrl = urls.find(url =>
    PURCHASE_DOMAINS.some(domain => url.toLowerCase().includes(domain))
  )
  if (purchaseUrl) return purchaseUrl

  // Check for smart link domains
  const smartLinkUrl = urls.find(url =>
    SMART_LINK_DOMAINS.some(domain => url.toLowerCase().includes(domain))
  )
  if (smartLinkUrl) return smartLinkUrl

  return null
}

/**
 * Check SoundCloud for purchase/download link
 */
async function checkSoundCloud(soundcloudId: number): Promise<EnrichResult> {
  try {
    const soundcloud = createSoundcloudClient()
    const track = await soundcloud.tracks.get(soundcloudId)

    if (!track) {
      return { source: 'none', url: null, title: null }
    }

    // Check if track is directly downloadable
    if (track.downloadable) {
      return {
        source: 'soundcloud',
        url: track.purchase_url || track.permalink_url,
        title: track.purchase_title || 'Free Download',
        downloadStatus: 'FreeDirectLink',
        downloadable: true
      }
    }

    // Check purchase_title for free keywords
    if (track.purchase_title) {
      const title = track.purchase_title.toLowerCase()
      if (FREE_KEYWORDS.some(keyword => title.includes(keyword))) {
        return {
          source: 'soundcloud',
          url: track.purchase_url || track.permalink_url,
          title: track.purchase_title,
          downloadStatus: 'FreeExternalLink',
          downloadable: false
        }
      }
    }

    // Check purchase_url for free download domains
    if (track.purchase_url) {
      if (FREE_DOWNLOAD_DOMAINS.some(domain => track.purchase_url!.toLowerCase().includes(domain))) {
        return {
          source: 'soundcloud',
          url: track.purchase_url,
          title: track.purchase_title || 'Free Download',
          downloadStatus: 'FreeExternalLink',
          downloadable: false
        }
      }

      // Has a purchase URL (not free)
      return {
        source: 'soundcloud',
        url: track.purchase_url,
        title: track.purchase_title || 'Buy / Stream',
        downloadStatus: 'No',
        downloadable: false
      }
    }

    // Check description for free download links
    if (track.description) {
      const freeLink = findFreeDownloadLink(track.description)
      if (freeLink) {
        return {
          source: 'soundcloud',
          url: freeLink,
          title: 'Free Download',
          downloadStatus: 'FreeExternalLink',
          downloadable: false
        }
      }

      // Check description for purchase links
      const purchaseLink = findPurchaseLink(track.description)
      if (purchaseLink) {
        return {
          source: 'soundcloud',
          url: purchaseLink,
          title: 'Buy / Stream',
          downloadStatus: 'No',
          downloadable: false
        }
      }
    }

    return { source: 'none', url: null, title: null }
  } catch {
    return { source: 'none', url: null, title: null }
  }
}

/**
 * Fetch purchase link from Odesli API (uses centralized service with caching)
 */
async function getOdesliEnrichResult(soundcloudUrl: string): Promise<EnrichResult> {
  const result = await fetchOdesliPurchaseLink(soundcloudUrl, { timeout: 10000 })

  if (result.url) {
    return {
      source: 'odesli',
      url: result.url,
      title: result.title,
      platform: result.platform || 'odesli',
      downloadStatus: 'No',
      downloadable: false
    }
  }

  return { source: 'none', url: null, title: null }
}

/**
 * Enrich a single track - first try SoundCloud, then Odesli
 */
async function enrichTrack(track: TrackRow): Promise<EnrichResult> {
  // Step 1: Check SoundCloud for updated info
  const scResult = await checkSoundCloud(track.soundcloud_id)
  if (scResult.source === 'soundcloud') {
    return scResult
  }

  // Step 2: Fallback to Odesli (uses centralized service with caching)
  const odesliResult = await getOdesliEnrichResult(track.permalink_url)
  return odesliResult
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const args = process.argv.slice(2)
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : null
  const dryRun = args.includes('--dry-run')

  console.log('Purchase Link Enrichment (SoundCloud + Odesli)')
  console.log('='.repeat(50))
  if (dryRun) {
    console.log('DRY RUN - No changes will be made')
  }
  console.log('')

  // Fetch tracks without purchase_url OR not marked as free download
  let query = supabase
    .from('tracks')
    .select('soundcloud_id, title, artist, permalink_url, download_status, downloadable')
    .or('purchase_url.is.null,and(download_status.neq.FreeDirectLink,download_status.neq.FreeExternalLink)')
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data: tracks, error } = await query

  if (error) {
    console.error('Failed to fetch tracks:', error.message)
    process.exit(1)
  }

  if (!tracks || tracks.length === 0) {
    console.log('No tracks to enrich found.')
    return
  }

  console.log(`Found ${tracks.length} tracks to check`)
  console.log('')

  let fromSoundCloud = 0
  let fromOdesli = 0
  let freeDownloadsFound = 0
  let notFound = 0
  let failed = 0

  const CONCURRENCY = 2
  const DELAY_BETWEEN_BATCHES = 1500

  for (let i = 0; i < tracks.length; i += CONCURRENCY) {
    const batch = tracks.slice(i, i + CONCURRENCY) as TrackRow[]

    const results = await Promise.all(
      batch.map(async (track) => {
        const result = await enrichTrack(track)
        return { track, result }
      })
    )

    for (let j = 0; j < results.length; j++) {
      const { track, result } = results[j]
      const progress = `[${i + j + 1}/${tracks.length}]`

      if (result.source !== 'none' && result.url) {
        const isFree = result.downloadStatus === 'FreeDirectLink' || result.downloadStatus === 'FreeExternalLink'
        const sourceLabel = result.source === 'soundcloud'
          ? `SC${isFree ? ' FREE' : ''}${result.downloadable ? ' (direct)' : ''}`
          : `Odesli (${result.platform})`

        console.log(`${progress} ${track.artist} - ${track.title}`)
        console.log(`        -> ${sourceLabel}: ${result.url}`)

        if (isFree) freeDownloadsFound++

        if (!dryRun) {
          const updateData: Record<string, unknown> = {
            purchase_url: result.url,
            purchase_title: result.title
          }

          // Update download_status if changed
          if (result.downloadStatus && result.downloadStatus !== track.download_status) {
            updateData.download_status = result.downloadStatus
          }

          // Update downloadable if changed
          if (result.downloadable !== undefined && result.downloadable !== track.downloadable) {
            updateData.downloadable = result.downloadable
          }

          const { error: updateError } = await supabase
            .from('tracks')
            .update(updateData)
            .eq('soundcloud_id', track.soundcloud_id)

          if (updateError) {
            console.log(`        [UPDATE FAILED] ${updateError.message}`)
            failed++
          } else {
            if (result.source === 'soundcloud') fromSoundCloud++
            else fromOdesli++
          }
        } else {
          if (result.source === 'soundcloud') fromSoundCloud++
          else fromOdesli++
        }
      } else {
        console.log(`${progress} ${track.artist} - ${track.title} -> not found`)
        notFound++
      }
    }

    // Rate limiting
    if (i + CONCURRENCY < tracks.length) {
      await delay(DELAY_BETWEEN_BATCHES)
    }
  }

  console.log('')
  console.log('='.repeat(50))
  console.log('Summary:')
  console.log(`  From SoundCloud: ${fromSoundCloud}`)
  console.log(`  From Odesli: ${fromOdesli}`)
  console.log(`  Free downloads found: ${freeDownloadsFound}`)
  console.log(`  Not found: ${notFound}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Total enriched: ${fromSoundCloud + fromOdesli}`)

  if (dryRun) {
    console.log('')
    console.log('This was a dry run. Run without --dry-run to update the database.')
  }
}

main().catch(console.error)
