import { generateNonce, createState } from '~/server/utils/pkce'

const SOUNDCLOUD_AUTHORIZE_URL = 'https://secure.soundcloud.com/authorize'
const REDIRECT_URI = 'https://musaic.fr/api/auth/soundcloud/callback'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  const clientId = config.soundcloudClientId as string
  const clientSecret = config.soundcloudClientSecret as string
  if (!clientId || !clientSecret) {
    throw createError({
      statusCode: 500,
      message: 'SoundCloud not configured'
    })
  }

  // Generate nonce for CSRF protection
  const nonce = generateNonce()

  // Determine environment
  const isDev = config.public.isDev as boolean
  const env = isDev ? 'dev' : 'prod'

  // Create HMAC-signed state (no cookie needed)
  const state = createState(env, nonce, clientSecret)

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state
  })

  const authUrl = `${SOUNDCLOUD_AUTHORIZE_URL}?${params.toString()}`

  return { authUrl }
})
