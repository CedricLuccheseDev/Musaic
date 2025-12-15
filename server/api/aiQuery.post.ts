import { generateSqlAndPhrase } from '~/server/services/aiQuery'
import { createClient } from '@supabase/supabase-js'
import type { DownloadStatus, TrackEntry } from '~/types/track'
import { logger } from '~/server/utils/logger'

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
  purchase_url: string | null
  purchase_title: string | null
  // Audio analysis fields
  bpm_detected: number | null
  bpm_confidence: number | null
  key_detected: string | null
  key_confidence: number | null
  energy: number | null
  loudness: number | null
  dynamic_complexity: number | null
  danceability: number | null
  speechiness: number | null
  instrumentalness: number | null
  acousticness: number | null
  valence: number | null
  liveness: number | null
  spectral_centroid: number | null
  dissonance: number | null
  analysis_status: string | null
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
    purchase_url: db.purchase_url,
    purchase_title: db.purchase_title,
    // Audio analysis fields
    bpm_detected: db.bpm_detected,
    bpm_confidence: db.bpm_confidence,
    beats_count: null,
    onset_rate: null,
    key_detected: db.key_detected,
    key_confidence: db.key_confidence,
    tuning_frequency: null,
    energy: db.energy,
    loudness: db.loudness,
    dynamic_complexity: db.dynamic_complexity,
    spectral_centroid: db.spectral_centroid,
    spectral_complexity: null,
    dissonance: db.dissonance,
    pitch_salience: null,
    danceability: db.danceability,
    speechiness: db.speechiness,
    instrumentalness: db.instrumentalness,
    acousticness: db.acousticness,
    valence: db.valence,
    liveness: db.liveness,
    analysis_status: db.analysis_status as TrackEntry['analysis_status'],
    analysis_error: null,
    analyzed_at: null
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
    // Generate SQL and phrase from natural language (single AI call)
    const aiResult = await generateSqlAndPhrase(question)
    const sql = aiResult.sql.trim().replace(/;+$/, '')
    const phrase = aiResult.phrase

    logger.ai.query(question)
    logger.ai.sql(sql)

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
    const supabaseUrl = config.supabaseUrl as string
    const supabaseKey = config.supabaseKey as string

    if (!supabaseUrl || !supabaseKey) {
      return { sql, results: [], error: 'Supabase not configured' }
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase.rpc('exec', { query: sql })

    if (error) {
      logger.ai.error(error.message)
      return { sql, results: [], error: error.message }
    }

    const isDev = process.env.DEV === 'true'

    // Transform DB results to TrackEntry format
    const results = (data || []).map((row: DbTrack) => dbTrackToTrackEntry(row))

    logger.ai.result(results.length, phrase)

    return {
      sql: isDev ? sql : undefined,
      results,
      response: phrase
    }
  } catch (err) {
    logger.ai.error(err instanceof Error ? err.message : 'Unknown error')
    throw createError({
      statusCode: 500,
      message: err instanceof Error ? err.message : 'Failed to generate query'
    })
  }
})
