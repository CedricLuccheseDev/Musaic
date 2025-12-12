/**
 * Script to populate the database with 500+ bass music tracks
 * Searches for various bass music subgenres and artists
 * Filters out DJ sets/mixes (tracks > 5 minutes)
 */

import { createClient } from '@supabase/supabase-js'
import { searchTracks } from '../server/services/soundcloud'
import type { TrackEntry } from '../types/track'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Convert TrackEntry to DB format
function trackToDbFormat(track: TrackEntry) {
  return {
    soundcloud_id: track.id,
    urn: track.urn,
    permalink_url: track.permalink_url,
    title: track.title,
    artist: track.artist,
    artist_id: null, // No FK for script insertion
    artwork: track.artwork,
    duration: track.duration,
    genre: track.genre,
    description: track.description,
    soundcloud_created_at: track.created_at,
    label: track.label,
    tags: track.tags,
    bpm: track.bpm,
    key: track.key,
    playback_count: track.playback_count,
    likes_count: track.likes_count,
    reposts_count: track.reposts_count,
    comment_count: track.comment_count,
    download_status: track.downloadStatus,
    downloadable: track.downloadable,
    download_url: track.download_url,
    purchase_url: track.purchase_url,
    purchase_title: track.purchase_title
  }
}

// Bass music search queries - mix of genres, artists, and labels
const SEARCH_QUERIES = [
  // Dubstep artists
  'Excision dubstep',
  'Virtual Riot',
  'Subtronics',
  'SVDDEN DEATH',
  'Wooli dubstep',
  'Kai Wachi',
  'Sullivan King',
  'Kompany dubstep',
  'PhaseOne',
  'Barely Alive',
  'MUST DIE!',
  'Zomboy',
  'NERO dubstep',
  'Skrillex dubstep',
  'Doctor P',

  // Riddim artists
  'INFEKT riddim',
  'Subtronics riddim',
  'Marauda',
  'Automhate',
  'Samplifire',
  'Al Ross riddim',
  'Aweminus',
  'Yakz riddim',

  // Color bass / Experimental
  'Chime color bass',
  'Ace Aura',
  'Oliverse',
  'Sharks color bass',
  'Au5',

  // Melodic dubstep
  'ILLENIUM',
  'Seven Lions',
  'Said The Sky',
  'Dabin',
  'MitiS',
  'Crystal Skies',
  'William Black',

  // Trap / Hybrid
  'RL Grime',
  'NGHTMRE',
  'Slander',
  'Boombox Cartel',
  'Hex Cougar',
  'ISOxo',
  'Knock2',
  'STUCA',

  // Future bass
  'Flume',
  'San Holo',
  'Medasin',
  'Ekali',

  // DnB crossover
  'Dimension dnb',
  'Sub Focus',
  'Wilkinson dnb',
  'Delta Heavy',
  'Netsky',
  'Grafix',
  'Culture Shock',
  'Friction dnb',

  // Rising artists 2024-2025
  'Tape B',
  'Steller bass',
  'Vampa bass',
  'Jeanie bass',
  'Hgods',
  'BVSSIC',
  'Leotrix',
  'Trinergy',

  // Genre searches
  'dubstep 2024',
  'riddim 2024',
  'color bass 2024',
  'melodic dubstep 2024',
  'bass house 2024',
  'future bass 2024',

  // Labels
  'Disciple Records',
  'Never Say Die',
  'Subsidia',
  'Ophelia Records',
  'Wakaan',
  'Deadbeats',
  'Monstercat bass',

  // Popular track types
  'dubstep remix 2024',
  'bass drop',
  'heavy bass',
  'filthy dubstep',
  'tearout dubstep',
  'melodic bass',
  'experimental bass'
]

const MAX_DURATION_MS = 5 * 60 * 1000 // 5 minutes in ms
const TARGET_TRACKS = 500
const TRACKS_PER_SEARCH = 25

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function upsertTracks(tracks: TrackEntry[]): Promise<number> {
  const dbTracks = tracks.map(trackToDbFormat)

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

async function main() {
  console.log('🎵 Starting bass music track population...')
  console.log(`Target: ${TARGET_TRACKS} tracks (max ${MAX_DURATION_MS / 60000} min each)`)
  console.log(`Queries: ${SEARCH_QUERIES.length}`)
  console.log('')

  const allTracks = new Map<number, TrackEntry>()
  let searchCount = 0

  for (const query of SEARCH_QUERIES) {
    if (allTracks.size >= TARGET_TRACKS) {
      console.log(`✅ Reached target of ${TARGET_TRACKS} tracks`)
      break
    }

    searchCount++
    console.log(`[${searchCount}/${SEARCH_QUERIES.length}] Searching: "${query}"...`)

    try {
      const tracks = await searchTracks(query, TRACKS_PER_SEARCH)

      // Filter out long tracks (DJ sets, mixes)
      const filteredTracks = tracks.filter(track => {
        const isShortEnough = track.duration <= MAX_DURATION_MS
        const isNotMix = !track.title.toLowerCase().includes('mix') &&
                         !track.title.toLowerCase().includes('set') &&
                         !track.title.toLowerCase().includes('live at')
        return isShortEnough && isNotMix
      })

      // Add to collection (deduplicates by track id)
      for (const track of filteredTracks) {
        if (!allTracks.has(track.id)) {
          allTracks.set(track.id, track)
        }
      }

      console.log(`   Found ${filteredTracks.length} valid tracks (${allTracks.size} total)`)

      // Rate limiting - wait between searches
      await delay(1000)
    } catch (error) {
      console.error(`   ❌ Error searching "${query}":`, error)
      await delay(2000) // Longer delay on error
    }
  }

  console.log('')
  console.log(`📊 Collection complete: ${allTracks.size} unique tracks`)
  console.log('')

  // Convert to array and batch insert
  const tracksArray = Array.from(allTracks.values())

  // Insert in batches of 50
  const BATCH_SIZE = 50
  let inserted = 0

  for (let i = 0; i < tracksArray.length; i += BATCH_SIZE) {
    const batch = tracksArray.slice(i, i + BATCH_SIZE)
    console.log(`Inserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tracksArray.length / BATCH_SIZE)}...`)

    try {
      const count = await upsertTracks(batch)
      inserted += count
      console.log(`   ✅ Inserted ${inserted}/${tracksArray.length}`)
    } catch (error) {
      console.error(`   ❌ Batch insert error:`, error)
    }

    await delay(500)
  }

  console.log('')
  console.log('🎉 Population complete!')
  console.log(`   Total tracks inserted: ${inserted}`)

  // Print some stats
  const genres = new Map<string, number>()
  for (const track of tracksArray) {
    const genre = track.genre || 'Unknown'
    genres.set(genre, (genres.get(genre) || 0) + 1)
  }

  console.log('')
  console.log('📈 Genre distribution:')
  const sortedGenres = [...genres.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  for (const [genre, count] of sortedGenres) {
    console.log(`   ${genre}: ${count}`)
  }
}

main().catch(console.error)
