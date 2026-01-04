/**
 * Cleanup script to remove low-quality tracks from the database
 * Uses shared quality rules from server/config/qualityRules.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  MIN_TRACK_DURATION,
  MAX_TRACK_DURATION,
  QUALITY_THRESHOLD,
  REJECT_KEYWORDS,
  SCORING,
  ENGAGEMENT,
  containsRejectKeyword,
  isValidDuration,
  isIdealDuration,
  isRecent
} from '../server/config/qualityRules'

// Load environment variables
config({ path: '.env' })

interface DbTrack {
  soundcloud_id: number
  title: string
  artist: string
  duration: number
  genre: string | null
  artwork: string | null
  description: string | null
  likes_count: number
  playback_count: number
  comment_count: number
  download_status: string | null
  downloadable: boolean | null
  soundcloud_created_at: string | null
}

function calculateQualityScore(track: DbTrack): number {
  // === HARD FILTERS (score = 0 = rejected) ===

  // Contains mix/live keywords
  if (containsRejectKeyword(track.title)) return 0

  // Duration outside limits
  if (!isValidDuration(track.duration)) return 0

  // === POSITIVE SCORING ===
  let score = 0

  // Duration scoring
  if (isIdealDuration(track.duration)) score += SCORING.idealDuration
  else score += SCORING.acceptableDuration

  // Presentation
  if (track.artwork) score += SCORING.hasArtwork
  if (track.genre) score += SCORING.hasGenre
  if (track.description) score += SCORING.hasDescription

  // Engagement
  if (track.likes_count > ENGAGEMENT.minLikes) score += SCORING.minLikes
  if (track.likes_count > ENGAGEMENT.goodLikes) score += SCORING.goodLikes
  if (track.playback_count > ENGAGEMENT.minPlays) score += SCORING.minPlays
  if (track.comment_count > 0) score += SCORING.hasComments

  // Download availability
  const hasDownload = track.download_status && track.download_status !== 'No'
  if (hasDownload) score += SCORING.downloadable

  // Freshness
  if (isRecent(track.soundcloud_created_at)) score += SCORING.recent

  return score
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🧹 Low Quality Track Cleanup')
  console.log('==================================================')
  console.log(`Quality threshold: ${QUALITY_THRESHOLD} points`)
  console.log(`Reject keywords: ${REJECT_KEYWORDS.join(', ')}`)
  console.log(`Duration limits: ${MIN_TRACK_DURATION / 60000}-${MAX_TRACK_DURATION / 60000} min`)
  console.log('')

  // Get total count
  const { count: totalCount } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Total tracks in database: ${totalCount}`)
  console.log('')

  // Fetch all tracks in batches
  const BATCH_SIZE = 1000
  let offset = 0
  const lowQualityIds: number[] = []
  const scoreDistribution: Record<string, number> = {
    '0': 0,
    '1-19': 0,
    '20-39': 0,
    '40-59': 0,
    '60-79': 0,
    '80+': 0
  }

  console.log('🔍 Analyzing tracks...')

  while (true) {
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('soundcloud_id, title, artist, duration, genre, artwork, description, likes_count, playback_count, comment_count, download_status, downloadable, soundcloud_created_at')
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) {
      console.error('❌ Error fetching tracks:', error.message)
      process.exit(1)
    }

    if (!tracks || tracks.length === 0) break

    for (const track of tracks) {
      const score = calculateQualityScore(track)

      // Update distribution
      if (score === 0) scoreDistribution['0']++
      else if (score < 20) scoreDistribution['1-19']++
      else if (score < 40) scoreDistribution['20-39']++
      else if (score < 60) scoreDistribution['40-59']++
      else if (score < 80) scoreDistribution['60-79']++
      else scoreDistribution['80+']++

      if (score < QUALITY_THRESHOLD) {
        lowQualityIds.push(track.soundcloud_id)
      }
    }

    offset += BATCH_SIZE
    process.stdout.write(`   Analyzed ${offset} tracks...\r`)
  }

  console.log('')
  console.log('')
  console.log('📈 Score Distribution:')
  for (const [range, count] of Object.entries(scoreDistribution)) {
    const bar = '█'.repeat(Math.ceil(count / 50))
    console.log(`   ${range.padEnd(6)}: ${count.toString().padStart(5)} ${bar}`)
  }

  console.log('')
  console.log(`🗑️  Tracks to delete (score < ${QUALITY_THRESHOLD}): ${lowQualityIds.length}`)

  if (lowQualityIds.length === 0) {
    console.log('✅ No low-quality tracks to delete!')
    return
  }

  // Check for --force or -y flag
  const forceDelete = process.argv.includes('--force') || process.argv.includes('-y')

  if (!forceDelete) {
    // Ask for confirmation
    const readline = await import('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise<string>(resolve => {
      rl.question(`\n⚠️  Delete ${lowQualityIds.length} tracks? (yes/no): `, resolve)
    })
    rl.close()

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Aborted.')
      return
    }
  }

  // Delete in batches
  console.log('')
  console.log('🗑️  Deleting low-quality tracks...')

  const DELETE_BATCH_SIZE = 100
  let deleted = 0

  for (let i = 0; i < lowQualityIds.length; i += DELETE_BATCH_SIZE) {
    const batch = lowQualityIds.slice(i, i + DELETE_BATCH_SIZE)

    const { error, count } = await supabase
      .from('tracks')
      .delete({ count: 'exact' })
      .in('soundcloud_id', batch)

    if (error) {
      console.error(`❌ Error deleting batch: ${error.message}`)
    } else {
      deleted += count || 0
      process.stdout.write(`   Deleted ${deleted}/${lowQualityIds.length} tracks...\r`)
    }
  }

  console.log('')
  console.log('')
  console.log(`✅ Done! Deleted ${deleted} low-quality tracks.`)

  // Get new count
  const { count: newCount } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Remaining tracks: ${newCount}`)
}

main().catch(console.error)
