import SoundcloudModule from 'soundcloud.ts'
import type { SoundcloudConstructor, SoundcloudInstance } from '~/types/soundcloud'
import { logger } from '~/server/utils/logger'

const Soundcloud = (
  (SoundcloudModule as { default?: SoundcloudConstructor }).default ||
  SoundcloudModule
) as SoundcloudConstructor

const PROXY_URL = 'https://corsproxy.io/?'

function createSoundcloudClient(): SoundcloudInstance {
  const config = useRuntimeConfig()
  const clientId = config.soundcloudClientId as string
  const isDev = process.env.NODE_ENV === 'development'
  const useProxy = !!clientId && !isDev

  if (clientId) {
    return new Soundcloud(clientId, undefined, useProxy ? { proxy: PROXY_URL } : undefined)
  }
  return new Soundcloud()
}

interface AnalyzeFallbackRequest {
  soundcloud_id: number
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const analyzerUrl = config.analyzerUrl as string
  const analyzerApiKey = config.analyzerApiKey as string

  if (!analyzerUrl) {
    throw createError({
      statusCode: 503,
      message: 'Analyzer service not configured'
    })
  }

  const body = await readBody<AnalyzeFallbackRequest>(event)

  if (!body.soundcloud_id) {
    throw createError({
      statusCode: 400,
      message: 'soundcloud_id required'
    })
  }

  const soundcloudId = body.soundcloud_id

  try {
    logger.info('Server', `Fallback analysis: streaming track ${soundcloudId}`)

    // Get stream URL via SoundCloud API
    const soundcloud = createSoundcloudClient()
    const track = await soundcloud.tracks.get(soundcloudId)
    const streamUrl = await soundcloud.util.streamLink(track, 'progressive')

    // Stream the audio
    const audioResponse = await fetch(streamUrl)
    if (!audioResponse.ok) {
      throw new Error(`Failed to stream audio: ${audioResponse.status}`)
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const audioBytes = new Uint8Array(audioBuffer)

    logger.info('Server', `Fallback analysis: got ${audioBytes.length} bytes, sending to analyzer`)

    // Send to analyzer
    const formData = new FormData()
    formData.append('soundcloud_id', soundcloudId.toString())
    formData.append('audio', new Blob([audioBytes], { type: 'audio/mpeg' }), 'audio.mp3')

    const headers: Record<string, string> = {}
    if (analyzerApiKey) {
      headers['X-API-Key'] = analyzerApiKey
    }

    const analyzerResponse = await fetch(`${analyzerUrl}/analyze-bytes`, {
      method: 'POST',
      headers,
      body: formData
    })

    if (!analyzerResponse.ok) {
      const error = await analyzerResponse.text()
      logger.error('Server', `Analyzer error: ${error}`)
      throw createError({
        statusCode: analyzerResponse.status,
        message: `Analyzer error: ${error}`
      })
    }

    const result = await analyzerResponse.json()
    logger.info('Server', `Fallback analysis completed for track ${soundcloudId}`)
    return result
  }
  catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    logger.error('Server', `Fallback analysis failed: ${error}`)
    throw createError({
      statusCode: 500,
      message: `Fallback analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
})
