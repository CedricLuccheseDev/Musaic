import { generateSqlAndPhrase } from '~/server/services/aiQuery'
import { createClient } from '@supabase/supabase-js'
import { type DbTrackWithAnalysis, dbTrackToTrackEntry } from '~/types'
import { logger } from '~/server/utils/logger'

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

    const isDev = process.env.NODE_ENV === 'development'

    // Transform DB results to TrackEntry format
    const results = (data || []).map((row: DbTrackWithAnalysis) => dbTrackToTrackEntry(row))

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
