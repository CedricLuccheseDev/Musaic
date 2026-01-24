/**
 * SoundCloud likes sync endpoint
 * Fetches user's liked tracks from SoundCloud and stores them
 */

import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '~/server/utils/auth'

interface SoundCloudTrack {
  id: number
  title: string
  user: {
    username: string
  }
  artwork_url: string | null
  duration: number
  genre: string | null
  downloadable: boolean
  permalink_url: string
}

interface SoundCloudLike {
  track: SoundCloudTrack
  created_at: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.supabaseUrl as string,
    config.supabaseKey as string
  )

  // Get SoundCloud connection
  const { data: connection, error: connectionError } = await supabase
    .from('soundcloud_connections')
    .select('access_token, last_sync_at')
    .eq('user_id', user.id)
    .single()

  if (connectionError || !connection) {
    throw createError({ statusCode: 400, message: 'SoundCloud not connected' })
  }

  try {
    // Fetch likes from SoundCloud
    const likes: SoundCloudLike[] = []
    let nextUrl = 'https://api.soundcloud.com/me/likes?limit=200&linked_partitioning=1'

    while (nextUrl) {
      const response = await $fetch<{
        collection: SoundCloudLike[]
        next_href?: string
      }>(nextUrl, {
        headers: {
          Authorization: `OAuth ${connection.access_token}`
        }
      })

      likes.push(...response.collection.filter(item => item.track))
      nextUrl = response.next_href || ''

      // Limit to 1000 likes for now
      if (likes.length >= 1000) break
    }

    // Process and store tracks
    let imported = 0
    let skipped = 0

    for (const like of likes) {
      const track = like.track
      if (!track) continue

      // Check if track exists
      const { data: existingTrack } = await supabase
        .from('tracks')
        .select('soundcloud_id')
        .eq('soundcloud_id', track.id)
        .single()

      if (!existingTrack) {
        // Add track with basic info
        await supabase.from('tracks').insert({
          soundcloud_id: track.id,
          title: track.title,
          artist: track.user.username,
          artwork: track.artwork_url?.replace('-large', '-t500x500') || null,
          duration: track.duration,
          genre: track.genre,
          permalink_url: track.permalink_url,
          analysis_status: 'pending',
          download_status: track.downloadable ? 'available' : 'unavailable'
        })
      }

      // Record user like
      const { error: likeError } = await supabase
        .from('user_liked_tracks')
        .upsert({
          user_id: user.id,
          soundcloud_id: track.id,
          liked_at: like.created_at
        }, {
          onConflict: 'user_id,soundcloud_id'
        })

      if (!likeError) {
        imported++
      } else {
        skipped++
      }
    }

    // Update last sync timestamp
    await supabase
      .from('soundcloud_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return {
      success: true,
      imported,
      skipped,
      total: likes.length
    }
  } catch (err) {
    console.error('[SoundCloud Sync] Error:', err)
    throw createError({ statusCode: 500, message: 'Failed to sync likes' })
  }
})
