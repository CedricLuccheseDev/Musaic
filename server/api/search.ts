import { searchWithArtistDetection, mapToArtistEntry, type SearchResult } from '~/server/services/soundcloud'
import { upsertTracks } from '~/server/services/trackStorage'
import { upsertArtist } from '~/server/services/artistStorage'

export default defineEventHandler(async (event): Promise<SearchResult> => {
  const { q, offset } = getQuery(event)

  if (!q || typeof q !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Missing search query'
    })
  }

  const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0
  const result = await searchWithArtistDetection(q, 25, offsetNum)

  // Store in database (non-blocking, but artist first due to FK constraint)
  const allTracks = [...result.tracks, ...(result.artist?.tracks || [])]
  const knownArtistIds = new Set<number>()

  const storeData = async () => {
    // Store artist first if found (FK constraint requires artist to exist)
    if (result.artist) {
      const artistEntry = mapToArtistEntry({
        id: result.artist.id,
        username: result.artist.username,
        permalink_url: result.artist.permalink_url,
        avatar_url: result.artist.avatar_url,
        followers_count: result.artist.followers_count,
        track_count: result.artist.track_count
      } as Parameters<typeof mapToArtistEntry>[0])
      await upsertArtist(artistEntry)
      knownArtistIds.add(result.artist.id)
    }
    // Then store tracks (with known artist IDs for FK)
    await upsertTracks(allTracks, knownArtistIds)
  }

  storeData().catch(err => {
    console.error('[Search API] Failed to store data:', err)
  })

  return result
})
