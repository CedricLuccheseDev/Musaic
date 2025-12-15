import { logger } from '~/server/utils/logger'

interface AnalyzeRequest {
  soundcloud_ids: number[]
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const analyzerUrl = config.analyzerUrl as string

  if (!analyzerUrl) {
    throw createError({
      statusCode: 503,
      message: 'Analyzer service not configured'
    })
  }

  const body = await readBody<AnalyzeRequest>(event)

  if (!body.soundcloud_ids || !Array.isArray(body.soundcloud_ids) || body.soundcloud_ids.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'soundcloud_ids array required'
    })
  }

  // Limit batch size
  const ids = body.soundcloud_ids.slice(0, 100)

  try {
    const response = await fetch(`${analyzerUrl}/analyze/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soundcloud_ids: ids })
    })

    if (!response.ok) {
      const error = await response.text()
      logger.server.error(`Analyzer error: ${error}`)
      throw createError({
        statusCode: response.status,
        message: `Analyzer error: ${error}`
      })
    }

    const result = await response.json()
    return result
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    logger.server.error(`Analyzer unreachable: ${error}`)
    throw createError({
      statusCode: 503,
      message: 'Analyzer service unavailable'
    })
  }
})
