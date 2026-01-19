/**
 * POST /api/sets - Create a new set
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'
import { logger } from '~/server/utils/logger'
import type { CreateSetRequest, DbSet, SetMood, SetStatus } from '~/types'

const MAX_SETS_FREE = 1

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<CreateSetRequest>(event)
  const supabase = getSupabaseAdminClient()

  // Validate required fields
  if (!body.name?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Set name is required'
    })
  }

  if (!body.genre?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Genre is required'
    })
  }

  if (!body.targetDuration || body.targetDuration < 1) {
    throw createError({
      statusCode: 400,
      message: 'Target duration is required'
    })
  }

  try {
    // Check user's premium status and set count
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single()

    const isPremium = profile?.is_premium || false

    if (!isPremium) {
      // Check existing set count for free users
      const { count } = await supabase
        .from('sets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if ((count || 0) >= MAX_SETS_FREE) {
        throw createError({
          statusCode: 403,
          message: `Free users can create up to ${MAX_SETS_FREE} set. Upgrade to Premium for unlimited sets.`
        })
      }
    }

    // Create the set
    const { data: newSet, error } = await supabase
      .from('sets')
      .insert({
        user_id: user.id,
        name: body.name.trim(),
        genre: body.genre.trim(),
        target_duration: body.targetDuration * 60, // Convert minutes to seconds
        avg_track_playtime: body.avgTrackPlaytime || 70,
        mood: body.mood || 'mixed',
        status: 'draft',
        is_public: false
      })
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const dbSet = newSet as DbSet

    return {
      set: {
        id: dbSet.id,
        userId: dbSet.user_id,
        name: dbSet.name,
        description: dbSet.description,
        genre: dbSet.genre,
        targetDuration: dbSet.target_duration,
        avgTrackPlaytime: dbSet.avg_track_playtime || 70,
        mood: (dbSet.mood || 'mixed') as SetMood,
        tracks: [],
        status: (dbSet.status || 'draft') as SetStatus,
        isPublic: dbSet.is_public || false,
        createdAt: new Date(dbSet.created_at || Date.now()),
        updatedAt: new Date(dbSet.updated_at || Date.now())
      }
    }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode) {
      throw error
    }
    logger.db.error(`Failed to create set for user ${user.id}: ${error}`)
    throw createError({
      statusCode: 500,
      message: 'Failed to create set'
    })
  }
})
