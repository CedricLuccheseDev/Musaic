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

// System prompt for SQL + response generation in one call
const SYSTEM_PROMPT = `SQL and response generator for music search. Output JSON only.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "sql": "SELECT ...",
  "phrase": "Short response in user's language",
  "soundcloudQuery": "optimized search query for SoundCloud API",
  "soundcloudFilters": {
    "genres": "genre1,genre2",
    "bpm": { "from": 130, "to": 150 }
  }
}

SOUNDCLOUD QUERY RULES:
- soundcloudQuery: reformulate user intent into effective SoundCloud search keywords
- soundcloudFilters.genres: comma-separated SC genres (dubstep, house, techno, drum-n-bass, trap, etc.) - only if clearly relevant
- soundcloudFilters.bpm: only if user mentions BPM or tempo-related terms
- Keep soundcloudQuery short (3-6 keywords max)
- IMPORTANT: If query looks like an ARTIST NAME (single word, proper noun, username-like), keep it AS-IS without adding genre keywords
- Only add genre/style keywords when user explicitly mentions genres or describes a mood/vibe
- Artist name examples to keep as-is: "Quyver", "Skrillex", "Netsky", "Illenium" → soundcloudQuery should be the artist name only

SCHEMA: tracks(soundcloud_id PK, title, artist, genre, duration ms, download_status, downloadable, playback_count, likes_count, tags[], soundcloud_created_at, label,
  -- Audio analysis (from Essentia via musaic-analyzer)
  bpm_detected, bpm_confidence, key_detected, key_confidence,
  energy, loudness, dynamic_complexity,
  danceability, speechiness, instrumentalness, acousticness, valence, liveness,
  spectral_centroid, dissonance,
  analysis_status TEXT: pending/processing/completed/failed,
  -- Audio embedding for similarity search (1280 dimensions, cosine distance)
  embedding vector(1280))

DEFAULTS: SELECT * FROM tracks, ILIKE for text, ORDER BY playback_count DESC, LIMIT 20 (max 50)

GENRES: dubstep, melodic dubstep, future bass, trap, house, techno, drum and bass, bass house, riddim, electronic, edm, progressive house, deep house, future house, hybrid trap, midtempo, color bass, lo-fi, ambient, hardcore, hardstyle, trance, psytrance, breakbeat, garage, uk garage, jungle, neurofunk, liquid dnb, minimal, industrial

PATTERNS:
- genre simple: WHERE genre ILIKE '%dubstep%'
- genre multiple: WHERE (genre ILIKE '%dubstep%' OR genre ILIKE '%riddim%')
- drum and bass: WHERE (genre ILIKE '%drum%bass%' OR genre ILIKE '%dnb%' OR genre ILIKE '%d&b%' OR genre ILIKE '%jungle%' OR genre ILIKE '%neurofunk%' OR genre ILIKE '%liquid%')
- artist: WHERE artist ILIKE '%skrillex%'
- artist + genre: WHERE artist ILIKE '%netsky%' AND (genre ILIKE '%dnb%' OR genre ILIKE '%drum%bass%')
- label: WHERE label ILIKE '%hospital%'
- no vocals: WHERE instrumentalness > 0.7 AND analysis_status='completed'
- title: WHERE title ILIKE '%memories%'
- similar to artist: WHERE (genre ILIKE '%melodic dubstep%' OR genre ILIKE '%future bass%') AND artist NOT ILIKE '%artistname%'
- free: WHERE download_status IN ('FreeDirectLink','FreeExternalLink')
- bpm: WHERE bpm_detected BETWEEN 140 AND 150 AND analysis_status='completed'
- key: WHERE key_detected ILIKE '%A minor%' AND analysis_status='completed'
- energetic: WHERE energy > 0.7 AND analysis_status='completed'
- chill/relaxed: WHERE energy < 0.4 AND analysis_status='completed'
- danceable: WHERE danceability > 0.7 AND analysis_status='completed'
- happy/positive: WHERE valence > 0.7 AND analysis_status='completed'
- sad/melancholic: WHERE valence < 0.3 AND analysis_status='completed'
- acoustic: WHERE acousticness > 0.7 AND analysis_status='completed'
- electronic: WHERE acousticness < 0.3 AND analysis_status='completed'
- instrumental: WHERE instrumentalness > 0.7 AND analysis_status='completed'
- vocal: WHERE speechiness > 0.3 AND analysis_status='completed'
- live: WHERE liveness > 0.7 AND analysis_status='completed'
- bright: WHERE spectral_centroid > 3000 AND analysis_status='completed'
- dark: WHERE spectral_centroid < 1500 AND analysis_status='completed'
- recent: ORDER BY soundcloud_created_at DESC
- duration: <3min=<180000, 3-7min=180000-420000, >15min=>900000
- remix: title ILIKE '%remix%'
- original: title NOT ILIKE '%remix%' AND title NOT ILIKE '%bootleg%' AND title NOT ILIKE '%edit%'
- bootleg/edit: title ILIKE '%bootleg%' OR title ILIKE '%edit%' OR title ILIKE '%flip%'
- vip: title ILIKE '%vip%'
- mix/set: duration > 900000 AND (title ILIKE '%mix%' OR title ILIKE '%set%')
- tags: '%x%'=ANY(tags)
- label: WHERE label ILIKE '%monstercat%'

SIMILARITY SEARCH (use RPC function for "similar to track" queries):
- Use find_similar_tracks(source_track_id, limit_count) RPC function
- For "tracks similar to [track name]": first find the track, then use RPC
- Example: SELECT * FROM find_similar_tracks((SELECT soundcloud_id FROM tracks WHERE title ILIKE '%track name%' LIMIT 1), 20)
- For "similar artists to [artist]": use embedding average comparison
- Example: WITH artist_emb AS (SELECT AVG(embedding) as e FROM tracks WHERE artist ILIKE '%artist%' AND embedding IS NOT NULL) SELECT DISTINCT ON (artist) * FROM tracks t, artist_emb WHERE t.embedding IS NOT NULL AND t.artist NOT ILIKE '%artist%' ORDER BY artist, t.embedding <=> artist_emb.e LIMIT 20

AUDIO ANALYSIS (NULL if not analyzed, ALWAYS require analysis_status='completed' when filtering):
- bpm_detected: BPM (60-200)
- key_detected: musical key (e.g., "A minor", "C major")
- energy: intensity 0-1 (0.7+=high, 0.3-=low)
- danceability: groove/rhythm 0-1
- valence: mood 0-1 (1=happy, 0=sad)
- acousticness: acoustic vs electronic 0-1
- instrumentalness: instrumental vs vocal 0-1
- speechiness: voice presence 0-1
- liveness: live recording probability 0-1
- spectral_centroid: brightness in Hz (>3000=bright, <1500=dark)
- dissonance: harmonic tension 0-1
- embedding: 1280-dim audio feature vector for similarity (cosine distance <=> operator, lower=more similar)

PHRASE RULES:
- Under 15 words, same language as query
- Conversational, music-related
- No emojis

EXAMPLES:
User: "chill dubstep"
→ {"sql":"SELECT * FROM tracks WHERE genre ILIKE '%dubstep%' AND energy < 0.5 AND analysis_status='completed' ORDER BY playback_count DESC LIMIT 20","phrase":"Voici du dubstep chill pour toi","soundcloudQuery":"melodic dubstep chill","soundcloudFilters":{"genres":"dubstep"}}

User: "tracks like Excision"
→ {"sql":"SELECT * FROM tracks WHERE (genre ILIKE '%dubstep%' OR genre ILIKE '%riddim%') AND artist NOT ILIKE '%excision%' ORDER BY playback_count DESC LIMIT 20","phrase":"Heavy bass tracks similar to Excision","soundcloudQuery":"excision dubstep heavy bass","soundcloudFilters":{"genres":"dubstep"}}

User: "dubstep 140 bpm"
→ {"sql":"SELECT * FROM tracks WHERE genre ILIKE '%dubstep%' AND bpm_detected BETWEEN 135 AND 145 AND analysis_status='completed' ORDER BY playback_count DESC LIMIT 20","phrase":"Dubstep tracks around 140 BPM","soundcloudQuery":"dubstep","soundcloudFilters":{"genres":"dubstep","bpm":{"from":135,"to":145}}}

User: "happy uplifting music"
→ {"sql":"SELECT * FROM tracks WHERE valence > 0.7 AND energy > 0.6 AND analysis_status='completed' ORDER BY playback_count DESC LIMIT 20","phrase":"Uplifting tracks to boost your mood","soundcloudQuery":"uplifting happy melodic edm","soundcloudFilters":{}}

User: "je veux du riddim agressif"
→ {"sql":"SELECT * FROM tracks WHERE genre ILIKE '%riddim%' AND energy > 0.7 AND analysis_status='completed' ORDER BY playback_count DESC LIMIT 20","phrase":"Du riddim bien lourd pour toi","soundcloudQuery":"riddim heavy aggressive bass","soundcloudFilters":{"genres":"dubstep"}}

User: "artistes similaires à Illenium"
→ {"sql":"WITH artist_emb AS (SELECT AVG(embedding) as e FROM tracks WHERE artist ILIKE '%illenium%' AND embedding IS NOT NULL) SELECT DISTINCT ON (artist) * FROM tracks t, artist_emb WHERE t.embedding IS NOT NULL AND t.artist NOT ILIKE '%illenium%' ORDER BY artist, t.embedding <=> artist_emb.e LIMIT 20","phrase":"Artistes au son proche d'Illenium","soundcloudQuery":"illenium melodic dubstep future bass","soundcloudFilters":{"genres":"dubstep,future-bass"}}

User: "drum & bass"
→ {"sql":"SELECT * FROM tracks WHERE (genre ILIKE '%drum%bass%' OR genre ILIKE '%dnb%' OR genre ILIKE '%d&b%') ORDER BY playback_count DESC LIMIT 20","phrase":"Drum and bass tracks for you","soundcloudQuery":"drum and bass dnb","soundcloudFilters":{"genres":"drum-n-bass"}}

User: "liquid dnb chill"
→ {"sql":"SELECT * FROM tracks WHERE (genre ILIKE '%liquid%' OR genre ILIKE '%drum%bass%' OR genre ILIKE '%dnb%') AND energy < 0.5 AND analysis_status='completed' ORDER BY playback_count DESC LIMIT 20","phrase":"Smooth liquid drum and bass vibes","soundcloudQuery":"liquid drum bass chill atmospheric","soundcloudFilters":{"genres":"drum-n-bass"}}

User: "Netsky liquid"
→ {"sql":"SELECT * FROM tracks WHERE artist ILIKE '%netsky%' OR (genre ILIKE '%liquid%' AND (genre ILIKE '%dnb%' OR genre ILIKE '%drum%bass%')) ORDER BY playback_count DESC LIMIT 20","phrase":"Netsky and liquid dnb","soundcloudQuery":"netsky liquid drum bass","soundcloudFilters":{"genres":"drum-n-bass"}}

User: "bass sans vocals"
→ {"sql":"SELECT * FROM tracks WHERE (genre ILIKE '%bass%' OR genre ILIKE '%dubstep%') AND instrumentalness > 0.7 AND analysis_status='completed' ORDER BY playback_count DESC LIMIT 20","phrase":"Bass music instrumental","soundcloudQuery":"instrumental bass dubstep","soundcloudFilters":{"genres":"dubstep"}}

User: "Quyver"
→ {"sql":"SELECT * FROM tracks WHERE artist ILIKE '%quyver%' ORDER BY playback_count DESC LIMIT 20","phrase":"Tracks by Quyver","soundcloudQuery":"quyver","soundcloudFilters":{}}

User: "Hospital Records"
→ {"sql":"SELECT * FROM tracks WHERE label ILIKE '%hospital%' ORDER BY playback_count DESC LIMIT 20","phrase":"Tracks from Hospital Records","soundcloudQuery":"hospital records dnb","soundcloudFilters":{"genres":"drum-n-bass"}}

For French queries, translate intent to SQL and respond in French.`

export interface SoundcloudFilters {
  genres?: string
  bpm?: { from: number; to: number }
}

export interface AiQueryResult {
  sql: string
  phrase: string
  soundcloudQuery: string
  soundcloudFilters?: SoundcloudFilters
  wantsDownload?: boolean
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
  return {
    sql: result.sql || '',
    phrase: result.phrase || '',
    soundcloudQuery: result.soundcloudQuery || question,
    soundcloudFilters: result.soundcloudFilters || undefined
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
