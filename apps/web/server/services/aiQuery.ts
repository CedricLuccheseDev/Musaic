import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { logger } from '~/server/utils/logger'

// Validate SQL query structure
function validateSql(sql: string): boolean {
  const lower = sql.toLowerCase().trim()
  if (!lower.startsWith('select') && !lower.startsWith('with')) return false
  if (!lower.includes('from tracks') && !lower.includes('find_similar_tracks')) return false
  return true
}

// Escape user input for SQL fallback (prevent injection)
function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\')
}

// Keywords that indicate user wants to download tracks
const DOWNLOAD_KEYWORDS = [
  'télécharger', 'telecharger', 'download', 'dl',
  'gratuit', 'gratos', 'free',
  'zip', 'pack',
  'free download', 'free dl', 'freedl'
]

// Detect if user wants to download tracks
function detectDownloadIntent(query: string): boolean {
  const lower = query.toLowerCase()
  return DOWNLOAD_KEYWORDS.some(keyword => lower.includes(keyword))
}

// System prompt for SQL + response generation - lightweight and generic
const SYSTEM_PROMPT = `Music search SQL generator. Output strict JSON only.

RESPONSE FORMAT:
{
  "sql": "SELECT * FROM tracks WHERE ...",
  "phrase": "Short response in user's language",
  "soundcloudQuery": "Keywords for SoundCloud search",
  "soundcloudFilters": {"genres": "genre1,genre2", "bpm": {"from": 130, "to": 150}},
  "needsClarification": false,
  "clarificationQuestion": "Question if ambiguous",
  "clarificationOptions": [{"label": "Option", "query": "refined query"}]
}

SCHEMA:
tracks(soundcloud_id, title, artist, genre, duration, download_status, playback_count, tags[], label,
  bpm_detected, key_detected, energy, valence, danceability, instrumentalness, spectral_centroid,
  analysis_status, embedding vector(1280))

RULES:
1. Use your music knowledge to understand ANY genre, style, mood, or artist
2. Use ILIKE '%term%' for text matching, combine with OR for related terms
3. For audio features (energy, valence, etc.), require analysis_status='completed'
4. For similarity: find_similar_tracks(track_id, limit) RPC function
5. Artist name alone → keep soundcloudQuery as just the name
6. Default: ORDER BY playback_count DESC LIMIT 20

AUDIO FEATURES (0-1 scale, require analysis_status='completed'):
- energy: intensity (>0.7=high, <0.4=low)
- valence: mood (>0.7=happy, <0.3=sad)
- spectral_centroid: brightness in Hz (>3000=bright, <1500=dark)
- instrumentalness: (>0.7=no vocals)
- danceability, acousticness, speechiness, liveness

CLARIFICATION:
If query is too broad or ambiguous (e.g. "electronic", "good vibes", "something to dance"),
set needsClarification=true and provide relevant options based on your music knowledge.
Keep option labels SHORT and SIMPLE (just the genre/style name, no modifiers like "aggressive", "melodic", etc.).
The query field should also be simple (e.g. "dubstep" not "aggressive dubstep").

EXAMPLES:
- "chill dubstep" → {"sql":"SELECT * FROM tracks WHERE genre ILIKE '%dubstep%' AND energy < 0.5 AND analysis_status='completed' ORDER BY playback_count DESC LIMIT 20","phrase":"Voici du dubstep chill","soundcloudQuery":"melodic dubstep chill","needsClarification":false}
- "Skrillex" → {"sql":"SELECT * FROM tracks WHERE artist ILIKE '%skrillex%' ORDER BY playback_count DESC LIMIT 20","phrase":"Tracks by Skrillex","soundcloudQuery":"skrillex","needsClarification":false}
- "electronic music" → {"needsClarification":true,"clarificationQuestion":"Quel style d'électro ?","clarificationOptions":[{"label":"House","query":"house music"},{"label":"Techno","query":"techno"},{"label":"Dubstep","query":"dubstep"},{"label":"Ambient","query":"ambient electronic"}],"sql":"","phrase":"","soundcloudQuery":""}
- "free downloads dubstep" → {"sql":"SELECT * FROM tracks WHERE genre ILIKE '%dubstep%' AND download_status IN ('FreeDirectLink','FreeExternalLink') ORDER BY playback_count DESC LIMIT 20","phrase":"Dubstep gratuit pour toi","soundcloudQuery":"dubstep free download","needsClarification":false}

Respond in user's language. No emojis.`

export interface SoundcloudFilters {
  genres?: string
  bpm?: { from: number; to: number }
}

export interface ClarificationOption {
  label: string
  query: string
}

export interface AiQueryResult {
  sql: string
  phrase: string
  soundcloudQuery: string
  soundcloudFilters?: SoundcloudFilters
  wantsDownload?: boolean
  needsClarification?: boolean
  clarificationQuestion?: string
  clarificationOptions?: ClarificationOption[]
}

// Internal function to call the AI API
async function callAiApi(question: string): Promise<AiQueryResult> {
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
    max_tokens: 250,
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

  const result = JSON.parse(text) as AiQueryResult

  // Handle clarification case
  if (result.needsClarification) {
    return {
      sql: '',
      phrase: '',
      soundcloudQuery: '',
      needsClarification: true,
      clarificationQuestion: result.clarificationQuestion || '',
      clarificationOptions: result.clarificationOptions || []
    }
  }

  return {
    sql: result.sql || '',
    phrase: result.phrase || '',
    soundcloudQuery: result.soundcloudQuery || question,
    soundcloudFilters: result.soundcloudFilters || undefined,
    needsClarification: false
  }
}

// Create a simple fallback query for search
function createFallbackQuery(question: string): AiQueryResult {
  const escaped = escapeSqlString(question)
  return {
    sql: `SELECT * FROM tracks WHERE title ILIKE '%${escaped}%' OR artist ILIKE '%${escaped}%' ORDER BY playback_count DESC LIMIT 20`,
    phrase: '',
    soundcloudQuery: question,
    soundcloudFilters: undefined
  }
}

// Main function with retry and validation
export async function generateSqlAndPhrase(question: string, retries = 1): Promise<AiQueryResult> {
  const wantsDownload = detectDownloadIntent(question)

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await callAiApi(question)

      // Clarification doesn't need SQL validation
      if (result.needsClarification) {
        return { ...result, wantsDownload }
      }

      // Validate SQL structure
      if (validateSql(result.sql)) {
        return { ...result, wantsDownload }
      }

      // Invalid SQL, retry if attempts left
      if (attempt < retries) {
        logger.ai.error(`Invalid SQL structure, retrying (${attempt + 1}/${retries})`)
        continue
      }
    } catch (err) {
      // Parse error or API error, retry if attempts left
      if (attempt < retries) {
        logger.ai.error(`AI error, retrying (${attempt + 1}/${retries}): ${err instanceof Error ? err.message : 'Unknown'}`)
        continue
      }
    }
  }

  // All retries failed, return fallback
  logger.ai.error('All retries failed, using fallback query')
  return { ...createFallbackQuery(question), wantsDownload }
}
