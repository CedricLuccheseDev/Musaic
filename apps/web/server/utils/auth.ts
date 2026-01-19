/**
 * Server-side authentication utilities
 */

import type { H3Event } from 'h3'
import { getSupabaseClient } from './supabase'

export interface AuthUser {
  id: string
  email?: string
}

/**
 * Get authenticated user from request
 * Extracts Bearer token from Authorization header and verifies with Supabase
 * @returns User object or null if not authenticated
 */
export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)

  if (!token) {
    return null
  }

  try {
    const supabase = getSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email
    }
  } catch {
    return null
  }
}

/**
 * Require authenticated user or throw 401 error
 * Use this in API routes that require authentication
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
