import { generateNonce, createState } from '~/server/utils/pkce'

const SOUNDCLOUD_AUTHORIZE_URL = 'https://secure.soundcloud.com/authorize'
const REDIRECT_URI = 'https://musaic.fr/api/auth/soundcloud/callback'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const clientId = config.soundcloudClientId as string
  if (!clientId) {
    throw createError({
      statusCode: 500,
      message: 'SoundCloud client ID not configured'
    })
  }

  // Generate nonce for CSRF protection
  const nonce = generateNonce()

  // Determine environment
  const isDev = config.public.isDev as boolean
  const env = isDev ? 'dev' : 'prod'
  const state = createState(env, nonce)

  // Store nonce in HTTP-only cookie (expires in 10 minutes)
  const cookieData = JSON.stringify({ nonce })
  setCookie(event, 'sc_oauth', cookieData, {
    httpOnly: true,
    secure: !isDev,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/'
  })

  // Build authorization URL (without PKCE - SoundCloud may not support it)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state
  })

  const authUrl = `${SOUNDCLOUD_AUTHORIZE_URL}?${params.toString()}`

  return { authUrl }
})
