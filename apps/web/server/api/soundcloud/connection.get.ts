/**
 * Get SoundCloud connection status
 */

import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const config = useRuntimeConfig()
  const supabase = createClient(
    config.supabaseUrl as string,
    config.supabaseKey as string
  )

  const { data: connection } = await supabase
    .from('soundcloud_connections')
    .select('soundcloud_username, soundcloud_avatar, last_sync_at')
    .eq('user_id', user.id)
    .single()

  if (!connection) {
    return { connected: false }
  }

  // Count user's liked tracks
  const { count } = await supabase
    .from('user_liked_tracks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return {
    connected: true,
    username: connection.soundcloud_username,
    avatar: connection.soundcloud_avatar,
    lastSyncAt: connection.last_sync_at,
    likedTracksCount: count || 0
  }
})
