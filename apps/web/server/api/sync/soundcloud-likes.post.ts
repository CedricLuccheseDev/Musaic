/**
 * POST /api/sync/soundcloud-likes
 * Syncs the authenticated user's SoundCloud likes to the database
 */

import { requireAuth } from '~/server/utils/auth'
import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { syncUserLikes } from '~/server/services/soundcloudSync'
import { logger } from '~/server/utils/logger'

interface SyncResponse {
  success: boolean
  synced: number
  total: number
  skipped: number
  error?: string
}

export default defineEventHandler(async (event): Promise<SyncResponse> => {
  // Require authentication
  const user = await requireAuth(event)

  const supabase = getSupabaseAdminClient()

  // Get user's profile with SoundCloud tokens
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('soundcloud_access_token, soundcloud_refresh_token, soundcloud_token_expires_at')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    logger.error('SYNC', `Profile not found for user ${user.id}`)
    throw createError({
      statusCode: 404,
      message: 'Profile not found'
    })
  }

  if (!profile.soundcloud_access_token) {
    logger.error('SYNC', `No SoundCloud token for user ${user.id}`)
    throw createError({
      statusCode: 400,
      message: 'No SoundCloud connection. Please reconnect with SoundCloud.'
    })
  }

  // Check if token is expired
  let accessToken = profile.soundcloud_access_token
  if (profile.soundcloud_token_expires_at) {
    const expiresAt = new Date(profile.soundcloud_token_expires_at)
    if (expiresAt < new Date()) {
      // Token expired, try to refresh
      if (!profile.soundcloud_refresh_token) {
        throw createError({
          statusCode: 401,
          message: 'SoundCloud token expired. Please reconnect.'
        })
      }

      try {
        accessToken = await refreshToken(user.id, profile.soundcloud_refresh_token)
      } catch {
        throw createError({
          statusCode: 401,
          message: 'Failed to refresh SoundCloud token. Please reconnect.'
        })
      }
    }
  }

  // Sync likes
  try {
    const result = await syncUserLikes(accessToken)

    return {
      success: true,
      synced: result.synced,
      total: result.total,
      skipped: result.skipped
    }
  } catch (error) {
    logger.error('SYNC', `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)

    // Check if it's an auth error from SoundCloud
    if (error instanceof Error && error.message.includes('401')) {
      throw createError({
        statusCode: 401,
        message: 'SoundCloud token invalid. Please reconnect.'
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Sync failed. Please try again.'
    })
  }
})

/**
 * Refresh SoundCloud access token
 */
async function refreshToken(userId: string, refreshToken: string): Promise<string> {
  const config = useRuntimeConfig()
  const supabase = getSupabaseAdminClient()

  const response = await $fetch<{
    access_token: string
    refresh_token: string
    expires_in: number
  }>('https://secure.soundcloud.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.soundcloudClientId as string,
      client_secret: config.soundcloudClientSecret as string,
      refresh_token: refreshToken
    }).toString()
  })

  // Calculate expiration time
  const tokenExpiresAt = new Date()
  tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + response.expires_in)

  // Update tokens in database
  await supabase
    .from('profiles')
    .update({
      soundcloud_access_token: response.access_token,
      soundcloud_refresh_token: response.refresh_token,
      soundcloud_token_expires_at: tokenExpiresAt.toISOString()
    })
    .eq('id', userId)

  logger.info('SYNC', `Refreshed SoundCloud token for user ${userId}`)

  return response.access_token
}
