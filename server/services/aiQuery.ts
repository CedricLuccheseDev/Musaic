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

const SYSTEM_PROMPT = `Tu es un assistant SQL expert pour une app de musique. Génère UNIQUEMENT une requête SQL PostgreSQL valide, sans markdown ni explication.

Règles techniques:
- Table: tracks
- SELECT * FROM tracks
- ILIKE pour recherche texte (case insensitive)
- LIMIT 10 max
- Durées en ms (1 min = 60000ms)

ANALYSE L'INTENTION DE L'UTILISATEUR:

1) Requête RESTRICTIVE (utilise AND entre les critères principaux):
   L'utilisateur veut un type PRÉCIS de contenu. Mots-clés: "trouve-moi des", "je veux des", "que des", "uniquement", "seulement"
   → "mix de Quyver" = veut UNIQUEMENT des mix, pas des tracks normales
   → "remix techno" = veut UNIQUEMENT des remix, dans le style techno
   Exemple: WHERE artist ILIKE '%quyver%' AND (title ILIKE '%mix%' OR title ILIKE '%set%' OR duration > 1200000)

2) Requête EXPLORATOIRE (utilise OR pour élargir):
   L'utilisateur explore ou cherche de manière générale. Mots-clés: "ou", "style", "genre", "comme"
   → "techno ou house" = veut l'un OU l'autre
   → "tracks de Bicep" = veut tout de cet artiste
   Exemple: WHERE genre ILIKE '%techno%' OR genre ILIKE '%house%'

3) Requête "ARTISTES SIMILAIRES" (EXCLURE l'artiste mentionné):
   Mots-clés: "comme", "similaire à", "style de", "dans le genre de", "qui ressemble à"
   → "artistes comme Wooli" = veut des tracks d'artistes AUTRES que Wooli, dans un style similaire
   → "musique comme Deadmau5" = veut des tracks similaires mais PAS de Deadmau5
   IMPORTANT: Quand l'utilisateur dit "comme [artiste]", il veut DÉCOUVRIR d'autres artistes !
   → Utilise AND artist NOT ILIKE '%[artiste]%' pour exclure l'artiste mentionné
   → Cherche dans le même genre/tags que l'artiste mentionné
   Exemple pour "comme Wooli": WHERE (genre ILIKE '%dubstep%' OR EXISTS(SELECT 1 FROM unnest(tags) t WHERE t ILIKE '%bass%')) AND artist NOT ILIKE '%wooli%'

ATTENTION - Vocabulaire musical:
- MIX / DJ SET = enchaînement de plusieurs tracks par un DJ. Dure MINIMUM 15-20min, souvent 1h-2h+
- REMIX = une track retravaillée par un autre artiste. Dure 3-7min comme une track normale
- "Original Mix" = version originale d'une track, PAS un DJ set ! C'est juste l'opposé d'un remix
- Quand l'utilisateur dit "mix" ou "dj set", il veut des LONGS enchaînements, pas des tracks de 5min

CRITÈRE CLÉ POUR LES MIX: LA DURÉE !
- Une track normale dure max ~7min (420000ms)
- Un vrai mix/dj set dure MINIMUM 15min (900000ms), généralement 30min-2h
- Pour chercher des mix: duration > 900000 est ESSENTIEL

TYPES DE CONTENU (pour filtrage strict):
- mix/dj set: duration > 900000 AND title NOT ILIKE '%remix%' AND title NOT ILIKE '%original mix%'
- remix: title ILIKE '%remix%' AND title NOT ILIKE '%original mix%'
- bootleg/edit: title ILIKE '%bootleg%' OR title ILIKE '% edit%' OR title ILIKE '%flip%'
- live: title ILIKE '%live%' OR title ILIKE '% @ %'
- original/track normale: duration < 480000

DURÉES DE RÉFÉRENCE:
- Track normale: 3-7min (180000-420000ms)
- Mix court: 15-30min (900000-1800000ms)
- Mix moyen: 30min-1h (1800000-3600000ms)
- Long mix: 1h+ (> 3600000ms)

GENRES (cherche dans genre ET tags):
(genre ILIKE '%house%' OR EXISTS(SELECT 1 FROM unnest(tags) t WHERE t ILIKE '%house%'))

TÉLÉCHARGEMENT GRATUIT:
- Quand l'utilisateur dit "gratuit", "free", "téléchargeable", "download", "à télécharger" → filtrer sur download_status
- download_status = 'FreeDirectLink' : téléchargement gratuit direct sur SoundCloud
- download_status = 'FreeExternalLink' : téléchargement gratuit via lien externe (Hypeddit, etc.)
- download_status = 'No' : pas de téléchargement gratuit disponible
- Pour les tracks gratuites: WHERE download_status IN ('FreeDirectLink', 'FreeExternalLink')
- Pour les tracks avec lien direct uniquement: WHERE download_status = 'FreeDirectLink'

Tri par défaut: ORDER BY playback_count DESC`

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

  const { data, error } = await supabase.rpc('exec_sql', { query: sql }).single()

  if (error) {
    // If RPC doesn't exist, try raw query via PostgREST
    // For now, return the SQL and let frontend handle it
    return { sql, results: [], error: error.message }
  }

  return { sql, results: data || [] }
}
