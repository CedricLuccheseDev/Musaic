// Rate limiting store (in-memory, resets on server restart)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Config
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30 // 30 requests per minute
const AI_RATE_LIMIT_MAX = 10 // 10 AI requests per minute

// Allowed origins (add your production domain)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://musaic.clhub.fr',
  'https://musaic.fr'
]

function getClientIp(event: Parameters<typeof defineEventHandler>[0] extends (e: infer E) => unknown ? E : never): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return getHeader(event, 'x-real-ip') || 'unknown'
}

function checkRateLimit(key: string, maxRequests: number): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: maxRequests - record.count }
}

export default defineEventHandler((event) => {
  const path = event.path

  // Only protect API routes
  if (!path.startsWith('/api/')) {
    return
  }

  // Skip rate limiting in development
  const isDev = process.env.DEV === 'true'

  // Check origin/referer for non-SSR requests
  const origin = getHeader(event, 'origin')
  const referer = getHeader(event, 'referer')
  const secFetchSite = getHeader(event, 'sec-fetch-site')

  // Allow same-origin requests and SSR (no origin header)
  if (secFetchSite === 'same-origin' || secFetchSite === 'none') {
    // Same origin, OK
  } else if (origin) {
    // Check if origin is allowed
    if (!ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
      console.warn(`[Security] Blocked request from origin: ${origin}`)
      throw createError({
        statusCode: 403,
        message: 'Forbidden'
      })
    }
  } else if (referer) {
    // Check referer as fallback
    if (!ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed))) {
      console.warn(`[Security] Blocked request from referer: ${referer}`)
      throw createError({
        statusCode: 403,
        message: 'Forbidden'
      })
    }
  }
  // No origin/referer = likely SSR or server-to-server, allow

  // Rate limiting (skip in dev)
  if (!isDev) {
    const clientIp = getClientIp(event)
    const isAiEndpoint = path.includes('/api/aiQuery')

    const maxRequests = isAiEndpoint ? AI_RATE_LIMIT_MAX : RATE_LIMIT_MAX_REQUESTS
    const rateLimitKey = isAiEndpoint ? `ai:${clientIp}` : `api:${clientIp}`

    const { allowed, remaining } = checkRateLimit(rateLimitKey, maxRequests)

    // Set rate limit headers
    setHeader(event, 'X-RateLimit-Limit', maxRequests.toString())
    setHeader(event, 'X-RateLimit-Remaining', remaining.toString())

    if (!allowed) {
      console.warn(`[Security] Rate limit exceeded for ${clientIp} on ${path}`)
      throw createError({
        statusCode: 429,
        message: 'Too many requests. Please try again later.'
      })
    }
  }
})
