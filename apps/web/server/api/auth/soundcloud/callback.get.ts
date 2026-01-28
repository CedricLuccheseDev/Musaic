import { parseState } from '~/server/utils/pkce'
import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { syncUserLikes } from '~/server/services/soundcloudSync'

const SOUNDCLOUD_TOKEN_URL = 'https://secure.soundcloud.com/oauth/token'
const SOUNDCLOUD_ME_URL = 'https://api.soundcloud.com/me'
const REDIRECT_URI = 'https://musaic.fr/api/auth/soundcloud/callback'

interface SoundCloudTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
}

interface SoundCloudUser {
  id: number
  username: string
  avatar_url: string
  permalink_url: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const isDev = config.public.isDev as boolean
  const baseUrl = isDev ? 'http://localhost:3000' : 'https://musaic.fr'

  const code = query.code as string
  const state = query.state as string
  const error = query.error as string

  // Handle OAuth errors
  if (error) {
    const errorDescription = query.error_description as string || 'Authorization denied'
    return sendRedirect(event, `${baseUrl}/login?error=${encodeURIComponent(errorDescription)}`)
  }

  // Validate required params
  if (!code || !state) {
    return sendRedirect(event, `${baseUrl}/login?error=Missing%20authorization%20parameters`)
  }

  // Parse and verify signed state (HMAC signature + timestamp check)
  const clientSecret = config.soundcloudClientSecret as string
  const stateData = parseState(state, clientSecret)
  if (!stateData) {
    return sendRedirect(event, `${baseUrl}/login?error=Invalid%20or%20expired%20state`)
  }

  // If dev environment and we're on production, redirect to localhost
  if (stateData.env === 'dev' && !isDev) {
    const localUrl = new URL('http://localhost:3000/api/auth/soundcloud/callback')
    localUrl.searchParams.set('code', code)
    localUrl.searchParams.set('state', state)
    return sendRedirect(event, localUrl.toString())
  }

  const clientId = config.soundcloudClientId as string

  if (!clientId || !clientSecret) {
    return sendRedirect(event, '/login?error=SoundCloud%20not%20configured')
  }

  try {
    // Exchange code for tokens (without PKCE)
    const tokenResponse = await $fetch<SoundCloudTokenResponse>(SOUNDCLOUD_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: REDIRECT_URI
      }).toString()
    })

    // Get SoundCloud user info
    const scUser = await $fetch<SoundCloudUser>(SOUNDCLOUD_ME_URL, {
      headers: {
        Authorization: `OAuth ${tokenResponse.access_token}`
      }
    })

    const supabase = getSupabaseAdminClient()
    const userEmail = `sc_${scUser.id}@musaic.fr`
    const tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000)

    // Check if user already exists
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('soundcloud_id', scUser.id)
      .limit(1)

    let userId: string

    if (existingUsers && existingUsers.length > 0) {
      // Existing user - update tokens
      userId = existingUsers[0].id

      await supabase
        .from('profiles')
        .update({
          soundcloud_username: scUser.username,
          soundcloud_avatar_url: scUser.avatar_url,
          soundcloud_access_token: tokenResponse.access_token,
          soundcloud_refresh_token: tokenResponse.refresh_token,
          soundcloud_token_expires_at: tokenExpiresAt.toISOString()
        })
        .eq('id', userId)
    } else {
      // New user - create via admin API
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          soundcloud_id: scUser.id,
          soundcloud_username: scUser.username,
          avatar_url: scUser.avatar_url
        }
      })

      if (createError || !newUser.user) {
        console.error('[SC Callback] Failed to create user:', createError)
        return sendRedirect(event, '/login?error=Failed%20to%20create%20account')
      }

      userId = newUser.user.id

      // Update profile with SoundCloud data (profile is auto-created by trigger)
      await supabase
        .from('profiles')
        .update({
          soundcloud_id: scUser.id,
          soundcloud_username: scUser.username,
          soundcloud_avatar_url: scUser.avatar_url,
          soundcloud_access_token: tokenResponse.access_token,
          soundcloud_refresh_token: tokenResponse.refresh_token,
          soundcloud_token_expires_at: tokenExpiresAt.toISOString()
        })
        .eq('id', userId)
    }

    // Generate magic link to get the OTP token
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail
    })

    if (linkError || !linkData.properties?.hashed_token) {
      console.error('[SC Callback] Failed to generate link:', linkError)
      return sendRedirect(event, `${baseUrl}/auth/callback?error=${encodeURIComponent('Failed to create session')}`)
    }

    // Trigger likes sync in background (fire & forget)
    // Don't await - user shouldn't wait for sync to complete
    syncUserLikes(tokenResponse.access_token).catch((err) => {
      console.error('[SC Callback] Background likes sync failed:', err)
    })

    // Redirect to the client callback page with the token
    // The client will verify the token and establish the session
    const callbackUrl = new URL(`${baseUrl}/auth/callback`)
    callbackUrl.searchParams.set('token', linkData.properties.hashed_token)
    callbackUrl.searchParams.set('email', userEmail)

    return sendRedirect(event, callbackUrl.toString())
  } catch (err) {
    console.error('[SC Callback] Error:', err)
    return sendRedirect(event, '/login?error=Authentication%20failed')
  }
})
