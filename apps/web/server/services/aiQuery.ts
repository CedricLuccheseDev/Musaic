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

// System prompt for SQL + response generation - optimized for interpretation
const SYSTEM_PROMPT = `Music search SQL generator. Output strict JSON only.

OUTPUT: {"sql":"SELECT...","phrase":"response","soundcloudQuery":"keywords","soundcloudFilters":{},"needsClarification":false}

SCHEMA: tracks(soundcloud_id,title,artist,genre,tags[],label,playback_count,duration,download_status,bpm_detected,key_detected,analysis_status)

INTERPRETATION PRIORITY (follow this order):
1. KNOWN GENRE? (house,techno,dubstep,dnb,trap,trance,ambient,etc) → genre ILIKE '%x%'
2. BPM REQUEST? (fast,slow,140bpm) → use bpm_detected filter
3. KEY REQUEST? (C major, Am) → use key_detected filter
4. OTHERWISE → ASSUME ARTIST NAME → artist ILIKE '%x%'

PATTERN RECOGNITION (user says → interpret as):
- "comme X", "style X", "genre de X", "à la X", "like X", "similar to X" → artist search for X
- "récent", "nouveau", "2024", "2025", "fresh" → soundcloudFilters.created_at:"last_month"
- "gratuit", "free", "dl", "télécharger" → download_status IN (...) + soundcloudFilters.license:"to_share"
- "rapide", "fast", "140bpm" → bpm_detected > 135 or extract BPM number
- "lent", "slow" → bpm_detected < 100

RULES:
- ILIKE always '%term%' (NEVER '0term%')
- Default: ORDER BY playback_count DESC LIMIT 20
- Unknown single word = artist name (not title search!)

SOUNDCLOUD FILTERS (pass in soundcloudFilters when relevant):
- genres: genre name for filter.genre_or_tag
- created_at: "last_week"|"last_month"|"last_year"
- license: "to_share" for free downloads
- bpm: {from:X,to:Y}

EXAMPLES:
"techno" → sql:genre ILIKE '%techno%', scQuery:"techno", scFilters:{genres:"Techno"}
"Quyver" → sql:artist ILIKE '%quyver%', scQuery:"quyver" (unknown word = artist)
"comme Rezz" → sql:artist ILIKE '%rezz%', scQuery:"rezz"
"dubstep gratuit récent" → sql:genre ILIKE '%dubstep%' AND download_status IN ('FreeDirectLink','FreeExternalLink'), scFilters:{genres:"Dubstep",license:"to_share",created_at:"last_month"}
"electronic" → needsClarification:true, question:"Quel style?", options:[House,Techno,Dubstep]

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
