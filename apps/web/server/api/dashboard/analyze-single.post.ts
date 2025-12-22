export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const analyzerUrl = config.analyzerUrl as string

  if (!analyzerUrl) {
    throw createError({ statusCode: 503, message: 'Analyzer not configured' })
  }

  const body = await readBody<{ soundcloud_id: number }>(event)

  if (!body.soundcloud_id) {
    throw createError({ statusCode: 400, message: 'soundcloud_id required' })
  }

  try {
    const response = await fetch(`${analyzerUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soundcloud_id: body.soundcloud_id })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw createError({ statusCode: response.status, message: errorText })
    }

    const result = await response.json()
    return result
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err
    }
    throw createError({ statusCode: 503, message: 'Analyzer unavailable' })
  }
})
