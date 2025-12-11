import { generateSqlQuery } from '~/server/services/aiQuery'
import { createClient } from '@supabase/supabase-js'
import type { DownloadStatus, TrackEntry } from '~/types/track'

// Database record format (snake_case)
interface DbTrack {
  soundcloud_id: number
  urn: string
  permalink_url: string
  title: string
  artist: string
  artwork: string | null
  duration: number
  genre: string | null
  description: string | null
  soundcloud_created_at: string | null
  label: string | null
  tags: string[]
  playback_count: number
  likes_count: number
  reposts_count: number
  comment_count: number
  download_status: string
  downloadable: boolean
  download_url: string | null
  purchase_url: string | null
  purchase_title: string | null
}

// Convert DB format to TrackEntry format
function dbTrackToTrackEntry(db: DbTrack): TrackEntry {
  return {
    id: db.soundcloud_id,
    urn: db.urn,
    permalink_url: db.permalink_url,
    title: db.title,
    artist: db.artist,
    artwork: db.artwork,
    duration: db.duration,
    genre: db.genre,
    description: db.description,
    created_at: db.soundcloud_created_at,
    label: db.label,
    tags: db.tags || [],
    playback_count: db.playback_count,
    likes_count: db.likes_count,
    reposts_count: db.reposts_count,
    comment_count: db.comment_count,
    downloadStatus: db.download_status as DownloadStatus,
    downloadable: db.downloadable,
    download_url: db.download_url,
    purchase_url: db.purchase_url,
    purchase_title: db.purchase_title
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { question } = body

  if (!question || typeof question !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Missing question'
    })
  }

  try {
    // Generate SQL from natural language
    const sql = await generateSqlQuery(question)

    // Validate SQL (security check)
    const sqlLower = sql.toLowerCase().trim()
    const forbidden = ['drop', 'delete', 'update', 'insert', 'alter', 'truncate', 'create']
    if (forbidden.some(word => sqlLower.includes(word))) {
      return { sql, results: [], error: 'Only SELECT queries are allowed' }
    }

    if (!sqlLower.startsWith('select')) {
      return { sql, results: [], error: 'Only SELECT queries are allowed' }
    }

    // Execute the query via RPC
    const config = useRuntimeConfig()
    const supabase = createClient(config.public.supabase.url, config.public.supabase.key)

    const { data, error } = await supabase.rpc('exec_sql', { query: sql })

    if (error) {
      console.error('[AI Query] RPC error:', error.message)
      return { sql, results: [], error: error.message }
    }

    const isDev = process.env.DEV === 'true'

    // Transform DB results to TrackEntry format
    const results = (data || []).map((row: DbTrack) => dbTrackToTrackEntry(row))

    return {
      sql: isDev ? sql : undefined,
      results
    }
  } catch (err) {
    console.error('[AI Query] Error:', err)
    throw createError({
      statusCode: 500,
      message: err instanceof Error ? err.message : 'Failed to generate query'
    })
  }
})
