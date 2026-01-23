/**
 * SoundCloud OAuth callback endpoint
 * Handles the OAuth callback, exchanges code for token, creates/signs in user
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'

interface SoundCloudTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope: string
}

interface SoundCloudUser {
  id: number
  username: string
  avatar_url: string
  permalink_url: string
  followers_count: number
  track_count: number
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  // Get and validate state
  const state = query.state as string
  const storedState = getCookie(event, 'soundcloud_oauth_state')

  if (!state || state !== storedState) {
    throw createError({
      statusCode: 400,
      message: 'Invalid state parameter - possible CSRF attack'
    })
  }

  // Clear state cookie
  deleteCookie(event, 'soundcloud_oauth_state')

  // Check for error from SoundCloud
  if (query.error) {
    console.error('[SoundCloud OAuth] Error:', query.error, query.error_description)
    return sendRedirect(event, '/login?error=soundcloud_denied')
  }

  // Get authorization code
  const code = query.code as string
  if (!code) {
    throw createError({
      statusCode: 400,
      message: 'Missing authorization code'
    })
  }

  try {
    // Exchange code for token
    const tokenResponse = await $fetch<SoundCloudTokenResponse>(
      'https://api.soundcloud.com/oauth2/token',
      {
        method: 'POST',
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.soundcloudOAuthClientId,
          client_secret: config.soundcloudOAuthClientSecret,
          redirect_uri: config.soundcloudRedirectUri,
          code
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    // Fetch user info from SoundCloud
    const scUser = await $fetch<SoundCloudUser>('https://api.soundcloud.com/me', {
      headers: {
        Authorization: `OAuth ${tokenResponse.access_token}`
      }
    })

    // Get Supabase admin client
    const supabase = getSupabaseAdminClient()

    // Create unique email for SoundCloud user
    const email = `sc_${scUser.id}@soundcloud.musaic.app`

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(u => u.email === email)

    let userId: string

    if (existingUser) {
      // User exists, just sign them in
      userId = existingUser.id
    } else {
      // Create new user
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          soundcloud_id: scUser.id,
          soundcloud_username: scUser.username,
          avatar_url: scUser.avatar_url,
          provider: 'soundcloud'
        }
      })

      if (userError || !newUser.user) {
        console.error('[SoundCloud OAuth] Failed to create user:', userError)
        throw createError({
          statusCode: 500,
          message: 'Failed to create user account'
        })
      }

      userId = newUser.user.id
    }

    // Calculate token expiration
    const expiresAt = tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
      : null

    // Upsert SoundCloud connection
    const { error: connectionError } = await supabase
      .from('soundcloud_connections')
      .upsert({
        user_id: userId,
        soundcloud_user_id: scUser.id,
        soundcloud_username: scUser.username,
        soundcloud_avatar: scUser.avatar_url,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token || null,
        expires_at: expiresAt
      }, {
        onConflict: 'user_id'
      })

    if (connectionError) {
      console.error('[SoundCloud OAuth] Failed to save connection:', connectionError)
    }

    // Generate a magic link for sign-in (Supabase method)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email
    })

    if (linkError || !linkData.properties?.hashed_token) {
      console.error('[SoundCloud OAuth] Failed to generate sign-in link:', linkError)
      throw createError({
        statusCode: 500,
        message: 'Failed to create session'
      })
    }

    // Extract the token from the action link
    const actionUrl = new URL(linkData.properties.action_link)
    const token = actionUrl.searchParams.get('token')
    const type = actionUrl.searchParams.get('type')

    // Redirect to Supabase auth confirm endpoint which will set the session
    const confirmUrl = new URL('/auth/callback', config.soundcloudRedirectUri.replace('/api/auth/soundcloud/callback', ''))
    confirmUrl.searchParams.set('token_hash', linkData.properties.hashed_token)
    confirmUrl.searchParams.set('type', type || 'magiclink')
    confirmUrl.searchParams.set('next', '/app')

    return sendRedirect(event, confirmUrl.toString())
  } catch (err) {
    console.error('[SoundCloud OAuth] Error:', err)

    // Check if it's an auth error from SoundCloud
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status: number }).status
      if (status === 401) {
        return sendRedirect(event, '/login?error=soundcloud_auth_failed')
      }
    }

    throw createError({
      statusCode: 500,
      message: 'OAuth authentication failed'
    })
  }
})
