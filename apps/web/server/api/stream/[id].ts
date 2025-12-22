import SoundcloudModule from 'soundcloud.ts'
import type { SoundcloudConstructor, SoundcloudInstance } from '~/types/soundcloud'

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

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id || isNaN(Number(id))) {
    throw createError({
      statusCode: 400,
      message: 'Invalid track ID'
    })
  }

  try {
    const soundcloud = createSoundcloudClient()
    const track = await soundcloud.tracks.get(Number(id))
    const streamUrl = await soundcloud.util.streamLink(track, 'progressive')

    // Get range header from request
    const rangeHeader = getHeader(event, 'range')

    // Fetch with range if provided
    const fetchHeaders: HeadersInit = {}
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader
    }

    const response = await fetch(streamUrl, { headers: fetchHeaders })

    if (!response.ok && response.status !== 206) {
      throw new Error('Failed to fetch audio')
    }

    // Get content info from SoundCloud response
    const contentLength = response.headers.get('content-length')
    const contentRange = response.headers.get('content-range')
    const acceptRanges = response.headers.get('accept-ranges')

    // Set response headers
    const headers: Record<string, string> = {
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': acceptRanges || 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'public, max-age=3600',
    }

    if (contentLength) {
      headers['Content-Length'] = contentLength
    }

    if (contentRange) {
      headers['Content-Range'] = contentRange
    }

    setHeaders(event, headers)

    // Set status code (206 for partial content)
    if (response.status === 206) {
      setResponseStatus(event, 206)
    }

    return response.body
  }
  catch (error) {
    console.error('Stream error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to stream audio'
    })
  }
})
