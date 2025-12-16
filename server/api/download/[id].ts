import SoundcloudModule from 'soundcloud.ts'
import type { SoundcloudConstructor } from '~/types/soundcloud'

// Patterns to remove from filename
const TITLE_CLEANUP_PATTERNS = [
  /\[FREE DOWNLOAD\]/gi,
  /\(FREE DOWNLOAD\)/gi,
  /FREE DOWNLOAD/gi,
  /\[FREE DL\]/gi,
  /\(FREE DL\)/gi,
  /FREE DL/gi,
  /\[FREEDL\]/gi,
  /\(FREEDL\)/gi,
  /FREEDL/gi,
  /\|\[.*?\]\|/g, // |[ ... ]|
  /\|.*?FREE.*?\|/gi, // | ... FREE ... |
]

function cleanTitle(title: string): string {
  let cleaned = title
  for (const pattern of TITLE_CLEANUP_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }
  // Remove extra spaces and trim
  return cleaned.replace(/\s+/g, ' ').trim()
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '-').trim()
}

const Soundcloud = (
  (SoundcloudModule as { default?: SoundcloudConstructor }).default ||
  SoundcloudModule
) as SoundcloudConstructor

// Proxy URL for production (bypasses IP blocking from datacenters)
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

    // First fetch the full track object
    const track = await soundcloud.tracks.get(Number(id))

    // Get the stream URL
    const streamUrl = await soundcloud.util.streamLink(track, 'progressive')

    // Fetch the audio and proxy it with download headers
    const response = await fetch(streamUrl)

    if (!response.ok) {
      throw new Error('Failed to fetch audio')
    }

    const cleanedTitle = cleanTitle(track.title)
    const filename = sanitizeFilename(`${cleanedTitle}.mp3`)

    setHeaders(event, {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${filename}"`,
    })

    return response.body
  }
  catch (error) {
    console.error('Download error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to get download link'
    })
  }
})
