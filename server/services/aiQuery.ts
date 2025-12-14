import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { logger } from '~/server/utils/logger'

// System prompt for response generation
const RESPONSE_SYSTEM_PROMPT = `You generate short, friendly responses for a music search app. Respond in the same language as the user query.

Rules:
- Keep responses under 15 words
- Be conversational and helpful
- Reference what the user asked for
- Use music-related terms naturally
- No emojis, no markdown

Examples:
User: "Find me chill dubstep" (12 results)
Response: "Here are 12 chill dubstep tracks for you"

User: "Cherche moi de la techno récente" (8 results)
Response: "Voici 8 tracks techno récentes pour toi"

User: "Tracks like Excision" (15 results)
Response: "Found 15 heavy bass tracks similar to Excision"

User: "Melodic dubstep with vocals" (0 results)
Response: "No melodic dubstep with vocals found in your library"

User: "20 sons bass music" (20 results)
Response: "Voici 20 sons bass music comme demandé"`

// System prompt for SQL generation (optimized)
const SYSTEM_PROMPT = `SQL generator for music search. Output ONLY PostgreSQL, no markdown.

SCHEMA: tracks(soundcloud_id PK, title, artist, genre, duration ms, download_status, downloadable, playback_count, likes_count, tags[], soundcloud_created_at, bpm, key, label)

DEFAULTS: SELECT * FROM tracks, ILIKE for text, ORDER BY playback_count DESC, LIMIT 20 (max 50)

GENRES: dubstep, melodic dubstep, future bass, trap, house, techno, drum and bass, bass house, riddim, electronic, edm, progressive house, deep house, future house, hybrid trap, midtempo, color bass, lo-fi, ambient, hardcore, hardstyle, trance, psytrance, breakbeat, garage, uk garage, jungle, neurofunk, liquid dnb, minimal, industrial

PATTERNS:
- genre: WHERE genre ILIKE '%dubstep%'
- artist: WHERE artist ILIKE '%skrillex%'
- title: WHERE title ILIKE '%memories%'
- similar to artist: WHERE (genre ILIKE '%melodic dubstep%' OR genre ILIKE '%future bass%') AND artist NOT ILIKE '%artistname%'
- free: WHERE download_status IN ('FreeDirectLink','FreeExternalLink')
- bpm: WHERE bpm BETWEEN 140 AND 150
- key: WHERE key ILIKE '%C minor%' OR key ILIKE '%Cm%'
- recent: ORDER BY soundcloud_created_at DESC
- duration: <3min=<180000, 3-7min=180000-420000, >15min=>900000
- remix: title ILIKE '%remix%'
- original: title NOT ILIKE '%remix%' AND title NOT ILIKE '%bootleg%' AND title NOT ILIKE '%edit%'
- bootleg/edit: title ILIKE '%bootleg%' OR title ILIKE '%edit%' OR title ILIKE '%flip%'
- vip: title ILIKE '%vip%'
- mix/set: duration > 900000 AND (title ILIKE '%mix%' OR title ILIKE '%set%')
- tags: '%x%'=ANY(tags)
- label: WHERE label ILIKE '%monstercat%'

For French queries, translate intent to SQL.`

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

export async function generateAiResponse(question: string, resultCount: number): Promise<string> {
  const config = useRuntimeConfig()
  const apiKey = config.anthropicApiKey

  if (!apiKey) {
    return resultCount > 0 ? `Found ${resultCount} tracks` : 'No results found'
  }

  const anthropic = new Anthropic({ apiKey })

  const messages: MessageParam[] = [
    { role: 'user', content: `User: "${question}" (${resultCount} results)` }
  ]

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 64,
      system: RESPONSE_SYSTEM_PROMPT,
      messages
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return resultCount > 0 ? `Found ${resultCount} tracks` : 'No results found'
    }

    return content.text.trim()
  } catch {
    return resultCount > 0 ? `Found ${resultCount} tracks` : 'No results found'
  }
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
