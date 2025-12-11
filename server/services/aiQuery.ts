import Anthropic from '@anthropic-ai/sdk'

const SCHEMA = `Table: tracks
Columns:
- soundcloud_id (BIGINT, PRIMARY KEY)
- title (TEXT)
- artist (TEXT)
- genre (TEXT) - ex: "Electronic", "House", "Techno", "Hip-hop", "Dubstep", "Drum & Bass", "Ambient"
- duration (INTEGER, milliseconds)
- download_status (TEXT: 'FreeDirectLink', 'FreeExternalLink', 'No')
- downloadable (BOOLEAN)
- playback_count (INTEGER)
- likes_count (INTEGER)
- tags (TEXT[]) - array of keywords like "remix", "chill", "bass", "vocal", "instrumental", "dark", "melodic"
- soundcloud_created_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ, when added to our db)
- updated_at (TIMESTAMPTZ)`

const SYSTEM_PROMPT = `Tu es un assistant SQL pour une app de musique. Génère UNIQUEMENT une requête SQL PostgreSQL valide.

Règles:
- Table: tracks
- TOUJOURS utiliser SELECT * FROM tracks (jamais de colonnes spécifiques)
- Utilise ILIKE pour les recherches texte insensibles à la casse
- Limite TOUJOURS à 10 résultats max (LIMIT 10), même si l'utilisateur demande plus
- Pour les durées, convertis en millisecondes (1 min = 60000ms)
- Réponds UNIQUEMENT avec le SQL, sans explication ni markdown

Recherche avancée avec tags et genre:
- Pour les styles/ambiances, combine genre ET tags: WHERE genre ILIKE '%house%' OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE '%house%')
- Pour chercher dans les tags (array): EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE '%keyword%')
- Combine plusieurs critères pour des requêtes précises: "techno sombre" → genre ILIKE '%techno%' AND EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE '%dark%')
- Synonymes courants: chill/relaxing, energetic/upbeat, dark/deep, melodic/emotional`

export async function generateSqlQuery(question: string): Promise<string> {
  const config = useRuntimeConfig()
  const apiKey = config.anthropicApiKey

  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY')
  }

  const anthropic = new Anthropic({ apiKey })

  const message = await anthropic.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${SCHEMA}\n\nQuestion: ${question}`
      }
    ]
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
  const supabaseUrl = config.public.supabase.url
  const supabaseKey = config.public.supabase.key

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
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

  const { data, error } = await supabase.rpc('exec_sql', { query: sql }).single()

  if (error) {
    // If RPC doesn't exist, try raw query via PostgREST
    // For now, return the SQL and let frontend handle it
    return { sql, results: [], error: error.message }
  }

  return { sql, results: data || [] }
}
