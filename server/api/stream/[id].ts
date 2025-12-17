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

    const response = await fetch(streamUrl)

    if (!response.ok) {
      throw new Error('Failed to fetch audio')
    }

    setHeaders(event, {
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    })

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
