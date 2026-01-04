/**
 * Generic track population script
 *
 * Usage: npx tsx scripts/populateTracks.ts '<JSON_CONFIG>'
 *
 * Config format:
 * {
 *   "queries": ["search term 1", "search term 2"],  // REQUIRED: search queries
 *   "maxDuration": 300000,                           // Optional: max duration in ms (default: 5min)
 *   "minDuration": 60000,                            // Optional: min duration in ms (default: 1min)
 *   "targetCount": 500,                              // Optional: target track count
 *   "excludeMixes": true,                            // Optional: exclude DJ sets/mixes
 *   "freeDownloadOnly": false                        // Optional: only free downloads
 * }
 *
 * The queries should be provided by Claude after doing a web search for current artists/trends.
 */

import { createClient } from '@supabase/supabase-js'
import { searchTracks } from '../server/services/soundcloud'
import { type TrackEntry, DownloadStatus, trackEntryToDbTrack } from '../types'
import { containsRejectKeyword, isValidDuration } from '../server/config/qualityRules'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const analyzerUrl = process.env.ANALYZER_URL

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================================================
// Config Interface
// ============================================================================

interface PopulateConfig {
  queries: string[]
  maxDuration?: number
  minDuration?: number
  targetCount?: number
  excludeMixes?: boolean
  freeDownloadOnly?: boolean
}

// ============================================================================
// Track Filtering
// ============================================================================

function shouldIncludeTrack(track: TrackEntry, config: PopulateConfig): boolean {
  // Duration check - use config values or shared defaults
  if (config.maxDuration || config.minDuration) {
    const maxDuration = config.maxDuration || 5 * 60 * 1000
    const minDuration = config.minDuration || 60 * 1000
    if (track.duration > maxDuration || track.duration < minDuration) {
      return false
    }
  } else {
    // Use shared quality rules (2-7 min)
    if (!isValidDuration(track.duration)) {
      return false
    }
  }

  // Exclude mixes/sets using shared reject keywords
  if (config.excludeMixes !== false) {
    if (containsRejectKeyword(track.title)) {
      return false
    }
  }

  // Free download only
  if (config.freeDownloadOnly) {
    if (track.downloadStatus !== DownloadStatus.FreeDirectLink &&
        track.downloadStatus !== DownloadStatus.FreeExternalLink) {
      return false
    }
  }

  return true
}

// ============================================================================
// Database Operations
// ============================================================================

// Trigger analysis for tracks via musaic-analyzer
async function triggerAnalysis(soundcloudIds: number[]): Promise<void> {
  if (!analyzerUrl || soundcloudIds.length === 0) return

  try {
    await fetch(`${analyzerUrl}/analyze/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soundcloud_ids: soundcloudIds })
    })
    console.log(`   🔬 Triggered analysis for ${soundcloudIds.length} tracks`)
  } catch {
    // Silent fail - analyzer might be down
  }
}

async function upsertTracks(tracks: TrackEntry[]): Promise<number> {
  const dbTracks = tracks.map(trackEntryToDbTrack)

  const { error, data } = await supabase
    .from('tracks')
    .upsert(dbTracks, {
      onConflict: 'soundcloud_id',
      ignoreDuplicates: false
    })
    .select('soundcloud_id')

  if (error) {
    console.error('   ❌ Insert error:', error.message)
    return 0
  }

  return data?.length || tracks.length
}

// ============================================================================
// Main
// ============================================================================

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const configArg = process.argv[2]
  if (!configArg) {
    console.log('Usage: npx tsx scripts/populateTracks.ts \'<JSON_CONFIG>\'')
    console.log('')
    console.log('Config must include "queries" array from Claude web search.')
    process.exit(1)
  }

  let config: PopulateConfig
  try {
    config = JSON.parse(configArg)
  } catch {
    console.error('❌ Invalid JSON config')
    process.exit(1)
  }

  if (!config.queries || config.queries.length === 0) {
    console.error('❌ Missing "queries" in config')
    process.exit(1)
  }

  const targetCount = config.targetCount || 500

  console.log('🎵 Track Population Script')
  console.log('='.repeat(50))
  console.log(`Queries: ${config.queries.length}`)
  console.log(`Target: ${targetCount} tracks`)
  console.log(`Max duration: ${(config.maxDuration || 300000) / 60000} min`)
  console.log(`Free download only: ${config.freeDownloadOnly || false}`)
  console.log('')

  const allTracks = new Map<number, TrackEntry>()
  let searchCount = 0

  for (const query of config.queries) {
    if (allTracks.size >= targetCount) {
      console.log(`✅ Reached target of ${targetCount} tracks`)
      break
    }

    searchCount++
    console.log(`[${searchCount}/${config.queries.length}] "${query}"...`)

    try {
      const tracks = await searchTracks(query, 25)
      const filtered = tracks.filter(t => shouldIncludeTrack(t, config))

      for (const track of filtered) {
        if (!allTracks.has(track.id)) {
          allTracks.set(track.id, track)
        }
      }

      console.log(`   +${filtered.length} (total: ${allTracks.size})`)
      await delay(1000)
    } catch (error) {
      console.error(`   ❌ Error:`, error)
      await delay(2000)
    }
  }

  console.log('')
  console.log(`📊 Collected ${allTracks.size} unique tracks`)
  console.log('')

  // Insert in batches
  const tracksArray = Array.from(allTracks.values())
  const BATCH_SIZE = 50
  let inserted = 0

  for (let i = 0; i < tracksArray.length; i += BATCH_SIZE) {
    const batch = tracksArray.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(tracksArray.length / BATCH_SIZE)

    console.log(`Batch ${batchNum}/${totalBatches}...`)
    const count = await upsertTracks(batch)
    inserted += count
    console.log(`   ✅ ${inserted}/${tracksArray.length}`)

    // Trigger analysis for this batch
    await triggerAnalysis(batch.map(t => t.id))
    await delay(500)
  }

  console.log('')
  console.log('🎉 Done!')
  console.log(`   Inserted: ${inserted} tracks`)

  // Stats
  const genres = new Map<string, number>()
  for (const track of tracksArray) {
    const g = track.genre || 'Unknown'
    genres.set(g, (genres.get(g) || 0) + 1)
  }

  console.log('')
  console.log('📈 Genres:')
  const sorted = [...genres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  for (const [g, c] of sorted) {
    console.log(`   ${g}: ${c}`)
  }
}

main().catch(console.error)
