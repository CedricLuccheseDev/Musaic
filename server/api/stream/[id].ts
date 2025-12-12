import SoundcloudModule from 'soundcloud.ts'

interface SoundcloudTrack {
  id: number
  title: string
  user?: { username: string }
  media?: {
    transcodings: Array<{
      url: string
      preset: string
      format: { protocol: string }
    }>
  }
}

interface SoundcloudConstructor {
  new (): SoundcloudInstance
}

interface SoundcloudInstance {
  tracks: {
    get: (id: number) => Promise<SoundcloudTrack>
  }
  util: {
    streamLink: (track: SoundcloudTrack, protocol?: 'progressive' | 'hls') => Promise<string>
  }
}

const Soundcloud = (
  (SoundcloudModule as { default?: SoundcloudConstructor }).default ||
  SoundcloudModule
) as SoundcloudConstructor

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id || isNaN(Number(id))) {
    throw createError({
      statusCode: 400,
      message: 'Invalid track ID'
    })
  }

  try {
    const soundcloud = new Soundcloud()
    const track = await soundcloud.tracks.get(Number(id))
    const streamUrl = await soundcloud.util.streamLink(track, 'progressive')

    // Redirect to the stream URL (or proxy if needed)
    return sendRedirect(event, streamUrl, 302)
  }
  catch (error) {
    console.error('Stream error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to get stream link'
    })
  }
})
