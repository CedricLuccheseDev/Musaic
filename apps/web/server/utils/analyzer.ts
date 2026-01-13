/**
 * Analyzer service utility
 * Centralizes communication with the musaic-analyzer service
 */

import { logger } from '~/server/utils/logger'

export interface AnalyzeOptions {
  timeout?: number
  batchSize?: number
}

export interface AnalyzeResponse {
  message: string
  sent?: number
  soundcloud_ids?: number[]
}

/**
 * Validates that the analyzer service is configured
 * Throws error if configuration is missing
 */
export function validateAnalyzerConfig(): string {
  const config = useRuntimeConfig()
  const analyzerUrl = config.analyzerUrl as string

  if (!analyzerUrl) {
    throw createError({
      statusCode: 503,
      message: 'Analyzer service not configured. Check ANALYZER_URL environment variable.'
    })
  }

  return analyzerUrl
}

/**
 * Send analysis request to the analyzer service
 * @param soundcloudIds Array of SoundCloud track IDs to analyze
 * @param options Optional configuration (timeout, batch size)
 * @returns Analyzer response
 */
export async function sendAnalysisRequest(
  soundcloudIds: number[],
  options?: AnalyzeOptions
): Promise<AnalyzeResponse> {
  const analyzerUrl = validateAnalyzerConfig()

  if (!soundcloudIds || soundcloudIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'soundcloud_ids array cannot be empty'
    })
  }

  // Apply batch size limit (default 100)
  const batchSize = options?.batchSize || 100
  const ids = soundcloudIds.slice(0, batchSize)

  try {
    const controller = new AbortController()
    const timeout = options?.timeout || 30000 // 30 seconds default

    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(`${analyzerUrl}/analyze/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soundcloud_ids: ids }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Analyzer', `Request failed (${response.status}): ${errorText}`)

      throw createError({
        statusCode: response.status,
        message: `Analyzer error: ${errorText}`
      })
    }

    const result = await response.json() as AnalyzeResponse
    return result
  } catch (error) {
    // Re-throw if it's already a createError result
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('Analyzer', 'Request timeout')
      throw createError({
        statusCode: 504,
        message: 'Analyzer service timeout'
      })
    }

    // Network or other error
    logger.error('Analyzer', `Service unavailable: ${error}`)
    throw createError({
      statusCode: 503,
      message: 'Analyzer service unavailable'
    })
  }
}

/**
 * Send single track analysis request
 * Convenience wrapper around sendAnalysisRequest for a single track
 */
export async function analyzeSingleTrack(soundcloudId: number, options?: AnalyzeOptions): Promise<AnalyzeResponse> {
  return sendAnalysisRequest([soundcloudId], options)
}

/**
 * Fire-and-forget analysis trigger (non-blocking)
 * Useful for background analysis after track upsert
 * Does not throw errors - logs them instead
 */
export async function triggerAnalysisBackground(soundcloudIds: number[]): Promise<void> {
  try {
    const analyzerUrl = validateAnalyzerConfig()

    if (!soundcloudIds || soundcloudIds.length === 0) return

    // Fire and forget - don't await the result
    fetch(`${analyzerUrl}/analyze/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soundcloud_ids: soundcloudIds })
    }).catch((error) => {
      // Silent fail - analyzer might be down
      logger.error('Analyzer', `Background trigger failed: ${error}`)
    })
  } catch (error) {
    // Don't throw - this is background operation
    logger.error('Analyzer', `Background trigger error: ${error}`)
  }
}
