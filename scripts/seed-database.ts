/**
 * Database Seeding Script
 *
 * This script uses Claude AI to generate diverse search keywords,
 * then searches SoundCloud for each keyword and stores the tracks in the database.
 *
 * Usage: npm run seed
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import SoundcloudModule from 'soundcloud.ts'

// ============================================================================
// Configuration
// ============================================================================

const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_KEY || '',
  batchSize: 10, // Number of keywords per AI request
  totalBatches: 5, // Total batches to generate
  delayBetweenSearches: 1000, // ms delay between SoundCloud searches
  tracksPerSearch: 50 // Max tracks to fetch per search
}

// ============================================================================
// Types
// ============================================================================

interface SoundcloudConstructor {
  new (): SoundcloudInstance
}

interface SoundcloudInstance {
  tracks: {
    search: (params: { q: string }) => Promise<{ collection: SoundcloudTrack[] }>
  }
}

interface SoundcloudTrack {
  id: number
  urn: string
  title: string
  user?: { username: string }
  artwork_url?: string
  permalink_url: string
  duration: number
  genre?: string
  description?: string
  created_at?: string
  label_name?: string
  tag_list?: string
  playback_count?: number
  likes_count?: number
  reposts_count?: number
  comment_count?: number
  downloadable?: boolean
  download_url?: string
  purchase_url?: string
  purchase_title?: string
}

interface DbTrack {
  soundcloud_id: number
  urn: string
  permalink_url: string
  title: string
  artist: string
  artwork: string | null
  duration: number
  genre: string | null
  description: string | null
  soundcloud_created_at: string | null
  label: string | null
  tags: string[]
  playback_count: number
  likes_count: number
  reposts_count: number
  comment_count: number
  download_status: string
  downloadable: boolean
  download_url: string | null
  purchase_url: string | null
  purchase_title: string | null
}

// ============================================================================
// Helpers
// ============================================================================

const FREE_KEYWORDS = ['free download', 'free dl', 'freedl', 'free']

function getDownloadStatus(track: SoundcloudTrack): string {
  if (track.downloadable) {
    return 'FreeDirectLink'
  }
  if (track.purchase_title) {
    const title = track.purchase_title.toLowerCase()
    if (FREE_KEYWORDS.some(keyword => title.includes(keyword))) {
      return 'FreeExternalLink'
    }
  }
  return 'No'
}

function parseTags(tagList?: string): string[] {
  if (!tagList) return []
  return tagList.split(' ').filter(tag => tag.length > 0)
}

function trackToDbTrack(track: SoundcloudTrack): DbTrack {
  return {
    soundcloud_id: track.id,
    urn: track.urn || `soundcloud:tracks:${track.id}`,
    permalink_url: track.permalink_url,
    title: track.title,
    artist: track.user?.username || 'Unknown',
    artwork: track.artwork_url?.replace('-large', '-t300x300') || null,
    duration: track.duration,
    genre: track.genre || null,
    description: track.description || null,
    soundcloud_created_at: track.created_at || null,
    label: track.label_name || null,
    tags: parseTags(track.tag_list),
    playback_count: track.playback_count || 0,
    likes_count: track.likes_count || 0,
    reposts_count: track.reposts_count || 0,
    comment_count: track.comment_count || 0,
    download_status: getDownloadStatus(track),
    downloadable: track.downloadable || false,
    download_url: track.download_url || null,
    purchase_url: track.purchase_url || null,
    purchase_title: track.purchase_title || null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// AI Keyword Generation
// ============================================================================

const KEYWORD_PROMPT = `Tu es un assistant pour une app de musique électronique. Génère ${config.batchSize} mots-clés de recherche VARIÉS et UNIQUES pour trouver des tracks sur SoundCloud.

Règles:
- Mélange: genres (house, techno, dubstep, dnb, trance, ambient, etc.), artistes connus, labels, ambiances (dark, melodic, chill), styles spécifiques
- Inclus des combinaisons: "melodic techno", "deep house", "dark dnb"
- Inclus des artistes/labels variés de la scène électronique
- Ajoute "free download" à certains mots-clés pour trouver des tracks téléchargeables
- Évite les répétitions avec les batches précédents
- Format: un mot-clé par ligne, sans numérotation ni tirets

Batch précédents (à ne pas répéter):
{previousKeywords}

Génère ${config.batchSize} nouveaux mots-clés:`

async function generateKeywords(anthropic: Anthropic, previousKeywords: string[]): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: KEYWORD_PROMPT.replace('{previousKeywords}', previousKeywords.join('\n') || 'Aucun')
      }
    ]
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  const keywords = content.text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('-') && !line.match(/^\d+\./))

  return keywords
}

// ============================================================================
// SoundCloud Search
// ============================================================================

async function searchAndStore(
  soundcloud: SoundcloudInstance,
  supabase: ReturnType<typeof createClient>,
  keyword: string,
  retries = 2
): Promise<number> {
  try {
    const response = await soundcloud.tracks.search({ q: keyword })
    const tracks = response.collection || []

    if (tracks.length === 0) {
      console.log(`  ⚠ No tracks found for "${keyword}"`)
      return 0
    }

    const dbTracks = tracks.slice(0, config.tracksPerSearch).map(trackToDbTrack)

    // Deduplicate by soundcloud_id (SoundCloud API can return duplicates)
    const uniqueTracks = [...new Map(dbTracks.map(t => [t.soundcloud_id, t])).values()]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('tracks').upsert(uniqueTracks as any, {
      onConflict: 'soundcloud_id',
      ignoreDuplicates: false
    })

    if (error) {
      console.error(`  ✗ Error storing tracks for "${keyword}":`, error.message)
      return 0
    }

    const freeCount = dbTracks.filter(t => t.download_status !== 'No').length
    console.log(`  ✓ "${keyword}" → ${dbTracks.length} tracks (${freeCount} free)`)
    return dbTracks.length
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    // Retry on 404 errors (SoundCloud API can be flaky)
    if (errorMsg.includes('404') && retries > 0) {
      console.log(`  ⟳ Retrying "${keyword}" (${retries} attempts left)...`)
      await sleep(2000)
      return searchAndStore(soundcloud, supabase, keyword, retries - 1)
    }

    console.error(`  ✗ Search failed for "${keyword}":`, errorMsg)
    return 0
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('🎵 Musaic Database Seeder\n')

  // Validate config
  if (!config.anthropicApiKey) {
    console.error('❌ Missing ANTHROPIC_API_KEY environment variable')
    process.exit(1)
  }
  if (!config.supabaseUrl || !config.supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY environment variable')
    process.exit(1)
  }

  // Initialize clients
  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
  const supabase = createClient(config.supabaseUrl, config.supabaseKey)
  const Soundcloud = (
    (SoundcloudModule as { default?: SoundcloudConstructor }).default || SoundcloudModule
  ) as SoundcloudConstructor
  const soundcloud = new Soundcloud()

  // Get initial track count
  const { count: initialCount } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Initial track count: ${initialCount || 0}\n`)

  let totalTracksAdded = 0
  const allKeywords: string[] = []

  // Generate and search for each batch
  for (let batch = 1; batch <= config.totalBatches; batch++) {
    console.log(`\n📦 Batch ${batch}/${config.totalBatches}`)
    console.log('─'.repeat(40))

    // Generate keywords using AI
    console.log('🤖 Generating keywords...')
    const keywords = await generateKeywords(anthropic, allKeywords)
    console.log(`   Generated: ${keywords.join(', ')}\n`)

    allKeywords.push(...keywords)

    // Search for each keyword
    for (const keyword of keywords) {
      const count = await searchAndStore(soundcloud, supabase, keyword)
      totalTracksAdded += count
      await sleep(config.delayBetweenSearches)
    }
  }

  // Get final track count
  const { count: finalCount } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })

  console.log('\n' + '═'.repeat(40))
  console.log('✨ Seeding Complete!')
  console.log(`   Keywords searched: ${allKeywords.length}`)
  console.log(`   Tracks processed: ${totalTracksAdded}`)
  console.log(`   New tracks in DB: ${(finalCount || 0) - (initialCount || 0)}`)
  console.log(`   Total tracks: ${finalCount || 0}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
