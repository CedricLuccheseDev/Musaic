import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { logger } from '~/server/utils/logger'

// System prompt for SQL generation
const SYSTEM_PROMPT = `You are a SQL generator for a music search app. Output ONLY valid PostgreSQL. No markdown, no explanation.

SCHEMA:
tracks(soundcloud_id PK, title, artist, genre, duration INT ms, download_status TEXT, downloadable BOOL, playback_count INT, likes_count INT, tags TEXT[], soundcloud_created_at TIMESTAMP, bpm INT, key TEXT, label)

DEFAULTS:
- Always SELECT * FROM tracks
- Always use ILIKE for case-insensitive text matching
- Default ORDER BY playback_count DESC
- Default LIMIT 20 (max 50)

GENRES (use these exact values):
dubstep, melodic dubstep, future bass, trap, house, techno, drum and bass, bass house, riddim, electronic, edm, progressive house, deep house, future house, hybrid trap, midtempo, color bass, lo-fi, ambient, hardcore, hardstyle, trance, psytrance, breakbeat, garage, uk garage, jungle, neurofunk, liquid dnb, minimal, industrial

SEARCH PATTERNS:

1. Genre search:
   WHERE genre ILIKE '%dubstep%'

2. Artist search:
   WHERE artist ILIKE '%skrillex%'

3. Title search:
   WHERE title ILIKE '%memories%'

4. Similar to artist (exclude the artist, search by likely genres):
   WHERE (genre ILIKE '%melodic dubstep%' OR genre ILIKE '%future bass%') AND artist NOT ILIKE '%artistname%'

5. Free downloads only:
   WHERE download_status IN ('FreeDirectLink', 'FreeExternalLink')

6. BPM range:
   WHERE bpm BETWEEN 140 AND 150

7. Key search:
   WHERE key ILIKE '%C minor%' OR key ILIKE '%Cm%'

8. Recent tracks:
   ORDER BY soundcloud_created_at DESC

9. Popular tracks:
   ORDER BY playback_count DESC

10. Duration filters (ms):
    - Short (<3min): duration < 180000
    - Normal (3-7min): duration BETWEEN 180000 AND 420000
    - Long/Mix (>15min): duration > 900000

11. Content types:
    - Remix: title ILIKE '%remix%'
    - Original: title NOT ILIKE '%remix%' AND title NOT ILIKE '%bootleg%' AND title NOT ILIKE '%edit%'
    - Bootleg/Edit: title ILIKE '%bootleg%' OR title ILIKE '%edit%' OR title ILIKE '%flip%'
    - VIP: title ILIKE '%vip%'
    - Mix/Set: duration > 900000 AND (title ILIKE '%mix%' OR title ILIKE '%set%')

12. Tag search (combine with genre):
    WHERE genre ILIKE '%X%' OR '%X%' = ANY(tags)

13. Label search:
    WHERE label ILIKE '%monstercat%'

14. Combine multiple conditions with AND/OR as needed.

IMPORTANT:
- For "similar to" or "like [artist]" queries: identify the artist's typical genres and search those, excluding the artist
- Never invent genres - use only from the list above
- If unsure about genre, use broader terms like 'electronic' or 'bass'
- For French queries, translate the intent to SQL (e.g., "morceaux récents" = recent tracks)`

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

  // Log token usage
  const usage = message.usage
  const cacheRead = (usage as { cache_read_input_tokens?: number }).cache_read_input_tokens || 0
  const cacheCreation = (usage as { cache_creation_input_tokens?: number }).cache_creation_input_tokens || 0
  logger.ai.tokens(usage.input_tokens, usage.output_tokens, cacheRead, cacheCreation)

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

  if (!supabaseUrl || !supabaseKey) {
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

  return { sql, results: Array.isArray(data) ? data : [] }
}
