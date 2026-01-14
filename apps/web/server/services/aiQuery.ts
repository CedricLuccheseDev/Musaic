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

// Fix common SQL generation errors (auto-correct before validation)
function fixSqlErrors(sql: string): string {
  // Fix ILIKE patterns that use '0' instead of '%' at the start
  // Pattern: ILIKE '0word%' -> ILIKE '%word%'
  let fixed = sql.replace(/ILIKE\s+'0([^']+)'/gi, (_match, content) => {
    const hasEndPercent = content.endsWith('%')
    const cleanContent = hasEndPercent ? content.slice(0, -1) : content
    return `ILIKE '%${cleanContent}%'`
  })

  // Also fix patterns like '%word0' (ending with 0 instead of %)
  fixed = fixed.replace(/ILIKE\s+'%([^']+)0'/gi, (_match, content) => {
    return `ILIKE '%${content}%'`
  })

  return fixed
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
  "soundcloudFilters": {
    "genres": "genre1,genre2",
    "bpm": {"from": 130, "to": 150},
    "created_at": "last_week",
    "license": "to_share"
  },
  "needsClarification": false,
  "clarificationQuestion": "Question if ambiguous",
  "clarificationOptions": [{"label": "Option", "query": "refined query"}]
}

SCHEMA:
tracks(soundcloud_id, title, artist, genre, duration, download_status, playback_count, tags[], label,
  bpm_detected, key_detected, energy, valence, danceability, instrumentalness, spectral_centroid,
  analysis_status, embedding vector(1280))

QUERY TYPE DETECTION:
1. Genre/Tag: "dubstep", "techno récent", "chill house" → WHERE genre ILIKE '%genre%'
2. Artist: Known artist names like "Skrillex", "Rezz" → WHERE artist ILIKE '%name%'
3. Track: "Artist - Title" format → Exact match search
4. Mood/Features: "energetic", "sad", "chill" → Use audio features (energy, valence)

RULES:
- ALWAYS use ILIKE '%term%' for text (NEVER '0term%' or '%term0')
- Genre queries → search genre field + use soundcloudFilters.genres
- Audio features require analysis_status='completed'
- Default ORDER BY playback_count DESC LIMIT 20

SOUNDCLOUD FILTERS (always include in soundcloudFilters when detected):
- created_at: Detect from "recent", "latest", "new", "2025", "2026", "this week/month/year"
  → "last_week" (default for recent), "last_month", "last_year"
- license: Detect from "free", "download", "télécharger", "gratuit", "free dl"
  → "to_share" (for free downloads/sharing)
- genres: Pass genre names directly (will use filter.genre_or_tag internally)

AUDIO FEATURES (0-1 scale, require analysis_status='completed'):
- energy: intensity (>0.7=high, <0.4=low)
- valence: mood (>0.7=happy, <0.3=sad)
- spectral_centroid: brightness in Hz (>3000=bright, <1500=dark)
- instrumentalness: (>0.7=no vocals)
- danceability, acousticness, speechiness, liveness

CLARIFICATION:
If ambiguous (e.g. "electronic"), set needsClarification=true with simple options.

EXAMPLES (CRITICAL: ILIKE '%word%' with percent %, never 0):
- "dubstep récente" → {"sql":"SELECT * FROM tracks WHERE genre ILIKE '%dubstep%' ORDER BY playback_count DESC LIMIT 20","phrase":"Dernières sorties dubstep","soundcloudQuery":"dubstep","soundcloudFilters":{"genres":"Dubstep","created_at":"last_month"},"needsClarification":false}
- "Skrillex" → {"sql":"SELECT * FROM tracks WHERE artist ILIKE '%skrillex%' ORDER BY playback_count DESC LIMIT 20","phrase":"Tracks by Skrillex","soundcloudQuery":"skrillex","needsClarification":false}
- "chill dubstep" → {"sql":"SELECT * FROM tracks WHERE genre ILIKE '%dubstep%' AND energy < 0.5 AND analysis_status='completed' ORDER BY playback_count DESC LIMIT 20","phrase":"Voici du dubstep chill","soundcloudQuery":"melodic dubstep chill","soundcloudFilters":{"genres":"Dubstep"},"needsClarification":false}
- "free dubstep" → {"sql":"SELECT * FROM tracks WHERE genre ILIKE '%dubstep%' AND download_status IN ('FreeDirectLink','FreeExternalLink') ORDER BY playback_count DESC LIMIT 20","phrase":"Dubstep gratuit","soundcloudQuery":"dubstep","soundcloudFilters":{"genres":"Dubstep","license":"to_share"},"needsClarification":false}
- "electronic" → {"needsClarification":true,"clarificationQuestion":"Quel style ?","clarificationOptions":[{"label":"House","query":"house"},{"label":"Techno","query":"techno"},{"label":"Dubstep","query":"dubstep"}],"sql":"","phrase":"","soundcloudQuery":""}

Respond in user's language. No emojis.`

export interface SoundcloudFilters {
  genres?: string
  bpm?: { from: number; to: number }
  created_at?: 'last_hour' | 'last_day' | 'last_week' | 'last_month' | 'last_year'
  license?: 'to_modify_commercially' | 'to_share' | 'to_use_commercially'
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

  // Auto-fix common SQL errors (like '0word%' instead of '%word%')
  const fixedSql = result.sql ? fixSqlErrors(result.sql) : ''

  return {
    sql: fixedSql,
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
