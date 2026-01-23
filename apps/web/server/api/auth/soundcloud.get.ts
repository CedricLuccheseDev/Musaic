/**
 * SoundCloud OAuth initiation endpoint
 * Redirects user to SoundCloud authorization page
 */

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()

  const clientId = config.soundcloudOAuthClientId
  const redirectUri = config.soundcloudRedirectUri

  if (!clientId) {
    throw createError({
      statusCode: 500,
      message: 'SoundCloud client ID not configured'
    })
  }

  // Generate random state for CSRF protection
  const state = crypto.randomUUID()

  // Store state in cookie for validation on callback
  setCookie(event, 'soundcloud_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/'
  })

  // Build SoundCloud authorization URL
  const authUrl = new URL('https://soundcloud.com/connect')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'non-expiring')
  authUrl.searchParams.set('state', state)

  return sendRedirect(event, authUrl.toString())
})
