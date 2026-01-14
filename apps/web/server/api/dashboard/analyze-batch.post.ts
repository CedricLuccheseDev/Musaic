import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.supabaseUrl as string
  const supabaseKey = (config.supabaseServiceKey || config.supabaseKey) as string
  const analyzerUrl = config.analyzerUrl as string
  const analyzerApiKey = config.analyzerApiKey as string

  if (!analyzerUrl) {
    throw createError({ statusCode: 503, message: 'Analyzer not configured' })
  }

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Database not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get pending tracks (no analysis_status)
  const { data: pendingTracks, error } = await supabase
    .from('tracks')
    .select('soundcloud_id')
    .is('analysis_status', null)
    .limit(100)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  if (!pendingTracks || pendingTracks.length === 0) {
    return { message: 'No pending tracks', sent: 0 }
  }

  const soundcloudIds = pendingTracks.map(t => t.soundcloud_id)

  // Send to analyzer
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (analyzerApiKey) {
      headers['X-API-Key'] = analyzerApiKey
    }

    const response = await fetch(`${analyzerUrl}/analyze/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ soundcloud_ids: soundcloudIds })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw createError({ statusCode: response.status, message: errorText })
    }

    return { message: 'Batch sent', sent: soundcloudIds.length }
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err
    }
    throw createError({ statusCode: 503, message: 'Analyzer unavailable' })
  }
})
