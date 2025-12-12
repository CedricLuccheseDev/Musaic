import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

// Cached system prompt - optimized for token efficiency
const SYSTEM_PROMPT = `SQL generator for music app. Output ONLY valid PostgreSQL, no markdown.

TABLES:
- tracks (soundcloud_id PK, title, artist, artist_id FK, genre, duration ms, download_status, downloadable, playback_count, likes_count, tags TEXT[], soundcloud_created_at, bpm INT, key TEXT)
- artists (soundcloud_id PK, username, full_name, city, country, followers_count, track_count, genres TEXT[], labels TEXT[], verified BOOL, pro_user BOOL)

JOIN: tracks.artist_id = artists.soundcloud_id

RULES:
- Default tracks: SELECT * FROM tracks, ILIKE for text, LIMIT 20 (max 50), ORDER BY playback_count DESC
- Default artists: SELECT * FROM artists, ORDER BY followers_count DESC

INTENT DETECTION:
1) TRACK SEARCH (default): search in tracks table
   "techno tracks" → SELECT * FROM tracks WHERE genre ILIKE '%techno%'
2) ARTIST SEARCH ("artists", "producers", "DJs"): search in artists table
   "french artists" → SELECT * FROM artists WHERE country ILIKE '%france%'
   "verified dubstep artists" → SELECT * FROM artists WHERE verified = true AND 'dubstep' = ANY(genres)
3) TRACKS BY ARTIST CRITERIA (join):
   "tracks from french artists" → SELECT t.* FROM tracks t JOIN artists a ON t.artist_id = a.soundcloud_id WHERE a.country ILIKE '%france%'
4) SIMILAR ARTISTS ("like X", "similar to"): EXCLUDE mentioned artist
   "like Wooli" → WHERE genre ILIKE '%dubstep%' AND artist NOT ILIKE '%wooli%'

CONTENT TYPES (1min=60000ms):
- mix/dj set: duration > 900000 (15min+), title NOT ILIKE '%remix%'
- remix: title ILIKE '%remix%' AND title NOT ILIKE '%original mix%'
- bootleg/edit: title ILIKE '%bootleg%' OR title ILIKE '%edit%' OR title ILIKE '%flip%'

DOWNLOAD:
- Free: download_status IN ('FreeDirectLink','FreeExternalLink')
- Direct only: download_status = 'FreeDirectLink'

GENRE/TAG search: (genre ILIKE '%X%' OR EXISTS(SELECT 1 FROM unnest(tags) t WHERE t ILIKE '%X%'))
ARTIST GENRE: 'X' = ANY(genres) OR EXISTS(SELECT 1 FROM unnest(labels) l WHERE l ILIKE '%X%')`

export async function generateSqlQuery(question: string): Promise<string> {
  const config = useRuntimeConfig()
  const apiKey = config.anthropicApiKey

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY')
  }

  const anthropic = new Anthropic({ apiKey })

  const messages: MessageParam[] = [
    { role: 'user', content: question }
  ]

  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 256,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  // Clean up the response (remove markdown if present)
  let sql = content.text.trim()
  sql = sql.replace(/^```sql\n?/i, '').replace(/\n?```$/i, '')

  return sql
}

export async function executeAiQuery(question: string): Promise<{ sql: string; results: unknown[]; error?: string }> {
  const config = useRuntimeConfig()
  const supabaseUrl = config.supabaseUrl as string
  const supabaseKey = config.supabaseKey as string

  console.log('[AiQuery] Supabase config:', { url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING', key: supabaseKey ? 'SET' : 'MISSING' })

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[AiQuery] Supabase not configured, skipping')
    return { sql: '', results: [], error: 'Supabase not configured' }
  }

  // Generate SQL from question
  const sql = await generateSqlQuery(question)

  // Validate SQL (basic security check)
  const sqlLower = sql.toLowerCase()
  if (sqlLower.includes('drop') || sqlLower.includes('delete') || sqlLower.includes('update') || sqlLower.includes('insert') || sqlLower.includes('alter')) {
    return { sql, results: [], error: 'Only SELECT queries are allowed' }
  }

  // Execute the query
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.rpc('exec', { query: sql }).single()

  if (error) {
    // If RPC doesn't exist, try raw query via PostgREST
    // For now, return the SQL and let frontend handle it
    return { sql, results: [], error: error.message }
  }

  return { sql, results: data || [] }
}
