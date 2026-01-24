import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.supabaseUrl as string,
    config.supabaseKey as string
  )

  const { data, error } = await supabase
    .from('playlists')
    .select('id, name, target_duration, style, is_draft, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // Calculate track count and total duration for each playlist
  const playlists = await Promise.all(
    (data || []).map(async (playlist) => {
      const { data: tracks } = await supabase
        .from('playlist_tracks')
        .select('soundcloud_id, tracks(duration)')
        .eq('playlist_id', playlist.id)

      const trackCount = tracks?.length || 0
      let totalDuration = 0
      if (tracks) {
        for (const t of tracks) {
          const trackData = t.tracks as unknown as { duration: number } | { duration: number }[] | null
          if (trackData) {
            const duration = Array.isArray(trackData) ? trackData[0]?.duration : trackData.duration
            if (duration) {
              totalDuration += duration / 60000
            }
          }
        }
      }

      return {
        id: playlist.id,
        name: playlist.name,
        target_duration: playlist.target_duration,
        style: playlist.style,
        is_draft: playlist.is_draft,
        created_at: playlist.created_at,
        track_count: trackCount,
        total_duration: Math.round(totalDuration)
      }
    })
  )

  return playlists
})
