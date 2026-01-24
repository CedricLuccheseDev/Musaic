/**
 * Server-side authentication utilities
 */

import type { H3Event } from 'h3'
import { getSupabaseClient } from './supabase'

export interface AuthUser {
  id: string
  email: string
}

/**
 * Get the authenticated user from the request
 * Looks for Supabase session in cookies or Authorization header
 */
export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  // Try to get token from Authorization header
  const authHeader = getHeader(event, 'authorization')
  let accessToken = authHeader?.replace('Bearer ', '')

  // If not in header, try cookies
  if (!accessToken) {
    // Supabase stores tokens in cookies with various names
    const sbAccessToken = getCookie(event, 'sb-access-token')
    const sbRefreshToken = getCookie(event, 'sb-refresh-token')

    // Also check for the project-specific cookie format
    const allCookies = parseCookies(event)
    for (const [key, value] of Object.entries(allCookies)) {
      if (key.includes('-auth-token') && value) {
        try {
          const parsed = JSON.parse(value)
          if (parsed.access_token) {
            accessToken = parsed.access_token
            break
          }
        } catch {
          // Not JSON, might be the token itself
          if (value.length > 20) {
            accessToken = value
            break
          }
        }
      }
    }

    if (!accessToken && sbAccessToken) {
      accessToken = sbAccessToken
    }
  }

  if (!accessToken) {
    return null
  }

  // Verify token with Supabase
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.getUser(accessToken)

    if (error || !data.user) {
      return null
    }

    return {
      id: data.user.id,
      email: data.user.email || ''
    }
  } catch {
    return null
  }
}

/**
 * Require authentication - throws 401 if not authenticated
 */
export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const user = await getAuthUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  return user
}
