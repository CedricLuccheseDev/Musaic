import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { logger } from '~/server/utils/logger'

// System prompt for SQL + response generation in one call
const SYSTEM_PROMPT = `SQL and response generator for music search. Output JSON only.

OUTPUT FORMAT (strict JSON, no markdown):
{"sql":"SELECT ...","phrase":"Short response in user's language"}

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

PHRASE RULES:
- Under 15 words, same language as query
- Conversational, music-related
- No emojis

EXAMPLES:
User: "chill dubstep" → {"sql":"SELECT * FROM tracks WHERE genre ILIKE '%dubstep%' ORDER BY playback_count DESC LIMIT 20","phrase":"Voici du dubstep chill pour toi"}
User: "tracks like Excision" → {"sql":"SELECT * FROM tracks WHERE (genre ILIKE '%dubstep%' OR genre ILIKE '%riddim%') AND artist NOT ILIKE '%excision%' ORDER BY playback_count DESC LIMIT 20","phrase":"Heavy bass tracks similar to Excision"}

For French queries, translate intent to SQL and respond in French.`

export interface AiQueryResult {
  sql: string
  phrase: string
}

export async function generateSqlAndPhrase(question: string): Promise<AiQueryResult> {
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
    max_tokens: 300,
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

  // Parse JSON response
  let text = content.text.trim()
  // Remove markdown if present
  text = text.replace(/^```json\n?/i, '').replace(/\n?```$/i, '')

  try {
    const result = JSON.parse(text) as AiQueryResult
    return {
      sql: result.sql || '',
      phrase: result.phrase || ''
    }
  } catch {
    // Fallback: try to extract SQL if JSON parsing fails
    const sqlMatch = text.match(/SELECT[\s\S]+?(?:LIMIT \d+|$)/i)
    return {
      sql: sqlMatch ? sqlMatch[0] : text,
      phrase: ''
    }
  }
}
